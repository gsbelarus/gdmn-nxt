import { IDataSchema, IEntities, IKanbanCard, IKanbanColumn, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { importModels } from '../er/er-utils';
import { resultError } from '../responseMessages';
import { acquireReadTransaction, commitTransaction, getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '../utils/db-connection';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const execQuery = async ({ name, query }) => {
    const rs = await attachment.executeQuery(transaction, query);

    try {
      const data = await rs.fetchAsObject();
      const sch = _schema[name];

      if (sch) {
        for (const rec of data) {
          for (const fld of Object.keys(rec)) {
            if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
              rec[fld] = (rec[fld] as Date).getTime();
            }
            if ((sch[fld]?.type === 'boolean') && rec[fld] !== null) {
              rec[fld] = +rec[fld] === 1;
            }
          }
        }
      };
      return data as any;
    } finally {
      await rs.close();
    }
  };

  const { deadline } = req.query;

  const userId = parseInt(req.query.userId as string);

  const checkFullView = `
    EXISTS(
      SELECT ul.ID
      FROM USR$CRM_PERMISSIONS_UG_LINES ul
        JOIN USR$CRM_PERMISSIONS_CROSS cr ON ul.USR$GROUPKEY = cr.USR$GROUPKEY
        JOIN GD_RUID r ON r.ID = cr.USR$ACTIONKEY
      WHERE
        /* Если есть право на действие Видёть все */
        r.XID = 370486335 AND r.DBID = 1811180906
        AND cr.USR$MODE = 1
        AND ul.USR$USERKEY = ${userId})`;


  const checkCardsVisibility = `
    AND 1 = IIF(NOT ${checkFullView},
      IIF(EXISTS(
        SELECT DISTINCT
          con.NAME,
          ud.USR$DEPOTKEY
        FROM GD_USER u
          JOIN GD_CONTACT con ON con.ID = u.CONTACTKEY
          LEFT JOIN USR$CRM_USERSDEPOT ud ON ud.USR$USERKEY = u.ID
          JOIN USR$CRM_PERMISSIONS_UG_LINES ul ON ul.USR$USERKEY = u.ID
          LEFT JOIN GD_P_GETRUID(ul.USR$GROUPKEY) r ON 1 = 1
        WHERE
          u.ID = ${userId}
          /* Если начальник отдела, то видит все сделки по своим подразделениям, иначе только свои */
          AND (deal.USR$DEPOTKEY = IIF(r.XID = 370486080 AND r.DBID = 1811180906, ud.USR$DEPOTKEY, NULL)
          OR con.ID IN (performer.ID, creator.ID))), 1, 0), 1)`;

  const filter = `
    AND 1 =
    CASE ${deadline || -1}
      WHEN 1 THEN 1
      WHEN 2 THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) != 0, 0, 1)
      WHEN 3 THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) != 1, 0, 1)
      WHEN 4 THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) >= 0, 0, 1)
      WHEN 5 THEN IIF(deal.USR$DEADLINE IS NULL, 1, 0)
      ELSE 1
    END`;

  const _schema: IDataSchema = {
    tasks: {
      USR$DEADLINE: {
        type: 'date'
      },
      USR$DATECLOSE: {
        type: 'date'
      },
      USR$CREATIONDATE: {
        type: 'date'
      },
      USR$CLOSED: {
        type: 'boolean'
      }
    }
  };

  const queries = [
    {
      name: 'columns',
      query:
        `SELECT col.ID, col.USR$INDEX, col.USR$NAME
        FROM USR$CRM_KANBAN_TEMPLATE temp
          JOIN USR$CRM_KANBAN_TEMPLATE_LINE templine ON templine.USR$MASTERKEY = temp.ID
          JOIN USR$CRM_KANBAN_COLUMNS col ON col.ID = templine.USR$COLUMNKEY
        ORDER BY col.USR$INDEX`
    },
    {
      name: 'cards',
      query:
        `SELECT
          card.ID, COALESCE(card.USR$INDEX, 0) USR$INDEX, card.USR$MASTERKEY,
          card.USR$DEALKEY, deal.ID deal_ID, deal.USR$NAME deal_USR$NAME, deal.USR$DISABLED deal_USR$DISABLED,
          deal.USR$AMOUNT deal_USR$AMOUNT, deal.USR$CONTACTKEY deal_USR$CONTACTKEY,
          con.ID con_ID, con.NAME con_NAME,
          performer.ID AS PERFORMER_ID,
          performer.NAME AS PERFORMER_NAME,
          creator.ID AS CREATOR_ID,
          creator.NAME AS CREATOR_NAME,
          deal.USR$SOURCE,
          deal.USR$DEADLINE,
          deal.USR$DONE,
          deal.USR$READYTOWORK,
          dep.ID DEP_ID,
          dep.NAME DEP_NAME,
          deny.ID DENY_ID,
          deny.USR$NAME AS DENY_NAME,
          deal.USR$DENIED DENIED,
          deal.USR$COMMENT COMMENT
        FROM USR$CRM_KANBAN_CARDS card
          JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY
          JOIN GD_CONTACT con ON con.ID = deal.USR$CONTACTKEY
          LEFT JOIN GD_CONTACT dep ON dep.ID = deal.USR$DEPOTKEY
          LEFT JOIN GD_CONTACT performer ON performer.ID = deal.USR$PERFORMER
          LEFT JOIN GD_CONTACT creator ON creator.ID = deal.USR$CREATORKEY
          LEFT JOIN USR$CRM_DENY_REASONS deny ON deny.ID = deal.USR$DENYREASONKEY
        WHERE 1=1
        ${userId > 0 ? checkCardsVisibility : ''}
        ${filter}
        ORDER BY card.USR$MASTERKEY, USR$INDEX`
    },
    {
      name: 'tasks',
      query:
        `SELECT
          task.ID,
          task.USR$CARDKEY,
          task.USR$NAME,
          task.USR$CLOSED,
          task.USR$DEADLINE,
          task.USR$DATECLOSE,
          task.USR$CREATIONDATE,
          performer.ID AS PERFORMER_ID,
          performer.NAME AS PERFORMER_NAME,
          creator.ID AS CREATOR_ID,
          creator.NAME AS CREATOR_NAME
        FROM USR$CRM_KANBAN_CARD_TASKS task
        JOIN USR$CRM_KANBAN_CARDS card ON card.ID = task.USR$CARDKEY
        LEFT JOIN GD_CONTACT performer ON performer.ID = task.USR$PERFORMER
        LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY`
    },
    // {
    //   name: 'deny',
    //   query: `
    //     SELECT
    //       ID,
    //       USR$NAME NAME
    //     FROM USR$CRM_DENY_REASONS
    //     WHERE DISABLED = 0
    //     ORDER BY USR$NAME`
    // }
  ];

  const [rawColumns, rawCards, rawTasks] = await Promise.all(queries.map(execQuery));

  interface IMapOfArrays {
    [key: string]: any[];
  };

  const cards: IMapOfArrays = {};
  const tasks: IMapOfArrays = {};
  const denyReasons: IMapOfArrays = {};

  // rawDeny.forEach(el => {
  //   if (denyReasons[el['ID']]) {
  //     denyReasons[el['ID']].push(el);
  //   } else {
  //     denyReasons[el['ID']] = [el];
  //   };
  // });

  rawTasks.forEach(el => {
    const newTask = {
      ...el,
      // PERFORMER: {
      //   ID: el['PERFORMER_ID'],
      //   NAME: el['PERFORMER_NAME']
      // },
      // ...(el['CREATOR_ID'] && {
      //   CREATOR: {
      //     ID: el['CREATOR_ID'],
      //     NAME: el['CREATOR_NAME']
      //   }
      // }),
      PERFORMER: el['PERFORMER_ID']
        ? {
          ID: el['PERFORMER_ID'],
          NAME: el['PERFORMER_NAME']
        }
        : null,
      CREATOR: el['CREATOR_ID']
        ? {
          ID: el['CREATOR_ID'],
          NAME: el['CREATOR_NAME']
        }
        : null

    };

    if (tasks[el['USR$CARDKEY']]) {
      tasks[el['USR$CARDKEY']].push(newTask);
    } else {
      tasks[el['USR$CARDKEY']] = [newTask];
    };
  });

  rawCards.forEach(el => {
    const newCard = {
      ...el,
      DEAL: {
        ID: el['DEAL_ID'],
        USR$NAME: el['DEAL_USR$NAME'],
        USR$CONTACTKEY: el['DEAL_$CONTACTKEY'],
        USR$AMOUNT: el['DEAL_USR$AMOUNT'],
        USR$DEADLINE: el['USR$DEADLINE'],
        USR$SOURCE: el['USR$SOURCE'],
        ...(el['CON_ID'] && {
          CONTACT: {
            ID: el['CON_ID'],
            NAME: el['CON_NAME'],
          },
        }),
        ...(el['CREATOR_ID'] && {
          CREATOR: {
            ID: el['CREATOR_ID'],
            NAME: el['CREATOR_NAME'],
          },
        }),
        ...(el['PERFORMER_ID'] && {
          PERFORMER: {
            ID: el['PERFORMER_ID'],
            NAME: el['PERFORMER_NAME'],
          },
        }),
        ...(el['DEP_ID'] && {
          DEPARTMENT: {
            ID: el['DEP_ID'],
            NAME: el['DEP_NAME'],
          },
        }),
        ...(el['DENY_ID'] && {
          DENYREASON: {
            ID: el['DENY_ID'],
            NAME: el['DENY_NAME'],
          },
        }),
        USR$DONE: el['USR$DONE'] === 1,
        USR$READYTOWORK: el['USR$READYTOWORK'] === 1,
        DENIED: el['DENIED'] === 1,
        COMMENT: el['COMMENT'],
      },
      TASKS: tasks[el['ID']]
    };

    if (cards[el['USR$MASTERKEY']]) {
      cards[el['USR$MASTERKEY']].push(newCard);
    } else {
      cards[el['USR$MASTERKEY']] = [newCard];
    };
  });

  const columns = rawColumns.map(el => {
    return {
      ...el,
      CARDS: cards[el.ID] ?? []
    };
  });

  const result: IRequestResult = {
    queries: { columns },
    _schema
  };

  return res.status(200).json(result);
};

const reorderColumns: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const columns: IKanbanColumn[] = req.body;

    if (!columns.length) {
      return res.status(422).send(resultError('Нет данных'));
    }

    const allFields = ['ID', 'USR$INDEX'];
    const actualFields = allFields.filter(field => typeof columns[0][field] !== 'undefined');
    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_COLUMNS(${actualFieldsNames})
      VALUES(${paramsString})
      MATCHING(ID)
      RETURNING ${returnFieldsNames}`;

    const unresolvedPromises = columns.map(async column => {
      const paramsValues = actualFields.map(field => {
        return column[field];
      });

      return (await attachment.executeSingletonAsObject(transaction, sql, paramsValues));
    });

    const records = await Promise.all(unresolvedPromises);

    const result: IRequestResult<{ columns: IKanbanColumn[] }> = {
      queries: {
        columns: records as IKanbanColumn[]
      },
      _schema: undefined
    };

    await commitTransaction(req.sessionID, transaction);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  };
};

const reorderCards: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const cards: IKanbanCard[] = req.body;

    if (!cards.length) {
      // return res.status(422).send(resultError('Нет данных'));
      return res.status(204).send([]);
    };

    const allFields = ['ID', 'USR$INDEX'];
    const actualFields = allFields.filter(field => typeof cards[0][field] !== 'undefined');
    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_CARDS(${actualFieldsNames})
      VALUES(${paramsString})
      MATCHING(ID)
      RETURNING ${returnFieldsNames}`;

    const unresolvedPromises = cards.map(async card => {
      const paramsValues = actualFields.map(field => {
        return card[field];
      });

      return (await attachment.executeSingletonAsObject(transaction, sql, paramsValues));
    });

    const records = await Promise.all(unresolvedPromises);

    const result: IRequestResult<{ cards: IKanbanCard[] }> = {
      queries: {
        cards: records as IKanbanCard[]
      },
      _schema: undefined
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await commitTransaction(req.sessionID, transaction);
  };
};

export default { get, reorderColumns, reorderCards };
