import { IPhone, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { importedModels } from '../models';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction, startTransaction } from '../utils/db-connection';
import { genId } from '../utils/genId';

const getByCutomerId: RequestHandler = async (req, res) => {
  const { executeQuery } = await getReadTransaction(req.sessionID);

  try {
    const customerId = parseInt(req.params.customerId);

    const sql = new sqlQuery(attachment, transaction);
    sql.SQLtext = `
      SELECT ID FROM GD_CONTACT
      WHERE UPPER(NAME) = 'КОНТАКТЫ' AND PARENT = :CompanyId`;
    sql.setParamByName('CompanyId').value = customerId;

    let sqlResult = await sql.execute();

    const contactFolderId = sqlResult.length ? sqlResult[0]['ID'] : -1;

    sql.clear();
    sql.SQLtext = `
      SELECT dep.ID, dep.NAME
      FROM GD_CONTACT con
      JOIN GD_CONTACT dep ON dep.ID = con.USR$BG_OTDEL
      WHERE con.PARENT = :FolderId`;
    sql.setParamByName('FolderId').value = contactFolderId;
    sqlResult = await sql.execute();

    interface IMapOfObjects {
      [key: string]: any;
    };
    const departments: IMapOfObjects = {};

    sqlResult.forEach(res => {
      if (!departments[res['ID']]) {
        departments[res['ID']] = { ID: res['ID'], NAME: res['NAME'] };
      };
    });

    sql.clear();
    sql.SQLtext = `
      SELECT USR$CONTACTKEY, ID, USR$PHONENUMBER
      FROM USR$CRM_PHONES`;

    sqlResult = await sql.execute();

    interface IMapOfArray {
      [key: string]: any[];
    };
    const phones: IMapOfArray = {};

    sqlResult.forEach(res => {
      if (phones[res['USR$CONTACTKEY']]) {
        phones[res['USR$CONTACTKEY']].push({ ID: res['ID'], USR$PHONENUMBER: res['USR$PHONENUMBER'] });
      } else {
        phones[res['USR$CONTACTKEY']] = [{ ID: res['ID'], USR$PHONENUMBER: res['USR$PHONENUMBER'] }];
      };
    });

    // const { erModelNoAdapters } = await importedModels;
    // const allFields = erModelNoAdapters.entities['TgdcContact'].attributes.map(attr => attr.name);
    // const actualFieldsNames = allFields.join(',');

    sql.clear();
    sql.SQLtext = `
      SELECT
        ID, PARENT, NAME, EMAIL, p.RANK, CAST(c.NOTE AS VARCHAR(1024)) AS NOTE,
        ADDRESS, USR$BG_OTDEL AS USR$BG_OTDEL, p.USR$LETTER_OF_AUTHORITY, p.WCOMPANYKEY
      FROM GD_CONTACT c
      JOIN GD_PEOPLE p ON p.CONTACTKEY = c.ID
      WHERE PARENT = :FolderId
      ORDER BY ID DESC`;
    sql.setParamByName('FolderId').value = contactFolderId;
    sqlResult = await sql.execute();

    sqlResult.forEach(res => {
      res['USR$BG_OTDEL'] = departments[res['USR$BG_OTDEL']];
      res['PHONES'] = phones[res['ID']];
    });

    const result: IRequestResult = {
      queries: { persons: sqlResult },
      _params: [{ customerId }],
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const id = parseInt(req.params.id);

    const sql = new sqlQuery(attachment, transaction);
    sql.SQLtext = `
      SELECT dep.ID, dep.NAME
      FROM GD_CONTACT con
      JOIN GD_CONTACT dep ON dep.ID = con.USR$BG_OTDEL
      WHERE con.ID = :id`;
    sql.setParamByName('id').value = id;
    let sqlResult = await sql.execute();

    interface IMapOfObjects {
      [key: string]: any;
    };
    const departments: IMapOfObjects = {};

    sqlResult.forEach(res => {
      if (!departments[res['ID']]) {
        departments[res['ID']] = { ID: res['ID'], NAME: res['NAME'] };
      };
    });

    sql.clear();
    sql.SQLtext = `
      SELECT USR$CONTACTKEY, ID, USR$PHONENUMBER
      FROM USR$CRM_PHONES`;

    sqlResult = await sql.execute();

    interface IMapOfArray {
      [key: string]: any[];
    };
    const phones: IMapOfArray = {};

    sqlResult.forEach(res => {
      if (phones[res['USR$CONTACTKEY']]) {
        phones[res['USR$CONTACTKEY']].push({ ID: res['ID'], USR$PHONENUMBER: res['USR$PHONENUMBER'] });
      } else {
        phones[res['USR$CONTACTKEY']] = [{ ID: res['ID'], USR$PHONENUMBER: res['USR$PHONENUMBER'] }];
      };
    });

    // const { erModelNoAdapters } = await importedModels;
    // const allFields = erModelNoAdapters.entities['TgdcContact'].attributes.map(attr => attr.name);
    // const actualFieldsNames = allFields.join(',');

    sql.clear();
    sql.SQLtext = `
      SELECT ID, NAME, EMAIL, p.RANK, CAST(c.NOTE AS VARCHAR(1024)) AS NOTE, ADDRESS, USR$BG_OTDEL AS BG_OTDEL
      FROM GD_CONTACT c
      JOIN GD_PEOPLE p ON p.CONTACTKEY = c.ID
      WHERE ID = :id`;
    sql.setParamByName('id').value = id;
    sqlResult = await sql.execute();

    sqlResult.forEach(res => {
      res['USR$BG_OTDEL'] = departments[res['USR$BG_OTDEL']];
      res['PHONES'] = phones[res['ID']];
    });

    const result: IRequestResult = {
      queries: { sqlResult },
      _params: [{ id }],
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

const upsert: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const { id } = req.params;

  if (id && isNaN(Number(id))) return res.status(422).send(resultError('Field ID is not defined or is not numeric'));;

  try {
    const isInsertMode = id ? false : true;

    // const sql1 = new sqlQuery(attachment, transaction);
    // sql1.SQLtext = `
    //   UPDATE OR INSERT USR$CRM_PHONES(ID, USR$CONTACTKEY, USR$PHONENUMBER)
    //   VALUES(:ID, :USR$CONTACTKEY, :USR$PHONENUMBER)
    //   MATCHING(ID)`;


    // paramsValues.forEach((param, index) => {
    //   sql.setParamByName(actualFields[index]).value = param;
    // });

    // const sqlResult = await sql.execute();


    let ID = Number(id);
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
    };

    const { erModelNoAdapters } = await importedModels;
    const allFields = erModelNoAdapters.entities['TgdcContact'].attributes.map(attr => attr.name);
    const actualFields = allFields.filter(field => typeof req.body[field] !== 'undefined');

    // console.log('body', req.body);
    const paramsValues = actualFields.map(field => {
      if (field === 'NOTE') {
        return Buffer.from(req.body[field]);
      };
      if (field === 'USR$BG_OTDEL') {
        return req.body[field]['ID'];
      };
      return req.body[field];
    });

    if (actualFields.indexOf('ID') >= 0) {
      paramsValues.splice(actualFields.indexOf('ID'), 1);
      actualFields.splice(actualFields.indexOf('ID'), 1);
    };

    if (actualFields.indexOf('PARENT') >= 0) {
      paramsValues.splice(actualFields.indexOf('PARENT'), 1);
      actualFields.splice(actualFields.indexOf('PARENT'), 1);
    };

    if (actualFields.indexOf('CONTACTTYPE') >= 0) {
      paramsValues.splice(actualFields.indexOf('CONTACTTYPE'), 1);
      actualFields.splice(actualFields.indexOf('CONTACTTYPE'), 1);
    };

    // actualFields.unshift('ID');
    // paramsValues.unshift(ID);

    const requiredFields = {
      ID: ID
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!actualFields.includes(key)) {
        actualFields.push(key);
        paramsValues.push(value);
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(field => ':' + field).join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = new sqlQuery(attachment, transaction);
    sql.SQLtext = `
      UPDATE OR INSERT INTO GD_CONTACT(NAME, PARENT, CONTACTTYPE)
      VALUES(:NAME, :PARENT, 4)
      MATCHING(NAME, PARENT)
      RETURNING ID`;
    sql.setParamByName('NAME').value = 'Контакты';
    sql.setParamByName('PARENT').value = req.body['WCOMPANYKEY'];
    const sqlResultFolder = await sql.execute();

    sql.clear();
    sql.SQLtext = `
      UPDATE OR INSERT INTO GD_CONTACT(${actualFieldsNames}, PARENT, CONTACTTYPE)
      VALUES (${paramsString}, :PARENT, :CONTACTTYPE)
      MATCHING (ID)
      RETURNING ${returnFieldsNames}`;

    // console.log('sql.SQLtext', sql.SQLtext);

    paramsValues.forEach((param, index) => {
      sql.setParamByName(actualFields[index]).value = param;
    });
    sql.setParamByName('PARENT').value = sqlResultFolder['ID'];
    sql.setParamByName('CONTACTTYPE').value = 2;
    const sqlResultContact = await sql.execute();

    sql.clear();
    sql.SQLtext = `
      SELECT NAME FROM WG_POSITION
      WHERE UPPER(NAME) = UPPER(:NAME)`;
    sql.setParamByName('NAME').value = req.body['RANK'];
    let sqlResultPosition = await sql.execute();

    sql.clear();
    sql.SQLtext = `
      UPDATE OR INSERT INTO WG_POSITION(NAME)
      VALUES(:NAME)
      MATCHING(NAME)
      RETURNING ID`;
    if (sqlResultPosition.length) {
      sql.setParamByName('NAME').value = sqlResultPosition[0]['NAME'];
    } else {
      sql.setParamByName('NAME').value = req.body['RANK'];
    };
    sqlResultPosition = await sql.execute();

    sql.clear();
    sql.SQLtext = `
      UPDATE OR INSERT INTO GD_PEOPLE(CONTACTKEY, WPOSITIONKEY, USR$LETTER_OF_AUTHORITY, WCOMPANYKEY)
      VALUES(:CONTACTKEY, :POSITIONKEY, :LETTER_OF_AUTHORITY, :WCOMPANYKEY)
      MATCHING(CONTACTKEY)
      RETURNING CONTACTKEY, WPOSITIONKEY, USR$LETTER_OF_AUTHORITY, WCOMPANYKEY`;
    sql.setParamByName('CONTACTKEY').value = sqlResultContact['ID'];
    sql.setParamByName('POSITIONKEY').value = sqlResultPosition['ID'];
    sql.setParamByName('LETTER_OF_AUTHORITY').value = req.body['USR$LETTER_OF_AUTHORITY'];
    sql.setParamByName('WCOMPANYKEY').value = req.body['WCOMPANYKEY'];
    await sql.execute();

    sql.clear();
    sql.SQLtext = `
      UPDATE OR INSERT INTO GD_EMPLOYEE(CONTACTKEY)
      VALUES(:CONTACTKEY)
      MATCHING(CONTACTKEY)`;
    sql.setParamByName('CONTACTKEY').value = sqlResultContact['ID'];
    await sql.execute();


    /**  Upsert phones */
    const phones: IPhone[] = req.body['PHONES'];

    if (phones) {
      sql.clear();
      sql.SQLtext = `
        DELETE FROM USR$CRM_PHONES
        WHERE USR$CONTACTKEY = :USR$CONTACTKEY`;
      sql.setParamByName('USR$CONTACTKEY').value = sqlResultContact['ID'];
      await sql.execute();

      sql.clear();
      sql.SQLtext = `
        UPDATE OR INSERT INTO USR$CRM_PHONES(ID, USR$CONTACTKEY, USR$PHONENUMBER)
        VALUES(:ID, :USR$CONTACTKEY, :USR$PHONENUMBER)
        MATCHING(ID)`;

      const unresolvedPromises = phones.map(async phone => {
        if (!phone.USR$PHONENUMBER) return;

        let ID = phone.ID;
        if (ID <= 0) {
          ID = await genId(attachment, transaction);
        };

        sql.setParamByName('ID').value = ID;
        sql.setParamByName('USR$CONTACTKEY').value = sqlResultContact['ID'];
        sql.setParamByName('USR$PHONENUMBER').value = phone.USR$PHONENUMBER;

        return await sql.execute();
      });

      await Promise.all(unresolvedPromises);
    };

    const result: IRequestResult = {
      queries: { persons: [sqlResultContact] },
      _params: [{ id }],
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    await releaseTransaction(false);
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

const remove: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(422).send(resultError('Field ID is not defined or is not numeric'));;

  try {
    const { erModelNoAdapters } = await importedModels;
    const allFields = erModelNoAdapters.entities['TgdcContact'].attributes.map(attr => attr.name);
    const returnFieldsNames = allFields.join(',');

    const sql = new sqlQuery(attachment, transaction);
    sql.SQLtext = `
      DELETE FROM GD_CONTACT
      WHERE ID = :ID
      RETURNING ${returnFieldsNames}`;

    sql.setParamByName('ID').value = id;

    const sqlResult = await sql.execute();

    if (!sqlResult['ID']) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    const result: IRequestResult = {
      queries: { persons: [sqlResult] },
      _params: [{ id }],
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export default { getByCutomerId, get, upsert, remove };
