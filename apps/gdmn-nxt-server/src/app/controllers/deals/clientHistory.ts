import { RequestHandler } from 'express';
import { acquireReadTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { resultError } from '../../responseMessages';
import { IClientHistory, IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';

const get: RequestHandler = async (req, res) => {
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  const { cardId } = req.params;

  try {
    const _schema: IDataSchema = {
      clientHistory: {
        CREATIONDATE: {
          type: 'timestamp'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any }) => {
      const records = await fetchAsObject(query, params);
      const sch = _schema[name];

      if (sch) {
        records.forEach(rec => {
          for (const fld of Object.keys(rec)) {
            if ((sch[fld]?.type === 'date' || sch[fld]?.type === 'timestamp') && rec[fld] !== null) {
              rec[fld] = (rec[fld] as Date).getTime();
            }
          }
        });
      };

      return records;
    };

    const query = {
      name: 'clientHistory',
      query: `
        SELECT
          story.ID,
          story.USR$CONTENT CONTENT,
          story.USR$CREATIONDATE CREATIONDATE,
          creator.ID CREATOR_ID,
          creator.NAME CREATOR_NAME,
          stype.ID AS STYPE_ID,
          stype.USR$NAME AS STYPE_NAME,
          stype.USR$ICON_KEY AS STYPE_ICON_KEY
        FROM USR$CRM_DEALS_CLIENT_STORY story
          JOIN USR$CRM_DEALS_CLIENT_STORY_TYPE stype ON stype.ID = story.USR$STORY_TYPE_KEY
          JOIN GD_CONTACT creator ON creator.ID = story.USR$CREATORKEY
        WHERE
          story.USR$CARDKEY = :cardId
        UNION ALL
        SELECT
          t.ID,
          t.USR$NAME,
          t.USR$DATECLOSE,
          creator.ID CREATOR_ID,
          creator.NAME CREATOR_NAME,
          6,
          'Задача',
          6
        FROM USR$CRM_KANBAN_CARD_TASKS t
          JOIN USR$CRM_KANBAN_CARDS card ON card.ID = t.USR$CARDKEY
          JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY
          JOIN GD_CONTACT creator ON creator.ID = t.USR$CREATORKEY
        WHERE
          card.ID = :cardId
          AND t.USR$CLOSED = 1
        ORDER BY 3 DESC`,
      params: { cardId }
    };

    const rawClientHistory = await Promise.resolve(execQuery(query));

    const clientHistory: IClientHistory[] = rawClientHistory.map((r: any) => {
      const { CREATOR_ID, CREATOR_NAME, STYPE_ID, STYPE_NAME, STYPE_ICON_KEY, ...rest } = r;
      return {
        ...rest,
        CREATOR: {
          ID: CREATOR_ID,
          NAME: CREATOR_NAME
        },
        historyType: {
          ID: STYPE_NAME,
          NAME: STYPE_NAME,
          ICON: STYPE_ICON_KEY
        }
      };
    });

    const result: IRequestResult = {
      queries: {
        clientHistory
      },
      _params: [{ cardId }],
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

  const { fetchAsSingletonObject, releaseTransaction, generateId } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const { CONTENT, historyType, CARDKEY, CREATOR } = req.body;

    const ID = await (() => {
      if (isNaN(id) || id <= 0) {
        return generateId();
      };
      return id;
    })() ;

    const sql = isInsertMode
      ? `
        INSERT INTO USR$CRM_DEALS_CLIENT_STORY(ID, USR$STORY_TYPE_KEY, USR$CONTENT, USR$CARDKEY, USR$CREATORKEY)
        VALUES(:ID, :STORY_TYPE_KEY, :CONTENT, :CARDKEY, :CREATORKEY)
        RETURNING ID`
      : `
        UPDATE USR$CRM_DEALS_CLIENT_STORY
        SET
          USR$STORY_TYPE_KEY = :STORY_TYPE_KEY,
          USR$CONTENT = :CONTENT,
          USR$CARDKEY = :CARDKEY,
          USR$CREATORKEY = :CREATORKEY
        WHERE ID = :ID
        RETURNING ID`;

    const params = {
      ID,
      CONTENT,
      STORY_TYPE_KEY: historyType.ID,
      CARDKEY: CARDKEY,
      CREATORKEY: CREATOR.ID
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


export const clientHistoryController = {
  get,
  upsert
};
