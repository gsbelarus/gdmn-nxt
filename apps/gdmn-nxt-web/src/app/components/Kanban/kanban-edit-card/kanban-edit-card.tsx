import './kanban-edit-card.module.less';
import {
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
  Tooltip,
  StepButton,
  LinearProgress,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles } from '@mui/styles';
import { Form, FormikProvider, getIn, useFormik } from 'formik';
import * as yup from 'yup';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { IKanbanCard, IKanbanColumn, Permissions } from '@gsbelarus/util-api-types';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import KanbanHistory from '../kanban-history/kanban-history';
import { DesktopDatePicker } from '@mui/x-date-pickers-pro';
import { useGetEmployeesQuery } from '../../../features/contact/contactApi';
import { UserState } from '../../../features/user/userSlice';
import { useGetCustomersQuery } from '../../../features/customer/customerApi_new';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import KanbanTasks from '../kanban-tasks/kanban-tasks';
import { useGetDepartmentsQuery } from '../../../features/departments/departmentsApi';
import filterOptions from '../../helpers/filter-options';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DealSourcesSelect } from './components/deal-sources-select';
import { CustomerSelect } from './components/customer-select';
import styles from './kanban-edit-card.module.less';
import { useGetDenyReasonsQuery } from '../../../features/kanban/kanbanCatalogsApi';
import { DenyReasonsSelect } from './components/deny-reasons-select';
import { TabDescription } from './components/tab-descrption';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import CustomizedDialog from '../../Styled/customized-dialog/customized-dialog';
import CustomizedScrollBox from '../../Styled/customized-scroll-box/customized-scroll-box';
import TextFieldMasked from '../../textField-masked/textField-masked';
import { DealDocuments } from './components/deal-documents';
import { ClientHistory } from './components/client-history';
import ArrowCircleLeftOutlinedIcon from '@mui/icons-material/ArrowCircleLeftOutlined';
import ArrowCircleRightOutlinedIcon from '@mui/icons-material/ArrowCircleRightOutlined';
import { countries, countriesType, getNumberMask } from '../../../numberMask';


const useStyles = makeStyles((theme: Theme) => ({
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
    padding: 0,
    marginTop: '12px !important',
  },
  scrollContainer: {
    marginRight: -16
  },
  scrollBox: {
    paddingRight: 16
  }
}));

export interface KanbanEditCardProps {
  open: boolean;
  currentStage?: IKanbanColumn;
  card?: IKanbanCard;
  stages: IKanbanColumn[];
  deleteable?: boolean;
  onSubmit: (arg1: IKanbanCard, arg2: boolean) => void;
  onCancelClick: (isFetching?: boolean) => void;
}

export function KanbanEditCard(props: KanbanEditCardProps) {
  const { open, currentStage, card, stages, deleteable = true } = props;
  const { onSubmit, onCancelClick } = props;

  const classes = useStyles();

  const [confirmOpen, setConfirmOpen] = useState(false);
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
    refComment?.current && refComment.current.scrollIntoView({ behavior: 'smooth' });
  }, [refComment.current]);

  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const theme = useTheme();
  const matchDownLg = useMediaQuery(theme.breakpoints.down('lg'));
  const matchDownUW = useMediaQuery(theme.breakpoints.down('ultraWide'));
  const matchBetweenLgUw = useMediaQuery(theme.breakpoints.between('lg', 'ultraWide'));

  const windowWidth = useMemo(() => {
    switch (true) {
      case matchBetweenLgUw:
        return '70vw';
      case matchDownUW:
        return '60vw';
      default:
        return '50vw';
    }
  }, [matchBetweenLgUw, matchDownUW]);

  const handleDeleteClick = () => {
    setTabIndex('1');
    setDeleting(true);
    setConfirmOpen(true);
  };

  const handleCancelClick = () => {
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
        (card?.ID && card?.ID !== -1)
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
      PREPAID: card?.DEAL?.PREPAID ?? false,
    },
    TASKS: card?.TASKS || undefined,
  };

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
            .matches(/^[a-zа-я0-9\_\-\'\+]+([.]?[a-zа-я0-9\_\-\'\+])*@[a-zа-я0-9]+([.]?[a-zа-я0-9])*\.[a-zа-я]{2,}$/i,
              ({ value }) => {
                const invalidChar = value.match(/[^a-zа-я\_\-\'\+ @.]/i);
                if (invalidChar) {
                  return `Адрес не может содержать символ "${invalidChar}"`;
                }
                return 'Некорректный адрес';
              })
            .max(40, 'Слишком длинный email'),
          CONTACT_PHONE: yup.string()
            .nullable()
            .matches(/^(\+ ?)?([1-9]\d{0,2}[-\ ]?)?(\(?[1-9]\d{0,2}\)?)?[-\ ]?\d{3,3}[-\ ]?\d{2,2}[-\ ]?\d{2,2}$/, 'Некорректный номер')
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
  });
  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    onSubmit(formik.values, deleting);
  }, [formik.values, deleting]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    if ((getIn(formik.touched, 'DEAL.USR$NAME"') && Boolean(getIn(formik.errors, 'DEAL.USR$NAME"'))) ||
    (getIn(formik.touched, 'DEAL.CONTACT') && Boolean(getIn(formik.errors, 'DEAL.CONTACT'))) ||
    (getIn(formik.touched, 'DEAL.DEPARTMENT') && Boolean(getIn(formik.errors, 'DEAL.DEPARTMENT'))) ||
    (getIn(formik.touched, 'DEAL.CONTACT_EMAIL') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_EMAIL')))) {
      setTabIndex('1');
    };

    if ((getIn(formik.touched, 'DEAL.REQUESTNUMBER') && Boolean(getIn(formik.errors, 'DEAL.REQUESTNUMBER'))) ||
        (getIn(formik.touched, 'DEAL.PRODUCTNAME') && Boolean(getIn(formik.errors, 'DEAL.PRODUCTNAME'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_NAME') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_NAME'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_EMAIL') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_EMAIL'))) ||
        (getIn(formik.touched, 'DEAL.CONTACT_PHONE') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_PHONE')))) {
      setTabIndex('2');
    };
  }, [formik.touched, formik.errors]);

  const handleStep = (stageId: number) => () => {
    formik.setFieldValue('USR$MASTERKEY', stageId);
  };

  const handleStepBack = () => {
    const currentIndex = stages.findIndex(stage => stage.ID === formik.values.USR$MASTERKEY);

    if (currentIndex < 1) return;
    formik.setFieldValue('USR$MASTERKEY', stages[currentIndex - 1].ID);
  };

  const handleStepNext = () => {
    const currentIndex = stages.findIndex(stage => stage.ID === formik.values.USR$MASTERKEY);

    if (currentIndex >= stages.length - 1) return;
    formik.setFieldValue('USR$MASTERKEY', stages[currentIndex + 1].ID);
  };

  const checkDoneAndTasks = useMemo(() =>
    !(formik.values.DEAL?.USR$DONE) &&
    (formik.values.TASKS?.reduce((acc, task) => acc + Number(!task.USR$CLOSED), 0) || 0) > 0
  , [formik.values.DEAL?.USR$DONE, formik.values.TASKS]);

  const [country, setCountry] = useState<countriesType>('Belarus');

  const changeCountry = (e: SelectChangeEvent) => {
    setCountry(e.target.value as countriesType);
  };

  const KanbanRequestInfo = useMemo(() => {
    return (
      <Stack
        flex={1}
        spacing={3}
        paddingTop={1}
      >
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
          <TextFieldMasked
            mask={getNumberMask(country)}
            label="Телефон"
            type="text"
            fullWidth
            name="DEAL.CONTACT_PHONE"
            onChange={formik.handleChange}
            value={formik.values.DEAL?.CONTACT_PHONE || ''}
            error={getIn(formik.touched, 'DEAL.CONTACT_PHONE') && Boolean(getIn(formik.errors, 'DEAL.CONTACT_PHONE'))}
            helperText={getIn(formik.touched, 'DEAL.CONTACT_PHONE') && getIn(formik.errors, 'DEAL.CONTACT_PHONE')}
          />
          <FormControl style={{ width: '200px' }}>
            <InputLabel id={'country'}>Страна</InputLabel>
            <Select
              defaultValue={countries[0]}
              value={country}
              labelId={'country'}
              label="Страна"
              onChange={changeCountry}
            >
              {countries.map((item: countriesType, index: number) => <MenuItem key={index} value={item}>{item}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    );
  }, [formik.values, formik.touched, formik.errors, country]);


  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={deleting ? 'Удаление сделки' : 'Сохранение сделки'}
      text="Вы уверены, что хотите продолжить?"
      dangerous={deleting}
      confirmClick={handleConfirmOkClick}
      cancelClick={handleConfirmCancelClick}
    />,
  [confirmOpen, deleting, handleConfirmOkClick, handleConfirmCancelClick]);

  const currentStageIndex = useMemo(() => stages.findIndex(s => s.ID === formik.values.USR$MASTERKEY), [stages, formik.values.USR$MASTERKEY]);

  return (
    <CustomizedDialog
      open={open}
      onClose={handleOnClose}
      width={windowWidth}
      minWidth={400}
    >
      <DialogTitle>
        {formik.values.ID > 0 ? `Редактирование сделки: ${card?.DEAL?.USR$NAME}` : 'Создание сделки'}
      </DialogTitle>
      <DialogContent dividers style={{ display: 'flex' }}>
        <FormikProvider value={formik}>
          <Form
            id="mainForm"
            onSubmit={formik.handleSubmit}
            style={{ flex: 1, display: 'flex' }}
          >
            <Stack spacing={3} flex={1}>
              {matchDownLg
                ? <Stack
                  direction="row"
                  alignItems={'center'}
                  justifyContent={'center'}
                  spacing={2}
                  >
                  <IconButton
                    color="primary"
                    onClick={handleStepBack}
                    disabled={currentStageIndex < 1}
                  >
                    <ArrowCircleLeftOutlinedIcon />
                  </IconButton>
                  <Stack>
                    <Box
                      width={200}
                      textAlign={'center'}
                      fontWeight={500}
                    >
                      {stages.find(stage => stage.ID === formik.values.USR$MASTERKEY)?.USR$NAME ?? ''}
                    </Box>
                    <LinearProgress variant="determinate" value={Math.ceil(currentStageIndex / (stages.length - 1) * 100)} />
                  </Stack>
                  <IconButton
                    color="primary"
                    onClick={handleStepNext}
                    disabled={currentStageIndex >= (stages.length - 1)}
                  >
                    <ArrowCircleRightOutlinedIcon />
                  </IconButton>
                </Stack>
                : <Stepper
                  activeStep={stages.findIndex(stage => stage.ID === formik.values.USR$MASTERKEY)}
                  alternativeLabel
                  nonLinear
                  >
                  {stages.map((stage, idx) =>
                    <Step
                      key={stage.ID}
                      completed={idx < stages.findIndex(s => s.ID === formik.values.USR$MASTERKEY)}
                    >
                      <StepButton onClick={handleStep(stage.ID)}>
                        {stage.USR$NAME}
                      </StepButton>
                    </Step>)}
                </Stepper>}
              <TabContext value={tabIndex}>
                <Box style={{ width: `calc(${windowWidth} - 5vw)` }}>
                  <TabList
                    onChange={handleTabsChange}
                    scrollButtons="auto"
                    variant="scrollable"
                  >
                    <Tab label="Сведения" value="1" />
                    <Tab label="Заявка" value="2" />
                    <Tab label="Задачи" value="3" />
                    <Tab label="Документы" value="4" />
                    <Tab label="Хронология" value="5" />
                    <Tab label="Описание" value="6" />
                    <Tab
                      label="История клиента"
                      value="7"
                      disabled={(card?.ID ?? -1) <= 0}
                    />
                  </TabList>
                </Box>
                <Divider style={{ margin: 0 }} />
                <TabPanel value="1" className={tabIndex === '1' ? classes.tabPanel : ''}>
                  <CustomizedScrollBox container={{ className: classes.scrollContainer }} className={classes.scrollBox}>
                    <Stack
                      flex={1}
                      spacing={3}
                      paddingTop={1}
                    >
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
                      <Stack direction={'column'} spacing={3}>
                        <Autocomplete
                          fullWidth
                          options={employees || []}
                          getOptionLabel={option => option.NAME}
                          filterOptions={filterOptions(50, 'NAME')}
                          value={employees?.find(el => el.ID === formik.values.DEAL?.CREATOR?.ID) || null}
                          loading={employeesIsFetching}
                          loadingText="Загрузка данных..."
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
                      <Stack
                        direction="row"
                        spacing={3}
                        alignItems="center"
                      >
                        <Stack flex={1}>
                          <Stack direction="column" spacing={2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    name="DEAL.PREPAID"
                                    checked={formik.values.DEAL?.PREPAID}
                                    onChange={formik.handleChange}
                                  />
                                }
                                label="Оплачено"
                              />
                              {/* {(formik.values.USR$MASTERKEY === stages[1]?.ID || formik.values.USR$MASTERKEY === stages[2]?.ID) ? */}
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
                                      // formik.setFieldValue(
                                      //   'USR$MASTERKEY',
                                      //   value ? stages[2].ID : stages[1].ID
                                      // );
                                    }}
                                  />
                                }
                                label="В работе"
                              />
                              {/* : <></>} */}
                              {/* {(formik.values.USR$MASTERKEY === stages[2]?.ID ||
                                  formik.values.USR$MASTERKEY === stages[3]?.ID ||
                                  formik.values.DEAL?.USR$DONE)
                                  ?  */}
                              <Tooltip title={checkDoneAndTasks ? 'Есть незакрытые задачи' : ''} arrow>
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
                                        // formik.setFieldValue(
                                        //   'USR$MASTERKEY',
                                        //   value ? stages[3].ID : stages[2].ID
                                        // );
                                      }}
                                    />
                                  }
                                  label="Исполнено"
                                />
                              </Tooltip>
                            </Stack>
                            {/* : <></> */}
                            {/* } */}
                            {/* {card?.DEAL?.ID && (card?.DEAL?.ID > 0) ? */}
                            <Stack direction="row" spacing={2}>
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
                                      // const newMasterKey = (() => {
                                      //   if (checked) return stages[4].ID;
                                      //   if (formik.values.DEAL?.USR$DONE) return stages[3].ID;
                                      //   if (formik.values.DEAL?.USR$READYTOWORK) return stages[2].ID;
                                      //   if (formik.values.DEAL?.PERFORMERS) return stages[1].ID;
                                      //   return stages[0].ID;
                                      // })();
                                      // formik.setFieldValue('USR$MASTERKEY', newMasterKey);
                                      if (!checked) formik.setFieldValue('DEAL.DENYREASON', null);
                                      if (checked) formik.setFieldValue('DEAL.USR$DONE', false);
                                    }}
                                  />
                                }
                                label="Отказ"
                              />
                              {formik.values.DEAL?.DENIED &&
                                  <Stack flex={1} spacing={3}>
                                    <DenyReasonsSelect formik={formik} />
                                  </Stack>}
                            </Stack>
                            {/* : <></> */}
                            {/* } */}
                          </Stack>
                          <Box flex={1} />
                        </Stack>
                      </Stack>
                      {(formik.values.DEAL?.DENIED || formik.values.DEAL?.USR$DONE) &&
                          <TextField
                            label="Комментарий"
                            ref={refComment}
                            type="text"
                            name="COMMENT"
                            multiline
                            minRows={4}
                            onChange={(e) => {
                              formik.setFieldValue('DEAL.COMMENT', e.target.value);
                            }}
                            value={formik.values.DEAL?.COMMENT}
                          />
                      }
                    </Stack>
                  </CustomizedScrollBox>
                </TabPanel>
                <TabPanel value="2" className={tabIndex === '2' ? classes.tabPanel : ''}>
                  <CustomizedScrollBox container={{ className: classes.scrollContainer }} className={classes.scrollBox}>
                    {KanbanRequestInfo}
                  </CustomizedScrollBox>
                </TabPanel>
                <TabPanel value="3" className={tabIndex === '3' ? classes.tabPanel : ''}>
                  <KanbanTasks card={formik.values} formik={formik} />
                </TabPanel>
                <TabPanel value="4" className={tabIndex === '4' ? classes.tabPanel : ''}>
                  <DealDocuments dealId={card?.DEAL?.ID ?? -1}/>
                </TabPanel>
                <TabPanel value="5" className={tabIndex === '5' ? classes.tabPanel : ''}>
                  <CustomizedCard
                    borders
                    style={{
                      borderColor: 'lightgrey',
                      flex: 1,
                      marginBottom: '16px',
                      height: '100%'
                    }}
                  >
                    <CustomizedScrollBox>
                      <div style={{ height: '100%' }}>
                        {card?.ID
                          ? <KanbanHistory cardId={card.ID} />
                          : <></>}
                      </div>
                    </CustomizedScrollBox>
                  </CustomizedCard>
                </TabPanel>
                <TabPanel value="6" className={tabIndex === '6' ? classes.tabPanel : ''}>
                  <TabDescription formik={formik} />
                </TabPanel>
                <TabPanel value="7" className={tabIndex === '7' ? classes.tabPanel : ''}>
                  <ClientHistory card={formik.values} />
                </TabPanel>
              </TabContext>
            </Stack>
          </Form>
        </FormikProvider>
      </DialogContent>
      <DialogActions className={styles.DialogActions}>
        <PermissionsGate actionAllowed={userPermissions?.deals.DELETE}>
          {(card?.DEAL?.ID && (card?.DEAL?.ID > 0)) && deleteable &&
            <IconButton onClick={handleDeleteClick} size="small">
              <DeleteIcon />
            </IconButton>
          }
        </PermissionsGate>
        <Box flex={1} />
        <Button
          className={classes.button}
          onClick={handleCancelClick}
        >Отменить</Button>
        <PermissionsGate show={true} actionAllowed={formik.values.ID > 0 ? userPermissions?.deals.PUT : userPermissions?.deals.POST}>
          <Button
            className={classes.button}
            form="mainForm"
            type="submit"
            variant="contained"
            disabled={customerFetching || employeesIsFetching || denyReasonsIsFetching || departmentsIsFetching || isFetchingCard}
          >Сохранить</Button>
        </PermissionsGate>
      </DialogActions>
      {memoConfirmDialog}
      {/* {memoAddDealsSource} */}
    </CustomizedDialog>
  );
}

export default KanbanEditCard;
