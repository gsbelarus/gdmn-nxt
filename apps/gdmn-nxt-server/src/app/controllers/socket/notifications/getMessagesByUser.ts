import { acquireReadTransaction } from '@gdmn-nxt/db-connection';
import { INotification } from '@gdmn-nxt/socket';
import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { resultError } from 'apps/gdmn-nxt-server/src/app/responseMessages';
import { RequestHandler } from 'express';

interface IMapOfNotifications {
  [key: string]: INotification[];
};

export const getMessagesByUser: RequestHandler = async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    return res.status(422).send(resultError('Поле "userId" не указано или неверного типа'));
  };

  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);

  try {
    const schema: IDataSchema = {
      notifications: {
        EDITIONDATE: {
          type: 'date'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      // const rs = await attachment.executeQuery(transaction, query, params);
      try {
        // const data = await rs.fetchAsObject();
        const data = await fetchAsObject(query);
        const sch = schema[name];

        if (sch) {
          for (const rec of data) {
            for (const fld of Object.keys(rec)) {
              if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
                rec[fld] = (rec[fld] as Date).getTime();
              }
            }
          }
        };

        return data;
      } finally {
        // await rs.close();
      }
    };

    const query = {
      name: 'notifications',
      query: `
        SELECT
          ID, EDITIONDATE, USR$USERKEY, USR$TITLE, USR$MESSAGE, USR$ACTIONTYPE, USR$ACTIONCONTENT
        FROM USR$CRM_NOTIFICATIONS
        WHERE USR$DELAYED = 0 AND USR$USERKEY = ${userId}
        ORDER BY USR$USERKEY, EDITIONDATE DESC`
    };

    const rawNotifications = await Promise.resolve(execQuery(query));

    const notifictions: IMapOfNotifications = {};

    rawNotifications.forEach((n: any) => {
      const newNotification: INotification = {
        id: n.ID,
        date: n.EDITIONDATE,
        title: n.USR$TITLE,
        message: n.USR$MESSAGE,
        userId: n.USR$USERKEY,
        ...(n.USR$ACTIONTYPE ? { action: n.USR$ACTIONTYPE } : {}),
        ...(n.USR$ACTIONCONTENT ? { actionContent: n.USR$ACTIONCONTENT } : {}),
      };

      if (notifictions[n.USR$USERKEY]) {
        notifictions[n.USR$USERKEY].push(newNotification);
      } else {
        notifictions[n.USR$USERKEY] = [newNotification];
      };
    });

  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }

  return res.status(200).json(`result ${userId}`);
};
