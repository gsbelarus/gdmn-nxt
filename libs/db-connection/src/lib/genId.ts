import { IWithID } from '@gsbelarus/util-api-types';
import { Attachment, Transaction } from 'node-firebird-driver-native';

export const genId = async (attachment: Attachment, transaction: Transaction): Promise<number> => {
  const rs = await attachment.executeQuery(transaction, 'SELECT id FROM gd_p_getnextid');
  try {
    return (await rs.fetchAsObject<IWithID>())[0].ID;
  } catch {
    return -1;
  } finally {
    await rs.close();
  }
};
