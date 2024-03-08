import PermissionsGate from '@gdmn-nxt/components/Permissions/permission-gate/permission-gate';
import CustomizedCard from '@gdmn-nxt/components/Styled/customized-card/customized-card';
import CustomLoadingButton from '@gdmn-nxt/components/helpers/custom-loading-button/custom-loading-button';
import SearchBar from '@gdmn-nxt/components/search-bar/search-bar';
import { Box, CardContent, CardHeader, Divider, Stack, Typography } from '@mui/material';
import usePermissions from '@gdmn-nxt/components/helpers/hooks/usePermissions';
import { useGetContractsListQuery } from '../../../features/contracts-list/contractsListApi';
import { useCallback, useMemo, useState } from 'react';
import StyledGrid from '@gdmn-nxt/components/Styled/styled-grid/styled-grid';
import { columns } from './columns';
import useSystemSettings from '@gdmn-nxt/components/helpers/hooks/useSystemSettings';
import { ContractType, IContract, IFilteringData, ISortingData } from '@gsbelarus/util-api-types';
import CustomAddButton from '@gdmn-nxt/components/helpers/custom-add-button';
import { GridRowParams, GridSortModel } from '@mui/x-data-grid-pro';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { saveFilterData } from '../../../store/filtersSlice';
import DetailContent from './detail-content';
import CustomFilterButton from '@gdmn-nxt/components/helpers/custom-filter-button';
import { ContractsFilter } from '@gdmn-nxt/components/contracts/contracts-filter';

export interface ContractsProps {}

interface Pagination {
  pageNo: number;
  pageSize: number;
}

export function Contracts(props: ContractsProps) {
  const filterData = useSelector((state: RootState) => state.filtersStorage.filterData?.contracts);
  const [openFilters, setOpenFilters] = useState(false);
  const dispatch = useDispatch();

  const [pagination, setPagination] = useState<Pagination>({
    pageNo: 0,
    pageSize: 20
  });
  const [sortingData, setSortingData] = useState<ISortingData | null>();

  const {
    data: contracts,
    isFetching: contractsIsFetching,
    // isLoading,
    refetch
  } = useGetContractsListQuery({
    pagination,
    ...(filterData && { filter: filterData }),
    ...(sortingData ? { sort: sortingData } : {})
  });

  const refreshClick = useCallback(() => refetch(), []);

  const userPermissions = usePermissions();
  const systemSettings = useSystemSettings();

  const cols = columns[systemSettings?.CONTRACTTYPE ?? ContractType.GS];

  const pageOnChange = useCallback((pageNo: number) =>
    setPagination(prev => ({
      ...prev,
      ...(!isNaN(pageNo) && { pageNo })
    })),
  []);

  const pageSizeOnChange = useCallback((pageSize: number) =>
    setPagination(prev => ({
      ...prev,
      ...(pageSize && { pageSize })
    })),
  []);

  const saveFilters = useCallback((filteringData: IFilteringData) => {
    dispatch(saveFilterData({ 'contracts': filteringData }));
  }, []);

  const handleSortModelChange = useCallback((sortModel: GridSortModel) => {
    setSortingData(sortModel.length > 0 ? { ...sortModel[0] } : null);
  }, []);

  const handleFilteringDataChange = useCallback((newValue: IFilteringData) => saveFilters(newValue), []);

  const requestSearch = useCallback((value: string) => {
    const newObject = { ...filterData };
    delete newObject.name;
    handleFilteringDataChange({
      ...newObject,
      ...(value !== '' ? { name: [value] } : {})
    });
  }, []);

  const cancelSearch = useCallback(() => {
    const newObject = { ...filterData };
    delete newObject.name;
    handleFilteringDataChange(newObject);
  }, []);

  const filterHandlers = {
    filterClick: useCallback(() => {
      setOpenFilters(true);
    }, []),
    filterClose: async () => {
      setOpenFilters(false);
    },
  };

  const getDetailPanelContent = useCallback(({ row }: GridRowParams<IContract>) => <DetailContent row={row} />, []);

  const memoFilter = useMemo(() =>
    <ContractsFilter
      open={openFilters}
      onClose={filterHandlers.filterClose}
      filteringData={filterData}
      onFilteringDataChange={handleFilteringDataChange}
    />,
  [openFilters, filterData]);

  return (
    <CustomizedCard style={{ flex: 1 }}>
      <CardHeader
        title={<Typography variant="pageHeader">Договоры</Typography>}
        action={
          <Stack direction="row" spacing={1}>
            <Box paddingX={'4px'} />
            <SearchBar
              disabled={contractsIsFetching}
              onCancelSearch={cancelSearch}
              onRequestSearch={requestSearch}
              fullWidth
              cancelOnEscape
              value={
                filterData?.name
                  ? filterData.name[0]
                  : undefined
              }
            />
            <Box display="inline-flex" alignSelf="center">
              <PermissionsGate actionAllowed={userPermissions?.contacts?.POST}>
                <CustomAddButton
                  // disabled={contractsIsFetching}
                  disabled
                  label="Создать договор"
                  // onClick={() => setUpsertContact({ addContact: true })}
                />
              </PermissionsGate>
            </Box>
            <Box display="inline-flex" alignSelf="center">
              <CustomLoadingButton
                hint="Обновить данные"
                loading={contractsIsFetching}
                onClick={refreshClick}
              />
            </Box>
            <Box display="inline-flex" alignSelf="center">
              <CustomFilterButton
                onClick={filterHandlers.filterClick}
                disabled={contractsIsFetching}
                hasFilters={Object.keys(filterData || {}).filter(f => f !== 'name').length > 0}
              />
            </Box>
          </Stack>
        }
      />
      <Divider />
      <CardContent style={{ padding: 0 }}>
        <StyledGrid
          rows={contracts?.records ?? []}
          rowCount={contracts?.count ?? 0}
          columns={cols}
          loading={contractsIsFetching}
          pagination
          paginationMode="server"
          onPageChange={pageOnChange}
          onPageSizeChange={pageSizeOnChange}
          pageSize={pagination.pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          sortingMode="server"
          onSortModelChange={handleSortModelChange}
          getDetailPanelHeight={() => 'auto'}
          getDetailPanelContent={getDetailPanelContent}
        />
      </CardContent>
      {memoFilter}
    </CustomizedCard>
  );
};
