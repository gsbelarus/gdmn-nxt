import { ClientToServerEvents, ServerToClientEvents, IUser, INotification } from '@gdmn-nxt/socket';
import { Router } from 'express';
import { Server } from 'socket.io';
import { config } from '@gdmn-nxt/config';
import { getNotifications } from './handlers/getNotifications';
import { deleteNotification } from './handlers/deleteNotification';
import { updateNotifications } from './handlers/updateNotifications';
import { getMessagesByUser } from './handlers/getMessagesByUser';
import { insertNotification } from './handlers/insertNotification';

interface NotificationsProps {
  router: Router;
}

const host = (() => {
  return process.env.NODE_ENV === 'development'
    ? 'localhost'
    : process.env.NX_HOST_IP;
})();

const port = (() => {
  return process.env.NODE_ENV === 'development'
    ? 4201
    : process.env.GDMN_NXT_SERVER_PORT;
})();

const notificationPort = (() => {
  return process.env.NODE_ENV === 'development'
    ? 7777
    : Number(process.env.NX_SOCKET_NOTIFICATIONS_PORT);
})();

export function Notifications({ router }: NotificationsProps) {
  const socketIO = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >({
    cors: {
      credentials: true,
      // origin: `http://${process.env.NODE_ENV === 'development' ? 'localhost:4201' : `${process.env.NX_HOST_IP}:80`}`
      origin: `http://${host}:${port}`
    }
  });

  const sessionId = 'notification';
  const users: IUser[] = [];

  socketIO.listen(config.notificationPort);

  socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on('delete', async (notificationId) => {
      await deleteNotification(sessionId, notificationId);
      sendMessages();
    });

    socket.on('messagesByUser_request', async (userId) => {
      const notifications = await getNotifications(sessionId);
      const userNotifications: INotification[] = notifications[userId];

      socket.emit('messagesByUser_response', userNotifications?.map(n => {
        const { message, userId, ...mes } = n;
        return { ...mes, text: n.message };
      }) || []);
    });

    socket.on('sendMessageToUsers_request', async (message, userIDs) => {
      if (!message || userIDs?.length === 0) {
        return;
      };

      try {
        await insertNotification(sessionId, message, userIDs);
      } catch (error) {
        socket.emit('sendMessageToUsers_response', 500, 'Сообщение не отправлено. Обратитесь к администратору');
        return;
      };

      sendMessages();
      socket.emit('sendMessageToUsers_response', 200, 'Сообщение успешно отправлено');
    });

    const user: IUser = {
      userId: socket.handshake.auth.userId,
      socketId: socket.id
    };

    users.push(user);

    /** выслать список уведомлений подключившемуся пользователю */
    const notifications = getNotifications(sessionId);
    const userNotifications: INotification[] = notifications[user.userId];
    socket.emit('messages', userNotifications?.map(n => {
      const { message, userId, ...mes } = n;
      return { ...mes, text: n.message };
    }) || []);

    socket.on('disconnect', () => {
      const userIndex = users.indexOf(user);
      (userIndex !== -1) && users.splice(userIndex, 1);

      console.log(`🔥: A user ${socket.id} disconnected`);
    });
  });

  async function sendMessages() {
    if (users.length === 0) return;

    /** обновить список уведомлений в базе */
    await updateNotifications(sessionId);

    /** считать актуальные уведомления */
    const notifications = await getNotifications(sessionId);

    /** отправить каждому активному пользователю из users свои уведомления */
    users.forEach(user => {
      const userNotifications: INotification[] = notifications[user.userId];

      socketIO.to(user.socketId).emit('messages', userNotifications?.map(n => {
        const { message, userId, ...mes } = n;
        return { ...mes, text: n.message };
      }) || []);
    });
  }

  setInterval(sendMessages, 5000);

  router.get('/notifications/user/:userId', getMessagesByUser);
}
