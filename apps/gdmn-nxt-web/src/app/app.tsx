import { CheckCode, CreateCode, SignInSignUp } from '@gsbelarus/ui-common-dialogs';
import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { IAuthResult, IUserProfile, ColorMode } from '@gsbelarus/util-api-types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { queryLogin, selectMode, signedInCustomer, signedInEmployee, signInEmployee, createCustomerAccount, UserState, renderApp, signIn2fa, create2fa, setEmail } from './features/user/userSlice';
import { useEffect, useMemo, useState } from 'react';
import { baseUrlApi } from './const';
import { Button, Divider, Typography, Stack, useTheme } from '@mui/material';
import CreateCustomerAccount from './create-customer-account/create-customer-account';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircularIndeterminate } from './components/helpers/circular-indeterminate/circular-indeterminate';
import { InitData } from './store/initData';
import { setColorMode } from './store/settingsSlice';
import { getCookie } from './features/common/getCookie';

const query = async (config: AxiosRequestConfig<any>): Promise<IAuthResult> => {
  try {
    return (await axios(config)).data;
  } catch (error: any) {
    const { response, request, message } = error as AxiosError;

    if (response) {
      return { result: 'ERROR', message: error.message };
    } else if (request) {
      return { result: 'ERROR', message: `Can't reach server ${baseUrlApi}: ${message}` };
    } else {
      return { result: 'ERROR', message: error.message };
    }
  }
};

const post = (url: string, data: Object) => query({ method: 'post', url, baseURL: baseUrlApi, data, withCredentials: true });

export interface AppProps {}

export default function App(props: AppProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loginStage, userProfile } = useSelector<RootState, UserState>(state => state.user);

  /** Загрузка данных на фоне во время авторизации  */
  InitData();

  const navigate = useNavigate();

  const pathName: string[] = window.location.pathname.split('/');
  pathName.splice(0, 1);
  // Поиск и установка id страницы, который соответствует url, в state
  type User = IUserProfile & UserState;
  const [user, setUser] = useState<User>();

  useEffect(() => {
    (async function () {
      switch (loginStage) {
        case 'SELECT_MODE':
          dispatch(setColorMode(ColorMode.Light));
          navigate('/');
          break;
        case 'LAUNCHING':
          // приложение загружается
          // здесь мы можем разместить код, который еще
          // до первой связи с сервером необходимо выполнить
          dispatch(queryLogin());
          break;

        case 'QUERY_LOGIN': {
          const response = await fetch(`${baseUrlApi}user`, { method: 'GET', credentials: 'include' });
          if (!response.ok) {
            dispatch(selectMode());
            return;
          }

          const data = await response.json();

          if (!data.result) {
            dispatch(selectMode());
            return;
          }

          setUser(data.user);

          const colorMode = getCookie('color-mode');
          switch (colorMode) {
            case ColorMode.Dark:
              dispatch(setColorMode(ColorMode.Dark));
              break;
            case ColorMode.Light:
              dispatch(setColorMode(ColorMode.Light));
              break;
            default:
              dispatch(setColorMode(ColorMode.Light));
              break;
          }
          break;
        }
        case 'OTHER_LOADINGS': {
          dispatch(renderApp());
          break;
        }
      }
    })();
  }, [loginStage]);

  /** Wait for new color mod was applied */
  const theme = useTheme();
  useEffect(() => {
    if (loginStage === 'QUERY_LOGIN' &&
        theme.palette.mode === getCookie('color-mode') &&
        !!user) {
      if (user.gedeminUser) {
        dispatch(signedInEmployee({ ...user }));
      } else {
        dispatch(signedInCustomer({ userName: user.userName, id: user.id, contactkey: user.contactkey }));
      }
    }
  }, [loginStage, theme.palette.mode, user]);


  useEffect(() => {
    if (loginStage === 'SELECT_MODE') dispatch(signInEmployee());
  }, [loginStage]);

  const handleSignInWithEmail = (email: string) => handleSignIn(userProfile?.userName ?? '', userProfile?.password ?? '', email);

  const handleSignIn = async (userName: string, password: string, email?: string) => {
    const response = await post('user/signin', { userName, password, employeeMode: true, ...(email && { email }) });

    if (response.result === 'SUCCESS') {
      dispatch(queryLogin());
    };

    if (response.result === 'REQUIRED_2FA') {
      if (!response.userProfile?.email) {
        dispatch(setEmail({ ...response.userProfile, userName, password }));
      } else {
        dispatch(create2fa({ ...response.userProfile, userName, password }));
      }
    };

    if (response.result === 'ENABLED_2FA') {
      dispatch(signIn2fa());
    };

    return response;
  };

  const backToMain = async () => {
    dispatch(selectMode());
  };

  const create2FAOnSubmit = async (code: string): Promise<IAuthResult> => {
    const response = await post('user/signin-2fa', { code });

    if (response.result === 'SUCCESS') {
      dispatch(queryLogin());
    };

    return response;
  };

  const check2FAOnSubmit = async (code: string): Promise<IAuthResult> => {
    const response = await post('user/signin-2fa', { code });

    if (response.result === 'SUCCESS') {
      dispatch(queryLogin());
    };

    return response;
  };

  const loadingPage = useMemo(() => {
    return (
      <Stack spacing={2}>
        <CircularIndeterminate open={true} size={100} />
        <Typography
          variant="overline"
          color="gray"
          align="center"
        >
          подключение
        </Typography>
      </Stack>
    );
  }, []);

  const renderLoginStage = useMemo(() => {
    switch (loginStage) {
      case 'LAUNCHING':
        return loadingPage;
      case 'OTHER_LOADINGS':
        return loadingPage;
      case 'SELECT_MODE':
        return loadingPage;
      case 'CUSTOMER':
        return <Navigate to="/customer" />;
      case 'EMPLOYEE':
        return <Navigate to="/employee/dashboard" />;
      case 'CREATE_CUSTOMER_ACCOUNT':
        return <CreateCustomerAccount onCancel={() => dispatch(selectMode())} />;
      case 'SIGN_IN_EMPLOYEE':
        return (
          <SignInSignUp
            // checkCredentials={handleCheckCredentials}
            onSignIn={handleSignIn}
          />
        );
      case 'SIGN_IN_CUSTOMER':
        return (
          <SignInSignUp
            onSignIn={(userName, password) => post('user/signin', { userName, password })}
            newPassword={(email) => post('user/forgot-password', { email })}
            // onSignIn={handleSignIn}
            bottomDecorator={() =>
              <Stack direction="column">
                <Typography align="center">
                  Создать новую
                  <Button onClick={() => dispatch(createCustomerAccount())}>
                    учетную запись
                  </Button>
                </Typography>
                <Divider />
                <Typography align="center">
                  Вернуться в
                  <Button onClick={() => dispatch(selectMode())}>
                    начало
                  </Button>
                </Typography>
              </Stack>
            }
          />
        );
      case 'CREATE_2FA':
      case 'SET_EMAIL':
        return <CreateCode
          user={userProfile}
          onSubmit={create2FAOnSubmit}
          onCancel={backToMain}
          onSignIn={handleSignInWithEmail}
        />;
      case 'SIGN_IN_2FA':
        return <CheckCode
          onSubmit={check2FAOnSubmit}
          onCancel={backToMain}
        />;
      default:
        return loadingPage;
    }
  }, [loginStage]);

  const result =
    <Stack
      direction="column"
      justifyContent="center"
      alignContent="center"
      sx={{ margin: '0 auto', height: '100vh', maxWidth: '440px' }}
    >
      {renderLoginStage}
    </Stack>;

  return result;
};
