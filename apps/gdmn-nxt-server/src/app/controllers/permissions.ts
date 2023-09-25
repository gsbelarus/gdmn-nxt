import { IDataSchema, IRequestResult } from '@gsbelarus/util-api-types';
import { Request, RequestHandler } from 'express';
import { importedModels } from '../utils/models';
import { resultError } from '../responseMessages';
import { acquireReadTransaction, getReadTransaction, releaseReadTransaction, startTransaction } from '@gdmn-nxt/db-connection';
import { genId } from '../utils/genId';
import { setPermissonsCache } from '../middlewares/permissions';

const eintityCrossName = 'TgdcAttrUserDefinedUSR_CRM_PERMISSIONS_CROSS';

function getSessionIdByUserId(userId: number, sessions) {
  const keys = Object.keys(sessions);
  for (const key of keys) {
    if (sessions[key].userId === userId) return key;
  }
  return null;
}

const closeUserSession = async (req: Request, userIdToClose: number) => {
  const { userId } = req.session;
  if (userId === userIdToClose) return;

  req.sessionStore.all((err, sessions) => {
    const sessionID = getSessionIdByUserId(userIdToClose, sessions);
    req.sessionStore.destroy(sessionID);
  });
};

const closeUsersSessions = async (req: Request, groupId: number) => {
  const { userId: currentUserId } = req.session;
  const { fetchAsObject, releaseReadTransaction } = await acquireReadTransaction(req.sessionID);

  try {
    const query = `
      select USR$USERKEY AS USERID
      from USR$CRM_PERMISSIONS_UG_LINES
      where USR$GROUPKEY = :groupId AND USR$USERKEY != :currentUserId`;

    const usersId = await fetchAsObject(query, { groupId, currentUserId });
    usersId.forEach(u => closeUserSession(req, u['USERID']));
  } catch (error) {
    console.error(error);
  } finally {
    await releaseReadTransaction();
  }
};

const getCross: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const execQuery = async (query: string) => {
      const rs = await attachment.executeQuery(transaction, query, []);
      const data = await rs.fetchAsObject();

      await rs.close();

      return data as any;
    };

    const queries = [
      `SELECT
        cr.ID,
        cr.USR$ACTIONKEY,
        cr.USR$GROUPKEY,
        cr.USR$MODE as MODE
      FROM USR$CRM_PERMISSIONS_CROSS cr
      JOIN USR$CRM_PERMISSIONS_ACTIONS act ON act.ID = cr.USR$ACTIONKEY
      JOIN USR$CRM_PERMISSIONS_USERGROUPS ug ON ug.ID = cr.USR$GROUPKEY`,
      `SELECT act.ID, act.USR$NAME NAME, USR$CODE CODE
      FROM USR$CRM_PERMISSIONS_ACTIONS act`,
      `SELECT ug.ID, ug.USR$NAME NAME
      FROM USR$CRM_PERMISSIONS_USERGROUPS ug`
    ];

    const [rawCross, rawActions, rawUserGroups] = await Promise.all(queries.map(execQuery));

    const cross = rawCross.map(c => {
      const ACTION = rawActions.filter(act => act['ID'] === c['USR$ACTIONKEY'])[0];
      const USERGROUP = rawUserGroups.filter(ug => ug['ID'] === c['USR$GROUPKEY'])[0];
      const { USR$ACTIONKEY, USR$GROUPKEY, ...newObject } = c;
      return { ...newObject, ACTION, USERGROUP };
    });

    const result: IRequestResult = {
      queries: {
        cross
      },
      _schema
    };

    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsertCross: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await attachment.executeSingletonAsObject(transaction, query, params);

      return [name, data];
    };

    const ID = await (async () => {
      const checkID = parseInt(req.body['ID']);
      return checkID > 0
        ? checkID
        : await genId(attachment, transaction);
    })();

    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities[eintityCrossName].attributes.map(attr => attr.name))];
    const actualFields = allFields.filter(field => {
      switch (field) {
        case 'USR$ACTIONKEY':
          return typeof req.body['ACTION'] !== 'undefined';
        case 'USR$GROUPKEY':
          return typeof req.body['USERGROUP'] !== 'undefined';
        case 'USR$MODE':
          return typeof req.body['MODE'] !== 'undefined';
        default:
          return typeof req.body[field] !== 'undefined';
      }
    });

    const paramsValues = actualFields.map(field => {
      switch (field) {
        case 'USR$ACTIONKEY':
          return req.body['ACTION']['ID'];
        case 'USR$GROUPKEY':
          return req.body['USERGROUP']['ID'];
        case 'USR$MODE':
          return req.body['MODE'];
        default:
          return req.body[field];
      }
    });

    const requiredFields = {
      ID,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!actualFields.includes(key)) {
        actualFields.push(key);
        paramsValues.push(value);
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');

    const query = {
      name: 'cross',
      query: `
        UPDATE OR INSERT INTO USR$CRM_PERMISSIONS_CROSS(${actualFieldsNames})
        VALUES(${paramsString})
        MATCHING(ID)
        RETURNING ${actualFieldsNames}`,
      params: paramsValues,
    };

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries([await Promise.resolve(execQuery(query))])
      },
      _schema
    };

    closeUsersSessions(req, req.body.USERGROUP?.ID);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
    setPermissonsCache();
  }
};

const getUserGroups: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema: IDataSchema = {
      userGroups: {
        REQUIRED_2FA: {
          type: 'boolean'
        }
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, []);
      const data = await rs.fetchAsObject();

      const sch = _schema[name];

      if (sch) {
        for (const rec of data) {
          for (const fld of Object.keys(rec)) {
            if ((sch[fld]?.type === 'boolean') && rec[fld] !== null) {
              rec[fld] = +rec[fld] === 1;
            }
          }
        }
      };
      await rs.close();

      return data as any;
    };

    const query = {
      name: 'userGroups',
      query: `
        SELECT
          ug.ID,
          ug.USR$NAME AS NAME,
          USR$DESCRIPTION DESCRIPTION,
          USR$REQUIRED_2FA REQUIRED_2FA
        FROM USR$CRM_PERMISSIONS_USERGROUPS ug
        ORDER BY ug.USR$NAME`
    };

    const userGroups = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: {
        userGroups
      },
      _schema
    };

    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsertGroup: RequestHandler = async (req, res) => {
  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await attachment.executeSingletonAsObject(transaction, query, params);

      return [data];
    };

    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities['TgdcAttrUserDefinedUSR_CRM_PERMISSIONS_USERGROUPS'].attributes.map(attr => attr.name))];

    const actualFields = allFields.filter(field => typeof req.body[field.replace('USR$', '')] !== 'undefined');

    const paramsValues = actualFields.map(field => {
      return req.body[field.replace('USR$', '')];
    });

    let ID = id;
    if (isInsertMode) {
      ID = await genId(attachment, transaction);
      if (actualFields.indexOf('ID') >= 0) {
        paramsValues.splice(actualFields.indexOf('ID'), 1, ID);
      };
    };

    const requiredFields = {
      ID: ID,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!actualFields.includes(key)) {
        actualFields.push(key);
        paramsValues.push(value);
      }
    };

    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');

    const queries = [
      {
        name: 'userGroup',
        query: `
          UPDATE OR INSERT INTO USR$CRM_PERMISSIONS_USERGROUPS(${actualFieldsNames})
          VALUES(${paramsString})
          MATCHING(ID)
          RETURNING ${actualFieldsNames}`,
        params: paramsValues,
      },
      {
        name: 'userGroupLine',
        query: `
          UPDATE USR$CRM_PERMISSIONS_UG_LINES
          SET USR$REQUIRED_2FA = ?
          WHERE USR$GROUPKEY = ?`,
        params: [Number(req.body['REQUIRED_2FA'] ?? false), ID],
      }
    ];

    const [userGroup, userGroupLine] = await Promise.all(queries.map(execQuery));

    const result = {
      queries: {
        userGroup: userGroup[0]
      },
      _params: id ? [{ id: id }] : undefined,
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
    setPermissonsCache();
  };
};

const removeGroup: RequestHandler = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));

  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const result = await attachment.executeQuery(
      transaction,
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS SMALLINT)
      AS
      DECLARE VARIABLE UG_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID FROM USR$CRM_PERMISSIONS_USERGROUPS WHERE ID = :ID INTO :UG_ID AS CURSOR curUserGroup
        DO
        BEGIN
          DELETE FROM USR$CRM_PERMISSIONS_UG_LINES
          WHERE USR$GROUPKEY = :UG_ID;

          DELETE FROM USR$CRM_PERMISSIONS_CROSS
          WHERE USR$GROUPKEY = :UG_ID;

          DELETE FROM USR$CRM_PERMISSIONS_USERGROUPS WHERE CURRENT OF curUserGroup;

          SUCCESS = 1;
        END

        SUSPEND;
      END`,
      [id]
    );

    const data: { SUCCESS: number }[] = await result.fetchAsObject();
    await result.close();

    if (data[0].SUCCESS !== 1) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    closeUsersSessions(req, id);

    return res.status(200).json({ id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
    setPermissonsCache();
  };
};

const getActions: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, []);
      const data = await rs.fetchAsObject();
      await rs.close();

      return data as any;
    };

    const query = {
      name: 'actions',
      query: `
        SELECT act.ID, act.USR$TITLE NAME, USR$CODE CODE
        FROM USR$CRM_PERMISSIONS_ACTIONS act
        ORDER BY USR$SORTNUMBER`,
    };

    const actions = await Promise.resolve(execQuery(query));

    const result: IRequestResult = {
      queries: {
        actions
      },
      _schema
    };

    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

const getUserGroupLine: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const groupId = parseInt(req.params.groupId);
  if (isNaN(groupId)) return res.status(422).send(resultError('Поле "groupId" не указано или неверного типа'));

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      const data = await rs.fetchAsObject();
      await rs.close();

      return data as any;
    };

    const query = {
      name: 'users',
      query: `
        SELECT
          ul.ID,
          ug.ID GROUP_ID,
          ug.USR$NAME GROUP_NAME,
          u.ID USER_ID,
          u.NAME USER_NAME,
          u.FULLNAME USER_FULLNAME,
          u.DISABLED USER_DISABLED,
          con.ID AS CONTACT_ID,
          con.NAME AS CONTACT_NAME,
          con.PHONE CONTACT_PHONE,
          ul.USR$REQUIRED_2FA AS REQUIRED_2FA
        FROM USR$CRM_PERMISSIONS_USERGROUPS ug
        JOIN USR$CRM_PERMISSIONS_UG_LINES ul ON ul.USR$GROUPKEY = ug.ID
        JOIN GD_USER u ON u.ID = ul.USR$USERKEY
        JOIN GD_CONTACT con ON con.ID = u.CONTACTKEY
        WHERE
          ug.ID = ?`,
      params: [groupId]
    };

    const rawUsers = await Promise.resolve(execQuery(query));


    const users = rawUsers.map(user => {
      const CONTACT = {
        ID: user['CONTACT_ID'],
        NAME: user['CONTACT_NAME'],
        PHONE: user['CONTACT_PHONE']
      };
      const USER = {
        ID: user['USER_ID'],
        NAME: user['USER_NAME'],
        FULLNAME: user['USER_FULLNAME'],
        DISABLED: user['USER_DISABLED'],
        CONTACT: { ...CONTACT }
      };
      const USERGROUP = {
        ID: user['GROUP_ID'],
        NAME: user['GROUP_NAME'],
      };
      const { CONTACT_ID, CONTACT_NAME, PHONE, ...newObject } = user;
      return {
        ID: user['ID'],
        REQUIRED_2FA: user['REQUIRED_2FA'] === 1,
        USERGROUP: { ...USERGROUP },
        USER: { ...USER }
      };
    });

    const result: IRequestResult = {
      queries: {
        users
      },
      ...(groupId ? { _params: [{ groupId: groupId }] } : {}),
      _schema
    };

    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const getUserByGroup: RequestHandler = async (req, res) => {
  const { attachment, transaction } = await getReadTransaction(req.sessionID);

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));

  try {
    const _schema = {};

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const rs = await attachment.executeQuery(transaction, query, params);
      const data = await rs.fetchAsObject();
      await rs.close();

      return data as any;
    };

    const query = {
      name: 'users',
      query: `
        SELECT
          ul.ID,
          u.NAME,
          u.FULLNAME,
          u.DISABLED,
          con.ID AS CONTACT_ID,
          con.NAME AS CONTACT_NAME,
          con.PHONE
        FROM USR$CRM_PERMISSIONS_USERGROUPS ug
        JOIN USR$CRM_PERMISSIONS_UG_LINES ul ON ul.USR$GROUPKEY = ug.ID
        JOIN GD_USER u ON u.ID = ul.USR$USERKEY
        JOIN GD_CONTACT con ON con.ID = u.CONTACTKEY
        WHERE
          ug.ID = ?`,
      params: [id]
    };

    const rawUsers = await Promise.resolve(execQuery(query));


    const users = rawUsers.map(user => {
      const CONTACT = { ID: user['CONTACT_ID'], NAME: user['CONTACT_NAME'], PHONE: user['PHONE'] };
      const { CONTACT_ID, CONTACT_NAME, PHONE, ...newObject } = user;
      return { ...newObject, CONTACT };
    });

    const result: IRequestResult = {
      queries: {
        users
      },
      ...(id ? { _params: [{ id: id }] } : {}),
      _schema
    };

    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  }
};

const upsertUserGroupLine: RequestHandler = async (req, res) => {
  const isInsertMode = (req.method === 'POST');

  const id = parseInt(req.params.id);
  if (!isInsertMode) {
    if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));
  };

  const { attachment, transaction, releaseTransaction, fetchAsObject } = await startTransaction(req.sessionID);

  try {
    const _schema = {};

    if (isInsertMode) {
      const userExistsQuery = `
        SELECT
          ug.USR$NAME NAME
        FROM USR$CRM_PERMISSIONS_UG_LINES ul
        JOIN USR$CRM_PERMISSIONS_USERGROUPS ug ON ug.ID = ul.USR$GROUPKEY
        WHERE
          ul.USR$GROUPKEY != :groupId
          AND ul.USR$USERKEY = :userId`;

      const userExists = await fetchAsObject(userExistsQuery, { groupId: req.body['USERGROUP']['ID'], userId: req.body['USER']['ID'] });

      if (userExists.length) {
        return res.status(409).json(resultError(`Пользователь уже добавлен в группу ${userExists[0]['NAME']}`));
      }
    };

    const execQuery = async ({ name, query, params }: { name: string, query: string, params?: any[] }) => {
      const data = await attachment.executeSingletonAsObject(transaction, query, params);

      return [name, data];
    };

    const { erModel } = await importedModels;
    const allFields = [...new Set(erModel.entities['TgdcAttrUserDefinedUSR_CRM_PERMISSIONS_UG_LINES'].attributes.map(attr => attr.name))];

    const actualFields = allFields.filter(field => {
      switch (field) {
        case 'USR$REQUIRED_2FA':
          return typeof req.body['REQUIRED_2FA'] !== 'undefined';
        case 'USR$USERKEY':
          return typeof req.body['USER'] !== 'undefined';
        case 'USR$GROUPKEY':
          return typeof req.body['USERGROUP'] !== 'undefined';
        case 'ID':
          break;
        default:
          return typeof req.body[field] !== 'undefined';
      }
    });

    const paramsValues = actualFields.map(field => {
      switch (field) {
        case 'USR$REQUIRED_2FA':
          return req.body['REQUIRED_2FA'];
        case 'USR$USERKEY':
          return req.body['USER']['ID'];
        case 'USR$GROUPKEY':
          return req.body['USERGROUP']['ID'];
        default:
          return req.body[field];
      }
    });

    const query = {
      name: 'users',
      query: `
      UPDATE OR INSERT INTO USR$CRM_PERMISSIONS_UG_LINES(${actualFields})
      VALUES(${actualFields.map(f => '?')})
      MATCHING(USR$USERKEY)
      RETURNING ID, USR$USERKEY, USR$GROUPKEY`,
      params: paramsValues,
    };

    const result: IRequestResult = {
      queries: {
        ...Object.fromEntries([await Promise.resolve(execQuery(query))])
      },
      _schema
    };

    closeUserSession(req, req.body.USER.ID);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
  };
};

const removeUserGroupLine: RequestHandler = async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(422).send(resultError('Поле "id" не указано или неверного типа'));

  const { attachment, transaction, releaseTransaction } = await startTransaction(req.sessionID);

  try {
    const result = await attachment.executeQuery(
      transaction,
      `EXECUTE BLOCK(
        ID INTEGER = ?
      )
      RETURNS(SUCCESS SMALLINT, USERID INTEGER)
      AS
      DECLARE VARIABLE UG_ID INTEGER;
      BEGIN
        SUCCESS = 0;
        FOR SELECT ID, USR$USERKEY FROM USR$CRM_PERMISSIONS_UG_LINES WHERE ID = :ID INTO :UG_ID, :USERID AS CURSOR curUserGroup
        DO
        BEGIN
          DELETE FROM USR$CRM_PERMISSIONS_UG_LINES WHERE CURRENT OF curUserGroup;

          SUCCESS = 1;
        END

        SUSPEND;
      END`,
      [id]
    );

    const data: { SUCCESS: number, USERID: number }[] = await result.fetchAsObject();
    await result.close();

    if (data[0].SUCCESS !== 1) {
      return res.status(500).send(resultError('Объект не найден'));
    };

    closeUserSession(req, data[0].USERID);

    return res.status(200).json({ id });
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction(res.statusCode === 200);
    setPermissonsCache();
  };
};

const getPermissionByUser: RequestHandler = async (req, res) => {
  // const actionCode = parseInt(req.params.actionCode);
  // if (isNaN(actionCode)) return res.status(422).send(resultError('Поле "actionCode" не указано или неверного типа'));
  try {
  //   if(!permissionsActionsCache.get(actionCode)){
  //     const result = await updatePermissonsCache(req)
  //     if(!result.result) return res.status(500).send(resultError(result.message));
  //   }
  //   return res.status(200).json({CODE:actionCode,MODE:permissionsActionsCache.get(actionCode)});
    return res.status(200);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction(req.sessionID);
  };
};

export const PermissionsController = {
  getCross,
  upsertCross,
  upsertGroup,
  removeGroup,
  getActions,
  getUserGroups,
  getUserByGroup,
  upsertUserGroupLine,
  removeUserGroupLine,
  getUserGroupLine,
  getPermissionByUser
};
