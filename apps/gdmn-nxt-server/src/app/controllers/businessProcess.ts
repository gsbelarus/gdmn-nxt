import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { acquireReadTransaction } from '@gdmn-nxt/db-connection';

const get: RequestHandler = async (req, res) => {
  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);

  try {
    const sqlResult = await fetchAsObject(`
      SELECT ID, USR$NAME AS NAME
      FROM USR$BG_BISNESS_PROC`);

    const result: IRequestResult = {
      queries: { businessProcesses: sqlResult },
      _schema: {}
    };
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    releaseReadTransaction();
  }
};

export default { get }
;
