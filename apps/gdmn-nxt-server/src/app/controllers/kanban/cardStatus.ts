import { RequestHandler } from 'express';
import { startTransaction } from '@gdmn-nxt/db-connection';
import { IRequestResult } from '@gsbelarus/util-api-types';
import { resultError } from '../../responseMessages';

const get: RequestHandler = async(req, res) => {
  const { isRead, CARD, USER, } = req.body;

  const { fetchAsObject, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const query = `
        UPDATE OR INSERT INTO USR$CRM_KANBAN_CARD_STATUS(USR$ISREAD, USR$CARDKEY, USR$USERKEY)
        VALUES(:ISREAD, :CARDKEY, :USERKEY)
        MATCHING(USR$CARDKEY, USR$USERKEY)
        RETURNING ID`;

    const data: object[] = await fetchAsObject(query, { ISREAD: isRead, CARDKEY: CARD.ID, USERKEY: USER.ID });

    const result: IRequestResult = {
      queries: {
        status: data
      },
      _params: [{ ISREAD: isRead, CARDKEY: CARD.ID, USERKEY: USER.ID }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

const upsert: RequestHandler = async(req, res) => {
  const cardId = parseInt(req.params.id as string);
  const { isRead, userId } = req.body;

  const { fetchAsObject, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const query = `
        UPDATE OR INSERT INTO USR$CRM_KANBAN_CARD_STATUS(USR$ISREAD, USR$CARDKEY, USR$USERKEY)
        VALUES(:ISREAD, :cardId, :userId)
        MATCHING(USR$CARDKEY, USR$USERKEY)
        RETURNING ID`;

    const data: object[] = await fetchAsObject(query, { ISREAD: Number(isRead), cardId, userId });

    const result: IRequestResult = {
      queries: {
        status: data
      },
      _params: [{ ISREAD: isRead, cardId, userId }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export const cardStatusController = { get, upsert };
