import { IDeal, IEntities, IKanbanCard, IKanbanColumn, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { importModels } from '../er/er-utils';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction, startTransaction } from '../utils/db-connection';
import { genId } from '../utils/genId';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseReadTransaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  if (id && isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));

  try {
    const _schema = { };

    // const erModelFull = (await importERModel('TgdcAttrUserDefinedUSR_CRM_KANBAN_COLUMNS')).entities;
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcAttrUserDefinedUSR_CRM_KANBAN_COLUMNS'].attributes.map(attr => attr.name))];
    const allFields = ['ID', 'USR$INDEX', 'USR$MASTERKEY'];
    const actualFields = allFields;
    const actualFieldsNames = actualFields.join(',');
    const returnFieldsNames = allFields.join(',');

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
        name: 'cards',
        query: `
          SELECT ${actualFieldsNames}
          FROM USR$CRM_KANBAN_CARDS
          ${id ? 'WHERE ID = ?' : '' }`,
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

    await releaseReadTransaction();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  };
};

const upsert: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (id && isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or is not numeric'));

  try {
    const isInsertMode = id ? false : true;

    let ID = Number(id);
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
    };

    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    let allFields;
    let actualFields;
    let paramsValues;
    let actualFieldsNames;
    let paramsString;
    let returnFieldsNames;
    let sql;
    let dealRecord: IDeal;

    allFields = ['USR$DEALKEY', 'USR$NAME', 'USR$DISABLED', 'USR$AMOUNT', 'USR$CONTACTKEY'];
    actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');

    paramsValues = actualFields.map(field => {
      return req.body[field];
    });

    actualFields = actualFields.map(field => field === 'USR$DEALKEY' ? 'ID' : field);

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
        };
      };
    };

    actualFieldsNames = actualFields.join(',');
    paramsString = actualFields.map(_ => '?').join(',');
    returnFieldsNames = actualFields.join(',');

    sql = `
      UPDATE OR INSERT INTO USR$CRM_DEALS(${actualFieldsNames})
      VALUES (${paramsString})
      MATCHING (ID)
      RETURNING ${returnFieldsNames}`;

    dealRecord = await attachment.executeSingletonAsObject(transaction, sql, paramsValues);

    if (isInsertMode) {
      ID = await genId(attachment, transaction);
    };

    allFields = ['ID', 'USR$INDEX', 'USR$MASTERKEY', 'USR$DEALKEY'];
    actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');

    paramsValues = actualFields.map(field => {
      return field === 'USR$DEALKEY' ? dealRecord.ID : req.body[field];
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
        };
      };
    };

    actualFieldsNames = actualFields.join(',');
    paramsString = actualFields.map(_ => '?').join(',');
    returnFieldsNames = allFields.join(',');

    sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_CARDS(${actualFieldsNames})
      VALUES (${paramsString})
      MATCHING (ID)
      RETURNING ${returnFieldsNames}`;

    const cardRecord: IKanbanCard = await attachment.executeSingletonAsObject(transaction, sql, paramsValues);

    const result: IRequestResult<{ cards: IKanbanCard[] }> = {
      queries: {
        cards: [Object.fromEntries(allFields.map((field, idx) => ([field, cardRecord[field]]))) as IKanbanCard]
      },
      _schema: undefined
    };

    await transaction.commit();
    //TODO: а почему здесь транзакция не высвобождается???
    // await commitTransaction(req.sessionID, transaction);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

const remove: RequestHandler = async(req, res) => {
  const { releaseTransaction, executeQuery } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));

  let result: ResultSet;
  try {
    result = await executeQuery(
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS BOOLEAN, USR$MASTERKEY INTEGER)
      AS
        DECLARE VARIABLE DEAL_ID INTEGER;
      BEGIN
        SUCCESS = FALSE;
        FOR SELECT USR$DEALKEY, USR$MASTERKEY FROM USR$CRM_KANBAN_CARDS WHERE ID = :ID INTO :DEAL_ID, :USR$MASTERKEY AS CURSOR curCARD
        DO
        BEGIN
          DELETE FROM USR$CRM_KANBAN_CARDS WHERE CURRENT OF curCARD;
          DELETE FROM USR$CRM_DEALS deal WHERE deal.ID = :DEAL_ID;

          SUCCESS = TRUE;
        END

        SUSPEND;
      END`,
      [id]
    );

    const data: { SUCCESS: boolean, USR$MASTERKEY: number }[] = await result.fetchAsObject();

    if (!data[0].SUCCESS) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    await result.close();
    await releaseTransaction();
    return res.status(200).json({ 'ID': id, 'USR$MASTERKEY': data[0].USR$MASTERKEY });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export default { get, upsert, remove };
