import { ILabelsContact, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from '@gdmn-nxt/db-connection';

export const getLabelsContact: RequestHandler = async (req, res) => {
  //  console.log('getLabelsContact', req.params.contactId ? req.params.contactId : 666);

  // return res.status(500).send({ "errorMessage": "test"});

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema = { };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();
        const sch = _schema[name];

        return [name, data];
      } finally {
        await rs.close();
      }
    };

    const getParams: any = (withKeys: boolean) => {
      const arr: Array<string | { [key: string]: string}> = [];
      req.params.contactId
        ? withKeys ? arr.push({ contactId: req.params.contactId }) : arr.push(req.params.contactId)
        : null;

      return (arr?.length > 0 ? arr : undefined);
    };


    const queries = [
      {
        name: 'labels',
        query: `
          SELECT
            l.ID,
            l.USR$CONTACTKEY,
            l.USR$LABELKEY
          FROM USR$CRM_CONTACT_LABELS l
          JOIN GD_CONTACT con ON con.ID = l.USR$LABELKEY
          ${req.params.contactId ? ' WHERE l.USR$CONTACTKEY = ?' : ''}`,
        params: getParams(false)
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _params: getParams(true),
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send({ 'errorMessage': error.message });
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

export const addLabelsContact: RequestHandler = async (req, res) => {
  const labels: ILabelsContact[] = req.body;

  if (labels.length === 0) {
    return res.status(400).send({ 'errorMessage': 'Пустой набор входящих данных' });
  }
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    /** Поскольку мы передаём весь массив лейблов, то удалим все прежние  */
    const deleteSQL = 'DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = ?';

    await Promise.all(
      [...new Set(labels.map(el => el.USR$CONTACTKEY))]
        .map(async label => {
          await attachment.execute(transaction, deleteSQL, [label]);
        })
    );

    const insertSQL = `
        EXECUTE BLOCK(
          ID TYPE OF COLUMN USR$CRM_CONTACT_LABELS.ID = ?,
          CONTACTKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$CONTACTKEY = ?,
          LABELKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$LABELKEY = ?
        )
        RETURNS(
          res_ID TYPE OF COLUMN USR$CRM_CONTACT_LABELS.ID,
          res_CONTACTKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$CONTACTKEY,
          res_LABELKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$LABELKEY
        )

        AS
        BEGIN
          DELETE FROM USR$CRM_CONTACT_LABELS WHERE ID = :ID;

          INSERT INTO USR$CRM_CONTACT_LABELS(USR$CONTACTKEY, USR$LABELKEY)
          VALUES(:CONTACTKEY, :LABELKEY)
          RETURNING ID, USR$CONTACTKEY, USR$LABELKEY INTO :res_ID, :res_CONTACTKEY, :res_LABELKEY;

          SUSPEND;
        END`;

    const unresolvedPromises = labels.map(async label => {
      return (await attachment.executeSingletonAsObject(transaction, insertSQL, Object.values(label)));
    });

    const records = await Promise.all(unresolvedPromises);

    const _schema = { };
    const result: IRequestResult = {
      queries: {
        'labels': records
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export const deleteLabelsContact: RequestHandler = async (req, res) => {
  const { contactId } = req.params;
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    await attachment.execute(
      transaction,
      'DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = ?',
      [contactId]
    );

    return res.status(204).send();
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  }
};
