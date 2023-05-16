import { Autocomplete, Box, Button, Checkbox, createFilterOptions, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, Slide, Stack, TextField, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { forwardRef, ReactElement, Ref, useCallback, useEffect, useMemo, useState } from 'react';
import styles from './kanban-edit-task.module.less';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { IEmployee, IKanbanCard, IKanbanTask } from '@gsbelarus/util-api-types';
import { Form, FormikProvider, useFormik } from 'formik';
import * as yup from 'yup';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { UserState } from '../../../features/user/userSlice';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { DesktopDatePicker, TimePicker } from '@mui/x-date-pickers-pro';
import { useGetEmployeesQuery } from '../../../features/contact/contactApi';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';
import { useGetKanbanDealsQuery } from '../../../features/kanban/kanbanApi';
import filterOptions from '../../helpers/filter-options';
import { useGetTaskTypesQuery } from '../../../features/kanban/kanbanCatalogsApi';

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: 0
  },
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    width: '25vw',
    minWidth: 400,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  dialogAction: {
    paddingRight: '3%',
    paddingLeft: '3%',
  },
  helperText: {
    '& p': {
      color: '#ec5555',
    },
  },
  button: {
    width: '120px',
  },
}));

// const filterOptions = createFilterOptions({
//   matchFrom: 'any',
//   limit: 50,
//   stringify: (option: IEmployee) => option.NAME,
// });

export interface KanbanEditTaskProps {
  open: boolean;
  task?: IKanbanTask;
  onSubmit: (task: IKanbanTask, deleting: boolean) => void;
  onCancelClick: () => void;
}

export function KanbanEditTask(props: KanbanEditTaskProps) {
  const { open, task } = props;
  const { onSubmit, onCancelClick } = props;

  const classes = useStyles();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cards, setCards] = useState<IKanbanCard[]>([]);

  const { data: employees, isFetching: employeesIsFetching } = useGetEmployeesQuery();
  const { data: deals = [], isLoading: dealsIsLoading } = useGetKanbanDealsQuery({ userId: -1 });
  const { data: taskTypes = [], isFetching: taskTypesFetching } = useGetTaskTypesQuery();

  useEffect(() => {
    if (dealsIsLoading) return;
    setCards(deals.map(d => d.CARDS)?.flat());
  }, [deals, dealsIsLoading]);

  const user = useSelector<RootState, UserState>(state => state.user);

  const initValue: IKanbanTask = {
    ID: task?.ID || -1,
    USR$CARDKEY: task?.USR$CARDKEY || -1,
    USR$NAME: task?.USR$NAME || '',
    CREATOR: task?.CREATOR
      ? task.CREATOR
      : {
        ID: user.userProfile?.contactkey || -1,
        NAME: ''
      },
    USR$CLOSED: task?.USR$CLOSED || false,
    USR$DEADLINE: task?.USR$DEADLINE,
    TASKTYPE: task?.TASKTYPE
      ? task.TASKTYPE
      : {
        ID: -1,
        NAME: ''
      }
  };

  const formik = useFormik<IKanbanTask>({
    enableReinitialize: true,
    initialValues: {
      ...task,
      ...initValue,
    },
    validationSchema: yup.object().shape({
      USR$NAME: yup.string()
        .required('')
        .max(80, 'Слишком длинное описание'),
      USR$CARDKEY: yup.number()
        .required()
        .moreThan(-1)
    }),
    onSubmit: (values) => {
      if (!confirmOpen) {
        setDeleting(false);
        setConfirmOpen(true);
        return;
      };
      setConfirmOpen(false);
    },
    validateOnMount: true,
  });

  // console.log('task', formik.values);
  // console.log('cards', cards);

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const handleDeleteClick = () => {
    setDeleting(true);
    setConfirmOpen(true);
  };

  const handleCancelClick = useCallback(() => {
    setDeleting(false);
    onCancelClick();
  }, [formik, onCancelClick]);

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    onSubmit(formik.values, deleting);
  }, [formik.values, deleting]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    handleCancelClick();
  }, [handleCancelClick]);

  function combineDateAndTime(date?: Date, time?: Date) {
    if (!date || !time) return;

    const timeString = time.getHours() + ':' + time.getMinutes() + ':00';
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateString = '' + year + '-' + month + '-' + day;
    const combined = new Date(dateString + ' ' + timeString);

    return combined;
  };

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={deleting ? 'Удаление задачи' : 'Сохранение'}
      text="Вы уверены, что хотите продолжить?"
      dangerous={deleting}
      confirmClick={handleConfirmOkClick}
      cancelClick={handleConfirmCancelClick}
    />,
  [confirmOpen, deleting]);

  return (
    <CustomizedDialog
      open={open}
      onClose={handleClose}
      width={500}
    >
      <DialogTitle>
        {Number(task?.ID) ? `Редактирование: ${task?.USR$NAME}` : 'Добавление задачи'}
      </DialogTitle>
      <DialogContent
        dividers
        className={classes.dialogContent}
      >
        <PerfectScrollbar>
          <Stack direction="column" p="16px 24px">
            <FormikProvider value={formik}>
              <Form id="taskForm" onSubmit={formik.handleSubmit}>
                <Stack direction="column" spacing={3}>
                  <Autocomplete
                    options={taskTypes || []}
                    value={taskTypes?.find(el => el.ID === formik.values.TASKTYPE?.ID) || null}
                    onChange={(e, value) => {
                      formik.setFieldValue(
                        'TASKTYPE',
                        value ? { ID: value.ID, NAME: value.NAME } : undefined
                      );
                    }}
                    getOptionLabel={option => option.NAME}
                    renderOption={(props, option) => (
                      <li {...props} key={option.ID}>
                        {option.NAME}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Тип задачи"
                        placeholder="Выберите тип задачи"
                        required
                      />
                    )}
                    loading={taskTypesFetching}
                    loadingText="Загрузка данных..."
                  />
                  <TextField
                    label="Описание"
                    type="text"
                    name="USR$NAME"
                    onBlur={formik.handleBlur}
                    onChange={formik.handleChange}
                    value={formik.values.USR$NAME}
                    required
                    autoFocus
                    multiline
                    minRows={1}
                  />
                  <Autocomplete
                    options={employees || []}

                    readOnly
                    value={employees?.find(el => el.ID === formik.values.CREATOR?.ID) || null}
                    onChange={(e, value) => {
                      formik.setFieldValue(
                        'PERFORMER',
                        value ? { ID: value.ID, NAME: value.NAME } : undefined
                      );
                    }}
                    getOptionLabel={option => option.NAME}
                    renderOption={(props, option) => (
                      <li {...props} key={option.ID}>
                        {option.NAME}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Постановщик"
                        placeholder="Выберите постановщика"
                        required
                      />
                    )}
                    loading={employeesIsFetching}
                    loadingText="Загрузка данных..."
                  />
                  <Autocomplete
                    options={employees || []}
                    filterOptions={filterOptions(50, 'NAME')}
                    value={employees?.find(el => el.ID === formik.values.PERFORMER?.ID) || null}
                    onChange={(e, value) => {
                      formik.setFieldValue(
                        'PERFORMER',
                        value ? { ID: value.ID, NAME: value.NAME } : undefined
                      );
                    }}
                    getOptionLabel={option => option.NAME}
                    renderOption={(props, option) => (
                      <li {...props} key={option.ID}>
                        {option.NAME}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Исполнитель"
                        placeholder="Выберите исполнителя"
                      />
                    )}
                    loading={employeesIsFetching}
                    loadingText="Загрузка данных..."
                  />
                  <Autocomplete
                    options={cards}
                    filterOptions={(option, { inputValue }) => option.filter(o => o.DEAL?.USR$NAME?.toUpperCase().includes(inputValue.toUpperCase()) || o.DEAL?.CONTACT?.NAME?.toUpperCase().includes(inputValue.toUpperCase()))
                    }
                    getOptionLabel={option => option.DEAL?.USR$NAME || ''}
                    value={cards?.find(el => el.ID === formik.values.USR$CARDKEY) || null}
                    readOnly={(initValue.USR$CARDKEY || 0) > 0}
                    onChange={(e, value) => formik.setFieldValue('USR$CARDKEY', value?.ID)}
                    renderOption={(props, option) => (
                      <li {...props} key={option.ID}>
                        <Box>
                          <div>{option.DEAL?.USR$NAME}</div>
                          <Typography variant="caption">{option.DEAL?.CONTACT?.NAME}</Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Сделка"
                        placeholder="Выберите сделку"
                        required
                      />
                    )}
                    loading={dealsIsLoading}
                    loadingText="Загрузка данных..."
                  />
                  <Divider textAlign="left">Срок выполнения</Divider>
                  <Stack direction="row" spacing={3}>
                    <DesktopDatePicker
                      label="Дата"
                      value={formik.values.USR$DEADLINE || null}
                      mask="__.__.____"
                      // onChange={formik.handleChange}
                      onChange={(value) => {
                        formik.setFieldValue('USR$DEADLINE', value);
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                    <TimePicker
                      label="Время"
                      ampm={false}
                      value={formik.values.USR$DEADLINE || null}
                      disabled={formik.values.USR$DEADLINE ? false : true}
                      onChange={(value) => {
                        formik.setFieldValue(
                          'USR$DEADLINE',
                          combineDateAndTime(formik.values.USR$DEADLINE ? new Date(formik.values.USR$DEADLINE) : new Date(), value || undefined)
                        );
                      }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </Stack>
                  <Divider textAlign="left">Дата выполнения</Divider>
                  <Stack direction="row" spacing={3}>
                    <DesktopDatePicker
                      label="Дата"
                      readOnly
                      value={formik.values.USR$DATECLOSE || null}
                      mask="__.__.____"
                      onChange={formik.handleChange}
                      // onChange={(value) => {
                      //   formik.setFieldValue(
                      //     'DEAL',
                      //     { ...formik.values.DEAL, USR$DEADLINE: value ? value : null }
                      //   );
                      // }}
                      renderInput={(params) => <TextField {...params} />}
                    />
                    <TimePicker
                      label="Время"
                      readOnly
                      value={formik.values.USR$DATECLOSE || null}
                      onChange={formik.handleChange}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </Stack>
                  <Divider />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="USR$CLOSED"
                        checked={!!formik.values.USR$CLOSED}
                        onChange={formik.handleChange}
                      />
                    }
                    label="Выполнена"
                  />
                </Stack>
              </Form>
            </FormikProvider>
          </Stack>
        </PerfectScrollbar>
      </DialogContent>
      <DialogActions className={classes.dialogAction}>
        {formik.values.ID > 0 &&
        <IconButton onClick={handleDeleteClick} size="small">
          <DeleteIcon />
        </IconButton>
        }
        <Box flex={1} />
        <Button
          className={classes.button}
          onClick={handleCancelClick}
          variant="text"
          color="primary"
        >
            Отменить
        </Button>
        <Button
          className={classes.button}
          type={!formik.isValid ? 'submit' : 'button'}
          form="taskForm"
          onClick={() => {
            setDeleting(false);
            setConfirmOpen(formik.isValid);
          }}
          variant="contained"
        >
            OK
        </Button>
      </DialogActions>
      {memoConfirmDialog}
    </CustomizedDialog>
  );
}

export default KanbanEditTask;
