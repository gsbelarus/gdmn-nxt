import { IDataSchema, IKanbanTask, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '../utils/db-connection';
import { genId } from '../utils/genId';

const get: RequestHandler = async (req, res) => {
  const cardId = parseInt(req.params.cardId);

  if (isNaN(cardId)) return res.status(422).send(resultError('Не указано поле "cardId"'));

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

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
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
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

        return data;
      } finally {
        await rs.close();
      }
    };

    const query = {
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
        LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY
        WHERE task.USR$CARDKEY = ?`,
      params: [cardId]
    };

    const tasksRecord = await Promise.resolve(execQuery(query));

    const tasks = tasksRecord.map(task => ({
      ...task,
      CREATOR: {
        ID: task['CREATOR_ID'],
        NAME: task['CREATOR_NAME'],
      },
      ...(task['PERFORMER_ID'] && {
        PERFORMER: {
          ID: task['PERFORMER_ID'],
          NAME: task['PERFORMER_NAME'],
        }
      })
    }));

    const result: IRequestResult = {
      queries: { tasks },
      _params: [{ cardId }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

const upsert: RequestHandler = async (req, res) => {
  const cardId = parseInt(req.body['USR$CARDKEY']);

  if (isNaN(cardId)) return res.status(422).send(resultError('Не указано поле "cardId"'));

  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_CARD_TASKS
      (ID, USR$CARDKEY, USR$NAME, USR$CLOSED, USR$DEADLINE, USR$PERFORMER, USR$CREATORKEY)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      MATCHING(ID)
      RETURNING ID, USR$CARDKEY`;

    let id = parseInt(req.params.id) || -1;
    if (id <= 0) {
      id = await genId(attachment, transaction);
    };

    const task: IKanbanTask = req.body as IKanbanTask;

    const paramsValues = [
      task.ID > 0 ? task.ID : id,
      task.USR$CARDKEY,
      task.USR$NAME,
      Number(task.USR$CLOSED),
      task.USR$DEADLINE ? new Date(task.USR$DEADLINE) : null,
      task.PERFORMER?.ID,
      task.CREATOR?.ID
    ];

    const taskRecord = await attachment.executeSingletonAsObject(transaction, sql, paramsValues);

    const result: IRequestResult = {
      queries: { tasks: [taskRecord] },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  }
};

const remove: RequestHandler = async(req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const id = parseInt(req.params.id);

  if (!id) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));

  let result: ResultSet;
  try {
    result = await attachment.executeQuery(
      transaction,
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS SMALLINT)
      AS
      DECLARE VARIABLE TASK_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM USR$CRM_KANBAN_CARD_TASKS WHERE ID = :ID INTO :TASK_ID AS CURSOR curTASK
        DO
        BEGIN
          DELETE FROM USR$CRM_KANBAN_CARD_TASKS WHERE CURRENT OF curTASK;
          DELETE FROM USR$CRM_NOTIFICATIONS WHERE USR$KEY = :TASK_ID;

          SUCCESS = 1;
        END

        SUSPEND;
      END`,
      [id]
    );

    const data: { SUCCESS: number }[] = await result.fetchAsObject();
    await result.close();

    if (data[0].SUCCESS !== 1) {
      return res.status(500).send(resultError('Объект не найден'));
    }

    return res.status(200).json({ 'ID': id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  };
};

export default { get, upsert, remove };
