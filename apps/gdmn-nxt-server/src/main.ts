import express from 'express';
import session from 'express-session';
import passport  from 'passport';
import * as dotenv from 'dotenv';
import * as cors from 'cors';
import { Strategy } from 'passport-local';
import { validPassword } from '@gsbelarus/util-helpers';
import { authResult } from '@gsbelarus/util-api-types';
import { checkGedeminUser, getAccount, getGedeminUser } from './app/app';
import { getReconciliationStatement } from './app/reconciliationStatement';
import { getContacts, updateContact, addContact, deleteContact, getContactHierarchy } from './app/contacts';
import { upsertAccount, getAccounts } from './app/accounts';
import { addLabelsContact, deleteLabelsContact, getLabelsContact } from './app/labels';
import contactGroups from './app/contactGrops';
import { disposeConnection, getReadTransaction, releaseReadTransaction } from './app/db-connection';
import { loadRDBFields, loadRDBRelationFields, loadRDBRelations } from './app/er/rdb-utils';
import { IRDBFields, IRDBRelationFields, IRDBRelations } from './app/er/rdb-types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MemoryStore = require('memorystore')(session);

dotenv.config({ path: '../..' });

const app = express();
const cors = require('cors');

app.use(cors({
  credentials: true,
  origin: 'http://localhost:4200'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const Api = {
  v1: '/api/v1',
  v2: '/api/v2'
};

interface IBaseUser {
  userName: string;
};

interface IGedeminUser extends IBaseUser {
  gedeminUser: true;
};

interface ICustomerUser extends IBaseUser {
  email: string;
  hash: string;
  salt: string;
  expireOn?: number;
};

type IUser = IGedeminUser | ICustomerUser;

function isIGedeminUser(u: IUser): u is IGedeminUser {
  return !!u['gedeminUser'];
};

const userName2Key = (userName: string) => userName.toLowerCase();

passport.use(new Strategy({
  usernameField: 'userName',
  passwordField: 'password',
  passReqToCallback: true
},
  async (req: any, userName: string, password: string, done) => {
    const { employeeMode } = req.body;

    console.log('this is passport');

    try {
      if (employeeMode) {
        //TODO: надо возвращать запись пользователя и все остальные проверки делать тут
        const res = await checkGedeminUser(userName, password);

        if (res.result === 'UNKNOWN_USER') {
          return done(null, false);
        }

        if (res.result === 'SUCCESS') {
          console.log('valid gedemin user');
          return done(null, { userName, gedeminUser: true });
        } else {
          return done(null, false);
        }
      } else {

        const account = await getAccount(req.sessionID, userName);

        if (!account || !account.USR$APPROVED || (account.USR$EXPIREON && account.USR$EXPIREON < new Date())) {
          return done(null, false);
        }

        if (validPassword(password, account.USR$HASH, account.USR$SALT)) {
          console.log('valid user');
          return done(null, { userName });
        } else {
          return done(null, false);
        }
      }
    }
    catch (err) {
      done(err);
    }
  }
));

passport.serializeUser( (user: IUser, done) => {
  console.log('passport serialize');
  done(null, `${isIGedeminUser(user) ? 'G' : 'U'}${userName2Key(user.userName)}`);
});

passport.deserializeUser(async (un: string, done) => {
  console.log('passport deserialize');

  const userType = un.slice(0, 1);
  const userName = un.slice(1);

  if (userType === 'U') {
    const account = await getAccount('passport', userName);

    if (account) {
      done(null, { userName });
    } else {
      done(`Unknown user userName: ${userName}`);
    }
  } else {
    const res = await getGedeminUser(userName);

    if (res) {
      done(null, { ...res, gedeminUser: true });
    } else {
      done(`Unknown user userName: ${userName}`);
    }
  }
});

const sessionStore = new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 });

const middlewares = [
  session({
    name: 'Sid',
    secret: 'kjdsfgfghfghfghfghfghfghhf',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000
    }
  }),
  passport.initialize(),
  passport.session()
];

app.use(middlewares);

app.get('/test', (req, res) => {
  if (req.isAuthenticated()) {
    return res.send(`Authenticated!\n${JSON.stringify(req.user, undefined, 2)}`);
  } else {    
    return res.send(`Not authenticated!`);
  }
});

app.get('/user', (req, res) => {
  req.isAuthenticated() ?
    res.json(req.user)
    :
    res.json({ success: false });
});

app.route('/user/signin')
  .post(
    passport.authenticate('local', {}),
    (req, res) => {
      const { userName } = req.body;

      return res.json(authResult(
        'SUCCESS',
        `You are logged in as ${userName}.`
      ));
    },
  );

app.route('/user/forgot-password')
  .post(
    async (req, res) => {
      const { email } = req.body;
      /*  1. проверим входные параметры на корректность  */

      if (typeof email !== 'string') {
        return res.json(authResult('INVALID_DATA', 'Invalid data.'));
      }

      return res.sendStatus(500);
    });

app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy( err => { if (err) console.error(err); } );
  } else {
    res.end();
  }
});

const router = express.Router();

/*
router.use(
  (req, res, next) => {
    console.log('123');
    if (req.isAuthenticated()) {
      console.log('123-OK');
      return next();
    } else {
      console.log('123-BAD');
      return res.sendStatus(403);
    }
  }
);
*/

router.get('/test', (req, res) => {
  if (req.isAuthenticated()) {
    return res.send(`from router: Authenticated!\n${JSON.stringify(req.user, undefined, 2)}`);
  } else {    
    return res.send(`from router: Not authenticated!`);
  }
});

router.get('/contacts', getContacts);
router.get('/contacts/taxId/:taxId', getContacts);
router.get('/contacts/rootId/:rootId', getContacts);
router.put('/contacts/:id', updateContact);
router.post('/contacts', addContact);
router.delete('/contacts/:id', deleteContact);
router.get('/contacts/hierarchy', getContactHierarchy);
router.get('/contacts/labels/:contactId', getLabelsContact);
router.get('/contacts/labels', getLabelsContact);
router.post('/contacts/labels', addLabelsContact);
router.delete('/contacts/labels/:contactId', deleteLabelsContact);

router.get('/contactgroups', contactGroups.get);
router.post('/contactgroups', contactGroups.add);
router.put('/contactgroups/:id', contactGroups.update);
router.delete('/contactgroups/:id', contactGroups.remove);

router.get('/accounts', getAccounts);
router.get('/accounts/email/:email', getAccounts);
router.get('/account/:id', getAccounts);
router.post('/account', upsertAccount);
router.put('/account/:ID', upsertAccount);

router.get('/reconciliation-statement/:custId/:dateBegin-:dateEnd', getReconciliationStatement);

app.use('/api/v1', router);

app.get('*', (req) => console.log(`Unknown request. ${req.url}`));

const port = process.env.GDMN_NXT_SERVER_PORT || 3333;
const server = app.listen(port, () => console.log(`Listening at http://localhost:${port}`));

server.on('error', console.error);

let rdbFields: IRDBFields;
let rdbRelations: IRDBRelations;
let rdbRelationFields: IRDBRelationFields;
let t = new Date().getTime();

getReadTransaction('rdb')
  .then( ({ attachment: a, transaction: t }) => Promise.all([
    loadRDBFields(a, t), 
    loadRDBRelations(a, t),
    loadRDBRelationFields(a, t),
  ]) )
  .then( ([f, r, rf]) => (rdbFields = f, rdbRelations = r, rdbRelationFields = rf) )
  .then( _ => console.log(`rdb data read in ${new Date().getTime() - t}ms`) )
  .finally( () => releaseReadTransaction('rdb') );

process
  .on('exit', code => {
    disposeConnection();
    console.log(`Process exit event with code: ${code}`);
  })
  .on('SIGINT', process.exit)
  .on('SIGBREAK', process.exit)
  .on('SIGTERM', process.exit)
  .on('unhandledRejection', (reason, p) => console.error({ err: reason }, p))
  .on('uncaughtException', console.error);


////////////////////////////////////////////////////////////////////////////
// garbage
////////////////////////////////////////////////////////////////////////////

/*
app.route('/login')
  .get((_, res) => {
    const form = '<h1>Login Page</h1><form method="POST" action="/login">\
    Enter Username:<br><input type="text" name="username">\
    <br>Enter Password:<br><input type="password" name="password">\
    <br><br><input type="submit" value="Submit"></form>';

    res.send(form);
  })
  .post(
    passport.authenticate('local', {
      failureRedirect: '/login-failure',
      successRedirect: '/login-success'
    }),
    (err, _req, _res, next) => {
      if (err) next(err);
    }
  );

app.route('/register')
  .get((_, res) => {
    const form = '<h1>Register Page</h1><form method="post" action="register">\
      Enter Username:<br><input type="text" name="username">\
      <br>Enter Password:<br><input type="password" name="password">\
      <br><br><input type="submit" value="Submit"></form>';

    res.send(form);
  })
  .post(async (req, res) => {
    const userName = req.body.username;

    const newUser: ICustomerUser = {
      userName,
      email: '',
      ...genPassword(req.body.password)
    };

    await userDB.write(userName2Key(userName), newUser, true);

    res.redirect('/login');
  });

app.get('/protected-route', (req, res) => {
  // This is how you check if a user is authenticated and protect a route.  You could turn this into a custom middleware to make it less redundant
  if (req.isAuthenticated()) {
    res.send('<h1>You are authenticated</h1><p><a href="/logout">Logout and reload</a></p>');
  } else {
    res.send('<h1>You are not authenticated</h1><p><a href="/login">Login</a></p>');
  }
});

app.get('/login-success', (_, res) => {
  res.send('<p>You successfully logged in. --> <a href="/protected-route">Go to protected route</a></p>');
});

app.get('/login-failure', (_, res) => {
  res.send('You entered the wrong password.');
});
*/

