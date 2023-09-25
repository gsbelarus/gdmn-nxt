import styles from './profile.module.less';
import NoPhoto from './img/NoPhoto.png';
import { Avatar, Box, Button, CardContent, CardHeader, Checkbox, Dialog, Divider, Fab, FormControlLabel, Icon, Skeleton, Stack, Switch, Tab, TextField, Tooltip, Typography } from '@mui/material';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetProfileSettingsQuery, useSetProfileSettingsMutation } from '../../../features/profileSettings';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { UserState } from '../../../features/user/userSlice';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import InfoIcon from '@mui/icons-material/Info';
import { Form, FormikProvider, getIn, useFormik } from 'formik';
import { IAuthResult, IProfileSettings, IUserProfile } from '@gsbelarus/util-api-types';
import * as yup from 'yup';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import SystemSecurityUpdateGoodIcon from '@mui/icons-material/SystemSecurityUpdateGood';
import { CheckCode, CreateCode } from '@gsbelarus/ui-common-dialogs';
import { useDisableOtpMutation, useGenerateOtpQRMutation, useVerifyOtpMutation } from '../../../features/auth/authApi';

/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  const { userProfile } = useSelector<RootState, UserState>(state => state.user);
  const { data: settings, isLoading } = useGetProfileSettingsQuery(userProfile?.id || -1);
  const [setSettings, { isLoading: updateIsLoading, error }] = useSetProfileSettingsMutation();

  const [generateOtp] = useGenerateOtpQRMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [disableOtp] = useDisableOtpMutation();

  const [tabIndex, setTabIndex] = useState('1');
  const [image, setImage] = useState<string>(NoPhoto);
  const inputRef = useRef<HTMLInputElement>(null);


  const [user, setUser] = useState<IUserProfile>();

  const handleUploadClick = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0] || undefined;
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = (e) => {
      setImage(reader.result?.toString() || '');

      setSettings({
        userId: userProfile?.id || -1,
        body: {
          ...settings,
          AVATAR: reader.result?.toString() || ''
        }
      });
    };
  }, [settings]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState<{
    create?: boolean;
    check?: boolean;
  }>({
    create: false,
    check: false
  });

  const onDelete = () => {
    handleConfirmCancelClick();
    if (image.length === 1) return;
    setSettings({
      userId: userProfile?.id || -1,
      body: {
        ...settings,
        AVATAR: null,
      }
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmCancelClick = () => {
    setConfirmOpen(false);
  };

  const handleTabsChange = (event: any, newindex: string) => {
    setTabIndex(newindex);
  };

  useEffect(() => {
    settings?.AVATAR && setImage(settings?.AVATAR);
  }, [settings?.AVATAR, error]);

  const initValue: Partial<IProfileSettings> = {
    SEND_EMAIL_NOTIFICATIONS: settings?.SEND_EMAIL_NOTIFICATIONS ?? false,
    ENABLED_2FA: settings?.ENABLED_2FA ?? false,
    REQUIRED_2FA: settings?.REQUIRED_2FA ?? false,
  };

  const formik = useFormik<IProfileSettings>({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: {
      ...settings,
      ...initValue
    },
    validationSchema: yup.object().shape({
      EMAIL: yup.string()
        .matches(/^[a-zа-я0-9\_\-\'\+]+([.]?[a-zа-я0-9\_\-\'\+])*@[a-zа-я0-9]+([.]?[a-zа-я0-9])*\.[a-zа-я]{2,}$/i,
          ({ value }) => {
            const invalidChar = value.match(/[^a-zа-я\_\-\'\+ @.]/i);
            if (invalidChar) {
              return `Адрес не может содержать символ "${invalidChar}"`;
            }
            return 'Некорректный адрес';
          })
        .max(40, 'Слишком длинный email'),
    }),
    onSubmit: (value) => {
      setSettings({
        userId: userProfile?.id ?? -1,
        body: {
          ...settings,
          ...value
        }
      });
    }
  });

  const onEnable2FAChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;

    if (checked) {
      const response = await generateOtp({ userId: userProfile?.id ?? -1, email: formik.values.EMAIL ?? '' });

      if (!('data' in response)) return;

      setUser({
        ...userProfile,
        userName: userProfile?.userName ?? '',
        email: formik.values.EMAIL ?? '',
        qr: response.data.qr,
        base32Secret: response.data.base32
      });

      setTwoFAOpen({ create: true });
    }
    /** Если хотим отключить, то надо ввести текущий код */
    if (!checked) {
      setTwoFAOpen({ check: true });
    }
  };

  const handleCreateOnSubmit = async (code: string): Promise<IAuthResult> => {
    const response = await verifyOtp({ userId: userProfile?.id ?? -1, code });

    if (!('data' in response)) return new Promise((resolve) => resolve({} as IAuthResult));

    if (response.data.result === 'SUCCESS') {
      formik.setFieldValue('ENABLED_2FA', true);
      formik.handleSubmit();
      setTwoFAOpen({ create: false });
    }

    return response.data;
  };

  const handleCheckOnSubmit = async (code: string): Promise<IAuthResult> => {
    const response = await disableOtp({ userId: userProfile?.id ?? -1, code });

    if (!('data' in response)) return new Promise((resolve) => resolve({} as IAuthResult));

    if (response.data.result === 'SUCCESS') {
      formik.setFieldValue('ENABLED_2FA', false);
      formik.handleSubmit();
      setTwoFAOpen({ check: false });
    }

    return response.data;
  };

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      dangerous={true}
      title={'Удаление фото'}
      text="Вы уверены, что хотите продолжить?"
      confirmClick={onDelete}
      cancelClick={handleConfirmCancelClick}
    />
  , [confirmOpen]);


  const memoCheckCode = useMemo(() =>
    <Dialog open={twoFAOpen.check ?? false} style={{ padding: 2 }}>
      <Stack
        direction="column"
        justifyContent="center"
        alignContent="center"
        sx={{ maxWidth: '440px', margin: 3 }}
      >
        <CheckCode onCancel={() => setTwoFAOpen({ check: false })} onSubmit={handleCheckOnSubmit} />
      </Stack>
    </Dialog>, [twoFAOpen.check]);

  const memoCreateCode = useMemo(() =>
    <Dialog open={twoFAOpen.create ?? false} style={{ padding: 2 }}>
      <Stack
        direction="column"
        justifyContent="center"
        alignContent="center"
        sx={{ maxWidth: '440px', margin: 3 }}
      >
        <CreateCode
          user={user}
          onCancel={() => setTwoFAOpen({ check: false })}
          onSubmit={handleCreateOnSubmit}
        />
      </Stack>
    </Dialog>, [twoFAOpen.create]);

  return (
    <>
      {memoCheckCode}
      {memoCreateCode}
      {memoConfirmDialog}
      <CustomizedCard className={styles.mainCard} borders>
        <CardHeader title={<Typography variant="pageHeader">Аккаунт</Typography>} />
        <Divider />
        <CardContent className={styles['card-content']}>
          <Stack
            direction="row"
            flex={1}
            spacing={2}
          >
            <Box position="relative">
              {isLoading || updateIsLoading
                ? <Skeleton
                  variant="circular"
                  height={300}
                  width={300}
                />
                :
                <Avatar
                  className={styles.image}
                  src={image}
                />}
              <Box position="absolute" top={250}>
                <Fab
                  disabled={isLoading || updateIsLoading}
                  component="span"
                  color="error"
                  onClick={handleDeleteClick}
                >
                  <DeleteIcon />
                </Fab>
              </Box>
              <Box
                position="absolute"
                top={250}
                left={245}
              >
                <label htmlFor="contained-button-file">
                  <Fab
                    component="span"
                    color="primary"
                    disabled={isLoading || updateIsLoading}
                  >
                    <AddPhotoAlternateIcon />
                  </Fab>
                </label>
              </Box>
              <input
                disabled={isLoading || updateIsLoading}
                className={styles['input-hide']}
                accept="image/*"
                id="contained-button-file"
                type="file"
                onChange={handleUploadClick}
                ref={inputRef}
              />
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box display="flex" flex={1}>
              <FormikProvider value={formik}>
                <Form
                  id="profileForm"
                  onSubmit={formik.handleSubmit}
                  className={styles.tabPanelForm}
                >
                  <TabContext value={tabIndex}>
                    <TabList onChange={handleTabsChange}>
                      <Tab label="Общее" value="1" />
                      <Tab
                        label="Безопасность"
                        value="2"
                        disabled={isLoading}
                      />
                      <Tab
                        label="Уведомления"
                        value="3"
                        disabled={isLoading}
                      />
                    </TabList>
                    <Divider style={{ margin: 0 }} />
                    <TabPanel value="1" className={tabIndex === '1' ? styles.tabPanel : ''}>
                      <Stack spacing={2}>
                        <TextField
                          label="Должность"
                          value={settings?.RANK || ''}
                          disabled
                        />
                        <TextField
                          disabled={isLoading}
                          label="Email"
                          name="EMAIL"
                          onChange={formik.handleChange}
                          value={formik.values.EMAIL ?? ''}
                          helperText={getIn(formik.touched, 'EMAIL') && getIn(formik.errors, 'EMAIL')}
                          error={getIn(formik.touched, 'EMAIL') && Boolean(getIn(formik.errors, 'EMAIL'))}
                        />
                      </Stack>
                    </TabPanel>
                    <TabPanel value="2" className={tabIndex === '2' ? styles.tabPanel : ''}>
                      <Typography variant="subtitle1">Способы входа</Typography>
                      <Stack direction="row" spacing={1}>
                        <Icon fontSize="large" style={{ height: '100%', marginLeft: -7 }}>
                          <SystemSecurityUpdateGoodIcon fontSize="large" color="action"/>
                        </Icon>
                        <Stack>
                          <Typography >Двухфакторная аутентификация</Typography>
                          <Typography variant="caption">Дополнительная защита аккаунта с паролем</Typography>
                        </Stack>
                        <Box flex={1} />
                        {/* .. Для вашего пользователя установлена обязательная двухфакторная аутентификация */}
                        <Tooltip
                          style={{ cursor: 'help' }}
                          arrow
                          title={formik.values.REQUIRED_2FA ? 'Для вашего пользователя установлена обязательная двухфакторная аутентификация' : ''}
                        >
                          <FormControlLabel
                            style={{
                              width: '155px'
                            }}
                            label={<Typography>{formik.values.ENABLED_2FA ? 'Подключено' : 'Отключено'}</Typography>}
                            disabled={formik.values.REQUIRED_2FA}
                            control={
                              <Switch
                                name="ENABLED_2FA"
                                checked={formik.values.ENABLED_2FA}
                                onChange={onEnable2FAChange}
                              />}
                          />
                        </Tooltip>
                      </Stack>
                    </TabPanel>
                    <TabPanel value="3" className={tabIndex === '3' ? styles.tabPanel : ''}>
                      <Stack direction="row" alignItems="center">
                        <FormControlLabel
                          disabled={isLoading}
                          label="Получать уведомления по почте"
                          control={<Checkbox
                            name="SEND_EMAIL_NOTIFICATIONS"
                            checked={formik.values.SEND_EMAIL_NOTIFICATIONS}
                            onChange={formik.handleChange}
                          />}
                          style={{
                            minWidth: '190px',
                          }}
                        />
                        <Tooltip
                          style={{ cursor: 'help' }}
                          arrow
                          title="Новые уведомления будут приходить списком каждый час с 9:00 до 17:00"
                        >
                          <InfoIcon color="action" />
                        </Tooltip>
                      </Stack>
                    </TabPanel>

                  </TabContext>
                  <Box flex={1}/>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={(JSON.stringify(formik.values) === JSON.stringify(settings)) || isLoading}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Сохранить
                  </Button>
                </Form>
              </FormikProvider>
            </Box>
          </Stack>
        </CardContent>
      </CustomizedCard>
    </>
  );
}

export default Profile;
