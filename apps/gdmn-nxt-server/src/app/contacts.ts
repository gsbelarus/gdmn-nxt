import { ICustomer, IDataSchema, ILabelsContact, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from './utils/db-connection';
import { resultError } from './responseMessages';
import { genId } from './utils/genId';

export const getContacts: RequestHandler = async (req, res) => {
  const { pageSize, pageNo } = req.query;

  let fromRecord = 0;
  let toRecord: number;

  if (pageNo && pageSize) {
    fromRecord = Number(pageNo) * Number(pageSize);
    toRecord = fromRecord + Number(pageSize);

    if (fromRecord === 0 ) fromRecord = 1;
  };

  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      contacts: {
        CONTRACTS: {
          type: 'array'
        },
        DEPARTMENTS: {
          type: 'array'
        }
      }
    };

    const getParams: any = (withKeys = false) => {
      const arr: Array<string | { [key: string]: string}> = [];
      req.params.taxId
        ? withKeys ? arr.push({ taxId: req.params.taxId }) : arr.push(req.params.taxId)
        : null;
      req.params.rootId
        ? withKeys ? arr.push({ rootId: req.params.rootId }) : arr.push(req.params.rootId)
        : null;

      return (arr?.length > 0 ? arr : undefined);
    };

    const execQuery = async (query: string) => {

      const aTime = new Date().getTime();
      const rs = await attachment.executeQuery(transaction, query, []);
      const data = await rs.fetchAsObject();
      console.log(`fetch time ${new Date().getTime() - aTime} ms`);
      await rs.close();

      return data as any;
    };


    const queries = [
      // 'SELECT DISTINCT USR$JOBKEY, USR$DEPOTKEY, USR$CUSTOMERKEY FROM USR$CRM_CUSTOMER ORDER BY USR$CUSTOMERKEY, USR$JOBKEY, USR$DEPOTKEY',
      'SELECT DISTINCT USR$JOBKEY, USR$CUSTOMERKEY FROM USR$CRM_CUSTOMER',
      'SELECT DISTINCT USR$DEPOTKEY, USR$CUSTOMERKEY FROM USR$CRM_CUSTOMER',
      'SELECT ID, NAME FROM GD_CONTACT WHERE CONTACTTYPE=0',
      `SELECT
         c.id,
         c.name,
         c.phone,
         c.email,
         c.parent,
         comp.taxid,
         c.address
       FROM
         gd_contact c
         join gd_companycode comp on comp.COMPANYKEY = c.id
         ${req.params.taxId ? `JOIN gd_companycode cc ON cc.companykey = c.id AND cc.taxid = '${req.params.taxId}'` : ''}
         ${req.params.rootId ? `JOIN GD_CONTACT rootItem ON c.LB > rootItem.LB AND c.RB <= rootItem.RB AND rootItem.ID = ${req.params.rootId}` : ''}
       WHERE
         c.contacttype IN (3,5)
       ORDER BY c.ID DESC
       ${fromRecord > 0 ? `ROWS ${fromRecord} TO ${toRecord}` : ''}`,
      `SELECT
          l.ID,
          l.USR$NAME,
          l.USR$COLOR,
          cl.USR$CONTACTKEY
        FROM USR$CRM_CONTACT_LABELS cl
        JOIN GD_CONTACT con ON con.ID = cl.USR$CONTACTKEY
        JOIN USR$CRM_LABELS l ON l.ID = cl.USR$LABELKEY
        ORDER BY cl.USR$CONTACTKEY`
    ];

    const t = new Date().getTime();

    // const [rawContracts] = await Promise.all(queries.map(execQuery));
    // const rawFolders = [];
    // const rawContacts = [];
    // const rawLabels = [];
    // const rawDepartment = [];
    const [rawContracts, rawDepartment, rawFolders, rawContacts, rawLabels] = await Promise.all(queries.map(execQuery));


    // console.log(`ExecQuery time ${new Date().getTime() - t} ms`);

    interface IMapOfArrays {
      [customerId: string]: any[];
    };

    const contracts: IMapOfArrays = {};
    const departments: IMapOfArrays = {};
    const labels: IMapOfArrays = {};

    const tMap = new Date().getTime();

    rawContracts.forEach(c => {
      if (contracts[c.USR$CUSTOMERKEY]) {
        if (!contracts[c.USR$CUSTOMERKEY].includes(c.USR$JOBKEY)) {
          contracts[c.USR$CUSTOMERKEY].push(c.USR$JOBKEY);
        }
      } else {
        contracts[c.USR$CUSTOMERKEY] = [c.USR$JOBKEY];
      };

      // if (departments[c.USR$CUSTOMERKEY]) {
      //   if (!departments[c.USR$CUSTOMERKEY].includes(c.USR$DEPOTKEY)) {
      //     departments[c.USR$CUSTOMERKEY].push(c.USR$DEPOTKEY);
      //   }
      // } else {
      //   departments[c.USR$CUSTOMERKEY] = [c.USR$DEPOTKEY];
      // };
    });


    rawDepartment.forEach(c => {

      if (departments[c.USR$CUSTOMERKEY]) {
        if (!departments[c.USR$CUSTOMERKEY].includes(c.USR$DEPOTKEY)) {
          departments[c.USR$CUSTOMERKEY].push(c.USR$DEPOTKEY);
        }
      } else {
        departments[c.USR$CUSTOMERKEY] = [c.USR$DEPOTKEY];
      };
    });

    rawLabels.map(l => {
      if (labels[l.USR$CONTACTKEY]) {
        if (!labels[l.USR$CONTACTKEY].includes(l.ID)) {
          labels[l.USR$CONTACTKEY].push({ ...l });
        }
      } else {
        labels[l.USR$CONTACTKEY] = [{ ...l }];
      };
    });

    // console.log(`Map time ${new Date().getTime() - tMap} ms`);

    interface IFolders {
      [id: string]: string;
    };

    const folders: IFolders = rawFolders.reduce((p, f) => {
      p[f.ID] = f.NAME;
      return p;
    }, {});

    const tCon = new Date().getTime();

    const contacts: ICustomer[] = rawContacts.map(c => {
      const DEPARTMENTS = departments[c.ID]?.map(d => ({
        ID: d
      })) ?? null;

      const CONTRACTS = contracts[c.ID]?.map(c => ({
        ID: c
      })) ?? null;

      const LABELS = labels[c.ID] ?? null;

      return {
        ...c,
        NAME: c.NAME || '<не указано>',
        DEPARTMENTS,
        CONTRACTS,
        LABELS,
        FOLDERNAME: folders[c.PARENT]
      };
    });

    // console.log(`Serialize contacts time ${new Date().getTime() - tCon} ms`);

    const result: IRequestResult = {
      queries: { contacts },
      _params: getParams(true),
      _schema
    };

    console.log(`Contacts time ${new Date().getTime() - t} ms`);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

export const updateContact: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { NAME, PHONE, EMAIL, PARENT, ADDRESS } = req.body;
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    try {
      await attachment.execute(
        transaction,
        `UPDATE GD_CONTACT
         SET
           NAME = ?,
           PHONE = ?,
           EMAIL = ?,
           PARENT = ?,
           ADDRESS = ?
         WHERE ID = ?`,
        [NAME, PHONE, EMAIL, PARENT, ADDRESS, id]
      );
    } catch (error) {
      return res.status(500).send({ 'errorMessage': error.message });
    }

    const resultSet = await attachment.executeQuery(
      transaction,
      `SELECT
         con.ID,
         con.PARENT,
         con.NAME,
         con.EMAIL,
         con.PHONE,
         par.NAME,
         con.ADDRESS
       FROM GD_CONTACT con
       JOIN GD_CONTACT par ON par.ID = con.PARENT
       WHERE con.ID = ?`,
      [id]
    );

    const row = await resultSet.fetch();

    const _schema = { };

    const result: IRequestResult = {
      queries: {
        contacts: [{
          ID: row[0][0],
          PARENT: row[0][1],
          NAME: row[0][2],
          EMAIL: row[0][3],
          PHONE: row[0][4],
          FOLDERNAME: row[0][5],
          ADDRESS: row[0][6]
        }]
      },
      _schema
    };

    await resultSet.close();
    await transaction.commit();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send({ 'errorMessage': error });
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  }
};

export const addContact: RequestHandler = async (req, res) => {
  const { NAME, PHONE, EMAIL, PARENT, ADDRESS, TAXID, labels } = req.body;
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    const resultSet = await attachment.executeQuery(
      transaction,
      `EXECUTE BLOCK(
        NAME  TYPE OF COLUMN GD_CONTACT.NAME = ?,
        EMAIL TYPE OF COLUMN GD_CONTACT.EMAIL = ?,
        PHONE TYPE OF COLUMN GD_CONTACT.PHONE = ?,
        PARENT TYPE OF COLUMN GD_CONTACT.PARENT = ?,
        TAXID TYPE OF COLUMN GD_COMPANYCODE.TAXID = ?
      )
      RETURNS(
        ret_ID    INTEGER,
        ret_NAME  TYPE OF COLUMN GD_CONTACT.NAME,
        ret_EMAIL TYPE OF COLUMN GD_CONTACT.EMAIL,
        ret_PHONE TYPE OF COLUMN GD_CONTACT.PHONE,
        ret_PARENT TYPE OF COLUMN GD_CONTACT.PARENT,
        ret_FOLDERNAME TYPE OF COLUMN GD_CONTACT.NAME,
        ret_ADDRESS TYPE OF COLUMN GD_CONTACT.ADDRESS,
        ret_TAXID TYPE OF COLUMN GD_COMPANYCODE.TAXID
      )
      AS
      BEGIN
        INSERT INTO GD_CONTACT(CONTACTTYPE, PARENT, NAME, PHONE, EMAIL, ADDRESS)
        VALUES(3, IIF(:PARENT IS NULL, (SELECT ID FROM GD_RUID WHERE XID = 147002208 AND DBID = 31587988 ROWS 1), :PARENT), :NAME, :PHONE, :EMAIL, :ADDRESS)
        RETURNING ID, PARENT, NAME, PHONE, EMAIL, ADDRESS
        INTO :ret_ID, :ret_PARENT, :ret_NAME, :ret_PHONE, :ret_EMAIL, :ret_ADDRESS;
        SELECT NAME FROM GD_CONTACT WHERE ID = :ret_PARENT
        INTO :ret_FOLDERNAME;
        IF (ret_ID IS NOT NULL) THEN
          INSERT INTO GD_COMPANY(CONTACTKEY)
          VALUES(:ret_ID);
        IF (ret_ID IS NOT NULL) THEN
          INSERT INTO GD_COMPANYCODE(COMPANYKEY, TAXID)
          VALUES(:ret_ID, :TAXID)
          RETURNING TAXID
          INTO :ret_TAXID;
        SUSPEND;
      END`,
      [NAME, EMAIL, PHONE, PARENT, ADDRESS, TAXID]
    );

    const _schema = {};
    const rows = await resultSet.fetch();

    await resultSet.close();

    const row = rows[0];
    // console.log('rows', rows);

    // const rec = await upsertLabels({ attachment, transaction}, row[0], labels);
    // console.log('rec', rec);

    const result: IRequestResult = {
      queries: {
        contacts: [{
          ID: row[0],
          NAME: row[1],
          EMAIL: row[2],
          PHONE: row[3],
          PARENT: row[4],
          FOLDERNAME: row[5],
          ADDRESS: row[6],
          TAXID: row[7],
          labels: await upsertLabels({ attachment, transaction }, row[0], labels)
        }]
      },
      _schema
    };

    await transaction.commit();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  };
};

export const upsertContact: RequestHandler = async (req, res) => {
  const { id } = req.params;

  if (id && !parseInt(id)) return res.status(422).send(resultError('Field ID is not defined or is not numeric'));

  const { NAME, PHONE, EMAIL, PARENT, ADDRESS, TAXID, LABELS } = req.body;
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    let ID = parseInt(id);
    if (!ID) {
      ID = await genId(attachment, transaction);
    };

    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await attachment.executeSingletonAsObject(transaction, query, params);

      data['LABELS'] = await upsertLabels({ attachment, transaction }, data['ID'], LABELS);

      return [name, data];
    };

    const query = {
      name: 'contact',
      query: `
        EXECUTE BLOCK(
          in_ID  TYPE OF COLUMN GD_CONTACT.ID = ?,
          in_NAME  TYPE OF COLUMN GD_CONTACT.NAME = ?,
          in_EMAIL TYPE OF COLUMN GD_CONTACT.EMAIL = ?,
          in_PHONE TYPE OF COLUMN GD_CONTACT.PHONE = ?,
          in_PARENT TYPE OF COLUMN GD_CONTACT.PARENT = ?,
          in_ADDRESS TYPE OF COLUMN GD_CONTACT.ADDRESS = ?,
          in_TAXID TYPE OF COLUMN GD_COMPANYCODE.TAXID = ?
        )
        RETURNS(
          ID    INTEGER,
          NAME  TYPE OF COLUMN GD_CONTACT.NAME,
          EMAIL TYPE OF COLUMN GD_CONTACT.EMAIL,
          PHONE TYPE OF COLUMN GD_CONTACT.PHONE,
          PARENT TYPE OF COLUMN GD_CONTACT.PARENT,
          FOLDERNAME TYPE OF COLUMN GD_CONTACT.NAME,
          ADDRESS TYPE OF COLUMN GD_CONTACT.ADDRESS,
          AXID TYPE OF COLUMN GD_COMPANYCODE.TAXID
        )
        AS
        BEGIN
          UPDATE OR INSERT INTO GD_CONTACT(ID, CONTACTTYPE, PARENT, NAME, PHONE, EMAIL, ADDRESS)
          VALUES(:in_ID, 3, IIF(:in_PARENT IS NULL, (SELECT ID FROM GD_RUID WHERE XID = 147002208 AND DBID = 31587988 ROWS 1), :in_PARENT), :in_NAME, :in_PHONE, :in_EMAIL, :in_ADDRESS)
          MATCHING(ID)
          RETURNING ID, PARENT, NAME, PHONE, EMAIL, ADDRESS
          INTO :ID, :PARENT, :NAME, :PHONE, :EMAIL, :ADDRESS;
          SELECT NAME FROM GD_CONTACT WHERE ID = :PARENT
          INTO :FOLDERNAME;
          IF (ID IS NOT NULL) THEN
            UPDATE OR INSERT INTO GD_COMPANY(CONTACTKEY)
            VALUES(:ID)
            MATCHING(CONTACTKEY);
          IF (ID IS NOT NULL) THEN
            UPDATE OR INSERT INTO GD_COMPANYCODE(COMPANYKEY, TAXID)
            VALUES(:ID, :in_TAXID)
            MATCHING(COMPANYKEY)
            RETURNING TAXID
            INTO :in_TAXID;
          SUSPEND;
        END`,
      params: [ID, NAME, EMAIL, PHONE, PARENT, ADDRESS, TAXID],
    };


    const row = await Promise.resolve(execQuery(query));
    // row['LABELS'] = await upsertLabels({ attachment, transaction }, row['ID'], LABELS);

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries([row])
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  };
};

export const deleteContact: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { attachment, transaction } = await startTransaction(req.sessionID);

  try {
    await attachment.execute(
      transaction,
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      AS
      BEGIN
        DELETE FROM GD_COMPANYCODE WHERE COMPANYKEY = :ID;
        DELETE FROM GD_COMPANY WHERE CONTACTKEY = :ID;
        DELETE FROM GD_CONTACT WHERE ID = :ID;
      END`,
      [id]
    );

    await transaction.commit();
    return res.status(200).send(id);
  } catch (error) {
    return res.status(500).send({ 'errorMessage': error.message });
  } finally {
    await releaseTransaction(req.sessionID, transaction);
  }
};

export const getContactHierarchy : RequestHandler = async (req, res) => {
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

    const queries = [
      {
        name: 'hierarchy',
        query: `
          SELECT
            z.ID,
            z.LB,
            z.RB,
            z.PARENT,
            z.NAME
          FROM
            GD_CONTACT z
          WHERE
            Z.CONTACTTYPE  =  0`
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
      },
      _schema
    };

    return res.json(result);
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsertLabels = async(firebirdPropsL: any, contactId: number, labels: ILabelsContact[]): Promise<ILabelsContact[]> => {
  if (!labels || labels?.length === 0) {
    return [];
  };

  const contactLabels = labels.map(label => ({ CONTACT: contactId, LABELKEY: label.ID }));

  const { attachment, transaction } = firebirdPropsL;

  try {
    /** Поскольку мы передаём весь массив лейблов, то удалим все прежние  */

    // const queries = [
    //   {
    //     query: 'DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = ?',
    //     params: [contactId]
    //   },
    //   {
    //     query: 'DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = ?',
    //     params: [contactId]
    //   }

    // ]
    const deleteSQL = 'DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = ?';

    await Promise.all(
      [...new Set(contactLabels.map(el => el.CONTACT))]
        .map(async contact => {
          await attachment.execute(transaction, deleteSQL, [contact]);
        })
    );

    const insertSQL = `
      EXECUTE BLOCK(
        CONTACTKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$CONTACTKEY = ?,
        LABELKEY TYPE OF COLUMN USR$CRM_CONTACT_LABELS.USR$LABELKEY = ?
      )
      RETURNS(
        ID TYPE OF COLUMN USR$CRM_LABELS.ID
      )
      AS
      BEGIN
        DELETE FROM USR$CRM_CONTACT_LABELS WHERE USR$CONTACTKEY = :CONTACTKEY AND USR$LABELKEY = :LABELKEY ;

        INSERT INTO USR$CRM_CONTACT_LABELS(USR$CONTACTKEY, USR$LABELKEY)
        VALUES(:CONTACTKEY, :LABELKEY);

        SELECT ID
        FROM USR$CRM_LABELS
        WHERE ID = :LABELKEY
        INTO :ID;

        SUSPEND;
      END`;

    const records = await Promise.all(contactLabels.map(async label => {
      return (await attachment.executeReturningAsObject(transaction, insertSQL, Object.values(label)));
    }));

    return records as ILabelsContact[];
  } catch (error) {
    console.log('catch', error);

    return;
  } finally {
    // await closeConnection(client, attachment, transaction);
  };
};
