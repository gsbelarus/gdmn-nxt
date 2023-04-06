import { SignInSignUp } from '@gsbelarus/ui-common-dialogs';
import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { IAuthResult, IUserProfile, ColorMode } from '@gsbelarus/util-api-types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { queryLogin, selectMode, signedInCustomer, signedInEmployee, signInCustomer, signInEmployee, createCustomerAccount, UserState } from './features/user/userSlice';
import { useEffect, useMemo, useState } from 'react';
import { baseUrlApi } from './const';
import { Button, Divider, Typography, Stack, useTheme } from '@mui/material';
import CreateCustomerAccount from './create-customer-account/create-customer-account';
import { Navigate } from 'react-router-dom';
import { CircularIndeterminate } from './components/helpers/circular-indeterminate/circular-indeterminate';
import { InitData } from './store/initData';
import { setColorMode, setPageIdFound, setActiveMenu } from './store/settingsSlice';
import menuItems, { IMenuItem } from './menu-items';
import { useGetPermissionByUserQuery } from './features/permissions';
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

  const appSettings = useSelector((state: RootState) => state.settings);
  const pageIdFound = useSelector((state: RootState) => state.settings.pageIdFound);
  const [actionCode, setActionCode] = useState<number>(-3);
  const { data: permissions } = useGetPermissionByUserQuery(
    { actionCode, userID: userProfile?.id || -1 }, { skip: !userProfile?.id || actionCode < 1 }
  );

  const pathName:string[] = window.location.pathname.split('/');
  pathName.splice(0, 1);
  // Поиск и установка id страницы, который соответствует url, в state
  useEffect(() => {
    if (pageIdFound) {
      return;
    }
    const flatMenuItems = (items: IMenuItem[]): IMenuItem[] =>
      items.map(item =>
        item.type === 'item'
          ? item
          : flatMenuItems(item.children || [])).flatMap(el => el);

    const flattedMenuItems = flatMenuItems(menuItems.items);
    const path = (pathName.filter((pathItem, index) => index !== 0 && pathItem)).join('/');
    const page = (flattedMenuItems.find(item => item.url === path));
    if (page) {
      if (page.checkAction) {
        if (actionCode < 1) {
          setActionCode(page.checkAction);
        }
        if (!permissions) {
          return;
        }
        if (permissions?.MODE === 1) {
          dispatch(setActiveMenu(page.id));
        } else {
          window.location.href = window.location.origin + '/employee/dashboard/overview';
        }
      } else {
        dispatch(setActiveMenu(page.id));
      }
    } else {
      dispatch(setActiveMenu('dashboard'));
    }

    dispatch(setPageIdFound(true));
  }, [appSettings, permissions]);


  type User = IUserProfile & UserState;
  const [user, setUser] = useState<User>();

  useEffect(() => {
    (async function () {
      switch (loginStage) {
        case 'SELECT_MODE':
          dispatch(setColorMode(ColorMode.Light));
          break;
        case 'LAUNCHING':
          // приложение загружается
          // здесь мы можем разместить код, который еще
          // до первой связи с сервером необходимо выполнить
          dispatch(queryLogin());
          break;

        case 'QUERY_LOGIN': {
          const response = await fetch(`${baseUrlApi}user`, { method: 'GET', credentials: 'include' });
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
      }
    })();
  }, [loginStage, pageIdFound]);

  /** Wait for new color mod was applied */
  const theme = useTheme();
  useEffect(() => {
    if (loginStage === 'QUERY_LOGIN' &&
        theme.palette.mode === getCookie('color-mode') &&
        !!user)
    {
      if (user.gedeminUser) {
        dispatch(signedInEmployee({ ...user }));
      } else {
        dispatch(signedInCustomer({ userName: user.userName, id: user.id, contactkey: user.contactkey, colorMode: user.colorMode, dealsFilter: user.dealsFilter }));
      }
    }
  }, [loginStage, theme.palette.mode, user]);


  useEffect(() => {
    if (loginStage === 'SELECT_MODE') dispatch(signInEmployee());
  }, [loginStage]);


  const handleSignIn = async () => {
    const response = await fetch(`${baseUrlApi}user`, { method: 'GET', credentials: 'include' });
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

    dispatch(queryLogin());
  };

  const renderLoginStage = useMemo(() => {
    switch (loginStage) {
      case 'LAUNCHING':
        return (
          <Stack spacing={2}>
            <CircularIndeterminate open={true} size={100} />
            <Typography variant="overline" color="gray" align="center">
              подключение
            </Typography>
          </Stack>
        );
      case 'SELECT_MODE':
        return <></>;
      case 'CUSTOMER':
        return <Navigate to="/customer" />;
      case 'EMPLOYEE':
        return <Navigate to="/employee/dashboard" />;
      case 'CREATE_CUSTOMER_ACCOUNT':
        return <CreateCustomerAccount onCancel={() => dispatch(selectMode())} />;
      case 'SIGN_IN_EMPLOYEE':
        return (
          <SignInSignUp
            checkCredentials={(userName, password) => post(`user/signin`, { userName, password, employeeMode: true })}
            onSignIn={handleSignIn}
          />
        );
      case 'SIGN_IN_CUSTOMER':
        return (
          <SignInSignUp
            checkCredentials={(userName, password) => post(`user/signin`, { userName, password })}
            newPassword={(email) => post('user/forgot-password', { email })}
            onSignIn={handleSignIn}
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
      default:
        return <></>;
    }
  }, [loginStage]);

  const result =
    <Stack direction="column" justifyContent="center" alignContent="center" sx={{ margin: '0 auto', height: '100vh', maxWidth: '440px' }}>
      {renderLoginStage}
    </Stack>;

  return result;
};
