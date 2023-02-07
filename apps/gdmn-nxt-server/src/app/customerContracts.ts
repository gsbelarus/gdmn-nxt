import { ICustomerContract, IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from './utils/db-connection';
import { resultError } from './responseMessages';
import { genId } from './utils/genId';
import { importModels } from './er/er-utils';
import { importedModels } from './models';

const eintityName = 'TgdcAttrUserDefinedUSR_BG_CONTRACTJOB'

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema: IDataSchema = {
      customerContracts: {
        USR$DATEBEGIN: {
          type: 'timestamp'
        },
        USR$DATEEND: {
          type: 'timestamp'
        }
      }
    };

    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities[eintityName].attributes.map(attr => attr.name))];
    const returnFieldsNames = allFields.join(',');

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();
        const sch = _schema[name];

        if (sch) {
          for (const rec of data) {
            for (const fld of Object.keys(rec)) {
              if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] != null) {
                rec[fld] = (rec[fld] as Date).getTime();
              }
            }
          }
        }

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: 'customerContracts',
        query: `
          SELECT
            ${returnFieldsNames}
          FROM
            USR$BG_CONTRACTJOB
          WHERE
            COALESCE(USR$BG_ACTING, 0) = 1
            ${id ? ' AND ID = ?' : ''}
          ORDER BY
            USR$NUMBER`,
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
  }
};

const upsert: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (id && isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or isn\'t numeric'));

  try {
    const isInsertMode = id ? false : true;

    let ID: number = Number(id);
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
    }

    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities[eintityName].attributes.map(attr => attr.name))];
    const actualFields = allFields.filter( field => typeof req.body[field] !== 'undefined' );
    const paramsValues = actualFields.map(field => {
      return req.body[field];
    });

    if (isInsertMode) {
      paramsValues.splice(actualFields.indexOf('ID'), 1);
      actualFields.splice(actualFields.indexOf('ID'), 1);

      const requiredFields = {
        ID: ID,
        USR$BG_ACTING: 1
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!actualFields.includes(key)) {
          actualFields.push(key);
          paramsValues.push(value)
        }
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map( _ => '?' ).join(',');
    const returnFieldsNames = allFields.join(',');


    const sql = `
      UPDATE OR INSERT INTO USR$BG_CONTRACTJOB (${actualFieldsNames})
      VALUES (${paramsString})
      MATCHING (ID)
      RETURNING ${returnFieldsNames}`;

    const row = await attachment.executeSingleton(transaction, sql, paramsValues);

    const result: IRequestResult<{ departments: ICustomerContract[] }> = {
      queries: {
        departments: [Object.fromEntries(allFields.map((field, idx) => ([field, row[idx]]))) as ICustomerContract]
      },
      _schema: undefined
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
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
      DECLARE VARIABLE CON_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM USR$BG_CONTRACTJOB WHERE ID = :ID INTO :CON_ID AS CURSOR curCONTACT
        DO
        BEGIN
          DELETE FROM USR$BG_CONTRACTJOB WHERE CURRENT OF curCONTACT;

          SUCCESS = 1;
        END

        SUSPEND;
      END`,
      [ id ]
    );

    const data: {SUCCESS: number}[] = await result.fetchAsObject();
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
