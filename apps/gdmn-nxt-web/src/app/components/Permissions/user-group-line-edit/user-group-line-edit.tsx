import { IUserGroupLine } from '@gsbelarus/util-api-types';
import { Autocomplete, Box, Button, Checkbox, createFilterOptions, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, useFormik } from 'formik';
import { useCallback, useEffect, useState } from 'react';
import { useGetUsersQuery } from '../../../features/systemUsers';
import * as yup from 'yup';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';
import { useGetUserGroupLineQuery } from '../../../features/permissions';

const useStyles = makeStyles(() => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    minWidth: 430,
    maxWidth: '100%',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  button: {
    width: '120px',
  },
}));

export interface UserGroupLineEditProps {
  open: boolean;
  userGroupLine: IUserGroupLine;
  onSubmit: (user: IUserGroupLine) => void;
  onCancel: () => void;
}

export function UserGroupLineEdit(props: UserGroupLineEditProps) {
  const { open, userGroupLine } = props;
  const { onSubmit, onCancel } = props;

  const { data: users, isFetching: usersIsFetching } = useGetUsersQuery();
  const { data: existsUsers = [] } = useGetUserGroupLineQuery(userGroupLine.USERGROUP.ID);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const classes = useStyles();

  const initValue: IUserGroupLine = {
    ID: userGroupLine?.ID || -1,
    USER: userGroupLine?.USER,
    USERGROUP: userGroupLine?.USERGROUP,
    REQUIRED_2FA: userGroupLine?.REQUIRED_2FA ?? false
  };

  const formik = useFormik<IUserGroupLine>({
    enableReinitialize: true,
    initialValues: {
      ...userGroupLine,
      ...initValue
    },
    validationSchema: yup.object().shape({
      USER: yup.object().required('Не выбран пользователь'),
    }),
    onSubmit: (value) => {
      setConfirmOpen(true);
    }
  });

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    onSubmit(formik.values);
  }, [formik.values]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const filterOptions = createFilterOptions({
    matchFrom: 'any',
    stringify: (option: any) => option.NAME + option.CONTACT.NAME
  });

  const handleClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <CustomizedDialog
      open={open}
      onClose={handleClose}
    >
      <DialogTitle>
        {userGroupLine.USER ? `Редактирование: ${userGroupLine.USER.NAME}` : 'Добавление пользователя'}
      </DialogTitle>
      <DialogContent dividers>
        <FormikProvider value={formik}>
          <Form id="mainForm" onSubmit={formik.handleSubmit}>
            <Stack direction="column" spacing={3}>
              <Autocomplete
                options={users?.filter(user => existsUsers.findIndex(eu => eu.USER?.ID === user.ID) < 0) ?? []}
                getOptionLabel={option => option.NAME}
                filterOptions={filterOptions}
                value={users?.find(el => el.ID === formik.values.USER?.ID) || null}
                loading={usersIsFetching}
                loadingText="Загрузка данных..."
                onBlur={formik.handleBlur}
                onChange={(event, value) => {
                  formik.setFieldValue(
                    'USER', value ? value : undefined
                  );
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.ID}>
                    <div>
                      {option.NAME}
                      <div>
                        {option.CONTACT.NAME}
                      </div>
                    </div>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Пользователь"
                    name="USER"
                    required
                    focused
                    placeholder="Выберите пользователя"
                    error={Boolean(formik.errors.USER)}
                    helperText={formik.errors.USER}
                  />
                )}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.REQUIRED_2FA}
                    name="REQUIRED_2FA"
                  />
                }
                onChange={formik.handleChange}
                label="Обязательная двухфакторная аутентификация"
              />
            </Stack>
          </Form>
        </FormikProvider>
      </DialogContent>
      <DialogActions>
        <Box flex={1}/>
        <Button
          className={classes.button}
          onClick={onCancel}
          variant="text"
          color="primary"
        >
          Отменить
        </Button>
        <Button
          className={classes.button}
          type={'submit'}
          form="mainForm"
          variant="contained"
        >
          Сохранить
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={confirmOpen}
        title="Сохранение"
        text="Вы уверены, что хотите продолжить?"
        confirmClick={handleConfirmOkClick}
        cancelClick={handleConfirmCancelClick}
      />
    </CustomizedDialog>
  );
}

export default UserGroupLineEdit;
