import { ColorMode, GedeminUser, IAccount, IAuthResult, IWithID } from '@gsbelarus/util-api-types';
import { getReadTransaction, releaseReadTransaction } from './utils/db-connection';

export const checkGedeminUser = async (userName: string, password: string): Promise<IAuthResult> => {
  const query = `
    SELECT
      u.ID,
      u.passw,
      u.ingroup,
      u.disabled as userDisabled,
      c.name as contactName,
      c.disabled as contactDisabled,
      p.firstname,
      p.surname
    FROM
      gd_user u
      JOIN gd_contact c ON c.id = u.contactkey
      JOIN gd_people p ON p.contactkey = c.id
    WHERE UPPER(u.name) = ?
  `;

  const { attachment, transaction } = await getReadTransaction('passport');
  try {
    const rs = await attachment.executeQuery(transaction, query, [userName.toLocaleUpperCase()]);
    try {
      const data = await rs.fetchAsObject();

      if (data.length === 1) {
        if (data[0]['PASSW'] !== password) {
          return {
            result: 'INVALID_PASSWORD'
          };
        }

        if (data[0]['USERDISABLED'] || data[0]['CONTACTDISABLED']) {
          return {
            result: 'ACCESS_DENIED'
          };
        }

        return {
          result: 'SUCCESS',
          userProfile: {
            id: data[0]['ID'],
            userName,
            firstname: data[0]['FIRSTNAME'],
            surname: data[0]['SURNAME'],
            colorMode: data[0]['COLORMODE'],
            dealsFilter: data[0]['DEALSFILTER']
          }
        };
      } else if (!data.length) {
        return {
          result: 'UNKNOWN_USER'
        };
      } else {
        throw new Error('Data corrupted.');
      }
    } finally {
      await rs.close();
    }
  } finally {
    await releaseReadTransaction('passport');
  }
};

export const getGedeminUser = async (userName: string): Promise<GedeminUser | undefined> => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.contactkey,
      p.RANK,
      ps.USR$MODE as COLORMODE,
      ps.USR$DEALS_FILTER as DEALSFILTER
    FROM
      gd_user u
      JOIN gd_contact c ON c.id = u.contactkey
      JOIN gd_people p ON p.contactkey = c.id
      LEFT JOIN USR$CRM_PROFILE_SETTINGS ps ON ps.USR$USERKEY = u.ID
    WHERE UPPER(u.name) = ?
  `;

  const { attachment, transaction } = await getReadTransaction('passport');
  try {
    const rs = await attachment.executeQuery(transaction, query, [userName.toLocaleUpperCase()]);
    try {
      const data = await rs.fetchAsObject();

      if (data.length === 1) {
        return {
          id: data[0]['ID'],
          userName,
          contactkey: data[0]['CONTACTKEY'],
          rank: data[0]['RANK'],
          colorMode: data[0]['COLORMODE'],
          dealsFilter: data[0]['DEALSFILTER']
        };
      } else if (!data.length) {
        return undefined;
      } else {
        throw new Error('Data corrupted.');
      }
    } finally {
      await rs.close();
    }
  } finally {
    await releaseReadTransaction('passport');
  }
};

export const getAccount = async (sessionId: string, email: string): Promise<(IAccount & IWithID) | undefined> => {
  console.log('getAccount...');

  const query = `
    SELECT
      acc.*
    FROM
      usr$crm_account acc
    WHERE UPPER(acc.usr$email) = ?
  `;
  const { attachment, transaction } = await getReadTransaction(sessionId);

  try {
    const rs = await attachment.executeQuery(transaction, query, [email.toLocaleUpperCase()]);
    try {
      const data = await rs.fetchAsObject<IAccount & IWithID>();

      if (data.length === 1) {
        return data[0];
      } else if (!data.length) {
        return undefined;
      } else {
        throw new Error('More than one account with the same email.');
      }
    } finally {
      await rs.close();
    }
  } finally {
    await releaseReadTransaction(sessionId);
  }
};
