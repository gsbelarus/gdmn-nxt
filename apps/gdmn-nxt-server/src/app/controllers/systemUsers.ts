import { IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';

export const get: RequestHandler = async(req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      try {
        const data = await rs.fetchAsObject();

        const formattedData = data.map((d: any) => {
          const CONTACT = { ID: d['CONTACT_ID'], NAME: d['CONTACT_NAME'] };
          const { CONTACT_ID, CONTACT_NAME, ...newObject } = d;
          return { ...newObject, CONTACT };
        });

        return [name, id ? formattedData.length > 0 ? formattedData[0] : {} : formattedData];
      } finally {
        await rs.close();
      }
    };

    const queries = [{
      name: id ? 'user' : 'users',
      query: `
          SELECT
            u.ID,
            u.NAME,
            u.FULLNAME,
            u.DISABLED,
            con.ID AS CONTACT_ID,
            con.NAME AS CONTACT_NAME
          FROM GD_USER u
          JOIN GD_CONTACT con ON con.ID = u.CONTACTKEY
          ${id ? ' WHERE u.ID = ?' : ''}`,
      params: id ? [id] : undefined,
    }];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(execQuery)))
      },
      _params: id ? [{ id: id }] : undefined,
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

export default { get };
