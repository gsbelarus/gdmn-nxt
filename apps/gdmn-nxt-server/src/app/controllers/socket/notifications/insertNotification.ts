import { startTransaction } from '@gdmn-nxt/db-connection';

export const insertNotification = async (sessionId: string, message: string, userIDs: number[]) => {
  const { fetchAsObject, releaseTransaction, transaction } = await startTransaction(sessionId);

  try {
    const sql = `
      INSERT INTO USR$CRM_NOTIFICATIONS (USR$USERKEY, USR$TITLE, USR$MESSAGE)
      VALUES(:userId, 'От администратора', :message)
      RETURNING ID`;

    await Promise.all(userIDs.map(userId => fetchAsObject(sql, { userId, message })));

    // console.log('insertNotification', res);

    // await attachment.executeQuery(transaction, sql);
  } catch (error) {
    transaction.rollback();
    throw new Error(error.message);
  } finally {
    await releaseTransaction();
  };
};
