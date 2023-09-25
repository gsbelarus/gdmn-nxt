import { IDataSchema, IKanbanHistory, IKanbanTask, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { resultError } from '../../responseMessages';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { genId } from '../../utils/genId';
import { addHistory } from './history';

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
        },
        USR$INPROGRESS: {
          type: 'boolean'
        },
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
        LEFT JOIN USR$CRM_KANBAN_CARD_TASKS_TYPES tt ON tt.ID = task.USR$TASKTYPEKEY
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
      }),
      ...(task['TYPE_ID'] && {
        TASKTYPE: {
          ID: task['TYPE_ID'],
          NAME: task['TYPE_NAME'],
        },
      }),
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

  const { attachment, transaction, executeSingletonAsObject, fetchAsSingletonObject, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const { id } = req.params;
    const isInsertMode = !id;

    const task: IKanbanTask = req.body as IKanbanTask;

    const userId = req.session.userId || -1;
    const taskId = await (() => isInsertMode ? genId(attachment, transaction) : Number(id))();

    let sql;

    /** Формирование истории изменений */
    sql = `
      SELECT
        task.USR$NAME, task.USR$DEADLINE, task.USR$CARDKEY, USR$CLOSED,
        creator.ID AS CREATOR_ID, creator.NAME AS CREATOR_NAME,
        performer.ID AS PERMORMER_ID, performer.NAME AS PERMORMER_NAME
      FROM USR$CRM_KANBAN_CARD_TASKS task
        LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY
        LEFT JOIN GD_CONTACT performer ON performer.ID = task.USR$PERFORMER
      WHERE task.ID = :taskId`;

    const oldTaskRecord = await fetchAsSingletonObject(sql, { taskId });

    const changes: IKanbanHistory[] = [];
    if ((task.CREATOR?.ID || -1) !== (oldTaskRecord?.CREATOR_ID || -1)) {
      changes.push({
        ID: -1,
        USR$TYPE: isInsertMode ? '1' : '2',
        USR$CARDKEY: cardId,
        USR$DESCRIPTION: `Постановщик задачи "${task.USR$NAME}"`,
        USR$OLD_VALUE: oldTaskRecord.CONTACT_NAME,
        USR$NEW_VALUE: task.CREATOR.NAME,
        USR$USERKEY: userId
      });
    };
    if ((task.PERFORMER?.ID || -1) !== (oldTaskRecord?.PERMORMER_ID || -1)) {
      changes.push({
        ID: -1,
        USR$TYPE: isInsertMode ? '1' : '2',
        USR$CARDKEY: cardId,
        USR$DESCRIPTION: `Исполнитель задачи "${task.USR$NAME}"`,
        USR$OLD_VALUE: oldTaskRecord.PERMORMER_NAME,
        USR$NEW_VALUE: task.PERFORMER.NAME,
        USR$USERKEY: userId
      });
    };
    if (task?.USR$NAME !== oldTaskRecord?.USR$NAME) {
      changes.push({
        ID: -1,
        USR$TYPE: isInsertMode ? '1' : '2',
        USR$CARDKEY: cardId,
        USR$DESCRIPTION: 'Описание задачи',
        USR$OLD_VALUE: oldTaskRecord?.USR$NAME,
        USR$NEW_VALUE: task.USR$NAME,
        USR$USERKEY: userId
      });
    };
    if ((task.USR$DEADLINE || -1) !== (oldTaskRecord.USR$DEADLINE || -1)) {
      changes.push({
        ID: -1,
        USR$TYPE: isInsertMode ? '1' : '2',
        USR$CARDKEY: cardId,
        USR$DESCRIPTION: `Срок выполнения задачи "${task.USR$NAME}"`,
        USR$OLD_VALUE: oldTaskRecord?.USR$DEADLINE ? new Date(oldTaskRecord?.USR$DEADLINE).toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        USR$NEW_VALUE: task?.USR$DEADLINE ? new Date(task?.USR$DEADLINE).toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        USR$USERKEY: userId
      });
    };
    if ((task.USR$CLOSED || -1) !== (oldTaskRecord.USR$CLOSED === 1)) {
      changes.push({
        ID: -1,
        USR$TYPE: isInsertMode ? '1' : '2',
        USR$CARDKEY: cardId,
        USR$DESCRIPTION: `Задача "${task.USR$NAME}"`,
        USR$OLD_VALUE: oldTaskRecord.USR$CLOSED === 1 ? 'Выполнена' : 'Не выполнена',
        USR$NEW_VALUE: task.USR$CLOSED ? 'Выполнена' : 'Не выполнена',
        USR$USERKEY: userId
      });
    };

    sql = `
      EXECUTE BLOCK(
        IN_ID INTEGER = ?,
        CARDKEY INTEGER = ?,
        NAME TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$NAME = ?,
        CLOSED TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$CLOSED = ?,
        DEADLINE TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$DEADLINE = ?,
        PERFORMER INTEGER = ?,
        CREATOR INTEGER = ?,
        TASKTYPEKEY INTEGER = ?,
        INPROGRESS SMALLINT = ?,
        DESCRIPTION TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$DESCRIPTION = ?
      )
      RETURNS(
        ID INTEGER,
        USR$NUMBER TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$NUMBER,
        USR$CARDKEY INTEGER
      )
      AS
      DECLARE VARIABLE TASKEXISTS INTEGER;
      DECLARE VARIABLE NEW_NUMBER INTEGER;
      BEGIN
        SELECT ID, USR$NUMBER FROM USR$CRM_KANBAN_CARD_TASKS WHERE ID = :IN_ID INTO TASKEXISTS, :NEW_NUMBER;

        IF (TASKEXISTS IS NULL) THEN
        BEGIN
          SELECT max(USR$NUMBER)
          FROM USR$CRM_KANBAN_CARD_TASKS
          INTO :NEW_NUMBER;
        NEW_NUMBER = COALESCE(NEW_NUMBER, 0) + 1;
        END


        UPDATE OR INSERT INTO USR$CRM_KANBAN_CARD_TASKS
        (ID, USR$CARDKEY, USR$NAME, USR$CLOSED, USR$DEADLINE, USR$PERFORMER, USR$CREATORKEY, USR$TASKTYPEKEY, USR$NUMBER, USR$INPROGRESS, USR$DESCRIPTION)
        VALUES(:IN_ID, :CARDKEY, :NAME, :CLOSED, :DEADLINE, :PERFORMER, :CREATOR, :TASKTYPEKEY, :NEW_NUMBER, :INPROGRESS, :DESCRIPTION)
        MATCHING(ID)
        RETURNING ID, USR$NUMBER, USR$CARDKEY
        INTO :ID, :USR$NUMBER, :USR$CARDKEY;

        SUSPEND;
      END`;

    const paramsValues = [
      taskId,
      task.USR$CARDKEY,
      task.USR$NAME,
      Number(task.USR$CLOSED),
      task.USR$DEADLINE ? new Date(task.USR$DEADLINE) : null,
      task.PERFORMER?.ID > 0 ? task.PERFORMER?.ID : null,
      task.CREATOR?.ID > 0 ? task.CREATOR?.ID : null,
      task.TASKTYPE?.ID > 0 ? task.TASKTYPE?.ID : null,
      Number(task.USR$INPROGRESS),
      task.DESCRIPTION
    ];
    const taskRecord = await executeSingletonAsObject(sql, paramsValues);

    /** Сохранение истории изменений */
    changes.forEach(c => addHistory(req.sessionID, c));

    /** Изменение статуса карточки */
    sql = `
      EXECUTE BLOCK(
        cardId INTEGER = ?,
        userId INTEGER = ?
      )
      AS
      DECLARE VARIABLE CON_ID INTEGER;
      BEGIN
        FOR
          SELECT u.ID
          FROM GD_CONTACT con
          JOIN GD_USER u ON u.CONTACTKEY = con.ID
          JOIN USR$CRM_KANBAN_CARD_TASKS task
            ON task.USR$CREATORKEY = con.ID
            OR task.USR$PERFORMER = con.ID
          WHERE task.ID = :cardId AND u.ID != :userId
          INTO :CON_ID
        DO
          UPDATE OR INSERT INTO USR$CRM_KANBAN_CARD_STATUS(USR$ISREAD, USR$CARDKEY, USR$USERKEY)
          VALUES(0, :cardId, :CON_ID)
          MATCHING(USR$CARDKEY, USR$USERKEY);
      END`;

    await executeSingletonAsObject(sql, [task.ID, userId]);

    const result: IRequestResult = {
      queries: { tasks: [taskRecord] },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  }
};

const remove: RequestHandler = async(req, res) => {
  const { attachment, transaction, releaseTransaction, fetchAsSingletonObject } = await startTransaction(req.sessionID);

  const id = parseInt(req.params.id);

  if (!id) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));


  // let result: ResultSet;
  try {
    const userId = req.session.userId || -1;

    /** Формирование истории изменений */
    const sql = `
      SELECT
        task.USR$NAME, task.USR$CARDKEY
      FROM USR$CRM_KANBAN_CARD_TASKS task
      WHERE task.ID = :taskId`;

    const oldTaskRecord = await fetchAsSingletonObject(sql, { taskId: id });

    const changes: IKanbanHistory[] = [];
    changes.push({
      ID: -1,
      USR$TYPE: '3',
      USR$CARDKEY: oldTaskRecord.USR$CARDKEY,
      USR$DESCRIPTION: 'Задача',
      USR$OLD_VALUE: oldTaskRecord.USR$NAME || '',
      USR$NEW_VALUE: oldTaskRecord.USR$NAME || '',
      USR$USERKEY: userId
    });

    const result: ResultSet = await attachment.executeQuery(
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

    /** Сохранение истории изменений */
    changes.forEach(c => addHistory(req.sessionID, c));

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
