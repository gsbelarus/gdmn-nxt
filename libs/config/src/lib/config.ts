interface IConfig {
  host: string;
  appPort: number;
  serverHost: string;
  serverPort: number;
  notificationPort: number;
  streamingUpdatePort: number;
  apiAccessToken: string;
  jwtSecret: string;
  serverStaticMode: boolean;
  origin: string;
}


/** Host where back/container is running  */
const host = process.env.NX_HOST_IP || '';

/** Listening host */
const serverHost = process.env.NX_SERVER_HOST || '';

/** Listening port */
const serverPort = Number(process.env.NX_SERVER_PORT);

const serverStaticMode = process.env.NX_SEVER_USE_STATIC_FILE === 'true';

const notificationPort = Number(process.env.NX_SOCKET_NOTIFICATIONS_PORT);

const streamingUpdatePort = Number(process.env.NX_SOCKET_STREAMING_UPDATE_PORT);

const appPort =
  serverStaticMode
    ? serverPort
    : Number(process.env.NX_APP_PORT) ?? 80;

const apiAccessToken = process.env.ACCESS_API_TOKEN || '';
const jwtSecret = process.env.JWT_SECRET || '';

// const origin = `https://${host}:${appPort}`;
const origin = `https://${host}`;

export const config: IConfig = {
  host,
  appPort,
  serverHost,
  serverPort,
  notificationPort,
  streamingUpdatePort,
  apiAccessToken,
  jwtSecret,
  serverStaticMode,
  origin
};
