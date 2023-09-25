import { resultError } from '../../../responseMessages';
import { startTransaction } from '@gdmn-nxt/db-connection';

export const deleteNotification = async (sessionId: string, id: number) => {
  if (isNaN(id)) return;
  const { attachment, transaction, fetchAsObject, releaseTransaction } = await startTransaction(sessionId);

  try {
    const sql = `
      UPDATE USR$CRM_NOTIFICATIONS c
      SET c.USR$DELAYED = 1
      WHERE c.ID = ${id}`;

    // await fetchAsObject(sql);
    await attachment.executeQuery(transaction, sql);
  } catch (error) {
    console.error(resultError(error.message));
  } finally {
    releaseTransaction();
  };
};
