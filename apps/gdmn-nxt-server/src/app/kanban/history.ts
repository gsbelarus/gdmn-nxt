import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { importedModels } from '../models';
import { resultError } from '../responseMessages';
import { getReadTransaction, startTransaction } from '../utils/db-connection';

const get: RequestHandler = async (req, res) => {
  const cardId = parseInt(req.params.cardId);

  if (isNaN(cardId)) return res.status(422).send(resultError('Не указано поле "cardId"'));

  const { releaseReadTransaction, executeQuery } = await getReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      history: {
        USR$DATE: {
          type: 'timestamp'
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
              if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
                rec[fld] = (rec[fld] as Date).getTime();
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
      name: 'history',
      query: `
        SELECT
          h.USR$DATE,
          h.USR$TYPE,
          h.USR$DESCRIPTION,
          h.USR$OLD_VALUE,
          h.USR$NEW_VALUE,
          u.NAME AS USERNAME
        FROM
          USR$CRM_KANBAN_CARD_HISTORY h
          LEFT JOIN GD_USER u ON u.ID = h.USR$USERKEY
        WHERE h.USR$CARDKEY = ?
        ORDER BY h.USR$DATE DESC`,
      params: [cardId]
    };

    const history = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: { history },
      _params: [{ customerId: cardId }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  };
};

const add: RequestHandler = async (req, res) => {
  const { releaseTransaction, executeSingletonAsObject } = await startTransaction(req.sessionID);

  const { erModelNoAdapters } = await importedModels;

  const allFields = erModelNoAdapters.entities['TgdcAttrUserDefinedUSR_CRM_KANBAN_CARD_HISTORY'].attributes.map(attr => attr.name);
  const actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');
  actualFields.splice(actualFields.indexOf('ID'), 1);
  const actualFieldsNames = actualFields.join(',');

  const paramsValues = actualFields.map(field => {
    return req.body[field];
  });
  const paramsString = actualFields.map(_ => '?').join(',');

  const returnFieldsNames = allFields.join(',');

  try {
    const _schema: IDataSchema = {
      history: {
        USR$DATE: {
          type: 'timestamp'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rec = await executeSingletonAsObject(query, params);
      try {
        // const data = await rs.fetchAsObject();
        const sch = _schema[name];

        if (sch) {
          for (const fld of Object.keys(rec)) {
            if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
              rec[fld] = (rec[fld] as Date).getTime();
            }
          }
        };

        return [rec];
      } finally {
        // await rs.close();
      }
    };

    const query = {
      name: 'history',
      query: `
        INSERT INTO USR$CRM_KANBAN_CARD_HISTORY(${actualFieldsNames}, USR$DATE)
        VALUES(${paramsString}, CURRENT_TIMESTAMP)
        RETURNING ${returnFieldsNames}`,
      params: paramsValues
    };

    const history = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: { history },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export default { get, add };
