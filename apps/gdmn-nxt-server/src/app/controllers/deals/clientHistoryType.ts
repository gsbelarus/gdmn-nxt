import { RequestHandler } from 'express';
import { acquireReadTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { resultError } from '../../responseMessages';
import { IRequestResult } from '@gsbelarus/util-api-types';
const get: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const sql = `
      SELECT
        ID, USR$NAME NAME
      FROM USR$CRM_DEALS_CLIENT_STORY_TYPE`;

    const clientHistoryTypes = await fetchAsObject(sql);

    const result: IRequestResult = {
      queries: {
        clientHistoryTypes
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

const upsert: RequestHandler = async (req, res) => {
  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };

  const { fetchAsSingletonObject, releaseTransaction, generateId, attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const { NAME } = req.body;

    const ID = await (() => {
      if (isNaN(id) || id <= 0) {
        return generateId();
      };
      return id;
    })() ;

    const sql = isInsertMode
      ? `
        INSERT INTO USR$CRM_DEALS_CLIENT_STORY_TYPE(ID, USR$NAME)
        VALUES(:ID, :NAME)
        RETURNING ID`
      : `
        UPDATE USR$CRM_DEALS_CLIENT_STORY_TYPE
        SET
          USR$NAME = :NAME
        WHERE ID = :ID
        RETURNING ID`;

    const params = {
      ID,
      NAME
    };

    const clientStory = await fetchAsSingletonObject(sql, params);

    const result: IRequestResult = {
      queries: {
        clientStory: { ...clientStory, ...req.body }
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  }
};


export const clientHistoryTypesController = {
  get,
  upsert
};
