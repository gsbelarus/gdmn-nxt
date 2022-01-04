import * as express from 'express';
import * as session from 'express-session';
import * as passport from 'passport';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';
import { Strategy } from 'passport-local';
import { FileDB } from '@gsbelarus/util-helpers';
import { checkEmailAddress, genRandomPassword } from '@gsbelarus/util-useful';
import { authResult } from '@gsbelarus/util-api-types';
import { checkGedeminUser, getReconciliationStatement } from './app/app';

const MemoryStore = require('memorystore')(session);

dotenv.config({ path: '../..' });

const app = express();

app.use(cors({
  credentials: true,
  origin: 'http://localhost:4200'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

interface IUser {
  userName: string;
  email: string;
  hash: string;
  salt: string;
  expireOn?: number;
};

const userDB = new FileDB<IUser>({
  fn: `${process.env.GDMN_NXT_SERVER_DB_FOLDER}/user.json`,
  space: 2
});

const userName2Key = (userName: string) => userName.toLowerCase();

const purgeExpiredUsers = async () => {
  let changed = false;
  const data = await userDB.getMutable(false);
  for (const k of Object.keys(data)) {
    if (data[k].expireOn < Date.now()) {
      delete data[k];
      changed = true;
    }
  }
  if (changed) {
    await userDB.put(data, true);
  }
};

passport.use(new Strategy({
  usernameField: 'userName',
  passwordField: 'password'
},
  async (userName: string, password: string, done) => {
    try {
      await purgeExpiredUsers();

      const user = await userDB.read(userName2Key(userName));

      if (!user) {
        return done(null, false);
      }

      if (validPassword(password, user.hash, user.salt)) {
        return done(null, user);
      } else {
        console.log('Пароль неверный');
        return done(null, false);
      }
    }
    catch (err) {
      done(err);
    }
  }
));

passport.serializeUser((user: IUser, done) => done(null, userName2Key(user.userName)));

passport.deserializeUser(async (userName: string, done) => {
  const user = await userDB.read(userName);

  if (user) {
    done(null, user);
  } else {
    done(`Unknown user userName: ${userName}`);
  }
});

const sessionStore = new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 });

app.use(session({
  name: 'Sid',
  secret: 'kjdsfgfghfghfghfghfghfghhf',
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());


app.get('/', (_, res) => {
  res.send('<h1>Home</h1><p>Please <a href="/register">register</a></p>');
});

app.get('/api', (_, res) => {
  res.send({ message: 'Welcome to gdmn-nxt-server!' });
});

app.get('/user', (req, res) => {
  console.log(req.user);
  console.log(req.session)
  req.isAuthenticated() ?
    res.json(req.user)
    :
    res.json({ success: false });
});

app.route('/api/v1/user/signup')
  .post(
    async (req, res) => {
      const { userName: receivedUserName, email: receivedEmail } = req.body;

      /*  1. проверим входные параметры на корректность  */

      if (typeof receivedUserName !== 'string' || !receivedUserName.trim() || !checkEmailAddress(receivedEmail)) {
        return res.json(authResult('INVALID_DATA', 'Invalid data.'));
      }

      const userName = receivedUserName.trim();
      const email = receivedEmail.trim().toLowerCase();

      /* 2. Очистим БД от устаревших записей */

      await purgeExpiredUsers();

      /* 3. проверим на дубликат имени пользователя */
      const un = userName.toLowerCase();
      if (await userDB.findOne(u => u.userName.toLowerCase() === un)) {
        return res.json(authResult('DUPLICATE_USER_NAME', `User name ${userName} already exists.`));
      };

      /* 4. проверим на дубликат email */
      if (await userDB.findOne(u => u.email === email)) {
        return res.json(authResult('DUPLICATE_EMAIL', `User with email ${email} already exists.`));
      };

      /* 5. создадим предварительную учетную запись */
      const provisionalPassword = genRandomPassword();

      const expireOn = Date.now() + 24 * 60 * 60 * 1000;
      const provisionalUser: IUser = {
        userName,
        email,
        ...genPassword(provisionalPassword),
        expireOn
      };

      /* 6. Пошлем пользователю email */

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: '"GDMN System" <test@gsbelarus.com>',
          to: email,
          subject: "Account confirmation",
          text:
            `Please use following credentials to sign-in into your account at ...\
            \n\n\
            User name: ${userName}\n\
            Password: ${provisionalPassword}
            \n\n\
            This temporary record will expire on ${new Date(expireOn).toLocaleDateString()}`
        });
      } catch (err) {
        return res.json(authResult('ERROR', err.message));
      }

      /* 7. Запишем информацию о пользователе в БД */

      //TODO: форсированно пишем на диск, пока не разберемся почему не отлавливает Ctrl-C в некоторых терминалах
      await userDB.write(userName2Key(userName), provisionalUser, true);

      /* 8. Информируем пользователя о создании учетной записи */

      return res.json(authResult(
        'SUCCESS_USER_CREATED',
        `Password was sent to ${email}. Please, sign in until ${new Date(expireOn).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })} to confirm.`
      ));
    }
  );



app.route('/api/v1/user/signin')
  .post(
    async (req, res, next) => {
      const { userName, password, employeeMode } = req.body;

      /*
        если это сотрудник, то проверять мы должны в базе гедымина
        если нет, то проверяем в нашем JSON

        если сотрудник предприятия, то надо ли его записывать в JSON?
        тогда вознинект вопрос синхронизации.

        если в JSON не записываем, то тогда везде надо проверять и
        на JSON и из базы.
      */

      if (employeeMode) {
        const tm = checkGedeminUser(userName, password);
        if((await tm).result !== 'SUCCESS'){
          return res.json(authResult((await tm).result, 'WRONG'  ))
        }
        next();
      } else {
        /*  1. проверим входные параметры на корректность  */
        if (typeof userName !== 'string' || typeof password !== 'string') {
          return res.json(authResult('INVALID_DATA', 'Invalid data.'));
        }

        /* 2. Очистим БД от устаревших записей */

        await purgeExpiredUsers();
        /* 3. ищем пользователя */
        const un = userName.toLowerCase();
        const user = await userDB.findOne(u => u.userName.toLowerCase() === un);

        if (!user) {
          return res.json(authResult('UNKNOWN_USER', `User name ${userName} not found.`));
        };

        /*4. Проверка пароля */
        if (!validPassword(password, user.hash, user.salt)) {
          return res.json(authResult('INVALID_PASSWORD', `Wrong password`)); // Убрать после обработки пасспорта P.S. Костыль
        }
        next();
      }
    },
    passport.authenticate('local', {}),
    async (req, res) => {
      const { userName } = req.body;

      return res.json(authResult(
        'SUCCESS',
        `You are logged in as ${userName}.`
      ));
    },
  );


app.route('/api/v1/user/forgot-password')
  .post(
    async (req, res) => {
      const { email } = req.body;
      /*  1. проверим входные параметры на корректность  */

      if (typeof email !== 'string') {
        return res.json(authResult('INVALID_DATA', 'Invalid data.'));
      }

      /* 2. Очистим БД от устаревших записей */

      await purgeExpiredUsers();

      /* 3. ищем пользователя */
      const em = email.toLowerCase();
      const user = await userDB.findOne(u => u.email.toLowerCase() === em);

      if (!user) {
        return res.json(authResult('UNKNOWN_USER', `User email ${email} not found.`));
      };

      /* 4. Поменяем данные профиля */
      const provisionalPassword = genRandomPassword();
      const expireOn = Date.now() + 24 * 60 * 60 * 1000;

      const { salt, hash } = genPassword(provisionalPassword);

      user.salt = salt;
      user.hash = hash;
      user.expireOn = expireOn;
      await userDB.write(user.userName, user, true);

      /* 5. Пошлем пользователю email */

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: '"GDMN System" <test@gsbelarus.com>',
          to: email,
          subject: "Password change complete",
          text:
            `Please use following credentials to sign-in into your account at ...\
            \n\n\
            User name: ${user.userName}\n\
            Password: ${provisionalPassword}
            \n\n\
            This temporary record will expire on ${new Date(expireOn).toLocaleDateString()}`
        });
      } catch (err) {
        return res.json(authResult('ERROR', err.message));
      }
      /* 6. Сообщим о письме на почте с информацией */
      return res.json(authResult(
        'SUCCESS_PASSWORD_CHANGED',
        `Password was sent to ${email}. Please, sign in until ${new Date(expireOn).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })} to confirm.`
      ));
    });

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

    const newUser: IUser = {
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

app.get('/logout', (req, res) => {
  res.clearCookie('Sid', { path: '/' }).send();
});

app.get('/login-success', (_, res) => {
  res.send('<p>You successfully logged in. --> <a href="/protected-route">Go to protected route</a></p>');
});

app.get('/login-failure', (_, res) => {
  res.send('You entered the wrong password.');
});

app.get('/reconciliation-statement', getReconciliationStatement);

app.get('*', () => console.log('Unknown request'));

const port = process.env.GDMN_NXT_SERVER_PORT || 3333;

const server = app.listen(port, () => console.log(`Listening at http://localhost:${port}`));

server.on('error', console.error);

/*
if (process.platform === "win32") {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => process.exit() );
}
*/

process
  .on('exit', code => {
    userDB.done();
    console.log(`Process exit event with code: ${code}`);
  })
  .on('SIGINT', process.exit)
  .on('SIGBREAK', process.exit)
  .on('SIGTERM', process.exit)
  .on('unhandledRejection', (reason, p) => console.error({ err: reason }, p))
  .on('uncaughtException', err => console.error(err));

/**
 * -------------- HELPER FUNCTIONS ----------------
 */

/**
 *
 * @param {*} password - The plain text password
 * @param {*} hash - The hash stored in the database
 * @param {*} salt - The salt stored in the database
 *
 * This function uses the crypto library to decrypt the hash using the salt and then compares
 * the decrypted hash/salt with the password that the user provided at login
 */
function validPassword(password: string, hash: string, salt: string) {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
};

function genPassword(password: string) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
};
