import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slide, Stack, TextField, Theme } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { forwardRef, ReactElement, Ref, useEffect, useState } from 'react';
import styles from './label-list-item-edit.module.less';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { ILabel } from '@gsbelarus/util-api-types';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, useFormik } from 'formik';
import * as yup from 'yup';
import { TwitterPicker } from 'react-color';
import LabelMarker from '../label-marker/label-marker';


const useStyles = makeStyles(() => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    // width: '20vw',
    minWidth: 330,
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

export interface LabelListItemEditProps {
  open: boolean;
  label?: ILabel;
  onSubmit: (lable: ILabel) => void;
  onCancelClick: () => void;
};

export function LabelListItemEdit(props: LabelListItemEditProps) {
  const { open, label } = props;
  const { onSubmit, onCancelClick } = props;

  const classes = useStyles();

  const [selectColor, setSelectColor] = useState(false);

  const initValue: ILabel = {
    ID: label?.ID || 0,
    USR$NAME: label?.USR$NAME || '',
    USR$DESCRIPTION: label?.USR$DESCRIPTION || '',
    USR$COLOR: label?.USR$COLOR || ''
  };

  const formik = useFormik<ILabel>({
    enableReinitialize: true,
    initialValues: {
      ...label,
      ...initValue
    },
    validationSchema: yup.object().shape({
      USR$NAME: yup.string().required('').max(40, 'Слишком длинное наименование'),
      USR$DESCRIPTION: yup.string().max(40, 'Слишком длинное описание'),
    }),
    onSubmit: (value) => {
      setConfirmOpen(false);
      onSubmit(value);
    }
  });

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const onCancel = () => {
    onCancelClick();
  };

  return (
    <Dialog
      open={open}
      classes={{ paper: classes.dialog }}
      TransitionComponent={Transition}
    >
      <DialogTitle>
        {label ? `Редактирование: ${label.USR$NAME}` : 'Добавление'}
      </DialogTitle>
      <DialogContent dividers>
        <FormikProvider value={formik}>
          <Form id="mainForm" onSubmit={formik.handleSubmit}>
            <Stack direction="column" spacing={3}>
              <LabelMarker label={formik.values} />
              <TextField
                label="Наименование"
                type="text"
                required
                autoFocus
                name="USR$NAME"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.USR$NAME}
                helperText={formik.errors.USR$NAME}
              />
              <TextField
                label="Описание"
                type="text"
                name="USR$DESCRIPTION"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.USR$DESCRIPTION}
                helperText={formik.errors.USR$DESCRIPTION}
              />
              <Stack spacing={0.5}>
                <TextField
                  label="Цвет"
                  type="text"
                  inputProps={{
                    readOnly: true
                  }}
                  onSelect={() => setSelectColor(true)}
                  value={formik.values.USR$COLOR}
                  helperText={formik.errors.USR$COLOR}
                />
                {selectColor &&
                  <TwitterPicker
                    color={formik.values.USR$COLOR}
                    onChange={(color) => {
                      formik.setFieldValue('USR$COLOR', color.hex);
                      setSelectColor(false);
                    }}
                  />
                }
              </Stack>
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
        setOpen={setConfirmOpen}
        title="Сохранение"
        text="Вы уверены, что хотите продолжить?"
        onConfirm={formik.handleSubmit}
      />
    </Dialog>
  );
}

export default LabelListItemEdit;
