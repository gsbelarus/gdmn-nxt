import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { acquireReadTransaction } from '@gdmn-nxt/db-connection';
import { resultError } from '../../responseMessages';

const get: RequestHandler = async (req, res) => {
  const dealId = parseInt(req.params.id);
  const { fetchAsObject, releaseReadTransaction, fetchAsSingletonObject } = await acquireReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const documentType = `
      SELECT
        SUM(IIF(r.XID = 349866728 AND r.DBID = 1252807417, r.ID, NULL)) AS RequestId,
        SUM(IIF(r.XID = 148474792 AND r.DBID = 218998645, r.ID, NULL)) AS ActId,
        SUM(IIF(r.XID = 155385807 AND r.DBID = 347126479, r.ID, NULL)) AS InvoiceId
      FROM GD_DOCUMENTTYPE d
      JOIN GD_RUID r ON r.ID = d.ID
      WHERE
        (r.XID = 349866728 AND r.DBID = 1252807417) /* Заявка ИЦ-26 */
        OR
        (r.XID = 148474792 AND r.DBID = 218998645) /* Акт выполненных работ */
        OR
        (r.XID = 155385807 AND r.DBID = 347126479) /* Счет-акт */`;

    const documentTypeIds = await fetchAsSingletonObject(documentType);

    const documentsQuery = `
        SELECT
          doc.ID,
          'Заявка ИЦ-26 №' || doc.NUMBER || ' от ' || doc.DOCUMENTDATE AS DESCRIPTION
        FROM
          GD_DOCUMENT doc
          JOIN USR$BG_REQUESTOW r on r.DOCUMENTKEY = doc.id
        WHERE
          doc.DOCUMENTTYPEKEY = :RequestId
          and r.USR$CRM_DEALKEY = :dealId
        UNION ALL
        SELECT
          docc.ID,
          'Калькуляция № ' ||
          docc.NUMBER ||
          ' от ' ||
          CAST(docc.DOCUMENTDATE as date) ||
          '  на сумму ' ||
          CAST((SELECT SUM(line.USR$VALUE) FROM USR$PD_CALCLINE line WHERE line.MASTERKEY = c.DOCUMENTKEY
            and line.USR$ACTIVITIESKEY = 189467574) as NUMERIC(15,2)) || ' руб.коп.'
        FROM
          USR$PD_CALC c
          JOIN GD_DOCUMENT docc on docc.id = c.DOCUMENTKEY
          JOIN USR$BG_REQUESTOW r ON docc.USR$DEALSKEY = r.USR$CRM_DEALKEY
          JOIN GD_DOCUMENT doc ON doc.ID = r.DOCUMENTKEY
        WHERE
          doc.DOCUMENTTYPEKEY = :RequestId
          AND r.USR$CRM_DEALKEY = :dealId
        UNION ALL
        SELECT
          docact.ID,
          'Акт выполненных работ № ' ||
          docact.NUMBER ||
          ' от ' ||
          CAST(docact.DOCUMENTDATE as date) ||
          '  на сумму ' ||
          CAST(  act.USR$SUMWITHNDSNCU  as NUMERIC(15,2))
          || ' руб.коп.'
        FROM
          USR$BG_ACT_CONTRAC act
          JOIN  GD_DOCUMENT docact on docact.id = act.DOCUMENTKEY
          JOIN USR$BG_REQUESTOW r ON docact.USR$DEALSKEY = r.USR$CRM_DEALKEY
          JOIN GD_DOCUMENT doc ON doc.ID = r.DOCUMENTKEY
        WHERE
          doc.DOCUMENTTYPEKEY = :RequestId
          AND r.USR$CRM_DEALKEY = :dealId
          AND docact.documenttypekey = :ActId
        UNION ALL
        SELECT
          docact2.ID,
          'Счет-акт № ' ||
          docact2.NUMBER ||
          ' от ' ||
          CAST(docact2.DOCUMENTDATE as date) ||
          '  на сумму ' ||
          CAST(  act2.USR$SUMWITHNDSNCU  as NUMERIC(15,2)) || ' руб.коп.'
        FROM
          USR$BG_ACT_CONTRAC act2
          JOIN GD_DOCUMENT docact2 on docact2.id = act2.DOCUMENTKEY
          JOIN USR$BG_REQUESTOW r ON docact2.USR$DEALSKEY = r.USR$CRM_DEALKEY
          JOIN GD_DOCUMENT doc ON doc.ID = r.DOCUMENTKEY
        WHERE
          doc.DOCUMENTTYPEKEY = :RequestId
          AND r.USR$CRM_DEALKEY = :dealId
          AND docact2.documenttypekey = :InvoiceId
        UNION ALL
        SELECT
          docdog.ID,
          'Договор № ' ||
          docdog.NUMBER ||
          ' от ' ||
          CAST(docdog.DOCUMENTDATE as date) ||
          '  на сумму ' ||
          CAST(  dog.USR$SUMM  as NUMERIC(15,2)) ||
          ' руб.коп.'
        FROM USR$BG_CONTRACT dog
          JOIN  GD_DOCUMENT docdog on docdog.id = dog.DOCUMENTKEY
          JOIN USR$BG_REQUESTOW r ON docdog.USR$DEALSKEY = r.USR$CRM_DEALKEY
          JOIN GD_DOCUMENT doc ON doc.ID = r.DOCUMENTKEY
        WHERE
          doc.DOCUMENTTYPEKEY = :RequestId
          AND r.USR$CRM_DEALKEY = :dealId`;

    const params = { dealId, RequestId: documentTypeIds['REQUESTID'], ActId: documentTypeIds['ACTID'], InvoiceId: documentTypeIds['INVOICEID'] };

    const documents = await fetchAsObject(documentsQuery, params);

    const result: IRequestResult = {
      queries: {
        documents
      },
      _params: [{ dealId }],
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  }
};

export const documentsCatalog = { get };
