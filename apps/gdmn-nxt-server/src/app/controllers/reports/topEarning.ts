import { IQuery, IDataRecord, IRequestResult } from '@gsbelarus/util-api-types';
import { parseParams } from '@gsbelarus/util-helpers';
import { parseIntDef } from '@gsbelarus/util-useful';
import { RequestHandler } from 'express';import { resultError } from '../../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';
;

export const getTopEarning: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: IQuery) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject<IDataRecord>();
        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const { dates = [], depId, jobId, jobWorkId, customerCount = 10 } = req.body;

    if (dates.length === 0 || dates.length > 2) return res.status(422).send(resultError('Не указан период'));

    if (!(new Date(dates[0]) instanceof Date)) return res.status(422).send(resultError('\'Начало периода\' неверного формата'));
    if (!(new Date(dates[1]) instanceof Date)) return res.status(422).send(resultError('\'Конец периода\' неверного формата'));

    const query: IQuery =
      {
        name: 'topEarning',
        query:
          `SELECT
            con.ID,
            con.NAME,
            SUM(c.USR$SUMNCU) AS AMOUNT
          FROM
            USR$CRM_CUSTOMER c
            JOIN GD_CONTACT con ON con.ID = c.USR$CUSTOMERKEY
          WHERE
            c.USR$DOCDATE BETWEEN ? AND ?
            ${depId ? `AND c.USR$DEPOTKEY = ${depId}` : ''}
            ${jobId ? `AND c.USR$JOBKEY = ${jobId}` : ''}
            ${jobWorkId ? `AND c.USR$JOBWORKKEY = ${jobWorkId}` : ''}
          GROUP BY
            con.NAME,
            con.ID
          ORDER BY 3 DESC
          ROWS ${customerCount}`,
        params: [new Date(dates[0]), new Date(dates[1])]
      };

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries([await Promise.resolve(execQuery(query))])
      },
      _params: [{
        dateBegin: dates[0],
        dateEnd: dates[1],
        ...(depId && { depId }),
        ...(jobId && { jobId }),
        ...(jobWorkId && { jobWorkId }),
        customerCount
      }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};
