import styles from './app.module.less';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { SignInSignUp, LogedUser } from '@gsbelarus/ui-common-dialogs';
import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { IAuthResult } from '@gsbelarus/util-api-types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { setLoginStage, setUserName, UserState } from './features/user/userSlice';
import { useEffect, useState } from 'react';
import { baseURL } from './const';

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
      return { result: 'ERROR', message: `Can't reach server ${baseURL}: ${message}` };
    }
    else {
      return { result: 'ERROR', message: error.message };
    }
  }
};

const post = (url: string, data: Object) => query({ method: 'post', url, baseURL, data, withCredentials: true });
const get = (url: string) => query({ method: 'get', url, baseURL, withCredentials: true });

export function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { loginStage, userName } = useSelector<RootState, UserState>( state => state.user );

  useEffect(() => {
    (async function () {
      switch (loginStage) {
        case 'LAUNCHING':
          // приложение загружается
          dispatch(setLoginStage('QUERY_LOGIN'));
          break;

        case 'QUERY_LOGIN':
          await fetch('http://localhost:4444/user', { method: 'GET', credentials: 'include' })
            .then( response => response.json() )
            .then( data => {
              data[ 'userName' ] ? dispatch(setLoginStage('CLIENT')) : dispatch(setLoginStage('SIGN_IN'));
            });
          break;

        case 'QUERY_LOGOUT':
          await get('/logout');
          dispatch(setLoginStage('SIGN_IN'));
          break;
      }
    })();
  }, [ loginStage ]);

  const result =
    <div className={styles.app}>
      {
        loginStage === 'QUERY_LOGIN' || loginStage === 'LAUNCHING' ?
          <h1>Loading...</h1>
          : loginStage === 'CLIENT' ?
            <LogedUser
              logout={() => dispatch(setLoginStage('QUERY_LOGOUT'))}
              onDone={userName => dispatch(setUserName(userName))}
            />
            :
            <SignInSignUp
              checkCredentials={(userName, password) => post('/api/v1/user/signin', { userName, password })}
              createUser={(userName, email) => post('/api/v1/user/signup', { userName, email })} // Переделать с useEffect P.S. Костыль
              newPassword={(email) => post('/api/v1/user/forgot-password', { email })}
              onDone={userName => dispatch(setUserName(userName))}
            />
      }
    </div>;

  return result;
};

export default App;