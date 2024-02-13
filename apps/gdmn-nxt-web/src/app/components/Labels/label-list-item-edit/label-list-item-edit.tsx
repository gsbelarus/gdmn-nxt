import { Box, Button, DialogActions, DialogContent, DialogTitle, Stack, TextField, Theme } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import styles from './label-list-item-edit.module.less';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { ILabel } from '@gsbelarus/util-api-types';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, getIn, useFormik } from 'formik';
import * as yup from 'yup';
import { SketchPicker } from 'react-color';
import LabelMarker from '../label-marker/label-marker';
import { useOutsideClick } from '../../../features/common/useOutsideClick';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';
import IconSelect from '@gdmn-nxt/components/icon-select/icon-select';

const useStyles = makeStyles((theme: Theme) => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    width: '30vw',
    minWidth: 330,
    maxWidth: '100%',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  button: {
    width: '120px',
  },
  piker: {

    position: 'absolute',
    zIndex: '1400 !important',
    right: '10px',
    moveTop: '10px',
    top: 'top - 50px',
    '& .sketch-picker ': {
      backgroundColor: `${theme.mainContent.backgroundColor} !important`,
      color: `${theme.textColor} !important`
    },
    '& .sketch-picker label': {
      color: `${theme.textColor} !important`
    },
    '& .saturation-white div': {
      pointerEvent: 'none !important',
      cursor: 'pointer !important'
    }
  }
}));

export interface LabelListItemEditProps {
  open: boolean;
  label?: ILabel;
  onSubmit: (lable: ILabel) => void;
  onCancelClick: () => void;
};

export function LabelListItemEdit(props: LabelListItemEditProps) {
  const classes = useStyles();
  const { open, label } = props;
  const { onSubmit, onCancelClick } = props;
  const [selectColor, setSelectColor] = useState(false);

  const initValue: ILabel = {
    ID: label?.ID || 0,
    USR$NAME: label?.USR$NAME || '',
    USR$DESCRIPTION: label?.USR$DESCRIPTION || '',
    USR$COLOR: label?.USR$COLOR || '',
    USR$ICON: label?.USR$ICON || ''
  };

  const formik = useFormik<ILabel>({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: {
      ...label,
      ...initValue
    },
    validationSchema: yup.object().shape({
      USR$NAME: yup.string().required('')
        .max(30, 'Слишком длинное наименование'),
      USR$DESCRIPTION: yup.string().max(120, 'Слишком длинное описание'),
    }),
    onSubmit: (value) => {
      if (!confirmOpen) {
        setConfirmOpen(true);
        return;
      };
      setConfirmOpen(false);
    }
  });

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const onCancel = () => {
    onCancelClick();
  };

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    onSubmit(formik.values);
  }, [formik.values]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const [colorLabel, setColorLabel] = useState(label?.USR$COLOR || 'grey');

  const handleOnClose = useCallback(() => onCancelClick(), [onCancelClick]);

  const [ref] = useOutsideClick(selectColor, [], () => setSelectColor(false));

  const changeIcon = (iconName: string) => {
    formik.setFieldValue('USR$ICON', iconName);
  };

  return (
    <>
      <CustomizedDialog
        open={open}
        onClose={handleOnClose}
      >
        <DialogTitle>
          {label ? `Редактирование: ${label.USR$NAME}` : 'Добавление метки'}
        </DialogTitle>
        <DialogContent dividers>
          <FormikProvider value={formik}>
            <Form id="mainForm" onSubmit={formik.handleSubmit}>
              <Stack direction="column" spacing={2}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <IconSelect icon={formik.values.USR$ICON} setIcon={changeIcon} />
                  <LabelMarker label={formik.values} icon={formik.values.USR$ICON} />
                </Stack>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  <TextField
                    style={{ width: '100%' }}
                    label="Наименование"
                    type="text"
                    required
                    autoFocus
                    name="USR$NAME"
                    onChange={formik.handleChange}
                    value={formik.values.USR$NAME}
                    error={getIn(formik.touched, 'USR$NAME') && Boolean(getIn(formik.errors, 'USR$NAME'))}
                    helperText={getIn(formik.touched, 'USR$NAME') && getIn(formik.errors, 'USR$NAME')}
                  />
                </div>

                <Stack ref={ref} spacing={0.5}>
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
                  <div className={classes.piker}>
                    <>
                      <SketchPicker
                        color={colorLabel}
                        onChange= {(color) => {
                          setColorLabel(color.hex);
                        }}
                        onChangeComplete={(color) => {
                          formik.setFieldValue('USR$COLOR', color.hex);
                        }}
                      />
                    </>
                  </div>
                  }
                </Stack>
                <TextField
                  label="Описание"
                  type="text"
                  name="USR$DESCRIPTION"
                  multiline
                  minRows={4}
                  onChange={formik.handleChange}
                  value={formik.values.USR$DESCRIPTION}
                  error={getIn(formik.touched, 'USR$DESCRIPTION') && Boolean(getIn(formik.errors, 'USR$DESCRIPTION'))}
                  helperText={getIn(formik.touched, 'USR$DESCRIPTION') && getIn(formik.errors, 'USR$DESCRIPTION')}
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
            variant="outlined"
            color="primary"
          >
            Отменить
          </Button>
          <Button
            className={classes.button}
            type="submit"
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
    </>
  );
}

export default LabelListItemEdit;
