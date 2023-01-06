import { INotification } from '@gdmn-nxt/socket';
import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { resultError } from 'apps/gdmn-nxt-server/src/app/responseMessages';
import { acquireReadTransaction } from 'apps/gdmn-nxt-server/src/app/utils/db-connection';
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
          ID, EDITIONDATE, USR$USERKEY, USR$TITLE, USR$MESSAGE
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
        userId: n.USR$USERKEY
      };

      if (notifictions[n.USR$USERKEY]) {
        notifictions[n.USR$USERKEY].push(newNotification);
      } else {
        notifictions[n.USR$USERKEY] = [newNotification];
      };
    });

    // const result: IRequestResult = {
    //   queries: {
    //     ...Object.fromEntries(await Promise.all(queries.map(execQuery)))
    //   },
    //   _params: id ? [{ id: id }] : undefined,
    //   _schema
    // };

    // return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    releaseReadTransaction();
  }

  return res.status(200).json(`result ${userId}`);
};


// export const getNotifications = async (sessionId: string) => {
//   // const { attachment, transaction } = await getReadTransaction(sessionId);
//   const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(sessionId);

//   try {
//     const schema: IDataSchema = {
//       notifications: {
//         EDITIONDATE: {
//           type: 'date'
//         }
//       }
//     };

//     const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
//       // const rs = await attachment.executeQuery(transaction, query, params);
//       try {
//         // const data = await rs.fetchAsObject();
//         const data = await fetchAsObject(query);
//         const sch = schema[name];

//         if (sch) {
//           for (const rec of data) {
//             for (const fld of Object.keys(rec)) {
//               if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
//                 rec[fld] = (rec[fld] as Date).getTime();
//               }
//             }
//           }
//         };

//         return data;
//       } finally {
//         // await rs.close();
//       }
//     };

//     const query = {
//       name: 'notifications',
//       query: `
//         SELECT
//           ID, EDITIONDATE, USR$USERKEY, USR$TITLE, USR$MESSAGE
//         FROM USR$CRM_NOTIFICATIONS
//         WHERE USR$DELAYED = 0
//         ORDER BY USR$USERKEY, EDITIONDATE DESC`
//     };

//     const rawNotifications = await Promise.resolve(execQuery(query));

//     const notifictions: IMapOfNotifications = {};

//     rawNotifications.forEach((n: any) => {
//       const newNotification: INotification = {
//         id: n.ID,
//         date: n.EDITIONDATE,
//         title: n.USR$TITLE,
//         message: n.USR$MESSAGE,
//         userId: n.USR$USERKEY
//       };

//       if (notifictions[n.USR$USERKEY]) {
//         notifictions[n.USR$USERKEY].push(newNotification);
//       } else {
//         notifictions[n.USR$USERKEY] = [newNotification];
//       };
//     });

//     return notifictions;
//   } catch (error) {
//     console.error(resultError(error.message));
//   } finally {
//     releaseReadTransaction();
//   };
// };