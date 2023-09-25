import { IDataSchema, IRequestResult, ITableSchema } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';
import { sqlQuery } from '../../utils/sqlQuery';

export const getSumByPeriod: RequestHandler = async(req, res) => {
  // sumbyperiod/?departmentId=147016912&dateBegin=1577912400000&dateEnd=1643662800000

  const dateBegin = new Date(Number(req.query.dateBegin));
  if (isNaN(dateBegin.getTime())) {
    return res.status(422).send(resultError('Не указано поле "dateBegin"'));
  };

  const dateEnd = new Date(Number(req.query.dateEnd));
  if (isNaN(dateEnd.getTime())) {
    return res.status(422).send(resultError('Не указано поле "dateEnd"'));
  };

  const jobWorkIds = req.query.workTypes as string;
  const contractIds = req.query.contracts as string;
  const departmentIds = req.query.departments as string;

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const schema: IDataSchema = {
      sumByperiod: {
        ONDATE: {
          type: 'date'
        }
      }
    };

    const applySchema = (schema: ITableSchema, data: object[]) => {
      if (schema) {
        for (const rec of data) {
          for (const fld of Object.keys(rec)) {
            if ((schema[fld]?.type === 'date' || schema[fld]?.type === 'timestamp') && rec[fld] !== null) {
              rec[fld] = (rec[fld] as Date).getTime();
            }
          }
        }
      };

      return data;
    };

    const getParams: any = (withKeys = false) => {
      const arr: Array<any | { [key: string]: any}> = [];
      dateBegin
        ? withKeys ? arr.push({ dateBegin }) : arr.push(dateBegin)
        : null;
      dateEnd
        ? withKeys ? arr.push({ dateEnd }) : arr.push(dateEnd)
        : null;
      // departmentId
      //   ? withKeys ? arr.push({ departmentId }) : arr.push(departmentId)
      //   : null;
      // jobWorkId
      //   ? withKeys ? arr.push({ jobWorkId }) : arr.push(jobWorkId)
      //   : null;
      // contractIds
      //   ? withKeys ? arr.push({ departmentId }) : arr.push(departmentId)

      return (arr?.length > 0 ? arr : undefined);
    };

    const namedSQL = new sqlQuery(attachment, transaction);
    namedSQL.SQLtext = `
      SELECT
        c.USR$DOCDATE AS ONDATE,
        SUM(c.USR$SUMNCU) AMOUNT
      FROM
        USR$CRM_CUSTOMER c
        JOIN gd_document doc on doc.ID = c.USR$ID
        ${departmentIds ? 'JOIN gd_contact dep on dep.ID = c.USR$DEPOTKEY' : ''}
        ${jobWorkIds ? 'JOIN USR$BG_JOBWORK jb ON jb.ID = c.USR$JOBWORKKEY' : ''}
      WHERE
        c.USR$DOCDATE BETWEEN :DateBegin AND :DateEnd
        ${departmentIds ? `AND dep.ID IN (${departmentIds})` : ''}
        ${contractIds ? `AND c.USR$JOBKEY IN (${contractIds})` : ''}
        ${jobWorkIds ? `AND jb.ID IN (${jobWorkIds})` : ''}
      GROUP BY c.USR$DOCDATE
      ORDER BY 1`;
    namedSQL.setParamByName('DateBegin').value = dateBegin;
    namedSQL.setParamByName('DateEnd').value = dateEnd;

    const sumByperiod = await namedSQL.execute();
    applySchema(schema.sumByperiod, sumByperiod);

    const result: IRequestResult = {
      queries: { sumByperiod },
      _params: getParams(true),
      _schema: schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

