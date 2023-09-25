import { IChartBusinessDirection, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../../responseMessages';
import { acquireReadTransaction } from '@gdmn-nxt/db-connection';

interface IMapOfArrays {
  [key: string]: any;
};

export const getBusinessDirection: RequestHandler = async(req, res) => {
  const dateBegin = new Date(Number(req.query.dateBegin));
  if (isNaN(dateBegin.getTime())) {
    return res.status(422).send(resultError('Не указано поле "dateBegin"'));
  };

  const dateEnd = new Date(Number(req.query.dateEnd));
  if (isNaN(dateEnd.getTime())) {
    return res.status(422).send(resultError('Не указано поле "dateEnd"'));
  };

  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);

  try {
    const schema = {};

    const sql = `
      SELECT
        dir.USR$NAME as DIRECTION_NAME,
        b.USR$NAME BUSINESS_NAME,
        CAST(SUM(l.USR$SUMNCU)/1000.00 as NUMERIC(15, 2)) as AMOUNT
      from
        gd_document doc
        JOIN GD_DOCUMENTTYPE dtype ON dtype.ID = doc.DOCUMENTTYPEKEY
        JOIN GD_RUID r ON r.ID = dtype.ID
        join usr$BG_OPERLINE l on l.DOCUMENTKEY = doc.id
        left join gd_contact dep on dep.id = l.USR$DEPOTKEY
        left join USR$BG_JOBWORK w on w.ID = l.USR$JOBWORKKEY
        left join USR$BG_BISNESS_PROC b on b.ID = w.USR$BUSINESSPROCKEY
        left join USR$BG_contractjob job on job.ID = l.USR$JOBKEY
        join USR$BG_DIRECTIONS dir on dir.ID = b.USR$DIRECTIONSKEY
        left join GD_CONTACT depN on depN.id =  dep.USR$BG_DEP
      WHERE
        r.XID = 282520663 AND r.DBID = 73095219 AND
        doc.DOCUMENTDATE BETWEEN :dateBegin AND :dateEnd
      GROUP BY 1,2
      HAVING SUM(l.USR$SUMNCU) <> 0
      ORDER BY 1,2`;

    const rawsBusinessDirection = await fetchAsObject(sql, { dateBegin, dateEnd });

    const businessProcessesMap: IMapOfArrays = {};

    rawsBusinessDirection.forEach(r => {
      if (businessProcessesMap[r['DIRECTION_NAME']]) {
        businessProcessesMap[r['DIRECTION_NAME']].push({
          name: r['BUSINESS_NAME'],
          amount: r['AMOUNT'],
        });
      } else {
        businessProcessesMap[r['DIRECTION_NAME']] = [{
          name: r['BUSINESS_NAME'],
          amount: r['AMOUNT'],
        }];
      }
    });

    const businessDirection: IChartBusinessDirection[] = [];
    for (const key in businessProcessesMap) {
      businessDirection.push({
        name: key,
        amount: businessProcessesMap[key]?.reduce((acc, { amount }) => Math.round((acc + amount) * 100) / 100, 0),
        businessProcesses: businessProcessesMap[key]
      });
    }

    const result: IRequestResult = {
      queries: { businessDirection },
      _params: [{ dateBegin, dateEnd }],
      _schema: schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  };
};
