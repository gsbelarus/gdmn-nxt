import './customer-edit.module.less';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Box,
  Slide,
  Typography,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  Theme
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { ICustomer, ILabel } from '@gsbelarus/util-api-types';
import ConfirmDialog from '../../confirm-dialog/confirm-dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, FormikProvider, getIn, useFormik } from 'formik';
import * as yup from 'yup';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useGetGroupsQuery } from '../../features/contact/contactGroupApi';
import { useGetLabelsQuery } from '../../features/labels';
import LabelMarker from '../../components/Labels/label-marker/label-marker';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useGetBusinessProcessesQuery } from '../../features/business-processes';
import ContactPersonList from '../contact-person-list/contact-person-list';
import CustomizedDialog from '../../components/Styled/customized-dialog/customized-dialog';
import TextFieldMasked from '../../components/textField-masked/textField-masked';
import { countries, countriesType, getNumberMask } from '../../numberMask';

const useStyles = makeStyles((theme: Theme) => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    width: '30vw',
    minWidth: 500,
    maxWidth: '100%',
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
  tabPanel: {
    flex: 1,
    display: 'flex',
    paddingLeft: 0,
    paddingRight: 0,
  }
}));

export interface CustomerEditProps {
  open: boolean;
  deleteable?: boolean;
  customer: ICustomer | null;
  onSubmit: (arg1: ICustomer, arg2: boolean) => void;
  onSaveClick?: () => void;
  onCancelClick: () => void;
  onDeleteClick?: () => void;
}

export function CustomerEdit(props: CustomerEditProps) {
  const { open, deleteable = false, customer } = props;
  const { onCancelClick, onSubmit } = props;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tabIndex, setTabIndex] = useState('1');

  const { data: groups, isFetching: groupFetching } = useGetGroupsQuery();
  const { data: labels, isFetching: labelsFetching } = useGetLabelsQuery();
  const { data: businessProcesses = [], isFetching: businessProcessesFetching } = useGetBusinessProcessesQuery();

  const classes = useStyles();

  const initValue: ICustomer = {
    ID: customer?.ID || 0,
    NAME: customer?.NAME || '',
    PHONE: customer?.PHONE || '',
    EMAIL: customer?.EMAIL || '',
    LABELS: customer?.LABELS || [],
    ADDRESS: customer?.ADDRESS || '',
    TAXID: customer?.TAXID || ''
  };

  const formik = useFormik<ICustomer>({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: {
      ...customer,
      ...initValue
    },
    validationSchema: yup.object().shape({
      NAME: yup.string().required('')
        .max(80, 'Слишком длинное наименование'),
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
      'PHONE': yup.string().matches(/^(\+ ?)?([1-9]\d{0,2}[-\ ]?)?(\(?[1-9]\d{0,2}\)?)?[-\ ]?\d{3,3}[-\ ]?\d{2,2}[-\ ]?\d{2,2}$/, 'Некорректный номер')
        .max(40, 'Слишком длинный номер')
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

  useEffect(() => {
    if (!open) {
      formik.resetForm();
      if (tabIndex !== '1') setTabIndex('1');
    };
  }, [open]);

  const handleDeleteClick = () => {
    setDeleting(true);
    setConfirmOpen(true);
  };

  const handleCancelClick = () => {
    setDeleting(false);
    formik.resetForm();
    onCancelClick();
  };

  const handleTabsChange = (event: any, newindex: string) => {
    setTabIndex(newindex);
  };

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

  const memoContactlist = useMemo(() =>
    <ContactPersonList customerId={customer?.ID || -1} />,
  [customer?.ID]);

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={deleting ? 'Удаление клиента' : 'Сохранение'}
      text="Вы уверены, что хотите продолжить?"
      dangerous={deleting}
      confirmClick={handleConfirmOkClick}
      cancelClick={handleConfirmCancelClick}
    />
  , [confirmOpen, deleting]);

  const [country, setCountry] = useState<countriesType>('Belarus');

  const changeCountry = (e: SelectChangeEvent) => {
    setCountry(e.target.value as countriesType);
  };

  return (
    <CustomizedDialog
      open={open}
      onClose={handleClose}
      // width={'30vw'}
    >
      <DialogTitle>
        {customer ? `Редактирование: ${customer.NAME}` : 'Добавление'}
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0 }}>
        <PerfectScrollbar style={{ padding: '16px 24px' }}>
          <Stack
            direction="column"
            spacing={3}
            style={{ flex: 1, display: 'flex' }}
          >
            <FormikProvider value={formik}>
              <Form id="customerEdit" onSubmit={formik.handleSubmit}>
                <TabContext value={tabIndex}>
                  <Box>
                    <TabList onChange={handleTabsChange}>
                      <Tab label="Сведения" value="1" />
                      <Tab label="Сотрудники" value="2" />
                    </TabList>
                  </Box>
                  <Divider style={{ margin: 0 }} />
                  <TabPanel value="1" className={tabIndex === '1' ? classes.tabPanel : ''}>
                    <Stack
                      direction="column"
                      spacing={3}
                      flex={1}
                      width="100%"
                    >
                      <TextField
                        label="Наименование"
                        className={classes.helperText}
                        type="text"
                        required
                        autoFocus
                        name="NAME"
                        onChange={formik.handleChange}
                        value={formik.values.NAME}
                        helperText={getIn(formik.touched, 'NAME') && getIn(formik.errors, 'NAME')}
                        error={getIn(formik.touched, 'NAME') && Boolean(getIn(formik.errors, 'NAME'))}
                      />
                      <TextField
                        label="УНП"
                        className={classes.helperText}
                        type="text"
                        name="TAXID"
                        onChange={formik.handleChange}
                        value={formik.values.TAXID}
                      />
                      <Stack direction="row" spacing={2}>
                        <TextField
                          label="Email"
                          className={classes.helperText}
                          type="text"
                          name="EMAIL"
                          onChange={formik.handleChange}
                          value={formik.values.EMAIL}
                          helperText={getIn(formik.touched, 'EMAIL') && getIn(formik.errors, 'EMAIL')}
                          error={getIn(formik.touched, 'EMAIL') && Boolean(getIn(formik.errors, 'EMAIL'))}
                          fullWidth
                        />
                        <TextFieldMasked
                          mask={getNumberMask(country)}
                          fullWidth
                          name="PHONE"
                          label="Телефон"
                          onChange={formik.handleChange}
                          value={formik.values.PHONE}
                          error={formik.touched.PHONE && Boolean(formik.errors.PHONE)}
                          helperText={formik.touched.PHONE && formik.errors.PHONE}
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
                      <TextField
                        label="Адрес"
                        className={classes.helperText}
                        multiline
                        minRows={1}
                        type="text"
                        name="ADDRESS"
                        onChange={formik.handleChange}
                        value={formik.values.ADDRESS}
                        placeholder="Введите адрес"
                        helperText={getIn(formik.touched, 'ADDRESS') && getIn(formik.errors, 'ADDRESS')}
                        error={getIn(formik.touched, 'ADDRESS') && Boolean(getIn(formik.errors, 'ADDRESS'))}
                      />
                      <Autocomplete
                        multiple
                        disableCloseOnSelect
                        limitTags={2}
                        options={businessProcesses}
                        loading={businessProcessesFetching}
                        getOptionLabel={option => option.NAME}
                        value={
                          businessProcesses?.filter(bp => formik.values.BUSINESSPROCESSES?.find(el => el.ID === bp.ID))
                        }
                        onChange={(e, value) => {
                          formik.setFieldValue(
                            'BUSINESSPROCESSES',
                            value || initValue.BUSINESSPROCESSES
                          );
                        }}
                        renderOption={(props, option, { selected }) => (
                          <li {...props} key={option.ID}>
                            <Checkbox
                              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                              checkedIcon={<CheckBoxIcon fontSize="small" />}
                              checked={selected}
                            />
                            {option.NAME}
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Бизнес-процессы"
                            placeholder="Выберите бизнес-процессы"
                          />
                        )}
                      />
                      <Autocomplete
                        multiple
                        limitTags={2}
                        disableCloseOnSelect
                        onChange={(e, value) => {
                          formik.setFieldValue(
                            'LABELS',
                            value || initValue.LABELS
                          );
                        }}
                        value={
                          labels
                            ?.filter(label => formik.values.LABELS?.find(el => el.ID === label.ID))
                        }
                        options={labels || []}
                        loading={labelsFetching}
                        getOptionLabel={opt => opt.USR$NAME}
                        renderOption={(props, option, { selected }) => (
                          <li {...props} key={option.ID}>
                            <Checkbox
                              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                              checkedIcon={<CheckBoxIcon fontSize="small" />}
                              style={{ marginRight: 8 }}
                              checked={selected}
                            />
                            <Stack direction="column">
                              <Stack direction="row">
                                <Box
                                  component="span"
                                  sx={{
                                    width: 14,
                                    height: 14,
                                    // flexShrink: 0,
                                    borderRadius: '12px',
                                    mr: 1,
                                    alignSelf: 'center',
                                  }}
                                  style={{ backgroundColor: option.USR$COLOR }}
                                />
                                <Box>
                                  {option.USR$NAME}
                                </Box>
                              </Stack>
                              <Typography variant="caption">{option.USR$DESCRIPTION}</Typography>
                            </Stack>
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Метки"
                            placeholder="Выберите метки"
                          />
                        )}
                        renderTags={(value: readonly ILabel[], getTagProps) =>
                          value.map((option: ILabel, index: number) =>
                            <Box
                              key={index}
                              pr={0.5}
                              pb={0.5}
                            >
                              <LabelMarker label={option} {...getTagProps({ index })}/>
                            </Box>
                          )
                        }
                      />
                    </Stack>
                  </TabPanel>
                  <TabPanel value="2" className={tabIndex === '2' ? classes.tabPanel : ''}>
                    <Box style={{ flex: 1, minHeight: '50vh', padding: 0, display: 'flex' }}>
                      {memoContactlist}
                    </Box>
                  </TabPanel>
                </TabContext>
              </Form>
            </FormikProvider>
          </Stack>
        </PerfectScrollbar>
      </DialogContent>
      <DialogActions>
        {
          customer && deleteable &&
          <IconButton
            onClick={handleDeleteClick}
            size="small"
            hidden
          >
            <DeleteIcon />
          </IconButton>
        }
        {/* <Button
          className={classes.button}
          variant="text"
          color="error"
          onClick={handleDeleteClick}
          startIcon={<DeleteIcon fontSize="medium"  />}
        >
          Удалить
        </Button> */}
        <Box flex={1}/>
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
          form="customerEdit"
          type="submit"
          variant="contained"
        >
            Сохранить
        </Button>
      </DialogActions>
      {memoConfirmDialog}
    </CustomizedDialog>
  );
}

export default CustomerEdit;
