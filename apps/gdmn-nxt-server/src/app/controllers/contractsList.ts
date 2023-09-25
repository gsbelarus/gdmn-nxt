import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';
import { resultError } from '../responseMessages';

export const get: RequestHandler = async(req, res) => {
  const companyId = parseInt(req.params.companyId);

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const schema: IDataSchema = {
      contractsList: {
        DOCUMENTDATE: {
          type: 'date'
        },
        DATEBEGIN: {
          type: 'date'
        },
        DATEEND: {
          type: 'date'
        },
        ISACTIVE: {
          type: 'boolean'
        },
        ISBUDGET: {
          type: 'boolean'
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
              if ((sch[fld]?.type === 'boolean') && rec[fld] !== null) {
                rec[fld] = +rec[fld] === 1;
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
      name: 'contractsList',
      query: `
        SELECT
          doc.ID,
          doc.DOCUMENTDATE,
          doc.NUMBER,
          c.USR$ACTIVE ISACTIVE,
          c.USR$BUDGET ISBUDGET,
          dep.name as DEPT_NAME,
          job.USR$NUMBER as JOB_NUMBER,
          c.USR$SUMM SUMNCU,
          c.USR$CURR SUMCURNCU,
          c.USR$DATEBEGIN DATEBEGIN,
          c.USR$DATEEND DATEEND
        FROM
          USR$BG_CONTRACT c
          join gd_document doc on c.DOCUMENTKEY = doc.id
          join gd_contact dep on dep.ID = c.USR$CONTACTKEY
          join usr$bg_contractjob job on job.ID = c.USR$CONTRACTJOBKEY
        WHERE
          c.USR$CUSTOMER = ?
        ORDER BY
          doc.DOCUMENTDATE DESC`,
      params: isNaN(companyId) ? undefined : [companyId]
    };

    const contractsList = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: { contractsList },
      _params: isNaN(companyId) ? undefined : [{ companyId: companyId }],
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
