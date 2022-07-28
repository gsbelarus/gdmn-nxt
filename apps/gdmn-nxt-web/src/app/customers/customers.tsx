import {
  DataGridPro,
  GridColDef,
  ruRU,
  GridFilterItem,
  GridFilterInputValueProps,
  GridFilterModel,
  GridFilterOperator
} from '@mui/x-data-grid-pro';
import './customers.module.less';
import Stack from '@mui/material/Stack/Stack';
import Button from '@mui/material/Button/Button';
import React, { CSSProperties, ForwardedRef, forwardRef, useEffect, useState } from 'react';
import { Box, List, ListItemButton, Snackbar, IconButton, useMediaQuery, Theme } from '@mui/material';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummarizeIcon from '@mui/icons-material/Summarize';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CustomerEdit from '../components/Customers/customer-edit/customer-edit';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { ICustomer, ILabel } from '@gsbelarus/util-api-types';
import { clearError } from '../features/error-slice/error-slice';
import { useTheme } from '@mui/material';
import CustomNoRowsOverlay from './DataGridProOverlay/CustomNoRowsOverlay';
import CustomLoadingOverlay from './DataGridProOverlay/CustomLoadingOverlay';
import CustomizedCard from '../components/customized-card/customized-card';
import { Link, useNavigate } from 'react-router-dom';
import CustomersFilter, { IFilteringData } from './customers-filter/customers-filter';
import SearchBar from '../components/search-bar/search-bar';
import CustomGridToolbarOverlay from './DataGridProOverlay/CustomGridToolbarOverlay';
import { makeStyles } from '@mui/styles';
import { useGetCustomersQuery, useUpdateCustomerMutation, useAddCustomerMutation, IPaginationData, useDeleteCustomerMutation } from '../features/customer/customerApi_new';
import { saveFilterData, saveFilterModel } from '../store/filtersSlice';
import { useGetLabelsQuery } from '../features/labels';
import LabelMarker from '../components/Labels/label-marker/label-marker';

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
      backgroundColor: '#f0f0f0',
    },
    '& ::-webkit-scrollbar-thumb': {
      position: 'absolute',
      right: 10,
      borderRadius: '6px',
      backgroundColor: 'rgba(170, 170, 170, 0.5)',
    },
    '& ::-webkit-scrollbar-thumb:hover': {
      backgroundColor: '#999',
    },
    '&.MuiDataGrid-root .MuiDataGrid-cell:focus, .MuiDataGrid-columnHeader:focus': {
      outline: 'none',
    },
    '& .MuiDataGrid-iconSeparator': {
      display: 'none',
    },
    '& .MuiDataGrid-columnHeader, .MuiDataGrid-cell': {
      padding: '24px',
    },
    '& .MuiDataGrid-columnHeader': {
      fontSize: '1rem'
    },
  },
}));

const labelStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2.5px 0px',
};

// interface IPaginationData {
//   pageNo: number;
//   pageSize: number;
// };

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
  const [searchName, setSearchName] = useState('');
  const [filteringData, setFilteringData] = useState<IFilteringData>({});
  const [paginationData, setPaginationData] = useState<IPaginationData>({
    pageNo: 0,
    pageSize: 20
  });

  /** Затычка для минимизации рендеров DataGrid при resize */
  const [displayDataGrid, setDisplayDataGrid] = useState(true);

  // const allCustomers = useSelector(customersSelectors.selectAll);
  const { error: customersError, loading: customersLoading } = useSelector((state: RootState) => state.customers);

  const { data: customers, isFetching: customerFetching, refetch: customerRefetch } = useGetCustomersQuery({
    // pagination: paginationData,
    // ...(filteringData['DEPARTMENTS']?.length > 0 ? { departments: filteringData['DEPARTMENTS']?.map((el: any) => el.ID) } : {}),
    // ...(filteringData ? { filter: filteringData['DEPARTMENTS']?.length > 0 ? { departments: filteringData['DEPARTMENTS']?.map((el: any) => el.ID) } : {} } : {})
    // ...(filteringData ? { filter: filteringData } : {})
    // filter: filteringData
  });
  const [updateCustomer] = useUpdateCustomerMutation();
  const [addCustomer] = useAddCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const dispatch = useDispatch();

  // console.log('setFilterModel', filterModel);
  // console.log('setFilteringData', filteringData);

  const { data: labels } = useGetLabelsQuery();

  const { errorMessage } = useSelector((state: RootState) => state.error);

  const theme = useTheme();
  const matchDownLg = useMediaQuery(theme.breakpoints.down('lg'));

  function CurrentLabelFilter(props: GridFilterInputValueProps) {
    const { item, applyValue, focusElementRef } = props;

    const label = labels?.find(el => el.ID === item.value);

    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'end',
          paddingBottom: '6px'
        }}
      >
        <div
          style={labelStyle}
        >
          {label ? <LabelMarker label={label} /> : <></>}
        </div>
      </div>
    );
  };

  const isLabel: GridFilterOperator = {
    label: 'Содержит',
    value: 'is',
    getApplyFilterFn: (filterItem: GridFilterItem) => {
      if (
        !filterItem.columnField ||
          !filterItem.value ||
          !filterItem.operatorValue
      ) {
        return null;
      }

      return (params: any): boolean => {
        return params.row.LABELS?.find((label: any) => label.ID === filterItem.value);
      };
    },
    InputComponent: CurrentLabelFilter,
    InputComponentProps: { type: 'number' },
  };

  const containLabels: GridFilterOperator = {
    label: 'Содержит',
    value: 'includes',
    getApplyFilterFn: (filterItem: GridFilterItem) => {
      if (
        !filterItem.columnField ||
        !filterItem.value ||
        !filterItem.operatorValue
      ) {
        return null;
      }

      if (!filterItem?.value.length) return (params: any): boolean => true;

      return (params: any): boolean => {
        return params.row.LABELS?.find((label: any) => filterItem.value.find((el: any) => el.ID === label.ID));
      };
    }
  };

  const containContracts: GridFilterOperator = {
    label: 'Содержит',
    value: 'includes',
    getApplyFilterFn: (filterItem: GridFilterItem) => {
      if (
        !filterItem.columnField ||
        !filterItem.value ||
        !filterItem.operatorValue
      ) {
        return null;
      }

      if (!filterItem?.value.length) return (params: any): boolean => true;

      return (params: any): boolean => {
        if (filteringData && filteringData['METHODS'] ? (filteringData['METHODS'] as any)['CONTRACTS'] === 'OR' : false) {
          return params.row.CONTRACTS?.find((contract: any) => filterItem.value.find((el: any) => el.ID === contract.ID));
        } else {
          return filterItem.value.every((value: any) => {
            return params.row.CONTRACTS?.find((el: any) => el.ID === value.ID);
          });
        }
      };
    }
  };

  const containDepartments: GridFilterOperator = {
    label: 'Содержит',
    value: 'includes',
    getApplyFilterFn: (filterItem: GridFilterItem) => {
      if (
        !filterItem.columnField ||
        !filterItem.value ||
        !filterItem.operatorValue
      ) {
        return null;
      }

      if (!filterItem?.value.length) return (params: any): boolean => true;

      return (params: any): boolean => {
        if (filteringData && filteringData['METHODS'] ? (filteringData['METHODS'] as any)['DEPARTMENTS'] === 'OR' : false) {
          return params.row.DEPARTMENTS?.find((department: any) => filterItem.value.find((el: any) => el.ID === department.ID));
        } else {
          return filterItem.value.every((value: any) => {
            return params.row.DEPARTMENTS?.find((el: any) => el.ID === value.ID);
          });
        }
      };
    }
  };

  const containWorkTypes: GridFilterOperator = {
    label: 'Содержит',
    value: 'includes',
    getApplyFilterFn: (filterItem: GridFilterItem) => {
      if (
        !filterItem.columnField ||
        !filterItem.value ||
        !filterItem.operatorValue
      ) {
        return null;
      }

      if (!filterItem?.value.length) return (params: any): boolean => true;

      return (params: any): boolean => {
        if (filteringData && filteringData['METHODS'] ? (filteringData['METHODS'] as any)['WORKTYPES'] === 'OR' : false) {
          return params.row.CONTRACTS?.find((contract: any) => filterItem.value.find((el: any) =>el.USR$CONTRACTJOBKEY === contract.ID));
        } else {
          return filterItem.value.every((value: any) => {
            return params.row.CONTRACTS?.find((el: any) => el.ID === value.USR$CONTRACTJOBKEY);
          });
        }
      };
    }
  };

  const columns: GridColDef[] = [
    { field: 'NAME', headerName: 'Наименование', flex: 1, minWidth: 200 },
    { field: 'PHONE', headerName: 'Телефон', width: 200 },
    { field: 'LABELS',
      headerName: 'Метки',
      width: 350,
      filterOperators: [isLabel, containLabels],
      renderCell: (params) => {
        const numberLabelsInRow = 2;

        const labels: ILabel[] = params.row.LABELS;

        if (!labels?.length) {
          return <></>;
        };

        return (
          <Stack direction="column">
            {labels.map((label, index) => {
              if (index % numberLabelsInRow === 0) {
                return (
                  <List
                    key={label.ID + index * 10}
                    style={{
                      flexDirection: 'row',
                      padding: '4px',
                      width: 'fit-content',
                    }}
                  >
                    {labels.slice(index, index + numberLabelsInRow).map((subLabel, index) => {
                      return (
                        <ListItemButton
                          key={subLabel.ID}
                          onClick={() => {
                            setFilterModel({ items: [{ id: 1, columnField: 'LABELS', value: subLabel.ID, operatorValue: 'is' }] });
                            setFilteringData({ 'LABELS': [{ ID: subLabel.ID }] });
                          }}
                          style={labelStyle}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'transparent',
                            }
                          }}
                        >
                          <LabelMarker label={subLabel} />
                          {/* {labels?.find(label => label.ID === subLabel.ID)?.USR$NAME} */}
                        </ListItemButton>
                      );
                    })}
                  </List>
                );
              }
              return null;
            })}
          </Stack>
        );
      }
    },
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
          component: forwardRef((props, ref: ForwardedRef<any>) =>
            <Link
              ref={ref}
              {...props}
              to={`details/${customerId}`}
              target="_self"
              onClick={SaveFilters}
            />)
        };

        return (
          <Box>
            <IconButton {...detailsComponent} disabled={customerFetching} >
              <VisibilityIcon fontSize="small" color="primary" />
            </IconButton>
            <IconButton onClick={handleCustomerEdit} disabled={customerFetching} >
              <EditOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
          </Box>
        );
      }
    },
    { field: 'CONTRACTS', headerName: 'Заказы', filterOperators: [containContracts] },
    { field: 'DEPARTMENTS', headerName: 'Отделы', filterOperators: [containDepartments] },
    { field: 'WORKTYPES', headerName: '', filterOperators: [containWorkTypes] },
  ];

  const filtersStorage = useSelector((state: RootState) => state.filtersStorage);

  useEffect(() => {
    setFilterModel(filtersStorage.filterModels['customers']);
    setFilteringData(filtersStorage.filterData['customers']);
    if (Object.keys(filtersStorage.filterData['customers'] || {}).length > 0) {
      setOpenFilters(true);
    };
  }, []);

  useEffect(() => {
    if (customersError) {
      setSnackBarMessage(customersError.toString());
      setOpenSnackBar(true);
    };

    if (errorMessage) {
      setSnackBarMessage(errorMessage);
      setOpenSnackBar(true);
    };
  }, [customersError, errorMessage]);

  /** Перевод вложенной структуры с lb rb в бинарное дерево */
  // const tree: NestedSets = new NestedSets({
  //   id: 'ID',
  //   parentId: 'PARENT',
  //   lft: 'LB',
  //   rgt: 'RB'
  // });

  // if (groups) {
  //   const arr: CollectionEl[] = groups.map(({ NAME, ...el }) => ({ ...el, PARENT: el.PARENT || 0 }));
  //   tree.loadTree(arr, { createIndexes: true });
  // }

  /** Close snackbar manually */
  const handleSnackBarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    };
    dispatch(clearError());
    setOpenSnackBar(false);
  };

  const SaveFilters = () => {
    dispatch(saveFilterData({ 'customers': filteringData }));
    dispatch(saveFilterModel({ 'customers': filterModel }));
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

  const handleOrganiztionEditSubmit = async (values: ICustomer, deleting: boolean) => {
    setOpenEditForm(false);

    if (deleting) {
      deleteCustomer(values.ID);
      return;
    };

    if (!values.ID) {
      addCustomer(values);
      return;
    };

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
    };

    deleteCustomer(currentOrganization);
  };


  const filterHandlers = {
    handleFilter: async () => {
      if (displayDataGrid) {
        setDisplayDataGrid(false);
      };

      setOpenFilters(!openFilters);
    },
    handleRequestSearch: async (value: string) => {
      setSearchName(value);
    },
    handleCancelSearch: async () => {
      setSearchName('');
    },
    handleFilteringData: async (newValue: IFilteringData) => {
      const filterModels: any[] = [];

      for (const [key, arr] of Object.entries(newValue)) {
        filterModels.push({ id: 2, columnField: key, value: arr, operatorValue: 'includes' });
      };

      setFilterModel({ items: filterModels });
      setFilteringData(newValue);
    },
    handleFilterClose: async (event: any, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (
        event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')
      ) {
        return;
      }
      setOpenFilters(false);
    }
  };

  return (
    <Stack flex={1} display="flex" direction="column" spacing={2} style={{ overflow: 'hidden' }}>
      <Stack direction="row" flex={1} >
        <Stack direction="column" style={{ width: '100%' }} padding={2}>
          <Box sx={{ mb: 1 }}>
            <Stack direction="row" spacing={2}>
              <Box display="flex" justifyContent="center">
                <Button onClick={() => customerRefetch()} disabled={customerFetching} startIcon={<RefreshIcon/>}>Обновить</Button>
                <Button onClick={handleAddOrganization} disabled={customerFetching} startIcon={<AddIcon/>}>Добавить</Button>
                {/* <Button
                  component="a"
                  href={`employee/reports/reconciliation/${currentOrganization}`}
                  disabled={customersLoading}
                  startIcon={<SummarizeIcon />}
                >Акт сверки</Button> */}
              </Box>
              <Box flex={1} />
              <Box>
                <SearchBar
                  disabled={customerFetching}
                  // onChange={filterHandlers.handleChange}
                  onCancelSearch={filterHandlers.handleCancelSearch}
                  onRequestSearch={filterHandlers.handleRequestSearch}
                  cancelOnEscape
                  placeholder="Поиск клиента"
                />
              </Box>
              <Box display="flex" justifyContent="center">
                <IconButton
                  onClick={filterHandlers.handleFilter}
                  disabled={customerFetching || !displayDataGrid}
                >
                  <FilterAltIcon color="primary" />
                </IconButton>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" flex={1} display="flex">
            <CustomizedCard
              borders
              boxShadows
              style={{
                width: '100%',
                ...(matchDownLg
                  ? {}
                  : {
                    transition: `${theme.transitions.create('width', {
                      easing: theme.transitions.easing.easeInOut,
                      duration: theme.transitions.duration.standard,
                    })}`
                  }),
              }}
            >
              <DataGridPro
                className={classes.DataGrid}
                style={{
                  display: `${displayDataGrid ? 'flex' : 'none'}`,
                }}
                localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
                rows={
                  customers
                    ?.filter(customer =>
                      customer.NAME.toUpperCase().includes(searchName.toUpperCase()) ||
                        customer.TAXID?.toUpperCase().includes(searchName.toUpperCase())
                    )
                    ?? []}
                columns={columns}
                columnVisibilityModel={{
                  CONTRACTS: false,
                  DEPARTMENTS: false,
                  WORKTYPES: false,
                }}
                pagination
                disableMultipleSelection
                loading={customerFetching}
                getRowId={row => row.ID}
                onSelectionModelChange={ids => setCurrentOrganization(ids[0] ? Number(ids[0]) : 0)}
                components={{
                  // Toolbar: CustomGridToolbarOverlay,
                  LoadingOverlay: CustomLoadingOverlay,
                  NoRowsOverlay: CustomNoRowsOverlay,
                  NoResultsOverlay: CustomNoRowsOverlay,
                }}
                filterModel={filterModel}
                onFilterModelChange={(model, detail) => setFilterModel(model)}
                // pinnedColumns={{ left: [customersLoading ? '' : 'NAME'] }}
                getRowHeight={(params) => {
                  const customer: ICustomer = params.model as ICustomer;
                  const labels: ILabel[] | undefined = customer.LABELS;

                  if (labels?.length && labels.length > 4) {
                    return 40 * Math.ceil(labels.length / 2);
                  };

                  return 80;
                }}
                rowsPerPageOptions={[20, 50, 100]}
                pageSize={paginationData.pageSize}
                onPageChange={(data) => {
                  setPaginationData(prevState => ({ ...prevState, pageNo: data }));
                }}
                onPageSizeChange={(data) => {
                  setPaginationData(prevState => ({ ...prevState, pageSize: data }));
                }}
                headerHeight={70}
                disableColumnResize
                disableColumnReorder

              />
            </CustomizedCard>
            <Box
              onTransitionEnd={() => setDisplayDataGrid(true)}
              display="flex"
              style={{
                ...(matchDownLg
                  ? {}
                  : {
                    marginLeft: theme.spacing(3),
                    marginRight: `${openFilters ? '0px' : '-' + theme.spacing(3)}`,
                    width: `${openFilters ? '300px' : '0px'}`,
                    transition: `${theme.transitions.create(['width', 'margin'], {
                      easing: theme.transitions.easing.easeInOut,
                      duration: theme.transitions.duration.standard,
                    })}`
                  })
              }}
            >
              <CustomersFilter
                open={openFilters}
                onClose={filterHandlers.handleFilterClose}
                filteringData={filteringData}
                onFilteringDataChange={filterHandlers.handleFilteringData}
              />
            </Box>
          </Stack>
        </Stack>
        {/* </div> */}
      </Stack>
      <CustomerEdit
        open={openEditForm}
        customer={
          customers
            ?.find(element => element.ID === currentOrganization)
            || null
        }
        onSubmit={handleOrganiztionEditSubmit}
        onCancelClick={handleOrganiztionEditCancelClick}
        onDeleteClick={handleOrganizationDeleteOnClick}
      />
      {/* {openEditForm ?
        <CustomerEdit
          open={openEditForm}
          customer={
            customers
              ?.find(element => element.ID === currentOrganization)
            || null
          }
          onSubmit={handleOrganiztionEditSubmit}
          onCancelClick={handleOrganiztionEditCancelClick}
          onDeleteClick={handleOrganizationDeleteOnClick}
        />
        : null
      } */}
      <Snackbar open={openSnackBar} autoHideDuration={5000} onClose={handleSnackBarClose}>
        <Alert onClose={handleSnackBarClose} variant="filled" severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}

export default Customers;
