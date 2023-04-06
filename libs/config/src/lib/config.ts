interface IConfig {
  host: string;
  port: number;
  notificationPort: number;
  streamingUpdatePort: number;
  appPort: number;
  env?: string;
}

const host = (() => {
  return process.env.NODE_ENV === 'development'
    ? 'localhost'
    : process.env.NX_HOST_IP || '';
})();

const port = (() => {
  return process.env.NODE_ENV === 'development'
    ? 4444
    : Number(process.env.GDMN_NXT_SERVER_PORT) || 4444;
})();

const notificationPort = (() => {
  return process.env.NODE_ENV === 'development'
    ? 5555
    : Number(process.env.NX_SOCKET_NOTIFICATIONS_PORT);
})();

const streamingUpdatePort = Number(process.env.NX_SOCKET_STREAMING_UPDATE_PORT);

const appPort = (() => {
  return process.env.NODE_ENV === 'development'
    ? 4201
    : Number(process.env.NX_APP_PORT);
})();


export const config: IConfig = {
  host,
  port,
  notificationPort,
  streamingUpdatePort,
  appPort,
  env: process.env.NODE_ENV || '123'
};

// export function config(): IConfig {
//   // process.env.NODE_ENV
//   return {
//     host,
//     port: 80,
//     env: process.env.NODE_ENV
//   };
// }
