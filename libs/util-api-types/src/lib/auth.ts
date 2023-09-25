import { IUserProfile } from "..";

export type AuthResult =
  'SUCCESS'

  /** Registration of the new user */

  /** Provided data is invalid */
  | 'INVALID_DATA'
  | 'DUPLICATE_USER_NAME'
  | 'DUPLICATE_EMAIL'

  | 'SUCCESS_PASSWORD_CHANGED'
  | 'SUCCESS_USER_CREATED'
  | 'SUCCESS_PASSWORD_CHANGED'

  /** Authenticate user */

  | 'UNKNOWN_USER'
  | 'INVALID_PASSWORD'
  | 'REQUIRED_2FA'
  | 'ENABLED_2FA'
  /** email unknown to the system */
  | 'INVALID_EMAIL'
  | 'ACCESS_DENIED'
  | 'SERVER_UNAVAILABLE'

  /** any other error */
  | 'ERROR';

export interface IAuthResult {
  result: AuthResult;
  message?: string;
  userProfile?: IUserProfile;
};

export const authResult = (result: AuthResult, message?: string, userProfile?: IUserProfile): IAuthResult => ({ result, message, userProfile });
