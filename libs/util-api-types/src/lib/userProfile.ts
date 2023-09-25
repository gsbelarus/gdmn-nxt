import { Permissions } from './crmDataTypes';

export interface IUserProfile {
  id?: number,
  userName: string;
  firstname?: string;
  surname?: string;
  contactkey?: number,
  rank?: string;
  permissions?: Permissions;
  email?: string;
  password?: string;
  qr?: string;
  base32Secret?: string;
};
