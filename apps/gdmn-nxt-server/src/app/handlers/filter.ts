import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { importedModels } from '../models';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, rollbackTransaction, startTransaction } from '../utils/db-connection';
import { genId } from '../utils/genId';

const eintityName = 'TgdcAttrUserDefinedUSR_CRM_DEAL_DEADLINE';

const get: RequestHandler = async(req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { filterCode } = req.params;

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();

        return [name, filterCode ? data.length > 0 ? data[0] : {} : data];
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: filterCode ? 'deadline' : 'deadlines',
        query: `
          SELECT USR$FILTERCODE as FilterCode, USR$NAME as name
          FROM USR$CRM_DEAL_DEADLINE
          ${filterCode ? ' WHERE USR$FILTERCODE = ?' : ''}`,
        params: filterCode ? [filterCode] : undefined,
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(execQuery)))
      },
      _params: filterCode ? [{ filterCode: filterCode }] : undefined,
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsert: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };
  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await attachment.executeSingletonAsObject(transaction, query, params);

      return [name, data];
    };
    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities[eintityName].attributes.map(attr => attr.name))];
    const actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');
    const paramsValues = actualFields.map(field => {
      return req.body[field];
    });
    let ID = id;
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
      if (actualFields.indexOf('ID') >= 0) {
        paramsValues.splice(actualFields.indexOf('ID'), 1, ID);
      };
    };
    const requiredFields = {
      ID: ID,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!actualFields.includes(key)) {
        actualFields.push(key);
        paramsValues.push(value);
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const query = {
      name: 'DEAL_DEADLINE',
      query: `
        UPDATE OR INSERT INTO USR$CRM_DEAL_DEADLINES(${actualFieldsNames})
        VALUES(${paramsString})
        MATCHING(ID)
        RETURNING ${actualFieldsNames}`,
      params: paramsValues,
    };

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries([await Promise.resolve(execQuery(query))])
      },
      _params: id ? [{ id: id }] : undefined,
      _schema
    };
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  };
};

const remove: RequestHandler = async(req, res) => {
  const id = parseInt(req.params.id);
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
      DECLARE VARIABLE LAB_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM USR$CRM_DEAL_DEADLINES WHERE ID = :ID INTO :LAB_ID AS CURSOR curDEAL_DEADLINE
        DO
        BEGIN
          DELETE FROM USR$CRM_DEAL_DEADLINES WHERE CURRENT OF curDEAL_DEADLINE;

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

    return res.status(200).json({ 'id': id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  }
};

export default { get, upsert, remove };
