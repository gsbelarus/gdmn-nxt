import { IKanbanCard, IKanbanColumn, IRequestResult } from '@gsbelarus/util-api-types';
import { RequestHandler } from 'express';
import { ResultSet } from 'node-firebird-driver-native';
import { resultError } from '../responseMessages';
import { getReadTransaction, startTransaction } from '../utils/db-connection';

const get: RequestHandler = async (req, res) => {
  const { mode } = req.params;

  const { releaseReadTransaction, executeQuery } = await getReadTransaction(req.sessionID);

  // let cardsData = '';
  // switch (mode) {
  // case 'deals':
  //   cardsData = `
  //     JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY`;
  //   break;

  // default:
  //   break;
  // }

  try {
    const _schema = { };

    // let allFields = ['ID', 'EDITIONDATE', 'USR$INDEX', 'USR$NAME'];
    let actualFields = ['ID', 'USR$INDEX', 'USR$NAME'];
    let actualFieldsNames = actualFields.join(',');

    const columnsResultSet = await executeQuery(
      `SELECT ${actualFieldsNames}
      FROM USR$CRM_KANBAN_COLUMNS
      ORDER BY USR$INDEX`
    );

    let cardsResultSet;
    switch (mode) {
    case 'deals':
      cardsResultSet = await executeQuery(
        `SELECT
            card.ID, COALESCE(card.USR$INDEX, 0) USR$INDEX, card.USR$MASTERKEY,
            card.USR$DEALKEY, deal.ID deal_ID, deal.USR$NAME deal_USR$NAME, deal.USR$DISABLED deal_USR$DISABLED, deal.USR$AMOUNT deal_USR$AMOUNT, deal.USR$CONTACTKEY deal_USR$CONTACTKEY,
            con.ID con_ID, con.NAME con_NAME
          FROM USR$CRM_KANBAN_CARDS card
          JOIN USR$CRM_DEALS deal ON deal.ID = card.USR$DEALKEY
          JOIN GD_CONTACT con ON con.ID = deal.USR$CONTACTKEY
          ORDER BY card.USR$MASTERKEY, USR$INDEX`
      );

      break;

    default:
      actualFields = ['ID', 'USR$MASTERKEY', 'USR$INDEX', 'USR$DEALKEY'];
      actualFieldsNames = actualFields.join(',');

      cardsResultSet = await executeQuery(
        `SELECT ${actualFieldsNames}
          FROM USR$CRM_KANBAN_CARDS card
          ORDER BY USR$INDEX`
      );

      break;
    };

    interface ISubItemArray {
      itemName: string;
      itemResultSet: ResultSet;
      itemMasterField?: string;
      itemDetailField: string;
      subItemArray?: ISubItemArray[];
    };

    const execQuery = async (resultSet: ResultSet, itemArray?: ISubItemArray[]) => {
      const data = await resultSet.fetchAsObject();

      if (itemArray) {
        for (const item of itemArray) {
          const itemData = await Promise.all(await execQuery(item.itemResultSet));

          switch (mode) {
          case 'deals':
            itemData.map((el: IKanbanCard) => {
              el.DEAL = {
                ID: el['DEAL_ID'],
                USR$NAME: el['DEAL_USR$NAME'],
                USR$CONTACTKEY: el['DEAL_$CONTACTKEY'],
                USR$AMOUNT: el['DEAL_USR$AMOUNT'],
                CONTACT: {
                  ID: el['CON_ID'],
                  NAME: el['CON_NAME']
                },
              };
              return el;
            });

            break;

          default:
            break;
          };

          data.map((el) => {
            return el[item.itemName] = itemData?.filter((e: IKanbanCard) => e[item.itemDetailField] === el[item.itemMasterField ? item.itemMasterField : 'ID']) as IKanbanCard[];
          });
        }
      }

      resultSet.close();
      return data;
    };

    // const rs = await Promise.all(await execQuery(columnsResultSet));
    // console.log('rs', rs);


    const itemArray: ISubItemArray[] = [
      {
        itemName: 'CARDS',
        itemResultSet: cardsResultSet,
        itemDetailField: 'USR$MASTERKEY',
        // subItemArray: [{
        //   itemName: 'DEAL',
        //   itemResultSet: dealsResultSet,
        //   itemMasterField: 'USR$DEALKEY',
        //   itemDetailField: 'ID',
        //   subItemArray: [{
        //     itemName: 'CONTACT',
        //     itemResultSet: contactResultSet,
        //     itemMasterField: 'USR$CONTACTKEY',
        //     itemDetailField: 'ID',
        //   }]
        // }]
      }
    ];

    const result: IRequestResult = {
      queries: {
        columns: await Promise.all(await execQuery(columnsResultSet, itemArray))
      },
      _schema
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseReadTransaction();
  };
};

const reorderColumns: RequestHandler = async (req, res) => {
  const { transaction, releaseTransaction, executeSingletonAsObject } = await startTransaction(req.sessionID);

  try {
    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const columns: IKanbanColumn[] = req.body;

    if (!columns.length) {
      return res.status(422).send(resultError('Нет данных'));
    }

    const allFields = ['ID', 'USR$INDEX'];
    const actualFields = allFields.filter(field => typeof columns[0][field] !== 'undefined');
    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_COLUMNS(${actualFieldsNames})
      VALUES(${paramsString})
      MATCHING(ID)
      RETURNING ${returnFieldsNames}`;

    const unresolvedPromises = columns.map(async column => {
      const paramsValues = actualFields.map(field => {
        return column[field];
      });

      return (await executeSingletonAsObject(sql, paramsValues));
    });

    const records = await Promise.all(unresolvedPromises);

    const result: IRequestResult<{ columns: IKanbanColumn[] }> = {
      queries: {
        columns: records as IKanbanColumn[]
      },
      _schema: undefined
    };

    await transaction.commit();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

const reorderCards: RequestHandler = async (req, res) => {
  const { transaction, releaseTransaction, executeSingletonAsObject } = await startTransaction(req.sessionID);

  try {
    // const erModelFull = importERModel('TgdcDepartment');
    // const entites: IEntities = Object.fromEntries(Object.entries((await erModelFull).entities));

    // const allFields = [...new Set(entites['TgdcDepartment'].attributes.map(attr => attr.name))];

    const cards: IKanbanCard[] = req.body;

    if (!cards.length) {
      return res.status(422).send(resultError('Нет данных'));
    };

    const allFields = ['ID', 'USR$INDEX'];
    const actualFields = allFields.filter(field => typeof cards[0][field] !== 'undefined');
    const actualFieldsNames = actualFields.join(',');
    const paramsString = actualFields.map(_ => '?').join(',');
    const returnFieldsNames = allFields.join(',');

    const sql = `
      UPDATE OR INSERT INTO USR$CRM_KANBAN_CARDS(${actualFieldsNames})
      VALUES(${paramsString})
      MATCHING(ID)
      RETURNING ${returnFieldsNames}`;

    const unresolvedPromises = cards.map(async card => {
      const paramsValues = actualFields.map(field => {
        return card[field];
      });

      return (await executeSingletonAsObject(sql, paramsValues));
    });

    const records = await Promise.all(unresolvedPromises);

    const result: IRequestResult<{ cards: IKanbanCard[] }> = {
      queries: {
        cards: records as IKanbanCard[]
      },
      _schema: undefined
    };

    await transaction.commit();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(resultError(error.message));
  } finally {
    await releaseTransaction();
  };
};

export default { get, reorderColumns, reorderCards };
