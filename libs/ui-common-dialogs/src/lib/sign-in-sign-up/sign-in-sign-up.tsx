import Button from '@mui/material/Button/Button';
import Stack from '@mui/material/Stack/Stack';
import TextField from '@mui/material/TextField/TextField';
import Typography from '@mui/material/Typography/Typography';
import { useReducer } from 'react';
import './sign-in-sign-up.module.less';
import type { IAuthResult } from '@gsbelarus/util-api-types';
import { checkEmailAddress } from '@gsbelarus/util-useful';
import { MathCaptcha } from '../math-captcha/math-captcha';
import { Alert, LinearProgress, Dialog } from '@mui/material';
import Box from '@mui/system/Box/Box';

type Stage = 'SIGNIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

export interface SignInSignUpProps {
  checkCredentials: (userName: string, password: string) => Promise<IAuthResult>;
  /**
   * Если call-back для создания пользователя не задан, то в окне будет отключен
   * функционал создания новой учетной записи.
   */
  createUser?: (userName: string, email: string) => Promise<IAuthResult>;
  newPassword?: (email: string) => Promise<IAuthResult>;
  topDecorator?: (stage?: Stage) => JSX.Element;
  bottomDecorator?: (stage?: Stage) => JSX.Element;
};

type State = {
  stage: Stage;
  waiting: boolean;
  userName: string;
  password: string;
  email: string;
  email2: string;
  authResult?: IAuthResult;
  captchaPassed: boolean;
};

const initialState: State = {
  stage: 'SIGNIN',
  waiting: false,
  userName: '',
  password: '',
  email: '',
  email2: '',
  captchaPassed: false
};

type Action = { type: 'SET_USERNAME', userName: string }
  | { type: 'SET_PASSWORD', password: string }
  | { type: 'SET_EMAIL', email: string }
  | { type: 'SET_EMAIL2', email2: string }
  | { type: 'SET_AUTHRESULT', authResult: IAuthResult }
  | { type: 'CLEAR_AUTHRESULT' }
  | { type: 'SET_STAGE', stage: State['stage'] }
  | { type: 'SET_WAITING' }
  | { type: 'SET_CAPTCHAPASSED', captchaPassed: boolean };

function reducer(state: State, action: Action): State {
  if (state.waiting && action.type !== 'SET_AUTHRESULT') {
    throw new Error(`Invalid action ${action.type} received.`);
  };

  switch (action.type) {
    case 'SET_USERNAME':
      return { ...state, userName: action.userName, authResult: undefined };
    case 'SET_PASSWORD':
      return { ...state, password: action.password, authResult: undefined };
    case 'SET_EMAIL':
      return { ...state, email: action.email, authResult: undefined };
    case 'SET_EMAIL2':
      return { ...state, email2: action.email2, authResult: undefined };
    case 'SET_AUTHRESULT':
      return { ...state, authResult: action.authResult, waiting: false };
    case 'CLEAR_AUTHRESULT':
      return { ...state, authResult: undefined };
    case 'SET_STAGE':
      return { ...state, stage: action.stage, authResult: undefined };
    case 'SET_WAITING':
      return { ...state, waiting: true };
    case 'SET_CAPTCHAPASSED':
      return state.captchaPassed !== action.captchaPassed ? { ...state, captchaPassed: action.captchaPassed } : state;
  }
};

export function SignInSignUp({ checkCredentials, createUser, newPassword, topDecorator, bottomDecorator }: SignInSignUpProps) {
  const [{ stage, userName, password, email, email2, authResult, captchaPassed, waiting }, dispatch] = useReducer(reducer, initialState);

  const waitAndDispatch = (fn: () => Promise<IAuthResult>) => () => {
    dispatch({ type: 'SET_WAITING' });
    fn().then(r => dispatch({ type: 'SET_AUTHRESULT', authResult: r }));
  };

  const doSignIn = () => {
    checkCredentials(userName, password).then(r => {
      dispatch({ type: 'SET_AUTHRESULT', authResult: r });
      if (r.result === 'SUCCESS') {
        location.reload();
      }
    });
  };

  const keyPress = (e: any) => {
    if (e.keyCode === 13) {
      doSignIn();
    }
  };

  const result =
    stage === 'FORGOT_PASSWORD'
      ?
      <Stack direction="column" spacing={2}>
        {topDecorator?.(stage)}
        <TextField
          label="Email"
          value={email}
          error={authResult?.result === 'INVALID_EMAIL' || authResult?.result === 'UNKNOWN_USER'}
          helperText={authResult?.result === 'INVALID_EMAIL' || authResult?.result === 'UNKNOWN_USER' ? authResult?.message : undefined}
          disabled={waiting}
          autoFocus
          onChange={e => dispatch({ type: 'SET_EMAIL', email: e.target.value })}
        />
        <Button
          variant="contained"
          disabled={waiting || !!authResult || !checkEmailAddress(email)}
          onClick = {newPassword && waitAndDispatch(() => newPassword(email))}
        >
          Request new Password
        </Button>
        <Button
          variant="outlined"
          disabled={waiting}
          onClick={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNIN' })}
        >
          Return to sign in
        </Button>
        {bottomDecorator?.(stage)}
      </Stack>
      :
      stage === 'SIGNUP'
        ?
        <Stack direction="column" spacing={2}>
          {topDecorator?.(stage)}
          <Typography variant="h1">
          New user
          </Typography>
          <TextField
            label="Пользователь"
            value={userName}
            disabled={waiting}
            autoFocus
            error={authResult?.result === 'DUPLICATE_USER_NAME'}
            helperText={authResult?.result === 'DUPLICATE_USER_NAME' ? authResult?.message : undefined}
            onChange={e => dispatch({ type: 'SET_USERNAME', userName: e.target.value })}
          />
          <TextField
            label="Email"
            value={email}
            disabled={waiting}
            error={(email > '' && !checkEmailAddress(email)) || authResult?.result === 'DUPLICATE_EMAIL'}
            helperText={authResult?.result === 'DUPLICATE_EMAIL' ? authResult?.message : undefined}
            onChange={e => dispatch({ type: 'SET_EMAIL', email: e.target.value })}
          />
          <TextField
            label="Retype email"
            value={email2}
            disabled={waiting}
            error={email2 > '' && email2 !== email}
            onChange={e => dispatch({ type: 'SET_EMAIL2', email2: e.target.value })}
          />
          <MathCaptcha
            disabled={waiting}
            onEnter={captchaPassed => dispatch({ type: 'SET_CAPTCHAPASSED', captchaPassed })}
          />
          {
            waiting ?
              <Box sx={{ padding: 2, border: 1, borderColor: 'grey.50', borderRadius: 1 }}>
                <LinearProgress />
              </Box>
              :
              <Button
                variant="contained"
                disabled={waiting || !userName || !checkEmailAddress(email) || email !== email2 || !captchaPassed || !!authResult}
                onClick={createUser && waitAndDispatch(() => createUser(userName, email))}
              >
              Sign up
              </Button>
          }
          <Typography>
          Already have an account? <Button disabled={waiting} onClick={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNIN' })}>Sign in</Button>
          </Typography>
          {bottomDecorator?.(stage)}
        </Stack>
        :
        <Stack direction="column" spacing={2}>
          {topDecorator?.(stage)}
          <Typography variant="h1">
          Войти в систему
          </Typography>
          <TextField
            label="Пользователь"
            value={userName}
            error={authResult?.result === 'UNKNOWN_USER'}
            helperText={authResult?.result === 'UNKNOWN_USER' ? authResult?.message : undefined}
            disabled={waiting}
            autoFocus
            onChange={e => dispatch({ type: 'SET_USERNAME', userName: e.target.value })}
            onKeyDown={keyPress}
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            error={authResult?.result === 'INVALID_PASSWORD'}
            helperText={authResult?.result === 'INVALID_PASSWORD' ? authResult?.message : undefined}
            disabled={waiting}
            onChange={e => dispatch({ type: 'SET_PASSWORD', password: e.target.value })}
            onKeyDown={keyPress}
          />
          <Button
            variant="contained"
            disabled={waiting || !userName || !password || !!authResult}
            onClick={doSignIn}
          >
          Вход
          </Button>
          {
            newPassword
          &&
          <Button variant="outlined" disabled={waiting} onClick={() => dispatch({ type: 'SET_STAGE', stage: 'FORGOT_PASSWORD' })}>
            Забыли пароль?
          </Button>
          }
          {
            createUser
          &&
          <Typography>
            Don't have an account? <Button disabled={waiting} onClick={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNUP' })}>Sign up</Button>
          </Typography>
          }
          {bottomDecorator?.(stage)}
        </Stack>;

  return (
    <>
      {result}
      <Dialog onClose={() => dispatch({ type: 'CLEAR_AUTHRESULT' })} open={authResult?.result === 'ERROR'}>
        <Alert severity="error">{authResult?.message}</Alert>
      </Dialog>
      <Dialog onClose={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNIN' })} open={authResult?.result === 'SUCCESS_USER_CREATED'}>
        <Alert severity="success">{authResult?.message}</Alert>
      </Dialog>
      <Dialog onClose={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNIN' })} open={authResult?.result === 'SUCCESS_PASSWORD_CHANGED'}>
        <Alert severity="success">{authResult?.message}</Alert>
      </Dialog>
      <Dialog onClose={() => dispatch({ type: 'SET_STAGE', stage: 'SIGNIN' })} open={authResult?.result === 'SUCCESS'}>
        <Alert severity="success">{authResult?.message}</Alert>
      </Dialog>
    </>
  );
};

export default SignInSignUp;
