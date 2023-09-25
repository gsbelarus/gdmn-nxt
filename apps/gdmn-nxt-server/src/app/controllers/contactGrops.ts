import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { resultError } from '../responseMessages';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema = { };

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
        name: 'groups',
        query: `
          SELECT
            z.ID,
            z.LB,
            z.RB,
            z.PARENT,
            z.NAME
          FROM
            GD_CONTACT z
          WHERE
            Z.CONTACTTYPE  =  0`
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};


const add: RequestHandler = async(req, res) => {
  const { NAME } = req.body;
  let { PARENT = null } = req.body;

  if (!NAME) {
    return res.status(422).send(resultError('Отсутсвует наименование'));
  }

  if (PARENT === 0) PARENT = null;

  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

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
        name: 'groups',
        query:
          `EXECUTE BLOCK(
            input_NAME  TYPE OF COLUMN GD_CONTACT.NAME = ?,
            input_PARENT TYPE OF COLUMN GD_CONTACT.PARENT = ?
          )
          RETURNS(
            ID    INTEGER,
            NAME  TYPE OF COLUMN GD_CONTACT.NAME,
            LB    TYPE OF COLUMN GD_CONTACT.LB,
            RB    TYPE OF COLUMN GD_CONTACT.RB,
            PARENT TYPE OF COLUMN GD_CONTACT.PARENT
          )
          AS
          BEGIN
            INSERT INTO GD_CONTACT(CONTACTTYPE, PARENT, NAME)
            VALUES(0, :input_PARENT, :input_NAME)
            RETURNING ID, PARENT, NAME, LB, RB
            INTO :ID, :PARENT, :NAME, :LB, :RB;

            SUSPEND;
          END`,
        params: [NAME, PARENT]
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  };
};

const update: RequestHandler = async(req, res) => {
  const { id } = req.params;
  const { NAME } = req.body;
  let { PARENT = null } = req.body;

  if (!NAME) {
    return res.status(422).send(resultError('Отсутсвует наименование'));
  }

  if (PARENT === 0) PARENT = null;

  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
    };

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
        name: 'groups',
        query:
          `EXECUTE BLOCK(
            input_ID      TYPE OF COLUMN GD_CONTACT.ID = ?,
            input_NAME    TYPE OF COLUMN GD_CONTACT.NAME = ?,
            input_PARENT  TYPE OF COLUMN GD_CONTACT.PARENT = ?
          )
          RETURNS(
            ID    INTEGER,
            NAME  TYPE OF COLUMN GD_CONTACT.NAME,
            LB    TYPE OF COLUMN GD_CONTACT.LB,
            RB    TYPE OF COLUMN GD_CONTACT.RB,
            PARENT TYPE OF COLUMN GD_CONTACT.PARENT
          )
          AS
          BEGIN
            UPDATE GD_CONTACT
            SET
              NAME = :input_NAME,
              PARENT = :input_PARENT
            WHERE
              ID = :input_ID
            RETURNING ID, PARENT, NAME, LB, RB INTO :ID, :PARENT, :NAME, :LB, :RB;

            SUSPEND;
          END`,
        params: [id, NAME, PARENT]
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _params: [{ id: id, body: req.body }],
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
  const { id } = req.params;
  const { fetchAsObject, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const sql = `
      EXECUTE BLOCK(
        ID INTEGER = :id
      )
      RETURNS(SUCCESS SMALLINT)
      AS
      DECLARE VARIABLE CON_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM GD_CONTACT WHERE ID = :ID INTO :CON_ID AS CURSOR curCONTACT
        DO
        BEGIN
          DELETE FROM GD_CONTACT WHERE CURRENT OF curCONTACT;

          SUCCESS = 1;
        END

        SUSPEND;
      END`;

    const data: object[] = await fetchAsObject(sql, [{ id }]);

    if (data[0]['SUCCESS'] !== 1) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    return res.status(200).json({ 'id': id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  }
};

export default { get, add, update, remove };
