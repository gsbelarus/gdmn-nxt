import { config } from '@gdmn-nxt/config';

export const baseUrl = `http://${config.host}:${config.serverPort}/`;
export const baseUrlApi = `${baseUrl}api/v1/`;
