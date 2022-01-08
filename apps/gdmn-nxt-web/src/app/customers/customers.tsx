import { useGetAllContactsQuery } from '../features/contact/contactApi';
import { DataGridPro, GridColDef, GridToolbar } from '@mui/x-data-grid-pro';
import './customers.module.less';
import Stack from '@mui/material/Stack/Stack';
import Button from '@mui/material/Button/Button';
import ReportParams from '../report-params/report-params';
import React from 'react';
import ReconciliationStatement from '../reconciliation-statement/reconciliation-statement';
import { Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import { DateRange } from '@mui/lab/DateRangePicker/RangeTypes';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CustomerEdit from '../customer-edit/customer-edit';


const columns: GridColDef[] = [
  { field: 'NAME', headerName: 'Name', width: 350 },
  { field: 'PHONE', headerName: 'Phone', width: 250 },
  { field: 'FOLDERNAME', headerName: 'Folder', width: 250 },
];

/* eslint-disable-next-line */
export interface CustomersProps {}

export function Customers(props: CustomersProps) {

  const { data, error, isFetching, refetch } = useGetAllContactsQuery();

  const [reconciliationParamsOpen, setReconciliationParamsOpen] = React.useState(false);
  const [reconciliationShow, setReconciliationShow] = React.useState(false);
  const [currentOrganization, setCurrentOrganization] = React.useState(0);
  const [openSnackBar, setOpenSnackBar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState('');
  const [paramsDates, setParamsDates] = React.useState<DateRange<Date | null>>([null, null]);

  const [openEditForm, setOpenEditForm] = React.useState(false);

  /** Close snackbar manually */
  const handleSnackBarClose = (event?: any, reason?: any) => {
    if (reason !== 'clickaway') {
      return;
    };
    setOpenSnackBar(false);
  };

  const handleReconciliationClick = () => {
    if (!currentOrganization) {
      setSnackBarMessage('Не выбрана организация');
      setOpenSnackBar(true);
      return;
    }
    setReconciliationParamsOpen(true);
  };

  /** Save report params */
  const handleSaveClick = () => {
    setReconciliationParamsOpen(false);
    setReconciliationShow(true);
  };

  /** Cancel report params */
  const handleCancelClick = () => {
    setReconciliationParamsOpen(false);
  };

  /** Handler for datePicker */
  const handleDateChange = (newValue: DateRange<Date | null>) => {
    setParamsDates(newValue);
  };

  /** Close reconciliation report */
  const handleReconcilitationBackOnClick = () => {
    setReconciliationShow(false);
  };

  /** Edit select organization */
  const handleOrganiztionEditClick = () => {
    if (!currentOrganization) {
      setSnackBarMessage('Не указана организация');
      setOpenSnackBar(true);
      return;
    }

    setOpenEditForm(true);
  };

  /** Save organization change */
  const handleOrganiztionEditSaveClick = () => {
    console.log('save data');
    setOpenEditForm(false);
  };

  /** Cancel organization change */
  const handleOrganiztionEditCancelClick = () => {
    console.log('cancel data');
    setOpenEditForm(false);
  };


  if (reconciliationShow) {
    return (
      <Stack direction="column" spacing={2}>
        <Button onClick={handleReconcilitationBackOnClick} variant="contained" size="large" startIcon={<ArrowBackIcon />}>
          Вернуться
        </Button>
        <ReconciliationStatement
          custId={currentOrganization} //148333193
          dateBegin={paramsDates[0]}
          dateEnd={paramsDates[1]}
        />
      </Stack>
    );
  };

  return (
    <Stack direction="column">
      <Stack direction="row">
        <Button onClick={refetch} disabled={isFetching} startIcon={<RefreshIcon/>}>Обновить</Button>
        <Button onClick={handleOrganiztionEditClick} disabled={isFetching} startIcon={<EditIcon />}>Редактировать</Button>
        <Button onClick={handleReconciliationClick} disabled={isFetching}>Акт сверки</Button>
      </Stack>
      <div style={{ width: '100%', height: '800px' }}>
        <DataGridPro
          rows={data?.queries.contacts ?? []}
          columns={columns}
          pagination
          disableMultipleSelection
          loading={isFetching}
          getRowId={row => row.ID}
          onSelectionModelChange={(ids)=>{
            setCurrentOrganization(Number(ids[0].toString()));
          }}
          components={{
            Toolbar: GridToolbar,
          }}
        />
      </div>
      <ReportParams
        open={reconciliationParamsOpen}
        dates={paramsDates}
        onDateChange={handleDateChange}
        onSaveClick={handleSaveClick}
        onCancelClick={handleCancelClick}
      />
      <CustomerEdit
        open={openEditForm}
        customer={data?.queries.contacts.find((element) => element.ID === currentOrganization) || null}
        onSaveClick={handleOrganiztionEditSaveClick}
        onCancelClick={handleOrganiztionEditCancelClick}
      />
      <Snackbar open={openSnackBar} autoHideDuration={5000} onClose={handleSnackBarClose}>
        <Alert onClose={handleSnackBarClose} variant="filled" severity='error'>{snackBarMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}

export default Customers;
