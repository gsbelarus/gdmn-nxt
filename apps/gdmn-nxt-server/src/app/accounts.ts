import { IAccount, IAccountWithID, IDataSchema, IRequestResult, IWithID } from "@gsbelarus/util-api-types";
import { genPassword } from "@gsbelarus/util-helpers";
import { genRandomPassword } from "@gsbelarus/util-useful";
import { RequestHandler } from "express";
import { getReadTransaction, startTransaction } from "./utils/db-connection";
import { sendEmail } from "./mail";

export const upsertAccount: RequestHandler = async (req, res) => {
  const { transaction, releaseTransaction, executeQuery, executeSingleton } = await startTransaction(req.sessionID);
  try {
    let ID: number;
    let insert: boolean;  // we know that this is an insert of a new account by the absence of the ID field

    if (parseInt(req.params['ID']) > 0) {
      ID = parseInt(req.params['ID']);
      insert = false;
    } else {
      const rs = await executeQuery('SELECT id FROM gd_p_getnextid');
      try {
        ID = (await rs.fetchAsObject<IWithID>())[0].ID;
        insert = true;
      } finally {
        await rs.close();
      }
    }

    let newCredentials;
    let approvalSet = Boolean(req.body['USR$APPROVED']);

    if (insert) {
      newCredentials = approvalSet;
    } else {
      const rs = await executeQuery('SELECT usr$approved FROM usr$crm_account WHERE id = :ID', { ID });
      try {
        const res = await rs.fetchAsObject<Pick<IAccount, 'USR$APPROVED'>>();
        const approvalWas = !!res[0]?.USR$APPROVED;
        newCredentials = approvalSet && !approvalWas;
      } finally {
        await rs.close();
      }
    }

    const provisionalPassword = newCredentials ? genRandomPassword() : null;
    const { salt, hash } = newCredentials ? genPassword(provisionalPassword) : { salt: null, hash: null };

    const allFields = ['ID', 'USR$FIRSTNAME', 'USR$LASTNAME', 'USR$POSITION', 'USR$PHONE', 'USR$EMAIL', 'USR$COMPANYKEY', 'USR$APPROVED', 'USR$EXPIREON', 'USR$SALT', 'USR$HASH'];
    const allFieldsNames = allFields.join(',');
    const actualFields = allFields.filter( f => typeof req.body[f] !== 'undefined' );

    if (!actualFields.includes('ID')) {
      actualFields.push('ID');
    }

    if (newCredentials) {
      if (!actualFields.includes('USR$HASH')) {
        actualFields.push('USR$HASH');
      }

      if (!actualFields.includes('USR$SALT')) {
        actualFields.push('USR$SALT');
      }
    }

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map( _ => '?' ).join(',');
    const params = actualFields.map( f => {
      switch (f){
        case 'ID':
          return ID;

        case 'USR$SALT':
          return salt;

        case 'USR$HASH':
          return hash;

        case 'USR$EMAIL':
          return req.body['USR$EMAIL'].trim().toLowerCase();

        case 'USR$EXPIREON':
          return req.body['USR$EXPIREON'] ? new Date(req.body['USR$EXPIREON']) : null;

        case 'USR$APPROVED': {
          const USR$APPROVED = req.body['USR$APPROVED'];
          if (typeof USR$APPROVED === 'boolean') {
            return USR$APPROVED ? 1 : 0;
          } else if (typeof USR$APPROVED === 'undefined') {
            return null;
          }
        }
      }

      return req.body[f];
    });

    const sql = `UPDATE OR INSERT INTO usr$crm_account (${actualFieldsNames}) VALUES (${paramsString}) MATCHING (ID) RETURNING ${allFieldsNames}`;

    const row = await executeSingleton(sql, params);
    await transaction.commit();

    const result: IRequestResult<{ accounts: IAccountWithID[] }> = {
      queries: {
        accounts: [Object.fromEntries( allFields.map( (f, idx) => ([f, row[idx]]) ) ) as IAccountWithID]
      },
      _schema: undefined
    };

    res.json(result);

    const email = result.queries.accounts[0]?.USR$EMAIL;

    if (email) {
      try {
        if (newCredentials) {
          await sendEmail(
            'CRM система БелГИСС <test@gsbelarus.com>',
            email,
            'Учетная запись и пароль для входа в систему',
            `Используйте следующую учетную запись и пароль для входа на портал БелГИСС:\
            \n\n\
            Пользователь: ${email}\n\
            Пароль: ${provisionalPassword}`
          );
        } else if (insert) {
          await sendEmail(
            'CRM система БелГИСС <test@gsbelarus.com>',
            email,
            'Подтверждение учетной записи',
            `Уважаемый пользователь!

            В ближайшее время мы рассмотрим вашу заявку на регистрацию в системе.

            После подтверждения вы получите на этот адрес электронной почты
            письмо с именем учетной записи и паролем.`
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
  finally {
    await releaseTransaction();
  }
};

export const getAccounts: RequestHandler = async (req, res) => {
  const { releaseReadTransaction, executeQuery } = await getReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      accounts: {
        USR$EXPIREON: {
          type: 'timestamp'
        },
        USR$APPROVED: {
          type: 'boolean'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await executeQuery(query, params);
      try {
        const data = await rs.fetchAsObject();
        const sch = _schema[name];

        if (sch) {
          for (const rec of data) {
            for (const fld of Object.keys(rec)) {
              if (sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') {
                rec[fld] = (rec[fld] as Date).getTime();
              }
            }
          }
        }

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: 'accounts',
        query: `
          SELECT
            Z.ID,
            Z.EDITIONDATE,
            Z.USR$EXPIREON,
            Z.USR$APPROVED,
            Z.USR$COMPANYKEY,
            C.NAME AS COMPANYNAME,
            Z.USR$POSITION,
            Z.USR$LASTNAME,
            Z.USR$FIRSTNAME,
            Z.USR$PHONE,
            Z.USR$EMAIL

          FROM
            USR$CRM_ACCOUNT Z
              LEFT JOIN
                GD_COMPANY Z_USR$COMPANYKEY
              ON
                Z_USR$COMPANYKEY.CONTACTKEY  =  Z.USR$COMPANYKEY
              LEFT JOIN
                GD_CONTACT C
              ON
                Z_USR$COMPANYKEY.CONTACTKEY  =  C.ID
            ${req.params.id ? 'WHERE Z.ID = ?' : req.params.email ? 'WHERE Z.USR$EMAIL = ?' : ''}`,
        params: req.params.id ? [req.params.id] : req.params.email ? [req.params.email] : undefined
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map( q => execQuery(q) )))
      },
      _params: req.params.email ? [{ email: req.params.email }] : undefined,
      _schema
    };

    return res.json(result);
  } finally {
    await releaseReadTransaction();
  }
};
