import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';

export const get: RequestHandler = async(req, res) => {
  const customerId = parseInt(req.params.customerId);

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const schema: IDataSchema = {
      actCompletion: {
        DOCUMENTDATE: {
          type: 'date'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();
        const sch = schema[name];

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
      } finally {
        await rs.close();
      }
    };

    const query = {
      name: 'actCompletion',
      query: `
        SELECT DISTINCT
          --doc.ID,
          RDB$GET_CONTEXT('USER_TRANSACTION', 'RowNumber') AS ID,
          RDB$SET_CONTEXT('USER_TRANSACTION', 'RowNumber', COALESCE(CAST(RDB$GET_CONTEXT('USER_TRANSACTION', 'RowNumber') AS INTEGER), 0) + 1),
          job.USR$NUMBER as JOB_NUMBER,
          dep.NAME as DEPT_NAME,
          doc.NUMBER,
          doc.DOCUMENTDATE,
          c.USR$SUMNCU,
          jwork.USR$NAME as JOBWORKNAME
        FROM
          USR$CRM_CUSTOMER c
          JOIN gd_document doc ON doc.ID = c.USR$ID
          JOIN USR$BG_CONTRACTJOB job ON job.ID = c.USR$JOBKEY
          JOIN gd_contact dep ON dep.ID = c.USR$DEPOTKEY
          LEFT JOIN USR$BG_JOBWORK jwork ON jwork.ID = c.USR$JOBWORKKEY
        ${isNaN(customerId) ? '' : 'WHERE c.USR$CUSTOMERKEY = ?'}
        ORDER BY
          doc.DOCUMENTDATE DESC`,
      params: isNaN(customerId) ? undefined : [customerId]
    };

    const actCompletion = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: { actCompletion },
      _params: isNaN(customerId) ? undefined : [{ customerId: customerId }],
      _schema: schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

export default { get };
