import { config } from '@gdmn-nxt/config';

export const baseUrl = process.env.NODE_ENV === 'production'
  ? `https://${config.serverHost}/`
  : `https://${config.serverHost}:${config.serverPort}/`;
export const baseUrlApi = `${baseUrl}api/v1/`;
