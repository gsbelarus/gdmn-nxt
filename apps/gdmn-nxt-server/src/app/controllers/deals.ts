import { IEntities, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { importedModels } from '../utils/models';
import { resultError } from '../responseMessages';
import { getReadTransaction, releaseReadTransaction } from '@gdmn-nxt/db-connection';

const get: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const { id } = req.params;

  try {
    const _schema = { };
    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities['TgdcDepartment'].attributes.map(attr => attr.name))];
    const returnFieldsNames = allFields.join(',');

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
        name: 'departments',
        query: `
          SELECT
            ${returnFieldsNames}
          FROM
            GD_CONTACT con
          WHERE
            con.CONTACTTYPE = 4 AND
            con.USR$ISOTDEL = 1 AND
            COALESCE(con.DISABLED, 0) = 0
            ${id ? ' and ID = ?' : ''}
          ORDER BY
            NAME`,
        params: id ? [id] : undefined,
      },
    ];

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries(await Promise.all(queries.map(q => execQuery(q))))
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
