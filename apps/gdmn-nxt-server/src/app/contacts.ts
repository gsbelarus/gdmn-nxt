import { IBusinessProcess, IContactPerson, ICustomer, IDataSchema, ILabelsContact, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { acquireReadTransaction, getReadTransaction, releaseReadTransaction, releaseTransaction, startTransaction } from './utils/db-connection';
import { resultError } from './responseMessages';
import { genId } from './utils/genId';

export const getContacts: RequestHandler = async (req, res) => {
  const customerId = parseInt(req.params.customerId);

  const { pageSize, pageNo } = req.query;
  const { DEPARTMENTS, CONTRACTS, WORKTYPES, LABELS, BUSINESSPROCESSES, NAME } = req.query;
  const { field: sortField, sort: sortMode } = req.query;

  let fromRecord = 0;
  let toRecord: number;

  if (pageNo && pageSize) {
    fromRecord = Number(pageNo) * Number(pageSize);
    toRecord = fromRecord + Number(pageSize);

    if (fromRecord === 0) fromRecord = 1;
  };

  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);


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

    const execQuery = async ({ name, query }) => {
      const startTime = new Date().getTime();
      // const rs = await attachment.executeQuery(transaction, query, []);
      const data = await fetchAsObject(query);
      // const data = await rs.fetchAsObject();
      const endTime = new Date().getTime();
      console.log(`${name} fetch time ms`, endTime - startTime);
      // await rs.close();

      return data as any;
    };

    const queries = [
      {
        name: 'folders',
        query: 'SELECT ID, NAME FROM GD_CONTACT WHERE CONTACTTYPE=0',
      },
      {
        name: 'contacts',
        query: `
          SELECT DISTINCT
            c.id,
            c.name,
            c.phone,
            c.email,
            c.parent,
            comp.taxid,
            c.address,
            com.FULLNAME,
            c.FAX,
            c.USR$CRM_POSTADDRESS AS POSTADDRESS
          FROM
            gd_contact c
            join gd_companycode comp on comp.COMPANYKEY = c.id
            JOIN GD_COMPANY com ON com.CONTACTKEY = c.ID
            ${req.params.taxId ? `JOIN gd_companycode cc ON cc.companykey = c.id AND cc.taxid = '${req.params.taxId}'` : ''}
            ${req.params.rootId ? `JOIN GD_CONTACT rootItem ON c.LB > rootItem.LB AND c.RB <= rootItem.RB AND rootItem.ID = ${req.params.rootId}` : ''}
            ${DEPARTMENTS || CONTRACTS || WORKTYPES
              ? `JOIN USR$CRM_CUSTOMER cust ON cust.USR$CUSTOMERKEY = c.ID
                ${CONTRACTS ? `AND cust.USR$JOBKEY IN (${CONTRACTS})` : ''}
                ${DEPARTMENTS ? `AND cust.USR$DEPOTKEY IN (${DEPARTMENTS})` : ''}
                ${WORKTYPES ? `AND cust.USR$JOBWORKKEY IN (${WORKTYPES})` : ''}`
              : ''}
            ${LABELS ? `JOIN USR$CRM_CONTACT_LABELS lab ON lab.USR$CONTACTKEY = c.ID AND lab.USR$LABELKEY IN (${LABELS})` : ''}
            ${BUSINESSPROCESSES ? `JOIN USR$CROSS1242_1980093301 bpcross ON bpcross.USR$GD_CONTACTKEY = c.ID AND bpcross.USR$BG_BISNESS_PROCKEY IN (${BUSINESSPROCESSES})` : ''}
          WHERE
            c.contacttype IN (3,5) /*and c.id = 147960147*/
            ${customerId > 0 ? `AND c.ID = ${customerId}` : ''}
            ${NAME ? `AND (UPPER(c.NAME) LIKE UPPER('%${NAME}%') OR UPPER(comp.TAXID) LIKE UPPER('%${NAME}%'))` : ''}
          ORDER BY c.${sortField ? sortField : 'ID'} ${sortMode ? sortMode : 'DESC'}
          ${fromRecord > 0 ? `ROWS ${fromRecord} TO ${toRecord}` : ''}`
      },
      {
        name: 'labels',
        query: `
          SELECT
            l.ID,
            l.USR$NAME,
            l.USR$COLOR,
            cl.USR$CONTACTKEY
          FROM USR$CRM_CONTACT_LABELS cl
          JOIN GD_CONTACT con ON con.ID = cl.USR$CONTACTKEY
          JOIN USR$CRM_LABELS l ON l.ID = cl.USR$LABELKEY
          ${customerId > 0 ? `WHERE cl.USR$CONTACTKEY = ${customerId}` : ''}
          ORDER BY cl.USR$CONTACTKEY`
      },
      {
        name: 'businessProcesses',
        query: `
          SELECT c.USR$GD_CONTACTKEY AS CONTACTKEY, b.ID, b.USR$NAME AS NAME
          FROM USR$CROSS1242_1980093301 c
          JOIN USR$BG_BISNESS_PROC b ON b.ID = c.USR$BG_BISNESS_PROCKEY`
      },
      {
        name: 'rowCount',
        query: `
          SELECT COUNT(DISTINCT c.ID)
          FROM
          gd_contact c
          join gd_companycode comp on comp.COMPANYKEY = c.id
          ${req.params.taxId ? `JOIN gd_companycode cc ON cc.companykey = c.id AND cc.taxid = '${req.params.taxId}'` : ''}
          ${req.params.rootId ? `JOIN GD_CONTACT rootItem ON c.LB > rootItem.LB AND c.RB <= rootItem.RB AND rootItem.ID = ${req.params.rootId}` : ''}
          ${DEPARTMENTS || CONTRACTS || WORKTYPES
            ? `JOIN USR$CRM_CUSTOMER cust ON cust.USR$CUSTOMERKEY = c.ID
              ${CONTRACTS ? `AND cust.USR$JOBKEY IN (${CONTRACTS})` : ''}
              ${DEPARTMENTS ? `AND cust.USR$DEPOTKEY IN (${DEPARTMENTS})` : ''}
              ${WORKTYPES ? `AND cust.USR$JOBWORKKEY IN (${WORKTYPES})` : ''}`
            : ''
          }
          ${LABELS ? `JOIN USR$CRM_CONTACT_LABELS lab ON lab.USR$CONTACTKEY = c.ID AND lab.USR$LABELKEY IN (${LABELS})` : ''}
          ${BUSINESSPROCESSES ? `JOIN USR$CROSS1242_1980093301 bpcross ON bpcross.USR$GD_CONTACTKEY = c.ID AND bpcross.USR$BG_BISNESS_PROCKEY IN (${BUSINESSPROCESSES})` : ''}
        WHERE
          c.contacttype IN (3,5) /*and c.id = 147960147*/
          ${customerId > 0 ? `AND c.ID = ${customerId}` : ''}
          ${NAME ? `AND (UPPER(c.NAME) LIKE UPPER('%${NAME}%') OR UPPER(comp.TAXID) LIKE UPPER('%${NAME}%'))` : ''}`
      },
      // {
      //   name: 'employees',
      //   query: `
      //     SELECT
      //       c.ID, c.NAME, c.EMAIL, p.RANK, CAST(c.NOTE AS VARCHAR(1024)) AS NOTE,
      //       c.ADDRESS,
      //       dep.ID DEP_ID, dep.NAME DEP_NAME
      //     FROM GD_CONTACT c
      //     JOIN GD_PEOPLE p ON p.CONTACTKEY = c.ID
      //     LEFT JOIN GD_CONTACT dep ON dep.ID = c.USR$BG_OTDEL
      //     WHERE c.PARENT = ${customerId}`
      // },
      // {
      //   name: 'phones',
      //   query: `
      //     SELECT
      //       p.ID,
      //       p.USR$PHONENUMBER
      //     FROM USR$CRM_PHONES p
      //     JOIN GD_CONTACT con ON con.ID = p.USR$CONTACTKEY
      //     WHERE con.PARENT = ${customerId}`
      // }
    ];

    let startTime = new Date().getTime();
    const [rawFolders, rawContacts, rawLabels, rawBusinessProcesses, rowCount] = await Promise.all(queries.map(execQuery));

    let endTime = new Date().getTime();

    console.log('Promise time ms', endTime - startTime);

    // const [rawContacts] = await Promise.all(queries.map(execQuery));
    // const rawContacts = await Promise.resolve(execQuery(q[2]));
    // const rawFolders = await Promise.resolve(execQuery(queries[2]));
    // const rawContracts = await Promise.resolve(execQuery(q[0]));

    interface IMapOfArrays {
      [customerId: string]: any[];
    };
    const labels: IMapOfArrays = {};
    const businessProcesses: IMapOfArrays = {};


    rawLabels.map(l => {
      if (labels[l.USR$CONTACTKEY]) {
        if (!labels[l.USR$CONTACTKEY].includes(l.ID)) {
          labels[l.USR$CONTACTKEY].push({ ...l });
        }
      } else {
        labels[l.USR$CONTACTKEY] = [{ ...l }];
      };
    });

    rawBusinessProcesses.map(bp => {
      if (businessProcesses[bp.CONTACTKEY]) {
        if (!businessProcesses[bp.CONTACTKEY].includes(bp.ID)) {
          businessProcesses[bp.CONTACTKEY].push({ ...bp });
        }
      } else {
        businessProcesses[bp.CONTACTKEY] = [{ ...bp }];
      };
    });

    interface IFolders {
      [id: string]: string;
    };

    const folders: IFolders = rawFolders.reduce((p, f) => {
      p[f.ID] = f.NAME;
      return p;
    }, {});

    const tCon = new Date().getTime();

    const contacts: ICustomer[] = rawContacts.map(c => {
      const LABELS = labels[c.ID] ?? null;
      const BUSINESSPROCESSES = businessProcesses[c.ID] ?? null;

      return {
        ...c,
        NAME: c.NAME || '<не указано>',
        LABELS,
        BUSINESSPROCESSES,
        FOLDERNAME: folders[c.PARENT]
      };
    });

    const result: IRequestResult = {
      queries: { contacts, rowCount },
      _params: getParams(true),
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    const a = 'a';
    await releaseReadTransaction();
    // await releaseReadTransaction(req.sessionID);
  }
};

export const updateContact: RequestHandler = async (req, res) => {
  const { id: ID } = req.params;
  const { NAME, PHONE, EMAIL, PARENT, ADDRESS } = req.body;
  const { attachment, transaction, releaseTransaction, executeQuery, fetchAsObject } = await startTransaction(req.sessionID);

  try {
    try {
      await executeQuery(`
        UPDATE GD_CONTACT
        SET
          NAME = ?,
          PHONE = ?,
          EMAIL = ?,
          PARENT = ?,
          ADDRESS = ?
        WHERE ID = ?`,
      [NAME, PHONE, EMAIL, PARENT, ADDRESS, ID]);
    } catch (error) {
      return res.status(500).send({ 'errorMessage': error.message });
    }

    const row = await fetchAsObject(`
      SELECT
        con.ID,
        con.PARENT,
        con.NAME,
        con.EMAIL,
        con.PHONE,
        par.NAME,
        con.ADDRESS
      FROM GD_CONTACT con
      JOIN GD_CONTACT par ON par.ID = con.PARENT
      WHERE con.ID = :ID`,
    { ID });

    const _schema = { };

    const result: IRequestResult = {
      queries: {
        contacts: [row]
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.errorMessage));
  } finally {
    await releaseTransaction();
  }
};

export const upsertContact: RequestHandler = async (req, res) => {
  const { id } = req.params;

  if (id && !parseInt(id)) return res.status(422).send(resultError('Field ID is not defined or is not numeric'));

  const { NAME, PHONE, EMAIL, PARENT, ADDRESS, TAXID, LABELS, BUSINESSPROCESSES } = req.body;
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
      data['BUSINESSPROCESSES'] = await upsertBusinessProcesses({ attachment, transaction }, data['ID'], BUSINESSPROCESSES);

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
      params: [ID, NAME, EMAIL, PHONE, PARENT ? PARENT : 147008647, ADDRESS, TAXID],
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
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

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

    return res.status(200).send(id);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
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
  const { attachment, transaction } = firebirdPropsL;

  if (!labels || labels?.length === 0) {
    try {
      const sql = `
        DELETE FROM USR$CRM_CONTACT_LABELS
        WHERE USR$CONTACTKEY = ?` ;

      await attachment.execute(transaction, sql, [contactId])

    } catch (error) {
      console.error('upsertLabels', error);
    }
    return [];
  };

  const contactLabels = labels.map(label => ({ CONTACT: contactId, LABELKEY: label.ID }));

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
    console.log('upsertLabels', error);

    return;
  } finally {
    // await closeConnection(client, attachment, transaction);
  };
};

export const getCustomersCross: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();

        return data as any;
      } finally {
        await rs.close();
      }
    };

    const queries = [
      {
        name: 'customers',
        query: `
          SELECT DISTINCT
            USR$JOBKEY,
            USR$JOBWORKKEY,
            USR$DEPOTKEY,
            USR$CUSTOMERKEY
          FROM USR$CRM_CUSTOMER
          ORDER BY USR$CUSTOMERKEY`,
      },
      {
        name: 'persons',
        query: `
          SELECT
            con.PARENT, empl.ID, empl.NAME, empl.EMAIL, p.RANK
          FROM GD_CONTACT con
          JOIN GD_CONTACT empl ON empl.PARENT = con.ID
          JOIN GD_PEOPLE p  ON p.CONTACTKEY = empl.ID
          WHERE
            UPPER(con.NAME) = 'КОНТАКТЫ'
          ORDER BY con.PARENT`
      },
      {
        name: 'phones',
        query: `
          SELECT
            p.ID, p.USR$CONTACTKEY, p.USR$PHONENUMBER
          FROM USR$CRM_PHONES p
          ORDER BY p.USR$CONTACTKEY`
      },
      // {
      //   name: 'businessProcesses',
      //   query: `
      //     SELECT c.USR$GD_CONTACTKEY AS CONTACTKEY, b.ID
      //     FROM USR$CROSS1242_1980093301 c
      //     JOIN USR$BG_BISNESS_PROC b ON b.ID = c.USR$BG_BISNESS_PROCKEY`
      // }
    ];

    const [rawCustomers, rawPersons, rawPhones] = await Promise.all(queries.map(execQuery));

    interface IMapOfArrays {
      [key: string]: any[];
    };

    const jobWorks: IMapOfArrays = {};
    const contracts: IMapOfArrays = {};
    const departments: IMapOfArrays = {};
    const persons: IMapOfArrays = {};
    const phones: IMapOfArrays = {};

    rawCustomers.forEach(c => {
      if (c.USR$JOBKEY) {
        if (contracts[c.USR$CUSTOMERKEY]) {
          if (!contracts[c.USR$CUSTOMERKEY].includes(c.USR$JOBKEY)) {
            contracts[c.USR$CUSTOMERKEY].push(c.USR$JOBKEY);
          }
        } else {
          contracts[c.USR$CUSTOMERKEY] = [c.USR$JOBKEY];
        };
      };

      if (c.USR$JOBWORKKEY) {
        if (jobWorks[c.USR$CUSTOMERKEY]) {
          if (!jobWorks[c.USR$CUSTOMERKEY].includes(c.USR$JOBWORKKEY)) {
            jobWorks[c.USR$CUSTOMERKEY].push(c.USR$JOBWORKKEY);
          }
        } else {
          jobWorks[c.USR$CUSTOMERKEY] = [c.USR$JOBWORKKEY];
        };
      };

      if (c.USR$DEPOTKEY) {
        if (departments[c.USR$CUSTOMERKEY]) {
          if (!departments[c.USR$CUSTOMERKEY].includes(c.USR$DEPOTKEY)) {
            departments[c.USR$CUSTOMERKEY].push(c.USR$DEPOTKEY);
          }
        } else {
          departments[c.USR$CUSTOMERKEY] = [c.USR$DEPOTKEY];
        };
      }
    });

    rawPhones.forEach(p => {
      const newPhone = {
        ID: p.ID,
        USR$PHONENUMBER: p.USR$PHONENUMBER
      };

      if (phones[p.USR$CONTACTKEY]) {
        phones[p.USR$CONTACTKEY].push(newPhone);
      } else {
        phones[p.USR$CONTACTKEY] = [newPhone];
      }
    });

    rawPersons.forEach(p => {
      const newPerson: IContactPerson = {
        ID: p.ID,
        NAME: p.NAME,
        EMAIL: p.EMAIL,
        RANK: p.RANK,
        PHONES: phones[p.ID] || []
      };

      if (persons[p.PARENT]) {
        persons[p.PARENT].push(newPerson);
      } else {
        persons[p.PARENT] = [newPerson];
      };
    });
    const result: IRequestResult = {
      queries: {
        cross: [{
          departments,
          contracts,
          jobWorks,
          persons,
        }]
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsertBusinessProcesses = async (firebirdPropsL: any, contactId: number, businessProcesses: IBusinessProcess[]) => {
  const { attachment, transaction } = firebirdPropsL;

  if (!businessProcesses || businessProcesses?.length === 0) {
    try {
      const sql = `
        DELETE FROM USR$CROSS1242_1980093301
        WHERE USR$GD_CONTACTKEY = ?` ;

      await attachment.execute(transaction, sql, [contactId])

    } catch (error) {
      console.error('upsertBusinessProcesses', error);
    }
    return [];
  };

  try {
    const params = businessProcesses.map(bp => ({ contactId, businessProcessId: bp.ID }));

    const sql = `
      EXECUTE BLOCK(
        contactId INTEGER = ?,
        businessProcessId INTEGER = ?
      )
      RETURNS(
        ID INTEGER
      )
      AS
      BEGIN
        DELETE FROM USR$CROSS1242_1980093301
        WHERE USR$GD_CONTACTKEY = :contactId AND USR$BG_BISNESS_PROCKEY = :businessProcessId ;

        UPDATE OR INSERT INTO USR$CROSS1242_1980093301(USR$GD_CONTACTKEY, USR$BG_BISNESS_PROCKEY)
        VALUES(:contactId, :businessProcessId)
        MATCHING(USR$GD_CONTACTKEY, USR$BG_BISNESS_PROCKEY)
        RETURNING USR$BG_BISNESS_PROCKEY INTO :ID;

        SUSPEND;
      END`;

    const records: IBusinessProcess[] = await Promise.all(params.map(async bp => {
      return (await attachment.executeReturningAsObject(transaction, sql, Object.values(bp)));
    }));

    return records;
  } catch (error) {
    console.error('upsertBusinessProcesses', error);
  };
};
