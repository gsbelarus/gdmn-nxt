import { IEntities, IKanbanColumn, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { resultError } from '../../responseMessages';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { genId } from '../../utils/genId';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema = { };

    // const erModelFull = (await importERModel('TgdcAttrUserDefinedUSR_CRM_KANBAN_COLUMNS')).entities;
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcAttrUserDefinedUSR_CRM_KANBAN_COLUMNS'].attributes.map(attr => attr.name))];
    // const returnFieldsNames = allFields.join(',');

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();
        const sch = _schema[name];

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: 'columns',
        query: `
          SELECT
            *
          FROM
          AT_RELATIONS `,
        params: id ? [id] : undefined,
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _params: id ? [{ id: id }] : undefined,
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
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (id && isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));

  try {
    const isInsertMode = id ? false : true;

    let ID = Number(id);
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
    }

    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const allFields = ['ID', 'USR$NAME', 'USR$INDEX'];
    const actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');

    const paramsValues = actualFields.map(field => {
      return req.body[field];
    });

    if (isInsertMode) {
      paramsValues.splice(actualFields.indexOf('ID'), 1);
      actualFields.splice(actualFields.indexOf('ID'), 1);

      const requiredFields = {
        ID: ID
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!actualFields.includes(key)) {
          actualFields.push(key);
          paramsValues.push(value);
        }
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_COLUMNS (${actualFieldsNames})
      VALUES (${paramsString})
      MATCHING (ID)
      RETURNING ${returnFieldsNames}`;


    const row = await attachment.executeSingleton(transaction, sql, paramsValues);

    const result: IRequestResult<{ columns: IKanbanColumn[] }> = {
      queries: {
        columns: [Object.fromEntries(allFields.map((field, idx) => ([field, row[idx]]))) as IKanbanColumn]
      },
      _schema: undefined
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  }
};

const remove: RequestHandler = async(req, res) => {
  const { id } = req.params;
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  let result: ResultSet;
  try {
    result = await attachment.executeQuery(
      transaction,
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS SMALLINT)
      AS
        DECLARE VARIABLE COLUMN_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM USR$CRM_KANBAN_COLUMNS WHERE ID = :ID INTO :COLUMN_ID AS CURSOR curCONTACT
        DO
        BEGIN
          DELETE FROM USR$CRM_KANBAN_CARDS WHERE USR$MASTERKEY = :COLUMN_ID;
          DELETE FROM USR$CRM_KANBAN_COLUMNS WHERE CURRENT OF curCONTACT;

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
    };

    return res.status(200).json({ 'id': id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  }
};

export default { get, upsert, remove };
