import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { Blob } from 'node-firebird-driver-native';
import { TextDecoder } from 'util';
import { resultError } from '../responseMessages';
import { acquireReadTransaction, getReadTransaction, releaseReadTransaction as releaseRT } from '@gdmn-nxt/db-connection';

const getHistory: RequestHandler = async(req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);
  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);
  try {
    const sqlText = `
      SELECT
        C.NAME AS CREATOR,
        Z.ID,
        IIF(CHAR_LENGTH(z.SQL_TEXT) > 1024, z.SQL_TEXT, NULL) AS SQL_TEXT_BLOB,
        IIF(CHAR_LENGTH(z.SQL_TEXT) <= 1024, CAST(z.SQL_TEXT AS VARCHAR(1024)), NULL) AS SQL_TEXT_CHAR,
        Z.SQL_PARAMS,
        Z.BOOKMARK,
        Z.CREATORKEY,
        Z.CREATIONDATE,
        Z.EDITORKEY,
        Z.EDITIONDATE,
        Z.EXEC_COUNT
      FROM
        GD_SQL_HISTORY Z
          JOIN GD_CONTACT C ON Z.CREATORKEY  =  C.ID
      WHERE
        COALESCE ( Z.BOOKMARK, ' ' )  <>  'M' --AND Z.ID = 370467378 --370467376 --370467378
      ORDER BY
        Z.EDITIONDATE DESC,
        Z.ID DESC`;

    const rows = await fetchAsObject(sqlText);
    const decoder = new TextDecoder('windows-1251');

    for (const r of rows) {
      if (r['SQL_TEXT_BLOB'] !== null && typeof r['SQL_TEXT_BLOB'] === 'object') {
        const blob = r['SQL_TEXT_BLOB'] as Blob;
        const blobStream = await attachment.openBlob(transaction, blob);
        const buffer = Buffer.alloc(await blobStream.length);
        await blobStream.read(buffer);
        await blobStream.close();
        r['SQL_TEXT'] = decoder.decode(buffer);
      } else {
        r['SQL_TEXT'] = r['SQL_TEXT_CHAR'];
      };
      delete r['SQL_TEXT_BLOB'];
      delete r['SQL_TEXT_CHAR'];
    };

    const result: IRequestResult = {
      queries: { history: rows },
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseRT(req.sessionID);
    await releaseReadTransaction();
  }
};


const executeScript: RequestHandler = async(req, res) => {
  const { script, params } = req.body;

  // console.log('body', req.body);

  if (!script) {
    return res.status(422).send(resultError('Отсутсвтует код для выполнения'));
  };

  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);

  try {
    const startTime = new Date().getTime();
    const rows = await fetchAsObject(script, params);
    const endTime = new Date().getTime();

    console.log('executeScript', endTime - startTime);

    const result: IRequestResult = {
      queries: { result: rows },
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    releaseReadTransaction();
  }
};

export default { getHistory, executeScript };
