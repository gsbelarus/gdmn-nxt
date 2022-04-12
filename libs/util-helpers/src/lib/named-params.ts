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
    fetchAsObject: (sqlStmt: string, parameters?: Parameters) => {

    }
  }
};

