import { DataGridPro, GridColDef, ruRU, GridFilterModel, GridSortModel } from '@mui/x-data-grid-pro';
import Stack from '@mui/material/Stack/Stack';
import Button from '@mui/material/Button/Button';
import React, { CSSProperties, ForwardedRef, forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Chip, Box, List, ListItemButton, Snackbar, IconButton, useMediaQuery, Theme, CardHeader, Typography, Divider, CardContent, Badge } from '@mui/material';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummarizeIcon from '@mui/icons-material/Summarize';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import CustomerEdit from './customer-edit/customer-edit';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { IBusinessProcess, IContactWithID, IContractJob, ICustomer, ICustomerContract, ICustomerContractWithID, ILabel, IWorkType } from '@gsbelarus/util-api-types';
import { clearError } from '../features/error-slice/error-slice';
import { useTheme } from '@mui/material';
import CustomNoRowsOverlay from '../components/Styled/styled-grid/DataGridProOverlay/CustomNoRowsOverlay';
import CustomLoadingOverlay from '../components/Styled/styled-grid/DataGridProOverlay/CustomLoadingOverlay';
import CustomizedCard from '../components/Styled/customized-card/customized-card';
import { Link, useNavigate } from 'react-router-dom';
import CustomersFilter, {
  IFilteringData
} from './customers-filter/customers-filter';
import SearchBar from '../components/search-bar/search-bar';
import CustomGridToolbarOverlay from '../components/Styled/styled-grid/DataGridProOverlay/CustomGridToolbarOverlay';
import { makeStyles } from '@mui/styles';
import { useGetCustomersQuery, useUpdateCustomerMutation, useAddCustomerMutation, IPaginationData, useDeleteCustomerMutation, useGetCustomersCrossQuery, ISortingData } from '../features/customer/customerApi_new';
import { clearFilterData, saveFilterData, saveFilterModel } from '../store/filtersSlice';
import { useGetLabelsQuery } from '../features/labels';
import LabelMarker from '../components/Labels/label-marker/label-marker';
import { useGetWorkTypesQuery } from '../features/work-types/workTypesApi';
import { useGetDepartmentsQuery } from '../features/departments/departmentsApi';
import { useGetCustomerContractsQuery } from '../features/customer-contracts/customerContractsApi';
import { useGetBusinessProcessesQuery } from '../features/business-processes';
import style from './customers.module.less';
import DataField from './dataField/DataField';
import { LoadingButton } from '@mui/lab';

const useStyles = makeStyles((theme: Theme) => ({
  DataGrid: {
    border: 'none',
    '& ::-webkit-scrollbar': {
      width: '10px',
      height: '10px',
      backgroundColor: 'transparent',
      borderRadius: '6px'
    },
    '& ::-webkit-scrollbar:hover': {
      backgroundColor: '#f0f0f0'
    },
    '& ::-webkit-scrollbar-thumb': {
      position: 'absolute',
      right: 10,
      borderRadius: '6px',
      backgroundColor: 'rgba(170, 170, 170, 0.5)'
    },
    '& ::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#999'
    },
    '&.MuiDataGrid-root .MuiDataGrid-cell:focus, .MuiDataGrid-columnHeader:focus':
      {
        outline: 'none'
      },
    '&.MuiDataGrid-root .MuiDataGrid-cell:focus-within': {
      outline: 'none !important'
    },
    '& .MuiDataGrid-iconSeparator': {
      display: 'none'
    },
    '& .MuiDataGrid-columnHeader, .MuiDataGrid-cell': {
      padding: '24px'
    },
    '& .MuiDataGrid-columnHeader': {
      fontSize: '1rem'
    }
  }
}));

const labelStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2.5px 0px'
};

/* eslint-disable-next-line */
export interface CustomersProps {}

export function Customers(props: CustomersProps) {
  const classes = useStyles();

  const [reconciliationShow, setReconciliationShow] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState(0);
  const [openSnackBar, setOpenSnackBar] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState('');
  const [openEditForm, setOpenEditForm] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [filterModel, setFilterModel] = useState<GridFilterModel>();
  const [filteringData, setFilteringData] = useState<IFilteringData>({});
  const [paginationData, setPaginationData] = useState<IPaginationData>({
    pageNo: 0,
    pageSize: 10
  });
  const [sortingData, setSortingData] = useState<ISortingData | null>();

  const filtersStorage = useSelector(
    (state: RootState) => state.filtersStorage
  );

  useEffect(() => {
    setFilterModel(filtersStorage.filterModels.customers);
    setFilteringData(filtersStorage.filterData.customers);
  }, []);

  const { data: customersCross } = useGetCustomersCrossQuery();
  const {
    data: customersResponse,
    isFetching: customerFetching,
    refetch: customerRefetch
  } = useGetCustomersQuery(
    {
      pagination: paginationData,
      ...(filteringData ? { filter: filteringData } : {}),
      ...(sortingData ? { sort: sortingData } : {})
    }
    // { refetchOnMountOrArgChange: true }
  );

  const customersData: ICustomer[] = useMemo(
    () => [...(customersResponse?.data || [])],
    [customersResponse?.data]
  );
  const customersCount: number | undefined = useMemo(
    () => customersResponse?.count || 0,
    [customersResponse?.count]
  );
  // const { data: customersData } = customersResponse;
  const { data: wotkTypes } = useGetWorkTypesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const { data: customerContracts } = useGetCustomerContractsQuery();
  const { data: businessProcesses } = useGetBusinessProcessesQuery();
  const [customers, setCustomers] = useState<ICustomer[] | undefined>();

  useEffect(() => {
    const newCustomers = customersData?.map((customer) => {
      const DEPARTMENTS: IContactWithID[] = [];
      customersCross?.departments[customer.ID]?.forEach((el: number) => {
        const department = departments?.find((wt) => wt.ID === el);
        if (!department) return;
        DEPARTMENTS.push(department);
      });

      const JOBWORKS: IWorkType[] = [];
      customersCross?.jobWorks[customer.ID]?.forEach((el: number) => {
        const wotkType = wotkTypes?.find((wt) => wt.ID === el);
        if (!wotkType) return;
        JOBWORKS.push(wotkType);
      });

      const CONTRACTS: ICustomerContract[] = [];
      customersCross?.contracts[customer.ID]?.forEach((el: number) => {
        const customerContract = customerContracts?.find((wt) => wt.ID === el);
        if (!customerContract) return;
        CONTRACTS.push(customerContract);
      });

      return {
        ...customer,
        DEPARTMENTS,
        CONTRACTS,
        JOBWORKS
      };
    });

    setCustomers(newCustomers);
  }, [
    customerFetching,
    customersData,
    customersCross,
    wotkTypes,
    departments,
    customerContracts,
    businessProcesses
  ]);

  const [updateCustomer] = useUpdateCustomerMutation();
  const [addCustomer] = useAddCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const dispatch = useDispatch();

  const { errorMessage } = useSelector((state: RootState) => state.error);

  const theme = useTheme();
  const matchDownLg = useMediaQuery(theme.breakpoints.down('lg'));

  const handleLabelClick = useCallback(
    (label: ILabel) => () => {
      setFilterModel({
        items: [
          { id: 1, columnField: 'LABELS', value: label.ID, operatorValue: 'is' }
        ]
      });
      setFilteringData({ LABELS: [{ ID: label.ID }] });
    },
    []
  );

  const columns: GridColDef[] = [
    {
      field: 'NAME',
      headerName: 'Наименование',
      flex: 1,
      minWidth: 200,
      renderCell: ({ value, row }) => {
        return (
          <Stack spacing={1}>
            <div>{value}</div>
            <List
              style={{
                flexDirection: 'row',
                padding: '0px',
                width: 'fit-content',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px'
              }}
            >
              {(row as ICustomer)?.LABELS?.map((label) => (
                <ListItemButton
                  key={label.ID}
                  onClick={handleLabelClick(label)}
                  style={labelStyle}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent'
                    }
                  }}
                >
                  <LabelMarker label={label} />
                </ListItemButton>
              ))}
            </List>
          </Stack>
        );
      }
    },
    { field: 'PHONE', headerName: 'Телефон', width: 200 },
    {
      field: 'Actions',
      headerName: 'Действия',
      width: 150,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const customerId = Number(params.id);

        const handleCustomerEdit = () => {
          setCurrentOrganization(customerId);
          setOpenEditForm(true);
        };

        const detailsComponent = {
          // eslint-disable-next-line react/display-name
          component: forwardRef((props, ref: ForwardedRef<any>) => (
            <Link
              ref={ref}
              {...props}
              to={`details/${customerId}`}
              target="_self"
              onClick={SaveFilters}
            />
          ))
        };

        return (
          <Box>
            <IconButton {...detailsComponent} disabled={customerFetching}>
              <VisibilityIcon fontSize="small" color="primary" />
            </IconButton>
            <IconButton
              onClick={handleCustomerEdit}
              disabled={customerFetching}
            >
              <EditOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  useEffect(() => {
    SaveFilters();
  }, [filterModel, filteringData]);

  useEffect(() => {
    if (errorMessage) {
      setSnackBarMessage(errorMessage);
      setOpenSnackBar(true);
    }
  }, [errorMessage]);

  /** Close snackbar manually */
  const handleSnackBarClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(clearError());
    setOpenSnackBar(false);
  };

  const SaveFilters = () => {
    dispatch(saveFilterData({ customers: filteringData }));
    dispatch(saveFilterModel({ customers: filterModel }));
  };

  const handleReconciliationClick = () => {
    if (!currentOrganization) {
      setSnackBarMessage('Не выбрана организация');
      setOpenSnackBar(true);
      return;
    }
    setReconciliationShow(true);
  };

  /** Cancel organization change */
  const handleOrganiztionEditCancelClick = () => {
    setOpenEditForm(false);
  };

  const handleOrganiztionEditSubmit = async (
    values: ICustomer,
    deleting: boolean
  ) => {
    setOpenEditForm(false);

    if (deleting) {
      deleteCustomer(values.ID);
      return;
    }

    if (!values.ID) {
      addCustomer(values);
      return;
    }

    updateCustomer(values);
  };

  const handleAddOrganization = () => {
    setCurrentOrganization(0);
    setOpenEditForm(true);
  };

  const handleOrganizationDeleteOnClick = () => {
    if (!currentOrganization) {
      setSnackBarMessage('Не выбрана организация');
      setOpenSnackBar(true);
      return;
    }

    deleteCustomer(currentOrganization);
  };

  const filterHandlers = {
    handleFilter: async () => {
      setOpenFilters(!openFilters);
    },
    handleRequestSearch: async (value: string) => {
      const newObject = { ...filteringData };
      delete newObject.NAME;
      setFilteringData({
        ...newObject,
        ...(value !== '' ? { NAME: [value] } : {})
      });
    },
    handleCancelSearch: async () => {
      const newObject = { ...filteringData };
      delete newObject.NAME;

      setFilteringData(newObject);
    },
    handleFilteringData: async (newValue: IFilteringData) => {
      const filterModels: any[] = [];

      for (const [key, arr] of Object.entries(newValue)) {
        filterModels.push({
          id: 2,
          columnField: key,
          value: arr,
          operatorValue: 'includes'
        });
      }

      setFilterModel({ items: filterModels });
      setFilteringData(newValue);
    },
    handleFilterClose: async (
      event: any,
      reason: 'backdropClick' | 'escapeKeyDown'
    ) => {
      if (
        event?.type === 'keydown' &&
        (event?.key === 'Tab' || event?.key === 'Shift')
      ) {
        return;
      }
      setOpenFilters(false);
    },
    handleFilterClear: async () => {
      dispatch(clearFilterData());

      setFilterModel({ items: [] });
      setFilteringData({});
    }
  };

  const handleSortModelChange = useCallback((sortModel: GridSortModel) => {
    setSortingData(sortModel.length > 0 ? { ...sortModel[0] } : null);
  }, []);

  const memoUpsertCustomer = useMemo(
    () => (
      <CustomerEdit
        open={openEditForm}
        customer={
          customers?.find((element) => element.ID === currentOrganization) ||
          null
        }
        onSubmit={handleOrganiztionEditSubmit}
        onCancelClick={handleOrganiztionEditCancelClick}
        onDeleteClick={handleOrganizationDeleteOnClick}
      />
    ),
    [openEditForm]
  );

  const memoSearchBar = useMemo(
    () => (
      <SearchBar
        disabled={customerFetching}
        onCancelSearch={filterHandlers.handleCancelSearch}
        onRequestSearch={filterHandlers.handleRequestSearch}
        cancelOnEscape
        placeholder="Поиск клиента"
        value={
          filteringData && filteringData.NAME
            ? filteringData.NAME[0]
            : undefined
        }
      />
    ),
    [customerFetching, filteringData]
  );

  const memoFilter = useMemo(
    () => (
      <CustomersFilter
        open={openFilters}
        onClose={filterHandlers.handleFilterClose}
        filteringData={filteringData}
        onFilteringDataChange={filterHandlers.handleFilteringData}
        onFilterClear={filterHandlers.handleFilterClear}
      />
    ),
    [openFilters, filteringData]
  );

  const handleOnChange = (entity: string, value:any) => {
    const newObject:any = Object.assign({}, filteringData);

    if (entity === 'CONTRACTS') {
      delete newObject.WORKTYPES;
    };
    if (newObject[entity].length === 1) {
      delete newObject[entity];
    } else {
      newObject[entity] = newObject[entity].filter((item:any) => (item.NAME || item.USR$NUMBER || item.USR$NAME) !== value);
    }
    filterHandlers.handleFilteringData(Object.assign(newObject));
  };

  return (
    <CustomizedCard
      borders
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(matchDownLg
          ? {}
          : {
            transition: `${theme.transitions.create('width', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard
            })}`
          })
      }}
    >
      <CardHeader title={<Typography variant="h3">Клиенты</Typography>} />
      <Divider />
      <CardContent
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
      >
        <Stack flex={1}>
          <Box p={3}>
            <Stack direction="row" spacing={2}>
              <Box display="flex" justifyContent="center">
                {/* <Button onClick={() => customerRefetch()} disabled={customerFetching} startIcon={<RefreshIcon/>}>Обновить</Button> */}
                <Button
                  variant="contained"
                  onClick={handleAddOrganization}
                  disabled={customerFetching}
                  startIcon={<AddIcon />}
                >
                  Добавить
                </Button>
              </Box>
              <Box flex={1} />
              <Box>{memoSearchBar}</Box>
              <Box display="flex" justifyContent="center" width={30}>
                <LoadingButton
                  loading={customerFetching}
                  onClick={() => customerRefetch()}
                  variant="text"
                  size="medium"
                  style={{
                    minWidth: 30,
                    borderRadius: '12px'
                  }}
                >
                  <RefreshIcon
                    style={{
                      display: customerFetching ? 'none' : 'inline',
                    }}
                    color={'primary'}
                  />
                </LoadingButton>
              </Box>
              <Box display="flex" justifyContent="center" width={30}>
                <IconButton
                  onClick={filterHandlers.handleFilter}
                  disabled={customerFetching}
                >
                  <Badge
                    color="error"
                    variant={
                      Object.keys(filteringData || {}).length > 0 && (Object.keys(filteringData || {}).length === 1 ? !filteringData.NAME : true)
                        ? 'dot'
                        : 'standard'
                    }
                  >
                    <FilterListIcon
                      color={customerFetching ? 'disabled' : 'primary'}
                    />
                  </Badge>
                </IconButton>
              </Box>
            </Stack>
          </Box>
          <Box p={3} className={style.bodySelectedDataContainer}>
            <Stack style={{ flexWrap: 'wrap' }} direction="row" spacing={2}>
              {filteringData?.DEPARTMENTS && (
                <DataField name="Отдел" data={filteringData.DEPARTMENTS} masName={'DEPARTMENTS'} deleteField={handleOnChange}/>
              )}
              {filteringData?.CONTRACTS && (
                <DataField name="Заказы" data={filteringData.CONTRACTS} masName={'CONTRACTS'} deleteField={handleOnChange}/>
              )}
              {filteringData?.WORKTYPES && (
                <DataField name="Виды работ" data={filteringData.WORKTYPES} masName={'WORKTYPES'} deleteField={handleOnChange}/>
              )}
              {filteringData?.LABELS && (
                <DataField name="Метки" data={filteringData.LABELS} masName={'LABELS'} deleteField={handleOnChange}/>
              )}
              {filteringData?.BUSINESSPROCESSES && (
                <DataField name="Бизнес процессы" data={filteringData.BUSINESSPROCESSES} masName={'BUSINESSPROCESSES'} deleteField={handleOnChange}/>
              )}
            </Stack>
          </Box>
          <Stack direction="row" flex={1} display="flex">
            <Box flex={1}>
              <DataGridPro
                className={classes.DataGrid}
                localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
                hideFooterSelectedRowCount
                rows={customers ?? []}
                columns={columns}
                columnVisibilityModel={{
                  CONTRACTS: false,
                  DEPARTMENTS: false,
                  WORKTYPES: false
                }}
                pagination
                disableMultipleSelection
                loading={customerFetching}
                getRowId={(row) => row.ID}
                onSelectionModelChange={(ids) =>
                  setCurrentOrganization(ids[0] ? Number(ids[0]) : 0)
                }
                components={{
                  LoadingOverlay: CustomLoadingOverlay,
                  NoRowsOverlay: CustomNoRowsOverlay,
                  NoResultsOverlay: CustomNoRowsOverlay
                }}
                getRowHeight={(params) => {
                  const customer: ICustomer = params.model as ICustomer;
                  const labels: ILabel[] | undefined = customer.LABELS;

                  if (labels?.length && labels.length > 4) {
                    return 40 * Math.ceil(labels.length / 2);
                  }

                  return 80;
                }}
                rowsPerPageOptions={[10, 20, 50]}
                paginationMode="server"
                rowCount={customersCount}
                pageSize={paginationData.pageSize}
                onPageChange={(data) => {
                  setPaginationData((prevState) => ({
                    ...prevState,
                    pageNo: data
                  }));
                }}
                onPageSizeChange={(data) => {
                  setPaginationData((prevState) => ({
                    ...prevState,
                    pageSize: data
                  }));
                }}
                sortingMode="server"
                onSortModelChange={handleSortModelChange}
                headerHeight={70}
                disableColumnResize
                disableColumnReorder
                disableColumnFilter
                disableColumnMenu
              />
            </Box>
            <Box>{memoFilter}</Box>
            {memoUpsertCustomer}
          </Stack>
        </Stack>
      </CardContent>
    </CustomizedCard>
  );

  return (
    <Stack
      flex={1}
      display="flex"
      direction="column"
      spacing={2}
      style={{ overflow: 'hidden' }}
    >
      <Snackbar
        open={openSnackBar}
        autoHideDuration={5000}
        onClose={handleSnackBarClose}
      >
        <Alert onClose={handleSnackBarClose} variant="filled" severity="error">
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default Customers;
