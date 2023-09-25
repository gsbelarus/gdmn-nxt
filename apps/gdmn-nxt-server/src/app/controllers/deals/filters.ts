import { RequestHandler } from "express";
import { acquireReadTransaction, startTransaction } from "@gdmn-nxt/db-connection";
import { IKanbanFilterDeadline, IRequestResult } from "@gsbelarus/util-api-types";
import { resultError } from "../../responseMessages";

const getFilters: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const query = `
      SELECT
        ID,
        USR$CODE CODE,
        USR$NAME NAME
      FROM USR$CRM_KANBAN_FILTERS_DEADLINE
      ORDER BY USR$CODE`;

    const result: IRequestResult = {
      queries: {
        filters: [... await fetchAsObject(query)]
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }

}

const getLastFilter: RequestHandler = async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(422).send(resultError('Поле "userId" не указано или неверного типа'));

  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const query = `
      SELECT
        last.ID,
        f.ID AS FILTER_ID,
        f.USR$CODE AS FILTER_CODE,
        f.USR$NAME AS FILTER_NAME,
        u.ID AS USER_ID,
        u.NAME AS USER_NAME
      FROM USR$CRM_LASTUSEDFILTER_DEADLINE last
      JOIN USR$CRM_KANBAN_FILTERS_DEADLINE f ON f.ID = last.USR$FILTERKEY
      JOIN GD_USER u ON u.ID = last.USR$USERKEY
      WHERE u.ID = :userId`;

    const fetch = await fetchAsObject(query, {userId});

    const filters = fetch.map(f => ({
      ID: f['FILTER_ID'],
      CODE: f['FILTER_CODE'],
      NAME: f['FILTER_NAME'],
    }));

    const result: IRequestResult = {
      queries: {
        filters
      },
      _schema,
      _params: [{ userId }]
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }
}

const upsertLastFilter: RequestHandler = async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(422).send(resultError('Поле "userId" не указано или неверного типа'));

  const { fetchAsObject, releaseTransaction} = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const query = `
      UPDATE OR INSERT INTO USR$CRM_LASTUSEDFILTER_DEADLINE(USR$USERKEY, USR$FILTERKEY)
      VALUES(:userId, :filterId)
      MATCHING(USR$USERKEY)
      RETURNING ID`;

    const { ID: filterId } = req.body;

    await fetchAsObject(query, { userId, filterId });

    const result: IRequestResult = {
      queries: {
        filters: [{...req.body}]
      },
      _schema,
      _params: [{ userId }]
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  }

}

export const filters = { getFilters, getLastFilter, upsertLastFilter };
