import styles from './profile.module.less';
import NoPhoto from './img/NoPhoto.png';
import { Avatar, Box, Button, CardActions, CardContent, CardHeader, Divider, Fab, Skeleton, Stack, TextField, Typography } from '@mui/material';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useGetProfileSettingsQuery, useSetProfileSettingsMutation } from '../../../features/profileSettings';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { UserState } from '../../../features/user/userSlice';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';

/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  const { userProfile } = useSelector<RootState, UserState>(state => state.user);
  const { data: settings, isLoading } = useGetProfileSettingsQuery(userProfile?.id || -1);
  const [setSettings, { isLoading: updateIsLoading }] = useSetProfileSettingsMutation();

  const [image, setImage] = useState<string>(NoPhoto);

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
          AVATAR: reader.result?.toString() || '',
          COLORMODE: settings?.COLORMODE,
          DEALSFILTER: settings?.DEALSFILTER
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
        AVATAR: null,
        COLORMODE: settings?.COLORMODE
      }
    });
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmCancelClick = () => {
    setConfirmOpen(false);
  };

  useEffect(() => {
    settings?.AVATAR && setImage(settings?.AVATAR);
  }, [settings?.AVATAR]);
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
    <>{memoConfirmDialog}
      <CustomizedCard className={styles.mainCard} borders>
        <CardHeader title={<Typography variant="h3">Аккаунт</Typography>} />
        <Divider />
        <CardContent className={styles['card-content']}>
          <Stack direction="row" flex={1} spacing={2} >
            <Box position="relative">
              {isLoading || updateIsLoading
                ? <Skeleton variant="circular" height={300} width={300} />
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
              <Box position="absolute" top={250} left={245}>
                <label htmlFor="contained-button-file">
                  <Fab component="span" color="primary" disabled={isLoading || updateIsLoading}>
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
              />
            </Box>
            <Divider orientation="vertical" flexItem />
            <Stack direction="column" spacing={2} flex={1} >
              <TextField
                label="Должность"
                value={settings?.RANK || ''}
                disabled
              />
              <Box flex={1} />
              <Button variant="contained" style={{ alignSelf: 'flex-start' }}>Сохранить</Button>
            </Stack>
          </Stack>
        </CardContent>
      </CustomizedCard>
    </>
  );
}

export default Profile;
