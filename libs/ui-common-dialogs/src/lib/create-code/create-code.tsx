import { Alert, Box, Button, Dialog, Divider, IconButton, InputAdornment, List, ListItem, ListItemIcon, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import SystemSecurityUpdateGoodIcon from '@mui/icons-material/SystemSecurityUpdateGood';
import styles from './create-code.module.less';
import { useRef, useState } from 'react';
import { IAuthResult, IUserProfile } from '@gsbelarus/util-api-types';
import CloseIcon from '@mui/icons-material/Close';

export interface CreateCodeProps {
  user?: IUserProfile;
  onSubmit: (code: string) => Promise<IAuthResult>;
  onCancel: () => void;
  onSignIn?: (email: string) => Promise<IAuthResult>;
};

const instruction = [
  'Установите Google Authenticator или Authy.',
  'В приложении аутентификации выберите значок «+».',
  'Выберите «Сканировать QR-код» и используйте камеру телефона,  чтобы отсканировать этот код.'
];

const subTitle = 'Для вашего пользователя установлена обязательная двухфакторная аутентификация';

export function CreateCode({ user, onCancel, onSubmit, onSignIn }: CreateCodeProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [QRIsOpen, setQRIsOpen] = useState(false);

  const matchUpHeight = useMediaQuery('(min-height:890px)'); // max window height in fact

  const [email, setEmail] = useState<{
    userEmail?: string,
    isError?: boolean,
    errorMessage?: string
  }>({
    userEmail: user?.email,
    isError: false,
    errorMessage: ''
  });

  const handleEmailOk = () => {
    if (!emailRef.current) return;

    const value = emailRef.current.value;
    const regEx = new RegExp(/^[a-zа-я0-9\_\-\'\+]+([.]?[a-zа-я0-9\_\-\'\+])*@[a-zа-я0-9]+([.]?[a-zа-я0-9])*\.[a-zа-я]{2,}$/i);

    if (regEx.test(value)) {
      onSignIn && onSignIn(value);
      return setEmail(({ userEmail: value }));
    };

    const invalidChar = value.match(/[^a-zа-я\_\-\'\+ @.]/i);

    if (invalidChar) {
      return setEmail(({
        userEmail: value,
        isError: true,
        errorMessage: `Адрес не может содержать символ "${invalidChar}"` }));
    };

    setEmail(({
      userEmail: value,
      isError: true,
      errorMessage: 'Некорректный адрес' }));
  };

  const handleSubmit = async () => {
    if (!codeRef.current) return;
    setLoading(true);
    const response = await onSubmit(codeRef.current.value);
    setLoading(false);

    if (response.result === 'ERROR') {
      setError(response.message ?? '');
    }
  };

  const showQR = () => {
    setQRIsOpen(true);
  };

  const closeQR = () => {
    setQRIsOpen(false);
  };

  const qrPopup = <Dialog
    onClose={closeQR}
    open={QRIsOpen}
  >
    <Stack
      padding="8px 16px 16px 16px"
      spacing={1}
    >
      <Stack
        direction="row"
        style={{
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="subtitle1">QR код</Typography>
        <IconButton
          onClick={closeQR}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <img src={user?.qr} alt="Ошибка отображения QR кода" />
    </Stack>
  </Dialog>;

  const content =
    email.userEmail && !email.isError
      ? <>
        <Box textAlign="left">
          <Typography variant="subtitle1">Настройка Google Authenticator или Authy</Typography>
          <Divider style={{ margin: 0 }} />
          <List disablePadding dense>
            {instruction.map((el, idx) =>
              <ListItem
                key={`${idx}`}
                disableGutters
                alignItems="flex-start"
              >
                <ListItemIcon style={{ minWidth: 20, marginTop: 0 }}>
                  <Typography variant="body2">{idx + 1}</Typography>
                </ListItemIcon >
                <Typography variant="body2">{el}</Typography>
              </ListItem>)}
          </List>
        </Box>
        <Box>
          <Typography variant="subtitle1" textAlign="left">Просканируйте QR-код</Typography>
          <Divider style={{ margin: 0 }} />
          <div className={styles.qrContainer}>
            {!matchUpHeight
              ? <Button variant="outlined" onClick={showQR}>
                Показать QR-код
              </Button>
              : <img src={user?.qr} alt="Ошибка отображения QR кода" />}
          </div>
          {qrPopup}
        </Box>
        <Box textAlign="left">
          <Typography variant="subtitle1">Или введите код в своё приложение</Typography>
          <Divider style={{ margin: 0 }} />
          <div className={styles.secretContainer}>
            <Typography variant="body1">{user?.base32Secret ?? 'Ошибка отображения кода'}</Typography>
          </div>
        </Box>
        <Box textAlign="left">
          <Typography variant="subtitle1">Проверьте код</Typography>
          <Divider style={{ margin: 0 }} />
          <Typography variant="body1">Для применения настройки введите код аутентификации:</Typography>
        </Box>
        <TextField
          inputRef={codeRef}
          label="Код аутентификации"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SystemSecurityUpdateGoodIcon />
              </InputAdornment>
            ),
          }}
        />
        <Divider />
        <Stack spacing={1}>
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Проверяем...' : 'Продолжить'}
          </Button>
          <Button variant="outlined" onClick={onCancel}>Отмена</Button>
        </Stack>
      </>
      : <>
        <Box textAlign="left">
          <Typography variant="subtitle1">Для активации 2FA укажите свой email</Typography>
          <Divider />
        </Box>
        <TextField
          label="Email"
          type="text"
          fullWidth
          inputRef={emailRef}
          error={email.isError}
          helperText={email.errorMessage}
          onFocus={() => setEmail(prev => ({ ...prev, errorMessage: '' }))}
        />
        <Divider />
        <Stack spacing={1}>
          <Button variant="contained" onClick={handleEmailOk}>Продолжить</Button>
          <Button variant="outlined" onClick={onCancel}>Отмена</Button>
        </Stack>
      </>;


  return (
    <Stack spacing={2} textAlign="center">
      <Box textAlign="center">
        <Typography variant="h6" fontSize="1.5rem">Двухфакторная аутентификация (2FA)</Typography>
      </Box>
      <Typography variant="body1" hidden={!!user?.permissions}>{subTitle}</Typography>
      {content}
      <Dialog
        onClose={() => setError('')}
        open={!!error}
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
          }
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          style={{ alignItems: 'center' }}
        >
          <Typography variant="subtitle1" color="white">{error}</Typography>
        </Alert>
      </Dialog>
    </Stack>
  );
}

export default CreateCode;
