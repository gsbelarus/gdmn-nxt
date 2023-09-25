import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { importedModels } from '../utils/models';
import { resultError } from '../responseMessages';
import { acquireReadTransaction } from '@gdmn-nxt/db-connection';

const get: RequestHandler = async (req, res) => {
  const id = parseInt(req.params.id);

  const { releaseReadTransaction, fetchAsObject } = await acquireReadTransaction(req.sessionID);
  try {
    const sqlResult = await fetchAsObject(`
      SELECT con.ID, con.NAME
      FROM GD_CONTACT con
      JOIN GD_EMPLOYEE emp ON emp.CONTACTKEY = con.ID
      WHERE con.DISABLED = 0 ${id ? 'AND con.ID = :id' : ''}`, { id });


    const result: IRequestResult = {
      queries: { employees: sqlResult },
      _params: [id && { id }],
      _schema: {}
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  };
};

export default { get };
