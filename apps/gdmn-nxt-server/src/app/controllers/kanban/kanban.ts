import { IDataSchema, IEntities, IKanbanCard, IKanbanColumn, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { resultError } from '../../responseMessages';
import { acquireReadTransaction, commitTransaction, releaseTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { getDayDiff } from '@gsbelarus/util-helpers';

interface IMapOfArrays {
  [key: string]: any;
};

interface IMapOfObjects {
  [key: string]: any;
};

const get: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseTransaction } = await startTransaction(req.sessionID);

  try {
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
        },
        USR$INPROGRESS: {
          type: 'boolean'
        },
      }
    };


    const execQuery = async ({ name, query }) => {
      try {
        const data = await fetchAsObject(query);
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
        // await rs.close();
      }
    };

    const deadline = parseInt(req.query.deadline as string);
    const userId = parseInt(req.query.userId as string);
    const { departments, customers, requestNumber, dealNumber, performers, period } = req.query;

    const periods = period ? (period as string)?.split(',') : [];

    const checkFullView = `
      EXISTS(
        SELECT ul.ID
        FROM USR$CRM_PERMISSIONS_UG_LINES ul
          JOIN USR$CRM_PERMISSIONS_CROSS cr ON ul.USR$GROUPKEY = cr.USR$GROUPKEY
          JOIN GD_RUID r ON r.ID = cr.USR$ACTIONKEY
        WHERE
          /* Если есть право на действие Видеть все */
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
            OR con.ID IN (performer.ID, secondPerformer.ID, creator.ID))), 1, 0), 1)`;

    const filter = `
      /** Фильтрация */
      AND (
        /** По сделкам */
        1 =
        CASE ${deadline || -1}
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029358 AND DBID = 1972632332 ROWS 1) THEN IIF(deal.USR$DONE = 0, 1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029357 AND DBID = 1972632332 ROWS 1) THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) != 0, 0, 1)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029356 AND DBID = 1972632332 ROWS 1) THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) != 1, 0, 1)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029355 AND DBID = 1972632332 ROWS 1) THEN IIF(deal.USR$DONE = 1 OR DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)) >= 0, 0, 1)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029354 AND DBID = 1972632332 ROWS 1) THEN IIF(deal.USR$DEADLINE IS NULL, 1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029353 AND DBID = 1972632332 ROWS 1) THEN 1
          ELSE 1
        END
        /** По задачам */
        OR 1 =
        CASE ${deadline || -1}
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029358 AND DBID = 1972632332 ROWS 1) THEN
            IIF(deal.USR$DONE != 1
              AND EXISTS(
              SELECT task.ID
              FROM USR$CRM_KANBAN_CARD_TASKS task
              WHERE task.USR$CARDKEY = card.ID
                AND task.USR$CLOSED = 0),
              1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029357 AND DBID = 1972632332 ROWS 1) THEN
            IIF(deal.USR$DONE != 1
              AND EXISTS(
              SELECT task.ID
              FROM USR$CRM_KANBAN_CARD_TASKS task
              WHERE task.USR$CARDKEY = card.ID
                AND IIF(DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(CAST(task.USR$DEADLINE AS DATE), CURRENT_DATE + 1000)) != 0, 0, 1) = 1),
              1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029356 AND DBID = 1972632332 ROWS 1) THEN
            IIF(deal.USR$DONE != 1
              AND EXISTS(
              SELECT task.ID
              FROM USR$CRM_KANBAN_CARD_TASKS task
              WHERE task.USR$CARDKEY = card.ID
                AND IIF(DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(CAST(task.USR$DEADLINE AS DATE), CURRENT_DATE + 1000)) != 1, 0, 1) = 1),
              1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029355 AND DBID = 1972632332 ROWS 1) THEN
            IIF(deal.USR$DONE != 1
              AND EXISTS(
              SELECT task.ID
              FROM USR$CRM_KANBAN_CARD_TASKS task
              WHERE task.USR$CARDKEY = card.ID
                AND IIF(DATEDIFF(DAY FROM CURRENT_DATE TO COALESCE(CAST(task.USR$DEADLINE AS DATE), CURRENT_DATE + 1000)) >= 0, 0, 1) = 1),
              1, 0)
          WHEN (SELECT ID FROM GD_RUID WHERE XID = 358029354 AND DBID = 1972632332 ROWS 1) THEN
            IIF(deal.USR$DONE != 1
              AND EXISTS(
              SELECT task.ID
              FROM USR$CRM_KANBAN_CARD_TASKS task
              WHERE task.USR$CARDKEY = card.ID
                AND task.USR$DEADLINE IS NULL),
              1, 0)
          ELSE 1
        END)
        ${departments ? `AND dep.ID IN (${departments})` : ''}
        ${customers ? `AND con.ID IN (${customers})` : ''}
        ${requestNumber ? `AND deal.USR$REQUESTNUMBER LIKE '%${requestNumber}%'` : ''}
        ${dealNumber ? `AND deal.USR$NUMBER = ${dealNumber}` : ''}
        ${performers ? ` AND (performer.ID IN (${performers}) OR secondPerformer.ID IN (${performers})) ` : ''}
        ${periods.length === 2 ? ` AND CAST(deal.USR$CREATIONDATE AS DATE) BETWEEN '${new Date(Number(periods[0])).toLocaleDateString()}' AND '${new Date(Number(periods[1])).toLocaleDateString()}'` : ''}`;

    const queries = [
      {
        name: 'columns',
        query:
          `SELECT col.ID, col.USR$INDEX, col.USR$NAME
          FROM USR$CRM_KANBAN_TEMPLATE temp
            JOIN USR$CRM_KANBAN_TEMPLATE_LINE templine ON templine.USR$MASTERKEY = temp.ID
            JOIN USR$CRM_KANBAN_COLUMNS col ON col.ID = templine.USR$COLUMNKEY
          WHERE temp.ID = (SELECT ID FROM GD_RUID WHERE XID = 147006332 AND DBID = 2110918267 ROWS 1)
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
            secondPerformer.ID AS SECOND_PERFORMER_ID,
            secondPerformer.NAME AS SECOND_PERFORMER_NAME,
            creator.ID AS CREATOR_ID,
            creator.NAME AS CREATOR_NAME,
            source.ID AS SOURCE_ID,
            source.USR$NAME AS SOURCE_NAME,
            deal.USR$DEADLINE,
            deal.USR$DONE,
            deal.USR$READYTOWORK,
            dep.ID DEP_ID,
            dep.NAME DEP_NAME,
            deny.ID DENY_ID,
            deny.USR$NAME AS DENY_NAME,
            deal.USR$DENIED DENIED,
            deal.USR$PREPAID PREPAID,
            deal.USR$COMMENT COMMENT,
            deal.USR$DESCRIPTION DESCRIPTION,
            deal.USR$REQUESTNUMBER AS REQUESTNUMBER,
            deal.USR$PRODUCTNAME AS PRODUCTNAME,
            deal.USR$CONTACT_NAME AS CONTACT_NAME,
            deal.USR$CONTACT_EMAIL AS CONTACT_EMAIL,
            deal.USR$CONTACT_PHONE AS CONTACT_PHONE,
            deal.USR$CREATIONDATE CREATIONDATE,
            deal.USR$NUMBER AS DEAL_NUMBER
          FROM USR$CRM_KANBAN_CARDS card
            JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY
            JOIN GD_CONTACT con ON con.ID = deal.USR$CONTACTKEY
            LEFT JOIN GD_CONTACT dep ON dep.ID = deal.USR$DEPOTKEY
            LEFT JOIN GD_CONTACT performer ON performer.ID = deal.USR$PERFORMER
            LEFT JOIN GD_CONTACT secondPerformer ON secondPerformer.ID = deal.USR$SECOND_PERFORMER
            LEFT JOIN GD_CONTACT creator ON creator.ID = deal.USR$CREATORKEY
            LEFT JOIN USR$CRM_DENY_REASONS deny ON deny.ID = deal.USR$DENYREASONKEY
            LEFT JOIN USR$CRM_DEALS_SOURCE source ON source.ID = deal.USR$SOURCEKEY
          WHERE 1=1
          ${userId > 0 ? checkCardsVisibility : ''}
          ${filter}
          ORDER BY card.USR$MASTERKEY, COALESCE(deal.USR$DEADLINE, CURRENT_DATE + 1000)`
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
            task.USR$NUMBER,
            task.USR$INPROGRESS,
            performer.ID AS PERFORMER_ID,
            performer.NAME AS PERFORMER_NAME,
            creator.ID AS CREATOR_ID,
            creator.NAME AS CREATOR_NAME,
            tt.ID AS TYPE_ID,
            tt.USR$NAME AS TYPE_NAME
          FROM USR$CRM_KANBAN_CARD_TASKS task
          JOIN USR$CRM_KANBAN_CARDS card ON card.ID = task.USR$CARDKEY
          LEFT JOIN GD_CONTACT performer ON performer.ID = task.USR$PERFORMER
          LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY
          LEFT JOIN USR$CRM_KANBAN_CARD_TASKS_TYPES tt ON tt.ID = task.USR$TASKTYPEKEY`
      },
      {
        name: 'status',
        query:
          `SELECT
            USR$CARDKEY,
            USR$ISREAD
          FROM USR$CRM_KANBAN_CARD_STATUS
          WHERE USR$USERKEY = ${userId}
          ORDER BY USR$CARDKEY`
      },
    ];

    const [rawColumns, rawCards, rawTasks, rawStatus] = await Promise.all(queries.map(execQuery));

    interface IMapOfArrays {
      [key: string]: any[];
    };

    interface IMapOfObjects {
      [key: string]: any;
    };


    const cards: IMapOfArrays = {};
    const tasks: IMapOfArrays = {};
    const status: IMapOfObjects = {};

    rawStatus.forEach(el => {
      const newStatus = {
        isRead: el['USR$ISREAD'] === 1
      };

      status[el['USR$CARDKEY']] = newStatus;
    });

    rawTasks.forEach(el => {
      const newTask = {
        ...el,
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
          : null,
        ...(el['TYPE_ID'] && {
          TASKTYPE: {
            ID: el['TYPE_ID'],
            NAME: el['TYPE_NAME'],
          },
        }),

      };

      if (tasks[el['USR$CARDKEY']]) {
        tasks[el['USR$CARDKEY']].push(newTask);
      } else {
        tasks[el['USR$CARDKEY']] = [newTask];
      };
    });

    rawCards.forEach(el => {
      const newCard: IKanbanCard = {
        // ...el,
        ID: el['ID'],
        USR$INDEX: el['USR$INDEX'],
        USR$MASTERKEY: el['USR$MASTERKEY'],
        USR$DEALKEY: el['USR$DEALKEY'],
        DEAL: {
          ID: el['DEAL_ID'],
          USR$NUMBER: el['DEAL_NUMBER'],
          USR$NAME: el['DEAL_USR$NAME'],
          USR$CONTACTKEY: el['deal_USR$CONTACTKEY'],
          USR$AMOUNT: el['DEAL_USR$AMOUNT'],
          USR$DEADLINE: el['USR$DEADLINE'],
          ...(el['SOURCE_ID'] && {
            SOURCE: {
              ID: el['SOURCE_ID'],
              NAME: el['SOURCE_NAME']
            }
          }),
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
          PERFORMERS: []
            .concat(el['PERFORMER_ID'] ? [{
              ID: el['PERFORMER_ID'],
              NAME: el['PERFORMER_NAME'],
            }] : [])
            .concat(el['SECOND_PERFORMER_ID'] ? [{
              ID: el['SECOND_PERFORMER_ID'],
              NAME: el['SECOND_PERFORMER_NAME'],
            }] : []),
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
          REQUESTNUMBER: el['REQUESTNUMBER'],
          PRODUCTNAME: el['PRODUCTNAME'],
          CONTACT_NAME: el['CONTACT_NAME'],
          CONTACT_EMAIL: el['CONTACT_EMAIL'],
          CONTACT_PHONE: el['CONTACT_PHONE'],
          CREATIONDATE: el['CREATIONDATE'],
          DESCRIPTION: el['DESCRIPTION'],
          PREPAID: el['PREPAID'] === 1,
        },
        TASKS: tasks[el['ID']],
        STATUS: status[el['ID']]
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
      _params: [{
        ...(userId ? { userId } : undefined),
        ...(deadline ? { deadline } : undefined)
      }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  };
};

const reorderColumns: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

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

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  };
};

const reorderCards: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const cards: IKanbanCard[] = req.body;

    if (!cards.length) {
      const result: IRequestResult = {
        queries: {
          cards: []
        },
        _schema: undefined
      };
      return res.status(200).json(result);
    };

    const allFields = ['ID', 'USR$INDEX', 'USR$MASTERKEY'];
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
    await releaseTransaction(res.statusCode === 200);
  };
};

const getTasks: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);
  try {
    const _schema: IDataSchema = {
      cards: {
        USR$DEADLINE: {
          type: 'date'
        },
        USR$CLOSED: {
          type: 'boolean'
        },
        USR$INPROGRESS: {
          type: 'boolean'
        },
      }
    };

    const execQuery = async ({ name, query }) => {
      try {
        const data = await fetchAsObject(query);
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
        // await rs.close();
      }
    };

    const userId = parseInt(req.query.userId as string);
    const { taskNumber, performers, period } = req.query;

    const periods = period ? (period as string)?.split(',') : [];

    const filter = `
      ${taskNumber ? ` AND task.USR$NUMBER = ${taskNumber} ` : ''}
      ${performers ? ` AND performer.ID IN (${performers}) ` : ''}
      ${periods.length === 2 ? ` AND CAST(task.USR$CREATIONDATE AS DATE) BETWEEN '${new Date(Number(periods[0])).toLocaleDateString()}' AND '${new Date(Number(periods[1])).toLocaleDateString()}'` : ''}`;


    const checkFullView = `
      EXISTS(
        SELECT ul.ID
        FROM USR$CRM_PERMISSIONS_UG_LINES ul
          JOIN USR$CRM_PERMISSIONS_CROSS cr ON ul.USR$GROUPKEY = cr.USR$GROUPKEY
          JOIN GD_RUID r ON r.ID = cr.USR$ACTIONKEY
        WHERE
          /* Если есть право на действие Видеть все */
          r.XID = 358029872 AND r.DBID = 1972632332
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

    const queries = [
      {
        name: 'columns',
        query:
          `SELECT col.ID, col.USR$INDEX, col.USR$NAME
          FROM USR$CRM_KANBAN_TEMPLATE temp
            JOIN USR$CRM_KANBAN_TEMPLATE_LINE templine ON templine.USR$MASTERKEY = temp.ID
            JOIN USR$CRM_KANBAN_COLUMNS col ON col.ID = templine.USR$COLUMNKEY
            WHERE temp.ID = (SELECT ID FROM GD_RUID WHERE XID = 358029675 AND DBID = 1972632332 ROWS 1)
          ORDER BY col.USR$INDEX`
      },
      {
        name: 'cards',
        query: `
          SELECT
            task.ID,
            task.ID as TASK_ID,
            card.ID as CARD_ID,
            deal.ID as DEAL_ID,
            deal.USR$CONTACTKEY CONTACT_ID,
            deal.USR$NAME as DEAL_NAME,
            deal.USR$CONTACT_NAME REQUEST_CONTACT_NAME,
            task.USR$NUMBER,
            task.USR$DEADLINE,
            task.USR$DATECLOSE,
            task.USR$INPROGRESS,
            task.USR$PERFORMER PERFORMER_ID,
            task.USR$NAME as TASK_NAME,
            task.USR$CLOSED,
            task.USR$TASKTYPEKEY AS TYPE_ID,
            task.USR$DESCRIPTION DESCRIPTION,
            tt.USR$NAME AS TYPE_NAME,
            creator.ID AS CREATOR_ID,
            creator.NAME AS CREATOR_NAME,
            con.NAME as CONTACT_NAME,
            performer.NAME AS PERFORMER_NAME
          FROM USR$CRM_KANBAN_CARD_TASKS task
          JOIN USR$CRM_KANBAN_CARDS card ON card.ID = task.USR$CARDKEY
          JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY
          JOIN GD_CONTACT con ON con.ID = deal.USR$CONTACTKEY
          LEFT JOIN GD_CONTACT performer ON performer.ID = task.USR$PERFORMER
          LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY
          LEFT JOIN USR$CRM_KANBAN_CARD_TASKS_TYPES tt ON tt.ID = task.USR$TASKTYPEKEY
          WHERE 1 = 1
          ${userId > 0 ? checkCardsVisibility : ''}
          ${filter}
          ORDER BY task.USR$DEADLINE DESC, card.USR$MASTERKEY `
      },
      {
        name: 'status',
        query:
          `SELECT
            USR$CARDKEY,
            USR$ISREAD
          FROM USR$CRM_KANBAN_CARD_STATUS
          WHERE USR$USERKEY = ${userId}
          ORDER BY USR$CARDKEY`
      },
    ];

    const [rawColumns, rawCards, rawStatus] = await Promise.all(queries.map(execQuery));

    const columnsIDs: IMapOfArrays = {};
    const cards: IMapOfArrays = {};
    const status: IMapOfObjects = {};

    rawStatus.forEach(el => {
      const newStatus = {
        isRead: el['USR$ISREAD'] === 1
      };

      status[el['USR$CARDKEY']] = newStatus;
    });

    rawColumns.forEach(el => {
      columnsIDs[el['USR$INDEX']] = el['ID'];
    });

    rawCards.forEach(el => {
      const columnIndex = (() => {
        if (el['USR$CLOSED']) return 5;
        if (!el['USR$DEADLINE']) return 4;

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const deadline = new Date(el['USR$DEADLINE']);
        deadline.setHours(0, 0, 0, 0);

        const daysInmonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        const diffTime = getDayDiff(deadline, currentDate);

        switch (true) {
          case diffTime < 0:
            return 0;
          case diffTime === 0:
            return 1;
          case diffTime === 1:
            return 2;
          case diffTime <= daysInmonth - currentDate.getDate():
            return 3;
          default:
            return 4;
        };
      })();

      const newCard: IKanbanCard = {
        ID: el['CARD_ID'],
        USR$INDEX: el['USR$INDEX'],
        USR$MASTERKEY: columnsIDs[columnIndex],
        TASK: {
          ID: el['TASK_ID'],
          USR$NAME: el['TASK_NAME'],
          USR$NUMBER: el['USR$NUMBER'],
          USR$INPROGRESS: el['USR$INPROGRESS'],
          USR$DEADLINE: el['USR$DEADLINE'],
          USR$DATECLOSE: el['USR$DATECLOSE'],
          USR$CARDKEY: el['CARD_ID'],
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
          ...(el['TYPE_ID'] && {
            TASKTYPE: {
              ID: el['TYPE_ID'],
              NAME: el['TYPE_NAME'],
            },
          }),
          USR$CLOSED: el['USR$CLOSED'],
          DESCRIPTION: el['DESCRIPTION']
        },
        DEAL: {
          ID: el['DEAL_ID'],
          ...(el['CONTACT_ID'] && {
            CONTACT: {
              ID: el['CONTACT_ID'],
              NAME: el['CONTACT_NAME'],
            },
          }),
          CONTACT_NAME: el['REQUEST_CONTACT_NAME'],
          USR$NAME: el['DEAL_NAME']
        },
        STATUS: status[el['TASK_ID']]
      };

      if (cards[columnsIDs[columnIndex]]) {
        cards[columnsIDs[columnIndex]].push(newCard);
      } else {
        cards[columnsIDs[columnIndex]] = [newCard];
      };
    });

    const columns = rawColumns.map(el => {
      return {
        ...el,
        CARDS: cards[el.ID]?.sort((a, b) => Number(a.STATUS?.isRead ?? true) - Number(b.STATUS?.isRead ?? true)) ?? []
      };
    });

    const result: IRequestResult = {
      queries: { columns },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }
};

export const kanbanController = { get, reorderColumns, reorderCards, getTasks };
