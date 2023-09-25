import { IDataSchema, IQuery, IDataRecord, IRequestResult } from "@gsbelarus/util-api-types";
import { parseIntDef } from "@gsbelarus/util-useful";
import { RequestHandler } from "express";
import { getReadTransaction, releaseReadTransaction } from "@gdmn-nxt/db-connection";

export const getReconciliationStatement: RequestHandler = async (req, res) => {

  const dateBegin = new Date(parseIntDef(req.params.dateBegin, new Date(2021, 0, 1).getTime()));
  const dateEnd = new Date(parseIntDef(req.params.dateEnd, new Date(2021, 2, 1).getTime()));
  const customerId = parseIntDef(req.params.custId, 148_333_193);
  const holdingId = 148_284_864;
  const account_id = 148529707;
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      customerDebt: {
        SALDO: {
          type: 'curr'
        }
      },
      customerAct: {
        DOCUMENTDATE: {
          type: 'date'
        }
      },
      _params: {
        dateBegin: {
          type: 'date'
        },
        dateEnd: {
          type: 'date'
        }
      }
    };

    const execQuery = async ({ name, query, params }: IQuery) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject<IDataRecord>();
        const sch = _schema[name];

        if (sch) {
          for (const rec of data) {
            for (const fld of Object.keys(rec)) {
              if (sch[fld]?.type === 'date') {
                rec[fld] = (rec[fld] as Date).getTime();
              }
            }
          }
        }

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const queries: IQuery[] = [
      {
        name: 'customerDebt',
        query:
          `select
              e.usr$bg_dcontractjobkey,
              job.usr$number,
              sum(e.debitncu - e.creditncu) as saldo
          from
            ac_entry e
            left join gd_contact con on e.usr$gs_customer = con.id
            LEFT JOIN usr$bg_contractjob job ON job.id = e.usr$bg_dcontractjobkey
          where
            (e.accountkey = 148040931 or e.accountkey = 148040932 or e.accountkey = 148040933 or e.accountkey = 148040934 or
              e.accountkey = 148040935 or e.accountkey = 148040936 or e.accountkey = 148040939 or e.accountkey = 148040940
              or e.accountkey = 148040943 or e.accountkey = 148040944 or e.accountkey = 148040945  or e.accountkey = 165771266)
            and e.entrydate <= ? and e.usr$gs_customer = ?
          group by
            1, 2
          having
            sum(e.debitncu - e.creditncu) <> 0
          order by
            2 desc`,
        params: [dateEnd, customerId]
      },
      {
        name: 'customerAct',
        query:
          `select
            doc.DOCUMENTDATE,
            cust.name as customer,
            act.USR$SUMACT as sumact,
            act.USR$DESCRIPTION,
            empl.name as emplname
          from
            gd_document doc
            left join USR$BG_CUSTBUH act on act.DOCUMENTKEY = doc.id
            left join gd_contact cust on cust.ID = act.USR$CUSTOMERKEY
            left join gd_contact empl on empl.ID = act.USR$EMPLKEY
          where
            doc.DOCUMENTTYPEKEY = 347370489
            and cust.ID = ?
          Order by 1
          `,
        params: [customerId]
      },
      {
        name: 'contact',
        query: `select * from gd_contact where id = ?`,
        params: [customerId]
      },
      {
        name: 'saldo',
        query:
          `SELECT SUM(e.debitncu - e.creditncu) as Saldo
          FROM ac_entry e JOIN ac_account a ON e.accountkey = a.id
              and e.entrydate < ? and e.usr$GS_CUSTOMER = ?
          JOIN ac_account a1 ON a.LB >= a1.LB and a.RB <= a1.RB and a1.id in (${account_id})
          JOIN ac_record r ON e.recordkey = r.id and r.companykey + 0 IN (${holdingId})`,
        params: [dateBegin, customerId]
      },
      {
        name: 'movement',
        query:
          `SELECT  entry.usr$bg_dcontractjobkey as job, a.alias, doct.name, doc.number, doc.documentdate, r.description, job.usr$number as jobnumber,  SUM(entry.creditncu) as GiveSum,
            CAST(0 as numeric(15,2)) as GiveSum2
          FROM ac_entry entry JOIN ac_account a ON entry.accountkey = a.id
              and entry.entrydate >= ? and entry.entrydate <= ? and entry.usr$GS_CUSTOMER = ?
              JOIN ac_account a1 ON a.LB >= a1.LB and a.RB <= a1.RB and a1.id in (${account_id})
              JOIN ac_record r ON entry.recordkey = r.id  AND r.companykey + 0 IN (${holdingId})
              LEFT JOIN gd_document doc ON r.documentkey = doc.id
              LEFT JOIN usr$bg_contractjob job ON job.id = entry.usr$bg_dcontractjobkey
              LEFT JOIN gd_documenttype doct ON doc.documenttypekey = doct.id
          WHERE
              NOT EXISTS(
                SELECT e_m.id FROM
              ac_entry e_m
              JOIN ac_record r_m ON e_m.recordkey=r_m.id
              JOIN ac_entry e_cm ON e_cm.recordkey=r_m.id AND
                e_cm.accountpart <> e_m.accountpart AND
                e_cm.accountkey=e_m.accountkey AND
                (e_m.debitncu=e_cm.creditncu OR
                e_m.creditncu=e_cm.debitncu OR
                e_m.debitcurr=e_cm.creditcurr OR
                e_m.creditcurr=e_cm.debitcurr)AND
                e_m.USR$GS_CUSTOMER=e_cm.USR$GS_CUSTOMER
              WHERE e_m.id = entry.id )
          GROUP BY entry.usr$bg_dcontractjobkey, r.description, a.alias, doct.name, doc.number, doc.documentdate, job.usr$number
          HAVING SUM(entry.creditncu) <> 0

              union

          SELECT  entry.usr$bg_dcontractjobkey as job, a.alias, doct.name, doc.number, doc.documentdate, r.description, job.usr$number as jobnumber, CAST(0 as numeric(15,2)) as GiveSum, SUM(entry.debitncu) as GiveSum2
          FROM ac_entry entry JOIN ac_account a ON entry.accountkey = a.id
              and entry.entrydate >= ? and entry.entrydate <= ? and entry.usr$GS_CUSTOMER = ?
              JOIN ac_account a1 ON a.LB >= a1.LB and a.RB <= a1.RB and a1.id in (${account_id})
              JOIN ac_record r ON entry.recordkey = r.id  AND r.companykey + 0 IN (${holdingId})
              LEFT JOIN gd_document doc ON entry.usr$GS_document = doc.id
              LEFT JOIN usr$bg_contractjob job ON job.id = entry.usr$bg_dcontractjobkey
              LEFT JOIN gd_documenttype doct ON doc.documenttypekey = doct.id
          WHERE
              NOT EXISTS(
                SELECT e_m.id FROM
              ac_entry e_m
              JOIN ac_record r_m ON e_m.recordkey=r_m.id
              JOIN ac_entry e_cm ON e_cm.recordkey=r_m.id AND
                e_cm.accountpart <> e_m.accountpart AND
                e_cm.accountkey=e_m.accountkey AND
                (e_m.debitncu=e_cm.creditncu OR
                e_m.creditncu=e_cm.debitncu OR
                e_m.debitcurr=e_cm.creditcurr OR
                e_m.creditcurr=e_cm.debitcurr)AND
                e_m.USR$GS_CUSTOMER=e_cm.USR$GS_CUSTOMER
              WHERE e_m.id = entry.id )
          GROUP BY entry.usr$bg_dcontractjobkey, r.description, a.alias, doct.name, doc.number, doc.documentdate, job.usr$number
          HAVING SUM(entry.debitncu) <> 0
            ORDER BY  1, 5, 3, 4`,
        params: [dateBegin, dateEnd, customerId, dateBegin, dateEnd, customerId]
      },
      {
        name: 'payment',
        query:
          `SELECT r.description, doct.name, doc.number, doc.documentdate, SUM(entry.debitncu) as GiveSum
          FROM ac_entry entry JOIN ac_account a ON entry.accountkey = a.id
              and entry.entrydate >= ? and entry.entrydate <= ? and entry.usr$GS_CUSTOMER = ?
              JOIN ac_account a1 ON a.LB >= a1.LB and a.RB <= a1.RB and a1.id in (${account_id})
              JOIN ac_record r ON entry.recordkey = r.id  AND r.companykey + 0 IN (${holdingId})
              LEFT JOIN gd_document doc ON r.documentkey = doc.id
              LEFT JOIN gd_documenttype doct ON doc.documenttypekey = doct.id
          WHERE
              NOT EXISTS(
                SELECT e_m.id FROM
              ac_entry e_m
              JOIN ac_record r_m ON e_m.recordkey=r_m.id
              JOIN ac_entry e_cm ON e_cm.recordkey=r_m.id AND
                e_cm.accountpart <> e_m.accountpart AND
                e_cm.accountkey=e_m.accountkey AND
                (e_m.debitncu=e_cm.creditncu OR
                e_m.creditncu=e_cm.debitncu OR
                e_m.debitcurr=e_cm.creditcurr OR
                e_m.creditcurr=e_cm.debitcurr)AND
                e_m.USR$GS_CUSTOMER=e_cm.USR$GS_CUSTOMER
              WHERE e_m.id = entry.id )
          GROUP BY r.description, doct.name, doc.number, doc.documentdate
          HAVING SUM(entry.debitncu) <> 0
          ORDER BY doc.documentdate, doct.name, doc.number`,
        params: [dateBegin, dateEnd, customerId]
      },
      {
        name: 'firm',
        query:
          `SELECT con.*, com.*, chief.Name as Chief, acc.Name as Account FROM gd_contact con JOIN gd_company com ON com.contactkey = con.id
             LEFT JOIN gd_contact chief ON com.DIRECTORKEY = chief.id
             LEFT JOIN gd_contact acc ON com.CHIEFACCOUNTANTKEY = acc.id
             WHERE con.id = ?`,
        params: [holdingId]
      }
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map( q => execQuery(q) )))
      },
      _params: [{ dateBegin: dateBegin.getTime(), dateEnd: dateEnd.getTime() }],
      _schema
    };

    return res.json(result);
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};
