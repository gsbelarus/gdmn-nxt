import styles from './check-code.module.less';
import { Alert, Box, Button, Dialog, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SystemSecurityUpdateGoodIcon from '@mui/icons-material/SystemSecurityUpdateGood';
import { IAuthResult } from '@gsbelarus/util-api-types';
import { useRef, useState } from 'react';

export interface CheckCodeProps {
  onSubmit: (code: string) => Promise<IAuthResult>;
  onCancel: () => void;
}

export function CheckCode({ onSubmit, onCancel }: CheckCodeProps) {
  const codeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!codeRef.current) return;
    setLoading(true);
    const response = await onSubmit(codeRef.current.value);
    setLoading(false);

    if (response.result === 'ERROR') {
      setError(response.message ?? '');
    }
  };

  const keyPress = (e: any) => {
    if (e.keyCode === 13) {
      handleSubmit();
    }
  };

  return (
    <Stack spacing={3} textAlign="center">
      <Box textAlign="center">
        <Typography variant="h6" fontSize="1.5rem">Двухфакторная аутентификация (2FA)</Typography>
      </Box>
      <Typography variant="body1">Откройте приложение двухфакторной проверки на своём мобильном устройстве, чтобы получить код подтверждения.</Typography>
      <TextField
        inputRef={codeRef}
        label="Код аутентификации"
        onKeyDown={keyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SystemSecurityUpdateGoodIcon />
            </InputAdornment>
          ),
        }}
      />
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
      <Dialog
        open={!!error}
        onClose={() => setError('')}
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
          }
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          sx={{ alignItems: 'center' }}
        >
          <Typography variant="subtitle1" color="white">{error}</Typography>
        </Alert>
      </Dialog>
    </Stack>
  );
}

export default CheckCode;
