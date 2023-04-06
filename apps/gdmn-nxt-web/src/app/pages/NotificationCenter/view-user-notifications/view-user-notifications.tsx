import { ClientToServerEvents, IMessage, ServerToClientEvents, getSocketClient, socketClient } from '@gdmn-nxt/socket';
import { Autocomplete, Box, Stack, TextField } from '@mui/material';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import NotificationList from '../../../layouts/MainLayout/Header/NotificationSection/notification-list/notification-list';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import styles from './view-user-notifications.module.less';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useGetUsersQuery } from '../../../features/systemUsers';
import { IUser } from '@gsbelarus/util-api-types';
import CustomNoData from '../../../components/Styled/Icons/CustomNoData';
import { Socket } from 'socket.io-client';

/* eslint-disable-next-line */
export interface ViewUserNotificationsProps {}

export function ViewUserNotifications(props: ViewUserNotificationsProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const { data: users = [], isFetching: usersIsFetching } = useGetUsersQuery();
  const [socketClient, setsocketClient] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>();

  const handleUserChange = useCallback((e: any, value: IUser | null) => {
    setSelectedUser(value);
  }, []);

  useEffect(() => {
    const socket = getSocketClient('notifications');
    setsocketClient(socket);
  }, []);

  useEffect(() => {
    socketClient?.emit('messagesByUser_request', selectedUser?.ID || -1);
  }, [socketClient, selectedUser]);

  const sendRequest = useCallback(() => socketClient?.emit('messagesByUser_request', selectedUser?.ID || -1), [selectedUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      sendRequest();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [selectedUser]);

  useEffect(() => {
    socketClient?.on('messagesByUser_response', (data: IMessage[]) => {
      setMessages(data);
    });

    return () => {
      socketClient?.removeListener('messagesByUser_response');
    };
  }, [socketClient]);

  return (
    <CustomizedCard
      className={styles['item-card']}
      borders
      boxShadows
    >
      <Stack direction="column" spacing={2} flex={1} style={{ display: 'flex' }}>
        <Autocomplete
          options={users}
          value={undefined}
          onChange={handleUserChange}
          fullWidth
          loading={usersIsFetching}
          loadingText="Загрузка данных..."
          getOptionLabel={option => option?.NAME || ''}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Пользователь"
              placeholder="Выберите пользователя"
            />
          )}
          renderOption={(props, option) =>
            <li {...props} key={option.ID}>
              {option.NAME}
            </li>
          }
        />
        <Box
          style={{
            height: 'calc(100vh - 410px)',
            minHeight: '430px',
            display: 'grid'
          }}
        >
          {messages.length === 0
            ? <Box style={{ alignSelf: 'center' }}>
              <CustomNoData />
            </Box>
            : <PerfectScrollbar>
              <NotificationList messages={messages} />
            </PerfectScrollbar>}
        </Box>
      </Stack>
    </CustomizedCard>
  );
}

export default ViewUserNotifications;
