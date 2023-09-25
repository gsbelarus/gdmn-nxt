import { IUserGroup } from '@gsbelarus/util-api-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Slide, Stack, TextField } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, useFormik } from 'formik';
import { forwardRef, ReactElement, Ref, useCallback, useEffect, useState } from 'react';
import * as yup from 'yup';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import DeleteIcon from '@mui/icons-material/Delete';
import styles from './user-group-edit.module.less';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';
import { FormControlLabel } from '@mui/material';
import { Checkbox } from '@mui/material';

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

export interface UserGroupEditProps {
  open: boolean;
  userGroup?: IUserGroup;
  onSubmit: (userGroup: IUserGroup, deleting: boolean) => void;
  onCancel: () => void;
  onClose: () => void;
}

export function UserGroupEdit(props: UserGroupEditProps) {
  const { open, userGroup } = props;
  const { onSubmit, onCancel, onClose } = props;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const classes = useStyles();

  const initValue: IUserGroup = {
    ID: userGroup?.ID ?? -1,
    NAME: userGroup?.NAME ?? '',
    DESCRIPTION: userGroup?.DESCRIPTION ?? '',
    REQUIRED_2FA: userGroup?.REQUIRED_2FA ?? false
  };

  const formik = useFormik<IUserGroup>({
    enableReinitialize: true,
    initialValues: {
      ...userGroup,
      ...initValue
    },
    validationSchema: yup.object().shape({
      NAME: yup.string().required('').max(40, 'Слишком длинное наименование'),
      DESCRIPTION: yup.string().max(260, 'Слишком длинное описание'),
    }),
    onSubmit: (value) => {
      if (!confirmOpen) {
        setDeleting(false);
        setConfirmOpen(true);
        return;
      };
      setConfirmOpen(false);
    }
  });

  const disableSubmitOnEnter = (e: any) => {
    e.key === 'Enter' && e.preventDefault();
  };

  const onDeleteClick = () => {
    setDeleting(true);
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setDeleting(false);
      formik.resetForm();
    }
  }, [open]);

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    onSubmit(formik.values, deleting);
  }, [formik.values, deleting]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return (
    <CustomizedDialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>
        {userGroup ? `Редактирование: ${userGroup.NAME}` : 'Добавление группы'}
      </DialogTitle>
      <DialogContent dividers>
        <FormikProvider value={formik}>
          <Form
            id="mainForm"
            onSubmit={formik.handleSubmit}
          >
            <Stack direction="column" spacing={3}>
              <TextField
                label="Наименование"
                type="text"
                required
                autoFocus
                name="NAME"
                onKeyDown={disableSubmitOnEnter}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.NAME}
                helperText={formik.errors.NAME}
              />
              <TextField
                label="Описание"
                type="text"
                name="DESCRIPTION"
                multiline
                minRows={4}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.DESCRIPTION}
                helperText={formik.errors.DESCRIPTION}
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
        <IconButton onClick={onDeleteClick}>
          <DeleteIcon />
        </IconButton >
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
          type={!formik.isValid ? 'submit' : 'button'}
          form="mainForm"
          onClick={() => {
            setConfirmOpen(formik.isValid);
          }}
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

export default UserGroupEdit;
