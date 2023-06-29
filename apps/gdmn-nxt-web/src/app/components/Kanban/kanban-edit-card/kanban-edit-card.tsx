import './kanban-edit-card.module.less';
import CustomPopup from '../../CustomPopup/customPopup';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Slide,
  Stack,
  TextField,
  Theme,
  Box,
  Divider,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Tab,
  useMediaQuery,
  useTheme,
  Paper,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { forwardRef, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransitionProps } from '@mui/material/transitions';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, getIn, useFormik } from 'formik';
import * as yup from 'yup';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { IKanbanCard, IKanbanColumn, IPermissionByUser, Permissions } from '@gsbelarus/util-api-types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { ICustomer } from '@gsbelarus/util-api-types';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import KanbanHistory from '../kanban-history/kanban-history';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { DateTimePicker, DesktopDatePicker } from '@mui/x-date-pickers-pro';
import { useGetEmployeesQuery } from '../../../features/contact/contactApi';
import { UserState } from '../../../features/user/userSlice';
import { useGetCustomersQuery } from '../../../features/customer/customerApi_new';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import KanbanTasks from '../kanban-tasks/kanban-tasks';
import { useGetDepartmentsQuery } from '../../../features/departments/departmentsApi';
import filterOptions from '../../helpers/filter-options';
// import { useGetDenyReasonsQuery } from '../../../features/kanban/kanbanApi';
import AlarmIcon from '@mui/icons-material/Alarm';
import SnoozeIcon from '@mui/icons-material/Snooze';
import ClockIcon from '@mui/icons-material/AccessTime';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DealSourcesSelect } from './components/deal-sources-select';
import { CustomerSelect } from './components/customer-select';
import styles from './kanban-edit-card.module.less';
import { useGetDenyReasonsQuery } from '../../../features/kanban/kanbanCatalogsApi';
import { DenyReasonsSelect } from './components/deny-reasons-select';
import { TabDescription } from './components/tab-descrption';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';


const useStyles = makeStyles((theme: Theme) => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    width: '40vw',
    [theme.breakpoints.down('ultraWide')]: {
      width: '50vw'
    },
    maxWidth: '100%',
    minWidth: 400,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  accordionTitle: {
    width: '33%',
    flexShrink: 0
  },
  accordionCaption: {
    color: theme.color.grey['500']
  },
  button: {
    width: '120px',
  },
  tabPanel: {
    flex: 1,
    display: 'flex',
    padding: 0,
    paddingBottom: 16
  },
}));


const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide
    direction="left"
    ref={ref}
    {...props}
         />;
});

export interface KanbanEditCardProps {
  open: boolean;
  currentStage?: IKanbanColumn;
  card?: IKanbanCard;
  stages: IKanbanColumn[];
  onSubmit: (arg1: IKanbanCard, arg2: boolean, arg3?: boolean) => void;
  onCancelClick: (isFetching?: boolean) => void;
}

export function KanbanEditCard(props: KanbanEditCardProps) {
  const { open, currentStage, card, stages } = props;
  const { onSubmit, onCancelClick } = props;

  const classes = useStyles();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addTasks, setAddTasks] = useState(false);
  const [isFetchingCard, setIsFetchingCard] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState('');
  const [tabIndex, setTabIndex] = useState('1');
  const user = useSelector<RootState, UserState>(state => state.user);

  const userPermissions = useSelector<RootState, Permissions | undefined>(state => state.user.userProfile?.permissions);

  const { data: employees, isFetching: employeesIsFetching } = useGetEmployeesQuery();
  const { isFetching: customerFetching } = useGetCustomersQuery();
  const { data: departments, isFetching: departmentsIsFetching, refetch: departmentsRefetch } = useGetDepartmentsQuery();
  const { isFetching: denyReasonsIsFetching } = useGetDenyReasonsQuery();

  const refComment = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    refComment && refComment.current && refComment.current.scrollIntoView({ behavior: 'smooth' });
  }, [refComment.current]);

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const theme = useTheme();
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
  const matchDownLg = useMediaQuery(theme.breakpoints.down('lg'));

  const handleChangeAccordion = (panel: string) => (event: any, newExpanded: any) => {
    if (newExpanded) setExpanded(panel);
    if (expanded === panel) setExpanded('');
  };

  const handleDeleteClick = () => {
    setAddTasks(false);
    setTabIndex('1');
    setDeleting(true);
    setConfirmOpen(true);
  };

  const handleCancelClick = () => {
    setAddTasks(false);
    setDeleting(false);
    setTabIndex('1');
    onCancelClick(isFetchingCard);
    if (isFetchingCard) {
      setIsFetchingCard(false);
    }
  };

  const handleOnClose = () => {
    handleCancelClick();
  };

  const handleTabsChange = (event: any, newindex: string) => {
    setTabIndex(newindex);
  };

  const initValue: IKanbanCard = {
    ID: card?.ID === -1 ? 0 : card?.ID || 0,
    USR$MASTERKEY: card?.USR$MASTERKEY || currentStage?.ID || 0,
    USR$INDEX: card?.USR$INDEX || currentStage?.CARDS?.length || 0,
    USR$DEALKEY: card?.USR$DEALKEY || -1,
    DEAL: {
      ...card?.DEAL,
      ID: card?.DEAL?.ID || -1,
      USR$NAME: card?.DEAL?.USR$NAME || '',
      CREATOR:
        card?.ID
          ? card?.DEAL?.CREATOR
          : {
            ID: user.userProfile?.contactkey || -1,
            NAME: ''
          },
      DEPARTMENT: card?.DEAL?.DEPARTMENT,
      PERFORMERS: card?.DEAL?.PERFORMERS || [],
      CONTACT: card?.DEAL?.CONTACT,
      COMMENT: card?.DEAL?.COMMENT || '',
      CREATIONDATE: card?.DEAL?.CREATIONDATE || currentDate,
    },
    TASKS: card?.TASKS || undefined,
  };

  useEffect(() => {
    if (card && card?.ID !== -1 && addTasks) {
      setTabIndex('3');
      setIsFetchingCard(false);
    }
  }, [card, addTasks]);

  const formik = useFormik<IKanbanCard>({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: {
      ...card,
      ...initValue
    },
    validationSchema: yup.object().shape({
      USR$MASTERKEY: yup.string().required(''),
      DEAL: yup.object()
        .shape({
          USR$NAME: yup.string()
            .required('Не указано наименование')
            .max(80, 'Слишком длинное наименование'),
          CONTACT: yup.object()
            .nullable()
            .required('Не указан клиент'),
          CREATOR: yup.object()
            .nullable()
            .required('Не указан создатель'),
          DEPARTMENT: yup.object()
            .nullable()
            .required('Не указан отдел'),
          CONTACT_NAME: yup.string()
            .nullable()
            .max(80, 'Слишком длинное имя'),
          CONTACT_EMAIL: yup.string()
            .nullable()
            .matches(/^[a-zа-я]+@[a-zа-я]+\.[a-zа-я]+$/i,
              'Адрес электрочнной почты должен содержать символы "@" и ".", а также только символы кирилицы и латиницы')
            .max(40, 'Слишком длинный email'),
          CONTACT_PHONE: yup.string().nullable()
            .max(40, 'Слишком длинный номер'),
          REQUESTNUMBER: yup.string().nullable()
            .max(20, 'Слишком длинный номер'),
          PRODUCTNAME: yup.string().nullable()
            .max(180, 'Слишком длинное наименование'),
          USR$AMOUNT: yup.number()
            .max(1000000, 'Слишком большая сумма'),
        })
    }),
    onSubmit: (values) => {
      if (!confirmOpen) {
        setDeleting(false);
        setConfirmOpen(true);
        return;
      };
      setConfirmOpen(false);
    },
    // onReset: () => {
    //   if (addTasks) {
    //     setTabIndex('3');
    //   } else {
    //     setTabIndex('1');
    //   }
    // }
  });

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    if (addTasks) {
      setIsFetchingCard(true);
    }
    setTabIndex('1');
    onSubmit(formik.values, deleting, !addTasks);
  }, [formik.values, deleting, addTasks]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const checkDoneAndTasks = useMemo(() =>
    !(formik.values.DEAL?.USR$DONE) &&
    (formik.values.TASKS?.reduce((acc, task) => acc + Number(!task.USR$CLOSED), 0) || 0) > 0
  , [formik.values.DEAL?.USR$DONE, formik.values.TASKS]);

  const KanbanRequestInfo = useMemo(() => {
    if ((getIn(formik.touched, 'DEAL.REQUESTNUMBER') && Boolean(getIn(formik.errors, 'DEAL.REQUESTNUMBER'))) ||
        (getIn(formik.touched, 'DEAL.PRODUCTNAME') && Boolean(getIn(formik.errors, 'DEAL.PRODUCTNAME'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_NAME') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_NAME'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_EMAIL') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_EMAIL'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_PHONE') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_PHONE')))) {
      setTabIndex('2');
    };

    return (
      <Stack flex={1} spacing={3}>
        <TextField
          label="Продукция"
          type="text"
          name="DEAL.PRODUCTNAME"
          onChange={formik.handleChange}
          value={formik.values.DEAL?.PRODUCTNAME || ''}
          error={getIn(formik.touched, 'DEAL.PRODUCTNAME') && Boolean(getIn(formik.errors, 'DEAL.PRODUCTNAME'))}
          helperText={getIn(formik.touched, 'DEAL.PRODUCTNAME') && getIn(formik.errors, 'DEAL.PRODUCTNAME')}
        />
        <Stack direction={'row'} spacing={3}>
          <Stack direction={'column'} flex={1}>
            <TextField
              label="Номер заявки"
              type="text"
              name="DEAL.REQUESTNUMBER"
              onChange={formik.handleChange}
              value={formik.values.DEAL?.REQUESTNUMBER || ''}
              error={getIn(formik.touched, 'DEAL.REQUESTNUMBER') && Boolean(getIn(formik.errors, 'DEAL.REQUESTNUMBER'))}
              helperText={getIn(formik.touched, 'DEAL.REQUESTNUMBER') && getIn(formik.errors, 'DEAL.REQUESTNUMBER')}
            />
          </Stack>
          <Stack
            direction="column"
            spacing={3}
            width={150}
          >
            <DesktopDatePicker
              label="Дата"
              value={formik.values.DEAL?.CREATIONDATE}
              inputFormat="dd.MM.yyyy"
              onChange={(value) => formik.setFieldValue('DEAL.CREATIONDATE', value)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
            <TimePicker
              label="Время"
              value={formik.values.DEAL?.CREATIONDATE}
              onChange={(value) => formik.setFieldValue('DEAL.CREATIONDATE', value)}
              renderInput={(params) => <TextField {...params} />}
            />
          </Stack>
        </Stack>
        <Divider />
        <TextField
          label="Заявитель"
          type="text"
          name="DEAL.CONTACT_NAME"
          onChange={formik.handleChange}
          value={formik.values.DEAL?.CONTACT_NAME || ''}
          error={getIn(formik.touched, 'DEAL.CONTACT_NAME') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_NAME'))}
          helperText={getIn(formik.touched, 'DEAL.CONTACT_NAME') && getIn(formik.errors, 'DEAL.CONTACT_NAME')}
        />
        <Stack
          flex={1}
          spacing={3}
          direction={{ sm: 'column', md: 'row', lg: 'row' }}
        >
          <TextField
            label="Email"
            type="text"
            fullWidth
            name="DEAL.CONTACT_EMAIL"
            onChange={formik.handleChange}
            value={formik.values.DEAL?.CONTACT_EMAIL || ''}
            error={getIn(formik.touched, 'DEAL.CONTACT_EMAIL') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_EMAIL'))}
            helperText={getIn(formik.touched, 'DEAL.CONTACT_EMAIL') && getIn(formik.errors, 'DEAL.CONTACT_EMAIL')}
          />
          <TextField
            label="Телефон"
            type="text"
            fullWidth
            name="DEAL.CONTACT_PHONE"
            onChange={formik.handleChange}
            value={formik.values.DEAL?.CONTACT_PHONE || ''}
            error={getIn(formik.touched, 'DEAL.CONTACT_PHONE') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_PHONE'))}
            helperText={getIn(formik.touched, 'DEAL.CONTACT_PHONE') && getIn(formik.errors, 'DEAL.CONTACT_PHONE')}
          />
        </Stack>
      </Stack>
    );
  }, [formik.values, formik.touched, formik.errors]);


  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={'Сохранение сделки'}
      text="Вы уверены, что хотите продолжить?"
      dangerous={deleting}
      confirmClick={handleConfirmOkClick}
      cancelClick={handleConfirmCancelClick}
    />,
  [confirmOpen, deleting, handleConfirmOkClick, handleConfirmCancelClick]);

  return (
    <>
      {memoConfirmDialog}
      <CustomPopup
        open={open}
        width={'40vw'}
        title={formik.values.ID > 0 ? `Редактирование сделки: ${card?.DEAL?.USR$NAME}` : 'Создание сделки'}
        closeButton={{
          function: handleCancelClick,
          name: 'Отмена'
        }}
        submitButton={{
          function: () => {
            setAddTasks(false);
          },
          props: { form: 'mainForm', type: 'submit', variant: 'contained' },
          permission: formik.values.ID > 0 ? userPermissions?.deals.PUT : userPermissions?.deals.POST,
          disabled: (customerFetching || employeesIsFetching || denyReasonsIsFetching || departmentsIsFetching || isFetchingCard),
          name: 'Сохранить'
        }}
        deleteButton={{
          function: handleDeleteClick,
          permission: userPermissions?.deals.DELETE,
          props: { size: 'small' },
          hide: !formik.values.ID
        }}
        otherButtons={[{
          function: () => {
            setAddTasks(true);
          },
          props: { form: 'mainForm', type: 'submit', variant: 'contained' },
          disabled: (customerFetching || employeesIsFetching || denyReasonsIsFetching || departmentsIsFetching || isFetchingCard),
          name: 'Добавить задачи',
          permission: userPermissions?.deals.POST,
          hide: !!formik.values.ID
        }]}
      >
        <FormikProvider value={formik}>
          <Form
            id="mainForm"
            onSubmit={formik.handleSubmit}
            style={{ flex: 1, display: 'flex' }}
          >
            <Stack spacing={3} flex={1}>
              <Stepper
                activeStep={stages.findIndex(stage => stage.ID === formik.values.USR$MASTERKEY)}
                alternativeLabel
                style={{
                  ...(matchDownLg ? { display: 'none' } : '')
                }}
              >
                {stages.map(stage =>
                  <Step key={stage.ID}>
                    <StepLabel>{stage.USR$NAME}</StepLabel>
                  </Step>)}
              </Stepper>
              <TabContext value={tabIndex}>
                <Box>
                  <TabList onChange={handleTabsChange}>
                    <Tab label="Сведения" value="1" />
                    <Tab label="Заявка" value="2" />
                    <Tab
                      label="Задачи"
                      value="3"
                      disabled={!formik.values.ID}
                    />
                    <Tab label="Хронология" value="4" />
                    <Tab label="Описание" value="5" />
                  </TabList>
                </Box>
                <Divider style={{ margin: 0 }} />
                <TabPanel value="1" className={tabIndex === '1' ? classes.tabPanel : ''}>
                  <Stack flex={1} spacing={3}>
                    <TextField
                      label="Наименование"
                      type="text"
                      multiline
                      minRows={1}
                      required
                      fullWidth
                      autoFocus
                      name="DEAL.USR$NAME"
                      onChange={(e) => {
                        const value = e.target.value;
                        formik.setFieldValue(
                          'DEAL',
                          { ...formik.values.DEAL, USR$NAME: value ? value : null }
                        );
                      }}
                      value={formik.values.DEAL?.USR$NAME || ''}
                      error={getIn(formik.touched, 'DEAL.USR$NAME') && Boolean(getIn(formik.errors, 'DEAL.USR$NAME'))}
                      helperText={getIn(formik.touched, 'DEAL.USR$NAME') && getIn(formik.errors, 'DEAL.USR$NAME')}
                    />
                    <Stack direction={matchDownLg ? 'column' : 'row'} spacing={3}>
                      <Stack
                        direction="column"
                        spacing={3}
                        flex={1}
                      >
                        <CustomerSelect formik={formik} />
                        <DealSourcesSelect formik={formik} />
                      </Stack>
                      <Stack
                        spacing={3}
                        {...(matchDownLg
                          ? {
                            direction: 'row',
                            flex: 1
                          }
                          : {
                            width: 150
                          })
                        }
                      >
                        <TextField
                          label="Сумма"
                          type="number"
                          name="DEAL.USR$AMOUNT"
                          fullWidth
                          InputProps={{
                            startAdornment: <InputAdornment position="start">BYN</InputAdornment>,
                          }}
                          value={formik.values.DEAL?.USR$AMOUNT || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            formik.setFieldValue(
                              'DEAL',
                              { ...formik.values.DEAL, USR$AMOUNT: value ? value : null }
                            );
                          }}
                          placeholder="0.00"
                          error={getIn(formik.touched, 'DEAL.USR$AMOUNT') && Boolean(getIn(formik.errors, 'DEAL.USR$AMOUNT'))}
                          helperText={getIn(formik.touched, 'DEAL.USR$AMOUNT') && getIn(formik.errors, 'DEAL.USR$AMOUNT')}
                        />
                        <DesktopDatePicker
                          label="Срок"
                          value={formik.values.DEAL?.USR$DEADLINE || null}
                          // mask="__.__.____"
                          inputFormat="dd.MM.yyyy"
                          onChange={(value) => {
                            formik.setFieldValue(
                              'DEAL',
                              { ...formik.values.DEAL, USR$DEADLINE: value ? value : null }
                            );
                          }}
                          renderInput={(params) => <TextField {...params} fullWidth/>}
                        />

                      </Stack>
                    </Stack>
                    <Divider variant="middle" />
                    <Stack direction={matchDownMd ? 'column' : 'column'} spacing={3}>
                      <Autocomplete
                        fullWidth
                        options={employees || []}
                        getOptionLabel={option => option.NAME}
                        filterOptions={filterOptions(50, 'NAME')}
                        value={employees?.find(el => el.ID === formik.values.DEAL?.CREATOR?.ID) || null}
                        loading={employeesIsFetching}
                        loadingText="Загрузка данных..."
                        // onOpen={formik.handleBlur}
                        onChange={(event, value) => {
                          formik.setFieldValue('DEAL.CREATOR', value);
                        }}
                        renderOption={(props, option) => {
                          return (
                            <li {...props} key={option.ID}>
                              {option.NAME}
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Создал"
                            // name="DEAL.CREATOR"
                            required
                            placeholder="Выберите сотрудника"
                            error={getIn(formik.touched, 'DEAL.CREATOR') && Boolean(getIn(formik.errors, 'DEAL.CREATOR'))}
                            helperText={getIn(formik.touched, 'DEAL.CREATOR') && getIn(formik.errors, 'DEAL.CREATOR')}
                          />
                        )}
                      />
                      <Autocomplete
                        fullWidth
                        options={departments || []}
                        getOptionLabel={option => option.NAME}
                        filterOptions={filterOptions(50, 'NAME')}
                        value={departments?.find(el => el.ID === formik.values.DEAL?.DEPARTMENT?.ID) || null}
                        loading={departmentsIsFetching}
                        loadingText="Загрузка данных..."
                        // onOpen={formik.handleBlur}
                        onChange={(event, value) => {
                          formik.setFieldValue(
                            'DEAL',
                            { ...formik.values.DEAL, DEPARTMENT: value ? value : null }
                          );
                        }}
                        renderOption={(props, option) => {
                          return (
                            <li {...props} key={option.ID}>
                              {option.NAME}
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Отдел"
                            required
                            placeholder="Выберите отдел"
                            name="DEAL.DEPARTMENT"
                            error={getIn(formik.touched, 'DEAL.DEPARTMENT') && Boolean(getIn(formik.errors, 'DEAL.DEPARTMENT'))}
                            helperText={getIn(formik.touched, 'DEAL.DEPARTMENT') && getIn(formik.errors, 'DEAL.DEPARTMENT')}
                          />
                        )}
                      />
                      <Autocomplete
                        fullWidth
                        options={employees?.filter(
                          empl => empl.ID !== formik.values.DEAL?.PERFORMERS?.[1]?.ID) || []}
                        getOptionLabel={option => option.NAME}
                        filterOptions={filterOptions(50, 'NAME')}
                        readOnly={formik.values.DEAL?.USR$READYTOWORK || false}
                        value={employees?.find(el => el.ID === formik.values.DEAL?.PERFORMERS?.[0]?.ID) || null}
                        loading={employeesIsFetching}
                        loadingText="Загрузка данных..."
                        onChange={(event, value) => {
                          const secondPerformer = formik.values.DEAL?.PERFORMERS?.[1];
                          const newPerformers = []
                            .concat(value ? value : [])
                            .concat(secondPerformer ? secondPerformer as any : []);

                          formik.setFieldValue(
                            'DEAL',
                            {
                              ...formik.values.DEAL,
                              PERFORMERS: newPerformers
                            }
                          );

                          if (!value && newPerformers.length === 0) {
                            formik.setFieldValue('USR$MASTERKEY', stages[0].ID);
                            return;
                          }
                          formik.setFieldValue('USR$MASTERKEY', stages[1].ID);
                        }}
                        renderOption={(props, option) => {
                          return (
                            <li {...props} key={option.ID}>
                              {option.NAME}
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Исполнитель"
                            disabled={formik.values.DEAL?.USR$READYTOWORK || false}
                            placeholder="Выберите сотрудника"
                          />
                        )}
                      />
                      <Autocomplete
                        fullWidth
                        disabled={(formik.values.DEAL?.PERFORMERS?.length || 0) === 0}
                        options={employees?.filter(empl => empl.ID !== formik.values.DEAL?.PERFORMERS?.[0]?.ID) || []}
                        getOptionLabel={option => option.NAME}
                        filterOptions={filterOptions(50, 'NAME')}
                        readOnly={formik.values.DEAL?.USR$READYTOWORK || false}
                        value={employees?.find(el => el.ID === formik.values.DEAL?.PERFORMERS?.[1]?.ID) || null}
                        loading={employeesIsFetching}
                        loadingText="Загрузка данных..."
                        onChange={(event, value) => {
                          const firstPerformer = formik.values.DEAL?.PERFORMERS?.[0];
                          const newPerformers = []
                            .concat(firstPerformer ? firstPerformer as any : [])
                            .concat(value ? value : []);

                          formik.setFieldValue(
                            'DEAL',
                            {
                              ...formik.values.DEAL,
                              PERFORMERS: newPerformers
                            }
                          );
                          if (!value && newPerformers.length === 0) {
                            formik.setFieldValue('USR$MASTERKEY', stages[0].ID);
                            return;
                          }
                          formik.setFieldValue('USR$MASTERKEY', stages[1].ID);
                        }}
                        renderOption={(props, option) => {
                          return (
                            <li {...props} key={option.ID}>
                              {option.NAME}
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Второй исполнитель"
                            disabled={formik.values.DEAL?.USR$READYTOWORK || false}
                            placeholder="Выберите сотрудника"
                          />
                        )}
                      />
                    </Stack>
                    <Stack direction="row" spacing={3}>
                      <Stack>
                        <Stack direction="row" spacing={3}>
                          {(formik.values.USR$MASTERKEY === stages[1]?.ID || formik.values.USR$MASTERKEY === stages[2]?.ID) ?
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formik.values.DEAL?.USR$READYTOWORK || false}
                                  onChange={(e) => {
                                    const value = e.target.checked;
                                    formik.setFieldValue(
                                      'DEAL',
                                      { ...formik.values.DEAL, USR$READYTOWORK: value }
                                    );
                                    formik.setFieldValue(
                                      'USR$MASTERKEY',
                                      value ? stages[2].ID : stages[1].ID
                                    );
                                  }}
                                />
                              }
                              label="В работе"
                            />
                            : <></>}
                          {(formik.values.USR$MASTERKEY === stages[2]?.ID || formik.values.USR$MASTERKEY === stages[3]?.ID)
                            ? <Tooltip title={checkDoneAndTasks ? 'Есть незакрытые задачи' : ''} arrow>
                              <FormControlLabel
                                disabled={checkDoneAndTasks}
                                control={
                                  <Checkbox
                                    checked={formik.values.DEAL?.USR$DONE || false}
                                    onChange={(e) => {
                                      const value = e.target.checked;
                                      formik.setFieldValue(
                                        'DEAL',
                                        { ...formik.values.DEAL, USR$DONE: value }
                                      );
                                      formik.setFieldValue(
                                        'USR$MASTERKEY',
                                        value ? stages[3].ID : stages[2].ID
                                      );
                                    }}
                                  />
                                }
                                label="Исполнено"
                              />
                            </Tooltip>
                            : <></>
                          }
                          {card?.DEAL?.ID && (card?.DEAL?.ID > 0) ?
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formik.values.DEAL?.DENIED || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    formik.setFieldValue(
                                      'DEAL',
                                      { ...formik.values.DEAL, DENIED: checked }
                                    );
                                    const newMasterKey = (() => {
                                      if (checked) return stages[4].ID;
                                      if (formik.values.DEAL?.USR$DONE) return stages[3].ID;
                                      if (formik.values.DEAL?.USR$READYTOWORK) return stages[2].ID;
                                      if (formik.values.DEAL?.PERFORMERS) return stages[1].ID;
                                      return stages[0].ID;
                                    })();
                                    formik.setFieldValue('USR$MASTERKEY', newMasterKey);
                                    if (!checked) formik.setFieldValue('DEAL.DENYREASON', null);
                                  }}
                                />
                              }
                              label="Отказ"
                            />
                            : <></>
                          }
                        </Stack>
                        <Box flex={1} />
                      </Stack>

                      {formik.values.DEAL?.DENIED &&
                          <Stack flex={1} spacing={3}>
                            <DenyReasonsSelect formik={formik} />
                            <TextField
                              label="Комментарий"
                              ref={refComment}
                              type="text"
                              name="COMMENT"
                              multiline
                              minRows={4}
                              // onChange={formik.handleChange}
                              onChange={(e) => {
                                formik.setFieldValue('DEAL.COMMENT', e.target.value);
                              }}
                              value={formik.values.DEAL.COMMENT}
                              // helperText={formik.errors.USR$DESCRIPTION}
                            />
                          </Stack>}

                    </Stack>

                    {/* <FormControlLabel
                        control={
                          <Checkbox
                            checked={formik.values.DEAL?.DENIED}
                            onChange={(e) => {
                              const value = e.target.checked;
                              formik.setFieldValue(
                                'DEAL',
                                { ...formik.values.DEAL, DENIED: value }
                              );
                              formik.setFieldValue(
                                'USR$MASTERKEY',
                                value ? stages[4].ID : stages[4].ID
                              );
                            }}
                          />
                        }
                        label="Отказ"
                      /> */}
                  </Stack>
                </TabPanel>
                <TabPanel value="2" className={tabIndex === '2' ? classes.tabPanel : ''}>
                  {KanbanRequestInfo}
                </TabPanel>
                <TabPanel value="3" className={tabIndex === '3' ? classes.tabPanel : ''}>
                  <KanbanTasks card={card} formik={formik} />
                </TabPanel>
                <TabPanel value="4" className={tabIndex === '4' ? classes.tabPanel : ''}>
                  <CustomizedCard
                    borders
                    style={{
                      borderColor: 'lightgrey',
                      flex: 1,
                      marginBottom: '16px'
                    }}
                  >
                    <PerfectScrollbar>
                      {card?.ID
                        ? <KanbanHistory cardId={card.ID} />
                        : <></>}
                    </PerfectScrollbar>
                  </CustomizedCard>
                </TabPanel>
                <TabPanel value="5" className={tabIndex === '5' ? classes.tabPanel : ''}>
                  <TabDescription formik={formik} />
                </TabPanel>
              </TabContext>
            </Stack>
          </Form>
        </FormikProvider>
      </CustomPopup>
    </>
  );
}

export default KanbanEditCard;
