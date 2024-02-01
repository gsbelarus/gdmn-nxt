import { config } from '@gdmn-nxt/config';

export const baseUrl = `https://${config.serverHost}${config.serverPort ? `:${config.serverPort}` : ''}/`;
// export const baseUrl = `https://${config.serverHost}/`;
export const baseUrlApi = `${baseUrl}api/v1/`;
