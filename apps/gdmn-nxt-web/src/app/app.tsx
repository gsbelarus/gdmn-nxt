import { SignInSignUp } from '@gsbelarus/ui-common-dialogs';
import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { IAuthResult } from '@gsbelarus/util-api-types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { queryLogin, selectMode, signedInCustomer, signedInEmployee, signInCustomer, signInEmployee, createCustomerAccount, UserState } from './features/user/userSlice';
import { useEffect } from 'react';
import { baseUrl } from './const';
import { Button, Divider, Typography, Stack } from '@mui/material';
import { SelectMode } from './select-mode/select-mode';
import CreateCustomerAccount from './create-customer-account/create-customer-account';
import { Navigate } from 'react-router-dom';
import { CircularIndeterminate } from './components/circular-indeterminate/circular-indeterminate';
import { useGetCustomersQuery } from './features/customer/customerApi_new';
import { useGetKanbanDealsQuery } from './features/kanban/kanbanApi';

const query = async (config: AxiosRequestConfig<any>): Promise<IAuthResult> => {
  try {
    return (await axios(config)).data;
  }
  catch (error: any) {
    const { response, request, message } = error as AxiosError;

    if (response) {
      return { result: 'ERROR', message: error.message };
    }
    else if (request) {
      return { result: 'ERROR', message: `Can't reach server ${baseUrl}: ${message}` };
    }
    else {
      return { result: 'ERROR', message: error.message };
    }
  }
};

const post = (url: string, data: Object) => query({ method: 'post', url, baseURL: baseUrl, data, withCredentials: true });
const get = (url: string) => query({ method: 'get', url, baseURL: baseUrl, withCredentials: true });

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { loginStage } = useSelector<RootState, UserState>( state => state.user );

  /** Загрузка данных на фоне в овремя авторизации  */
  const { } = useGetCustomersQuery();
  const { } = useGetKanbanDealsQuery();

  useEffect(() => {
    (async function () {
      switch (loginStage) {
        case 'LAUNCHING':
          // приложение загружается
          // здесь мы можем разместить код, который еще
          // до первой связи с сервером необходимо выполнить
          dispatch(queryLogin());
          break;

        case 'QUERY_LOGIN':
          await fetch(`${baseUrl}user`, { method: 'GET', credentials: 'include' })
            .then( response => response.json() )
            .then( data => {
              if (data[ 'userName' ]) {
                if (data['gedeminUser']) {
                  dispatch(signedInEmployee({ userName: data['userName'], id: data['id'], contactkey: data['contactkey'] }));
                } else {
                  dispatch(signedInCustomer({ userName: data['userName'], id: data['id'], contactkey: data['contactkey'] }));
                }
              } else {
                dispatch(selectMode());
              }
            });
          break;
      }
    })();
  }, [ loginStage ]);

  const result =
    <Stack direction="column" justifyContent="center" alignContent="center" sx={{ margin: '0 auto',  height: '100vh', maxWidth: "440px" }}>
      {
        loginStage === 'QUERY_LOGIN' || loginStage === 'LAUNCHING' ?
          <Stack spacing={2}>
            <CircularIndeterminate open={true} size={100} />
            <Typography variant="overline" color="gray" align="center">
              подключение
            </Typography>
          </Stack>
          : loginStage === 'SELECT_MODE' ?
            <SelectMode
              employeeModeSelected={ () => dispatch(signInEmployee()) }
              customerModeSelected={ () => dispatch(signInCustomer()) }
            />
          : loginStage === 'CUSTOMER' ? <Navigate to="/customer" />
          : loginStage === 'EMPLOYEE' ? <Navigate to="/employee/dashboard" />
          : loginStage === 'CREATE_CUSTOMER_ACCOUNT' ? <CreateCustomerAccount onCancel={ () => dispatch(selectMode()) } />
          : loginStage === 'SIGN_IN_EMPLOYEE' ?
            <SignInSignUp
              checkCredentials={(userName, password) => post('user/signin', { userName, password, employeeMode: true })}
              bottomDecorator={ () => <Typography align="center">Вернуться в<Button onClick={ () => dispatch(selectMode()) }>начало</Button></Typography> }
            />
          :
            <SignInSignUp
              checkCredentials={(userName, password) => post('user/signin', { userName, password })}
              newPassword={(email) => post('user/forgot-password', { email })}
              bottomDecorator={ () =>
                <Stack direction="column">
                  <Typography align="center">Создать новую<Button onClick={ () => dispatch(createCustomerAccount()) }>учетную запись</Button></Typography>
                  <Divider />
                  <Typography align="center">Вернуться в<Button onClick={ () => dispatch(selectMode()) }>начало</Button></Typography>
                </Stack>
              }
            />
      }
    </Stack>

  return result;
};

export default App;
