import { IProfileSettings, IRequestResult } from '@gsbelarus/util-api-types';
import { parseIntDef } from '@gsbelarus/util-useful';
import { Request, RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { acquireReadTransaction, getReadTransaction, startTransaction, releaseReadTransaction as releaseRT } from '@gdmn-nxt/db-connection';
import { bin2String, string2Bin } from '@gsbelarus/util-helpers';

const getSettings = async (userId: number, req: Request) => {
  const { releaseReadTransaction, fetchAsObject, executeSingletonAsObject } = await acquireReadTransaction(req.sessionID);
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const check2FA = await executeSingletonAsObject(`
      SELECT ug.USR$REQUIRED_2FA GROUP_2FA, ug.USR$REQUIRED_2FA USER_2FA
      FROM USR$CRM_PERMISSIONS_USERGROUPS ug
      JOIN USR$CRM_PERMISSIONS_UG_LINES ul ON ul.USR$GROUPKEY = ug.ID
      WHERE ul.USR$USERKEY = :userId`, { userId });

    const required2fa = !!check2FA?.USER_2FA || !!check2FA?.GROUP_2FA;

    const sqlResult = await fetchAsObject(`
      SELECT
        p.RANK, ps.USR$AVATAR as AVATAR_BLOB, ps.USR$MODE as ColorMode, ps.USR$LASTVERSION as LASTVERSION,
        ps.USR$SEND_EMAIL_NOTIFICATIONS as SEND_EMAIL_NOTIFICATIONS, c.EMAIL,
        ps.USR$2FA_ENABLED AS ENABLED_2FA, ps.USR$SECRETKEY AS SECRETKEY
      FROM GD_USER u
      JOIN GD_PEOPLE p ON p.CONTACTKEY = u.CONTACTKEY
      JOIN GD_CONTACT c ON c.ID = u.CONTACTKEY
      LEFT JOIN USR$CRM_PROFILE_SETTINGS ps ON ps.USR$USERKEY = u.ID
      WHERE u.ID = :userId`, { userId });

    for (const r of sqlResult) {
      if (r['AVATAR_BLOB'] !== null && typeof r['AVATAR_BLOB'] === 'object') {
        // eslint-disable-next-line dot-notation
        const readStream = await attachment.openBlob(transaction, r['AVATAR_BLOB']);
        const blobLength = await readStream?.length;
        const resultBuffer = Buffer.alloc(blobLength);

        let size = 0;
        let n: number;
        while (size < blobLength && (n = await readStream.read(resultBuffer.subarray(size))) > 0) size += n;

        await readStream.close();

        const blob2String = resultBuffer.toString();
        // eslint-disable-next-line dot-notation
        r['AVATAR'] = bin2String(blob2String.split(','));
      };
      r['SEND_EMAIL_NOTIFICATIONS'] = (r['SEND_EMAIL_NOTIFICATIONS'] ?? 0) === 1;
      r['ENABLED_2FA'] = r['ENABLED_2FA'] === 1;
      r['REQUIRED_2FA'] = required2fa;

      delete r['AVATAR_BLOB'];
    };

    const result = sqlResult[0] as IProfileSettings;

    return {
      OK: true,
      settings: {
        ...result
      }
    };
  } catch (error) {
    return {
      OK: false,
      error
    };
  } finally {
    /** Так как используем две транзакции */
    await releaseRT(req.sessionID);
    await releaseReadTransaction();
  }
};

const get: RequestHandler = async (req, res) => {
  const userId = parseIntDef(req.params.userId, -1);
  const data = await getSettings(userId, req);

  if (!data.OK) return res.status(500).send(resultError(data.error));

  const result: IRequestResult<{settings: IProfileSettings}> = {
    queries: { settings: data.settings },
    _params: [{ userId }],
    _schema: {}
  };

  return res.status(200).json(result);
};

const set: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction, fetchAsObject, fetchAsSingletonObject } = await startTransaction(req.sessionID);

  const userId = parseIntDef(req.params.userId, -1);

  const {
    AVATAR: avatar,
    COLORMODE: colorMode,
    LASTVERSION: lastVersion,
    SEND_EMAIL_NOTIFICATIONS,
    EMAIL
  } = req.body;

  try {
    const charArrayString = avatar !== null ? string2Bin(avatar).toString() : null;
    const blobBuffer = Buffer.alloc(charArrayString !== null ? charArrayString?.length : 0, charArrayString);
    const blob = await attachment.createBlob(transaction);
    await blob.write(blobBuffer);
    await blob.close();

    const updateEmail = await fetchAsObject(`
      UPDATE GD_CONTACT c
      SET EMAIL = :EMAIL
      WHERE EXISTS(SELECT ID FROM GD_USER u WHERE u.CONTACTKEY = c.ID AND u.ID = :userId)
      RETURNING EMAIL`,
    { userId, EMAIL });

    const sqlResult = await fetchAsSingletonObject(`
      UPDATE OR INSERT INTO USR$CRM_PROFILE_SETTINGS(USR$USERKEY, USR$AVATAR, USR$MODE, USR$LASTVERSION, USR$SEND_EMAIL_NOTIFICATIONS)
      VALUES(:userId, :avatar, :colorMode, :lastVersion, :SEND_EMAIL_NOTIFICATIONS)
      MATCHING(USR$USERKEY)
      RETURNING ID`,
    { userId, avatar: blob, colorMode, lastVersion, SEND_EMAIL_NOTIFICATIONS: Number(SEND_EMAIL_NOTIFICATIONS) });

    const result: IRequestResult = {
      queries: { settings: sqlResult },
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  }
};


const upsertSecretKey = async (req: Request, body: { userId: number, secretKey?: string, email?: string, enabled2fa?: boolean }) => {
  const { releaseTransaction, executeSingletonAsObject } = await startTransaction(req.sessionID);

  try {
    const { secretKey, userId, email, enabled2fa } = body;

    await executeSingletonAsObject(`
      UPDATE OR INSERT INTO USR$CRM_PROFILE_SETTINGS(USR$USERKEY
        ${typeof secretKey !== 'undefined' ? ', USR$SECRETKEY' : ''}
        ${typeof enabled2fa === 'boolean' ? ', USR$2FA_ENABLED' : ''})
      VALUES(:userId
        ${typeof secretKey !== 'undefined' ? ', :secretKey ' : ''}
        ${typeof enabled2fa === 'boolean' ? ', :enabled2fa' : ''})
      MATCHING(USR$USERKEY)`,
    { userId, secretKey, enabled2fa });

    (typeof email !== 'undefined') && await executeSingletonAsObject(`
      UPDATE GD_CONTACT C
      SET EMAIL = :email
      WHERE EXISTS(SELECT u.ID FROM GD_USER u WHERE u.CONTACTKEY = c.ID AND u.ID = :userId )`,
    { userId, email });

    return true;
  } catch (error) {
    console.error('upsertSecretKey', error);
    return false;
  } finally {
    releaseTransaction();
  }
};

export const profileSettingsController = { get, set, getSettings, upsertSecretKey };
