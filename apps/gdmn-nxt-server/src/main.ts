/* eslint-disable indent */
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import * as dotenv from 'dotenv';
import { Strategy } from 'passport-local';
import { validPassword } from '@gsbelarus/util-helpers';
import { authResult } from '@gsbelarus/util-api-types';
import { checkGedeminUser, getAccount, getGedeminUser } from './app/app';
import { getReconciliationStatement } from './app/reconciliationStatement';
import { upsertAccount, getAccounts } from './app/accounts';
import contactGroups from './app/contactGrops';
import departments from './app/departments';
import bankStatementsRouter from './app/routes/bankStatementsRouter';
import customerContracts from './app/customerContracts';
import dealsRouter from './app/routes/dealsRouter';
import kanbanRouter from './app/routes/kanbanRouter';
import actCompletionRouter from './app/routes/actCompletionRouter';
import chartsRouter from './app/routes/chartsDataRouter';
import contactsRouter from './app/routes/contactsRouter';
import systemRouter from './app/routes/systemRouter';
import { disposeConnection } from './app/utils/db-connection';
import { importedModels } from './app/models';
import contractsListRouter from './app/routes/contractsListRouter';
import reportsRouter from './app/routes/reportsRouter';
import workTypes from './app/handlers/workTypes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MemoryStore = require('memorystore')(session);

dotenv.config({ path: '../..' });
const app = express();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors');


app.use(cors({
  credentials: true,
  origin: `http://localhost:${process.env.NODE_ENV === 'development' ? '4200' : '80'}` // 'http://localhost:80'
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
app.use(express.static(path.resolve(__dirname, '../gdmn-nxt-web')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoot = {
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
  // eslint-disable-next-line dot-notation
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
        // TODO: надо возвращать запись пользователя и все остальные проверки делать тут
        const res = await checkGedeminUser(userName, password);

        if (res.result === 'UNKNOWN_USER') {
          return done(null, false);
        }

        if (res.result === 'SUCCESS') {
          console.log('valid gedemin user');
          return done(null, { userName, gedeminUser: true, id: res.userProfile.id });
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
    } catch (err) {
      done(err);
    }
  }
));

passport.serializeUser((user: IUser, done) => {
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
    return res.send('Not authenticated!');
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
        `Вы вошли как ${userName}.`
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
    req.session.destroy(err => {
      if (err) console.error(err);
    });
  }
  res.sendStatus(200);
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
    return res.send('from router: Not authenticated!');
  }
});

/** Contacts */
router.use(contactsRouter);

/** Contact groups */
router.get('/contactgroups', contactGroups.get);
router.post('/contactgroups', contactGroups.add);
router.put('/contactgroups/:id', contactGroups.update);
router.delete('/contactgroups/:id', contactGroups.remove);

/** Departments */
router.get('/departments', departments.get);
router.get('/departments/:id', departments.get);
router.post('/departments', departments.upsert);
router.put('/departments/:id', departments.upsert);
router.delete('/departments/:id', departments.remove);

/** Customer contracts */
router.get('/customercontracts', customerContracts.get);
router.get('/customercontracts/:id', customerContracts.get);
router.post('/customercontracts', customerContracts.upsert);
router.put('/customercontracts/:id', customerContracts.upsert);
router.delete('/customercontracts/:id', customerContracts.remove);

router.get('/worktypes', workTypes.get);

/** Contracts list */
router.use(contractsListRouter);
/** Bank Statements */
router.use(bankStatementsRouter);

/** Deals */
router.use(dealsRouter);

/** Kanban */
router.use(kanbanRouter);

router.use(actCompletionRouter);

router.use(chartsRouter);
router.use(systemRouter);

router.get('/accounts', getAccounts);
router.get('/accounts/email/:email', getAccounts);
router.get('/account/:id', getAccounts);
router.post('/account', upsertAccount);
router.put('/account/:ID', upsertAccount);

router.use(reportsRouter);

// router.get('/reconciliation-statement/:custId/:dateBegin-:dateEnd', getReconciliationStatement);

router.get('/er-model', async (_, res) => {
  const { erModelNoAdapters } = await importedModels;
  res.json(erModelNoAdapters);
});

router.get('/er-model/with-adapters', async (_, res) => {
  const { erModel } = await importedModels;
  res.json(erModel);
});

router.get('/er-model/make-sql', async (_, res) => {
  const { erModel } = await importedModels;
  res.json(erModel);
});

app.use(apiRoot.v1, router);

if (process.env.NODE_ENV !== 'development') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../gdmn-nxt-web', 'index.html'));
  });
};

app.get('*', (req) => console.log(`Unknown request. ${req.url}`));

const port = process.env.GDMN_NXT_SERVER_PORT || 3333;
const server = app.listen(port, () => console.log(`Listening at http://localhost:${port}`));

server.on('error', console.error);

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

// //////////////////////////////////////////////////////////////////////////
// garbage
// //////////////////////////////////////////////////////////////////////////

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

