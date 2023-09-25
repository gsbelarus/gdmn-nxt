import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { importedModels } from '../utils/models';
import { resultError } from '../responseMessages';
import { acquireReadTransaction, getReadTransaction, releaseReadTransaction, releaseTransaction, rollbackTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { genId } from '../utils/genId';

const eintityName = 'TgdcAttrUserDefinedUSR_CRM_UPDATES';

const get: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      updates: {
        ONDATE: {
          type: 'date'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await fetchAsObject(query);
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
    };

    const query =
      {
        name: 'updates',
        query: `
          SELECT ID, USR$VERSION VERSION, USR$CHANGES CHANGES, USR$ONDATE ONDATE
          FROM USR$CRM_UPDATES
          ORDER BY USR$VERSION DESC`,
      };

    const updates = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: {
        updates
      },
      _schema
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }
};

const upsert: RequestHandler = async (req, res) => {
  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };

  const { VERSION, CHANGES, ONDATE } = req.body;

  const regEx = new RegExp(/^\d+(\.\d+){2}$/);
  if (!regEx.test(VERSION)) {
    return res.status(422).send(resultError('Поле "version" не соответсвует формату <major.minor.patch>'));
  }

  const { attachment, transaction, releaseTransaction, fetchAsObject } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_UPDATES(ID, USR$VERSION, USR$CHANGES, USR$ONDATE)
      VALUES(:ID, :VERSION, :CHANGES, :ONDATE)
      MATCHING(ID)
      RETURNING ID`;

    const ID = await (() => {
      if (isNaN(id) || id <= 0) {
        return genId(attachment, transaction);
      };
      return id;
    })() ;

    const result: IRequestResult = {
      queries: {
        update: [...await fetchAsObject(sql, { ID, VERSION, CHANGES, ONDATE: new Date(ONDATE) })]
      },
      _params: id ? [{ id: id }] : undefined,
      _schema
    };
    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(resultError(error.message));
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
        FOR SELECT ID FROM USR$CRM_UPDATES WHERE ID = :ID INTO :LAB_ID AS CURSOR curUPDATE
        DO
        BEGIN
          DELETE FROM USR$CRM_UPDATES WHERE CURRENT OF curUPDATE;

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

export const updatesController = { get, upsert, remove };
