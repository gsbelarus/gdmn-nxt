import { wrapForNamedParams } from '@gsbelarus/util-helpers';
import { Semaphore } from '@gsbelarus/util-useful';
import { Client, Attachment, createNativeClient, getDefaultLibraryFilename, Transaction, TransactionIsolation } from 'node-firebird-driver-native';
import { config } from './db-config';
import { genId } from './genId';

const { host, port, db, username, password } = config;

let client: Client;

interface IDBSession {
  /** Full name of the database, including host and port number. */
  fullDbName: string;
  lock: number;
  touched: number;
  attachment: Attachment;
  readTransaction?: Transaction;
};

interface IDBSessions {
  [sessionId: string]: IDBSession;
};

const sessions: IDBSessions = {};
const semaphore = new Semaphore('dbSessions');

// TODO: время жизни сессии вынести с настройки
/** Minimal time of life of open unused attachment */
const minTimeOfLife = 1 * 60 * 100;

const releaseSessions = () => {
  const t = new Date().getTime();
  return Promise.all(Object.values(sessions).map(
    async (s) => {
      const { lock, attachment, readTransaction, touched } = s;
      if (!lock && (t - touched) > minTimeOfLife) {
        if (readTransaction?.isValid) {
          try {
            await readTransaction.commit();
          } catch (error) {
            console.error('ReadTransaction commit', error);
          };
        }

        if (attachment.isValid) {
          try {
            await attachment.disconnect();
          } catch (error) {
            console.error('Attachment disconnect', error);
          };
        }
      }
    }
  ));
};

const cleanupInterval = setInterval(
  async () => {
    await semaphore.acquire();
    try {
      await releaseSessions();

      for (const sessionId of Object.keys(sessions)) {
        if (!sessions[sessionId].attachment.isValid) {
          console.log(new Date().toLocaleTimeString(), `DB Session ${sessionId} has been deleted due to inactivity...`);
          delete sessions[sessionId];
        }
      }
    } finally {
      semaphore.release();
    }
  },
  minTimeOfLife
);

export const getDBSession = async (sessionId: string) => {
  if (!client?.isValid) {
    client = createNativeClient(getDefaultLibraryFilename());
  }

  await semaphore.acquire();
  try {
    let session = sessions[sessionId];

    if (!session?.attachment.isValid) {
      const fullDbName = `${host}/${port}:${db}`;
      const attachment = await client.connect(fullDbName, { username, password });
      session = {
        fullDbName,
        lock: 1,
        touched: new Date().getTime(),
        attachment
      };
      sessions[sessionId] = session;
    } else {
      session.lock += 1;
    }
    return session;
  } finally {
    semaphore.release();
  }
};

export const releaseDBSession = async (sessionId: string) => {
  await semaphore.acquire();
  try {
    const session = sessions[sessionId];

    if (!session?.attachment.isValid) {
      throw new Error(`Invalid attachment in session ${sessionId}`);
    }

    if (session.lock < 1) {
      throw new Error(`Invalid lock value ${session.lock} in session ${sessionId}`);
    }

    session.lock -= 1;
    session.touched = new Date().getTime();
  } finally {
    semaphore.release();
  }
};

export const getAttachment = async (sessionId: string) => (await getDBSession(sessionId)).attachment;
export const releaseAttachment = (sessionId: string) => releaseDBSession(sessionId);

export const getReadTransaction = async (sessionId: string) => {
  if (!client?.isValid) {
    client = createNativeClient(getDefaultLibraryFilename());
  }

  await semaphore.acquire();
  try {
    let dbSession = sessions[sessionId];

    if (!dbSession?.attachment.isValid) {
      const fullDbName = `${host}/${port}:${db}`;
      const attachment = await client.connect(fullDbName, { username, password });
      const readTransaction = await attachment.startTransaction({
        isolation: TransactionIsolation.READ_COMMITTED,
        readCommittedMode: 'RECORD_VERSION',
        waitMode: 'NO_WAIT',
        accessMode: 'READ_ONLY'
      });
      dbSession = {
        fullDbName,
        lock: 1,
        touched: new Date().getTime(),
        attachment,
        readTransaction
      };
      sessions[sessionId] = dbSession;
    } else {
      dbSession.lock += 1;

      if (!dbSession.readTransaction?.isValid) {
        dbSession.readTransaction = await dbSession.attachment.startTransaction({
          isolation: TransactionIsolation.READ_COMMITTED,
          readCommittedMode: 'RECORD_VERSION',
          waitMode: 'NO_WAIT',
          accessMode: 'READ_ONLY'
        });
      }
    }
    return {
      attachment: dbSession.attachment,
      transaction: dbSession.readTransaction,
      fullDbName: dbSession.fullDbName
    };
  } finally {
    semaphore.release();
  }
};

export const releaseReadTransaction = async (sessionId: string) => {
  await semaphore.acquire();
  try {
    const dbSession = sessions[sessionId];

    if (!dbSession?.readTransaction?.isValid) {
      throw new Error(`No active read transaction in session ${sessionId}`);
    }

    if (dbSession?.lock < 1) {
      throw new Error(`Db session ${sessionId} is not locked`);
    }

    dbSession.lock -= 1;
    dbSession.touched = new Date().getTime();
  } finally {
    semaphore.release();
  }
};

export const acquireReadTransaction = async (sessionId: string) => {
  const { attachment, transaction } = await getReadTransaction(sessionId);

  let released = false;

  const releaseReadTransaction = async () => {
    if (released) {
      throw new Error('multiple call of releaseTransaction');
    }

    await semaphore.acquire();
    try {
      const dbSession = sessions[sessionId];

      if (!dbSession?.readTransaction?.isValid) {
        throw new Error(`No active read transaction in session ${sessionId}`);
      }

      if (dbSession?.lock < 1) {
        throw new Error(`Db session ${sessionId} is not locked`);
      }

      released = true;
      dbSession.lock -= 1;
      dbSession.touched = new Date().getTime();
    } catch (error) {
      console.log('releaseReadTransaction', error);
    } finally {
      semaphore.release();
    }
  };

  return {
    attachment,
    transaction,
    releaseReadTransaction,
    ...wrapForNamedParams(attachment, transaction)
  };
};

export const startTransaction = async (sessionId: string) => {
  const attachment = await getAttachment(sessionId);
  const transaction = await attachment.startTransaction({
    isolation: TransactionIsolation.READ_COMMITTED,
    readCommittedMode: 'RECORD_VERSION',
    waitMode: 'NO_WAIT'
  });

  let released = false;

  const releaseTransaction = async (commit = true) => {
    if (released) {
      throw new Error('Transaction has been released already');
    }

    if (transaction.isValid) {
      if (commit) {
        await transaction.commit();
      } else {
        await transaction.rollback();
      }
    }

    await releaseAttachment(sessionId);
    released = true;
  };

  const generateId = () => genId(attachment, transaction);

  return {
    attachment,
    transaction,
    releaseTransaction,
    generateId,
    ...wrapForNamedParams(attachment, transaction)
  };
};

export const releaseTransaction = async (sessionId: string, transaction: Transaction) => {
  if (transaction.isValid) {
    await transaction.commit();
    await releaseAttachment(sessionId);
  }
};

export const commitTransaction = async (sessionId: string, transaction: Transaction) => {
  if (transaction.isValid) {
    await transaction.commit();
  }
  await releaseAttachment(sessionId);
};

export const rollbackTransaction = async (sessionId: string, transaction: Transaction) => {
  if (transaction.isValid) {
    await transaction.rollback();
  }
  await releaseAttachment(sessionId);
};

export const disposeConnection = async () => {
  await semaphore.acquire();
  try {
    clearInterval(cleanupInterval);
    if (client?.isValid) {
      await client.dispose();
    }
  } finally {
    semaphore.release();
  }
};
