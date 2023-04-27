import { ClientToServerEvents, ServerToClientEvents, IUser, INotification } from '@gdmn-nxt/socket';
import { Router } from 'express';
import { Server } from 'socket.io';
import { config } from '@gdmn-nxt/config';
import { getNotifications } from '../../../controllers/socket/notifications/getNotifications';
import { deleteNotification } from '../../../controllers/socket/notifications/deleteNotification';
import { updateNotifications } from '../../../controllers/socket/notifications//updateNotifications';
import { getMessagesByUser } from '../../../controllers/socket/notifications//getMessagesByUser';
import { insertNotification } from '../../../controllers/socket/notifications//insertNotification';

interface NotificationsProps {
  router: Router;
}

export function Notifications({ router }: NotificationsProps) {
  const socketIO = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >({
    cors: {
      credentials: true,
      origin: `http://${config.host}:${config.appPort}`
    }
  });

  const sessionId = 'notification';
  const users: IUser[] = [];

  socketIO.listen(config.notificationPort);

  socketIO.on('connection', (socket) => {
    console.log(`⚡ Notifications: ${socket.id} user just connected!`);

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

  setInterval(sendMessages, 15000);

  router.get('/notifications/user/:userId', getMessagesByUser);
}
