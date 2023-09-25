import { IQuery, IDataRecord, IRequestResult } from '@gsbelarus/util-api-types';
import { parseIntDef } from '@gsbelarus/util-useful';
import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';

export const getRemainsInvoices: RequestHandler = async (req, res) => {
  const onDate = new Date(parseIntDef(req.params.onDate, new Date().getTime()));

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

    const queries: IQuery[] = [
      {
        name: 'remainInvoices',
        query:
          `select
            a.ALIAS,
            a.ID,
            a.name,
            curr.CODE,
            sum(e.DEBITNCU - e.CREDITNCU) as SaldoCurr
          from
            ac_entry e
            join ac_account a on a.id = e.ACCOUNTKEY
            join GD_CURR curr on curr.ID = e.CURRKEY
          where
            e.ENTRYDATE <= ? and
            a.id in (355100, 338278175, 329437051, 353235866, 353938398)
          group by
            1,2,3,4
          having
            sum(e.DEBITNCU - e.CREDITNCU) > 0
          union all
          select
            a.ALIAS,
            a.ID,
            a.name,
            curr.CODE,
            sum(e.DEBITCURR - e.CREDITCURR) as SaldoCurr
          from
            ac_entry e
            join ac_account a on a.id = e.ACCOUNTKEY
            join GD_CURR curr on curr.ID = e.CURRKEY
          where
            e.ENTRYDATE <= ? and curr.id <> 200010 and
            a.id in (355201, 355202, 148348896, 338061063, 353235817, 353235818, 353235819, 353938400, 353938401, 353938402)
          group by
            1,2,3,4
          having sum(e.DEBITCURR - e.CREDITCURR) > 0
          order by 3`,
        params: [onDate, onDate]
      },
    ];


    // const o = await Promise.all(queries.map(execQuery));
    // const o2 = Object.fromEntries(o);
    // console.log(o2);

    // return res.status(200).json({ key: 123 });

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _params: [{ dateBegin: onDate.getTime(), onDate }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};
