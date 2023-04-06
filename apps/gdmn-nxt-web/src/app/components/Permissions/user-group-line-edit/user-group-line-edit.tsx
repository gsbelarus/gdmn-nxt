import { IUserGroupLine } from '@gsbelarus/util-api-types';
import { Autocomplete, Box, Button, createFilterOptions, Dialog, DialogActions, DialogContent, DialogTitle, Slide, Stack, TextField } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, useFormik } from 'formik';
import { forwardRef, ReactElement, Ref, useCallback, useEffect, useState } from 'react';
import { useGetUsersQuery } from '../../../features/systemUsers';
import * as yup from 'yup';
import styles from './user-group-line-edit.module.less';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';

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

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: ReactElement<any, any>;
  },
  ref: Ref<unknown>,
) {
  return <Slide direction="left" ref={ref} {...props} />;
});

export interface UserGroupLineEditProps {
  open: boolean;
  userGroupLine: IUserGroupLine;
  onSubmit: (user: IUserGroupLine) => void;
  onCancel: () => void;
  onClose: (e: any, r: string) => void;
}

export function UserGroupLineEdit(props: UserGroupLineEditProps) {
  const { open, userGroupLine } = props;
  const { onSubmit, onCancel, onClose } = props;

  const { data: users, isFetching: usersIsFetching } = useGetUsersQuery();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const classes = useStyles();

  const initValue: IUserGroupLine = {
    ID: userGroupLine?.ID || -1,
    USER: userGroupLine?.USER,
    USERGROUP: userGroupLine?.USERGROUP,
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
    stringify: (option:any) => option.NAME + option.CONTACT.NAME
  });

  return (
    <Dialog
      open={open}
      classes={{ paper: classes.dialog }}
      TransitionComponent={Transition}
      onClose={onClose}
    >
      <DialogTitle>
        {userGroupLine.USER ? `Редактирование: ${userGroupLine.USER.NAME}` : 'Добавление'}
      </DialogTitle>
      <DialogContent dividers>
        <FormikProvider value={formik}>
          <Form id="mainForm" onSubmit={formik.handleSubmit}>
            <Stack direction="column" spacing={3}>
              <Autocomplete
                options={users || []}
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
    </Dialog>
  );
}

export default UserGroupLineEdit;
