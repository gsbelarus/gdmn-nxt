import { RequestHandler } from 'express';
import { acquireReadTransaction } from '@gdmn-nxt/db-connection';
import { IDataSchema } from '@gsbelarus/util-api-types';
import { resultError } from '../../../responseMessages';

interface IUser {
  ID: number;
  NAME: string;
  EMAIL: string
}

/**
Get users list for notifications mailing
*/
export const getEmailUsers = async (sessionId: string): Promise<IUser[]> => {
  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(sessionId);

  try {
    const query = `
      SELECT
        u.ID, c.NAME, c.EMAIL
      FROM GD_CONTACT c
      JOIN GD_USER u ON u.CONTACTKEY = c.ID
      JOIN USR$CRM_PROFILE_SETTINGS p ON p.USR$USERKEY = u.ID
      WHERE
        COALESCE(p.USR$SEND_EMAIL_NOTIFICATIONS, 0) = 1
        AND COALESCE(c.EMAIL, '') != ''`;

    const users = fetchAsObject(query) as Promise<IUser[]>;

    return users;
  } catch (error) {
    console.error(resultError(error.message));
  } finally {
    releaseReadTransaction();
  }
};
