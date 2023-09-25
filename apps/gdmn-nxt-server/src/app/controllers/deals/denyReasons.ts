import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../../responseMessages';
import { acquireReadTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { genId } from '../../utils/genId';

const get: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const sql = `
      SELECT ID, USR$NAME NAME
      FROM USR$CRM_DENY_REASONS`;

    const result: IRequestResult = {
      queries: {
        denyReasons: [...await fetchAsObject(sql)]
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }
};

const upsert: RequestHandler = async(req, res) => {
  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };

  const { NAME } = req.body;

  const { fetchAsObject, releaseTransaction, attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_DENY_REASONS(ID, USR$NAME)
      VALUES(:ID, :NAME)
      MATCHING(ID)
      RETURNING ID, USR$NAME`;

    const ID = await (() => {
      if (isNaN(id) || id <= 0) {
        return genId(attachment, transaction);
      };
      return id;
    })() ;

    const result: IRequestResult = {
      queries: {
        denyReasons: [...await fetchAsObject(sql, { ID, NAME })]
      },
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
  const { fetchAsObject, releaseTransaction } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (isNaN(Number(id))) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));

  try {
    const result = await fetchAsObject(
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS SMALLINT)
      AS
      DECLARE VARIABLE SOURCE_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR
          SELECT ID FROM USR$CRM_DENY_REASONS WHERE ID = :ID
        INTO :SOURCE_ID AS CURSOR curRec
        DO
        BEGIN
          DELETE FROM USR$CRM_DENY_REASONS WHERE CURRENT OF curRec;

          SUCCESS = 1;
        END

        SUSPEND;
      END`,
      [id]
    );

    if (result[0]['SUCCESS'] !== 1) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    return res.status(200).json({ 'ID': id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};
export const denyReasons = { get, upsert, remove };
