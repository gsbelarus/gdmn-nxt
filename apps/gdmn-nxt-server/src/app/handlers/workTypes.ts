import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '../utils/db-connection';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema = {};


    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: 'workTypes',
        query: `
          SELECT
            w.ID,
            w.USR$NAME,
            w.USR$CONTRACTJOBKEY
          FROM
            USR$BG_JOBWORK w
          WHERE
            coalesce(w.USR$NOTACTIVE,1) = 0`
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(execQuery)))
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

export default { get };
