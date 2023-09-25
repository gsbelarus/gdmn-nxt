import { ColorMode, Permissions, authResult } from '@gsbelarus/util-api-types';
import express from 'express';
import passport from 'passport';
import { profileSettingsController } from '../controllers/profileSettings';
import { generateSecret, verifyCode } from '@gdmn/2FA';
import { nodeCache } from '../utils/cache';
import jwt from 'jsonwebtoken';
import { config } from '@gdmn-nxt/config';
import { resultError } from '../responseMessages';
import { jwtMiddleware } from '../middlewares/jwt';
import { ERROR_MESSAGES } from '../constants/messages';

/** In zeit/ms format */
const jwtExpirationTime = '6h';

export const router = express.Router();

router.post('/user/signin', async function(req, res, next) {
  passport.authenticate('local', async function(err, user, info) {
    if (err) {
      return next(err);
    }

    const { userName, email } = req.body;

    if (user) {
      const result = await profileSettingsController.getSettings(user.id, req);
      const { REQUIRED_2FA, ENABLED_2FA, EMAIL, SECRETKEY } = result.settings;


      /** If the user have to enter a 2FA code */
      if (ENABLED_2FA) {
        req.session.base32Secret = SECRETKEY;
        req.session.userId = user.id;
        req.session.email = EMAIL;
        req.session.userName = user.userName;

        return res.json(authResult(
          'ENABLED_2FA',
          'Требуется подтвердить код 2FA.'
        ));
      }

      /** If the user have to enable 2FA */
      if (REQUIRED_2FA) {
        /** Если в базе нет email, и нам прислали новый, на который надо зарегистрировать */
        if (EMAIL || email) {
          const { qr, base32Secret } = await generateSecret(email || EMAIL);

          await profileSettingsController.upsertSecretKey(req, { secretKey: base32Secret, email: email || EMAIL, userId: user.id });

          req.session.base32Secret = base32Secret;
          req.session.userId = user.id;
          req.session.email = email || EMAIL;
          req.session.userName = user.userName;


          return res.json(authResult(
            'REQUIRED_2FA',
            ERROR_MESSAGES.AUTH_FAILED_TFA_REQUIRED,
            { userName, email: email || EMAIL, ...((email || EMAIL) && { qr, base32Secret }) }
          ));
        }

        return res.json(authResult(
          'REQUIRED_2FA',
          ERROR_MESSAGES.AUTH_FAILED_TFA_REQUIRED,
          { userName, email: EMAIL }
        ));
      }

      /** If the user doesn't have to use 2FA */
      return req.login(user, loginErr => {
        if (loginErr) {
          return next(loginErr);
        }

        const prevSession = req.session;
        req.session.regenerate((err) => {
          Object.assign(req.session, prevSession);
          req.session.base32Secret = '';
          req.session.token = jwt.sign({ EMAIL }, config.jwtSecret, { expiresIn: jwtExpirationTime });

          return res.json(authResult(
            'SUCCESS',
            `Вы вошли как ${userName}.`
          ));
        });
      });
    }

    res.json(authResult(
      'ERROR',
      info?.message ?? ''
    ));
  })(req, res, next);
});

router.post('/user/signin-2fa', async function(req, res, next) {
  passport.authenticate('local', async function(err, user, info) {
    if (err) {
      return next(err);
    }

    const { code } = req.body;
    const { base32Secret, userId, email, userName } = req.session;

    const checkCode = await verifyCode(email, code, base32Secret);
    if (checkCode) {
      await profileSettingsController.upsertSecretKey(req, { userId, enabled2fa: true });
      const userPermissions: Permissions = nodeCache.get('permissions')?.[userId];
      const newUser = {
        userName,
        gedeminUser: true,
        id: userId,
        permissions: userPermissions
      };

      return req.login(newUser, loginErr => {
        if (loginErr) {
          return next(loginErr);
        }

        req.session.qr = '';
        req.session.email = '';
        req.session.base32Secret = '';
        req.session.token = jwt.sign({ email }, config.jwtSecret, { expiresIn: jwtExpirationTime });

        return res.json(authResult(
          'SUCCESS',
          `Вы вошли как ${userName}.`
        ));
      });
    }
    res.json(authResult(
      'ERROR',
      ERROR_MESSAGES.TFA_CODE_INVALID
    ));
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) console.error(err);
    });
  }
  res.sendStatus(200);
});

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.cookie('userId', req.user?.['id']);
    res.cookie('color-mode', req.user?.['colorMode'] || ColorMode.Light);
    return res.json({
      result: true,
      user: req.user,
    }
    );
  } else {
    return res.json({
      result: false,
      user: null,
    });
  }
});

router.post('/user/forgot-password', async (req, res) => {
  const { email } = req.body;
  /*  1. проверим входные параметры на корректность  */

  if (typeof email !== 'string') {
    return res.json(authResult('INVALID_DATA', 'Invalid data.'));
  }

  return res.sendStatus(500);
});

router.post('/user/otp/generate', jwtMiddleware, async function(req, res, next) {
  const { userId, email } = req.body;

  try {
    const { qr, base32Secret } = await generateSecret(email);

    await profileSettingsController.upsertSecretKey(req, { userId, secretKey: base32Secret, email: email });

    return res.status(200).send({ qr, base32: base32Secret });
  } catch (error) {
    console.error(error);
    return res.status(500).send(resultError(error));
  }
});

router.post('/user/otp/verify', jwtMiddleware, async function(req, res, next) {
  const { userId, code } = req.body;

  try {
    const result = await profileSettingsController.getSettings(userId, req);
    const { SECRETKEY, EMAIL } = result.settings;

    const checkCode = await verifyCode(EMAIL, code, SECRETKEY);

    if (checkCode) {
      await profileSettingsController.upsertSecretKey(req, { userId, enabled2fa: true });

      return res.json(authResult(
        'SUCCESS',
        '2FA успешно подключена'
      ));
    }
    return res.json(authResult(
      'ERROR',
      ERROR_MESSAGES.TFA_CODE_INVALID
    ));
  } catch (error) {
    res.status(500).json(authResult(
      'ERROR',
      error
    ));
  }
});

router.post('/user/otp/disable', jwtMiddleware, async function(req, res, next) {
  const { userId, code } = req.body;

  try {
    const result = await profileSettingsController.getSettings(userId, req);
    const { SECRETKEY, EMAIL } = result.settings;

    const checkCode = await verifyCode(EMAIL, code, SECRETKEY);

    if (checkCode) {
      await profileSettingsController.upsertSecretKey(req, { userId, enabled2fa: false });

      return res.json(authResult(
        'SUCCESS',
        '2FA успешно отключена'
      ));
    }
    return res.json(authResult(
      'ERROR',
      ERROR_MESSAGES.TFA_CODE_INVALID
    ));
  } catch (error) {
    res.status(500).json(authResult(
      'ERROR',
      error
    ));
  }
});

export const authRouter = router;
