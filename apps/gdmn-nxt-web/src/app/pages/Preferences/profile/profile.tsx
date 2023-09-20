import styles from './profile.module.less';
import NoPhoto from './img/NoPhoto.png';
import { Avatar, Box, Button, CardContent, CardHeader, Checkbox, Divider, Fab, FormControlLabel, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
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
import { IProfileSettings } from '@gsbelarus/util-api-types';
import * as yup from 'yup';

/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  const { userProfile } = useSelector<RootState, UserState>(state => state.user);
  const { data: settings, isLoading } = useGetProfileSettingsQuery(userProfile?.id || -1);
  const [setSettings, { isLoading: updateIsLoading, error }] = useSetProfileSettingsMutation();

  const [image, setImage] = useState<string>(NoPhoto);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    settings?.AVATAR && setImage(settings?.AVATAR);
  }, [settings?.AVATAR, error]);

  const initValue: Partial<IProfileSettings> = {
    SEND_EMAIL_NOTIFICATIONS: settings?.SEND_EMAIL_NOTIFICATIONS ?? false,
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

  return (
    <>
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
                <Form id="profileForm" onSubmit={formik.handleSubmit}>
                  <Stack
                    direction="column"
                    spacing={2}
                    flex={1}
                    height={'100%'}
                  >
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
                    <Box flex={1} />
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={(JSON.stringify(formik.values) === JSON.stringify(settings)) || isLoading}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Сохранить
                      {/* {(JSON.stringify(formik.values) === JSON.stringify(settings)) || isLoading ? 'Нет изменений' : 'Сохранить'} */}
                    </Button>
                  </Stack>
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
