import { Attachment, Transaction } from 'node-firebird-driver-native';
import { parseParams, Parameters } from './sql-param-parser';

export const wrapForNamedParams = (attachment: Attachment, transaction: Transaction) => {

  function prepare<T>(fn: (transaction: Transaction, sqlStmt: string, parameters: any[]) => T) {
    return (sqlStmt: string, parameters?: Parameters) => {
      if (!parameters || Array.isArray(parameters)) {
        return fn(transaction, sqlStmt, parameters as any[]);
      } else {
        const parsed = parseParams(sqlStmt);
        return fn(transaction, parsed.sqlStmt, parsed.paramNames?.map( p => parameters[p] ?? null ));
      }
    }
  };

  return {
    executeQuery: prepare(attachment.executeQuery),
    executeSingleton: prepare(attachment.executeSingleton),
    executeSingletonAsObject: prepare(attachment.executeSingletonAsObject),
    fetchAsObject: async (sqlStmt: string, parameters?: Parameters) => {
      let s;
      let p;

      if (!parameters || Array.isArray(parameters)) {
        s = sqlStmt;
        p = parameters;
      } else {
        const parsed = parseParams(sqlStmt);
        s = parsed.sqlStmt;
        p = parsed.paramNames?.map( p => parameters[p] ?? null );
      }

      const statement = await attachment.prepare(transaction, s);
      try {
        const resultSet = await statement.executeQuery(transaction, p);
        try {
          return await resultSet.fetchAsObject();
        } finally {
          await resultSet.close();
        }
      } finally {
        await statement.dispose();
      }
    }
  }
};

