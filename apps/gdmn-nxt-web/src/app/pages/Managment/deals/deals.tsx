import styles from './deals.module.less';
import KanbanBoard from '../../../components/Kanban/kanban-board/kanban-board';
import { useDispatch, useSelector } from 'react-redux';
import { SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useGetKanbanDealsQuery } from '../../../features/kanban/kanbanApi';
import { RootState } from '../../../store';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import { Autocomplete, Badge, CircularProgress, IconButton, Skeleton, Stack, TextField, Tooltip, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import KanbanList from '../../../components/Kanban/kanban-list/kanban-list';
import { IKanbanColumn, IKanbanFilterDeadline } from '@gsbelarus/util-api-types';
import DealsFilter, { IFilteringData } from '../../../components/Kanban/deals-filter/deals-filter';
import { clearFilterData, saveFilterData } from '../../../store/filtersSlice';
import { useGetFiltersDeadlineQuery, useGetLastUsedFilterDeadlineQuery, usePostLastUsedFilterDeadlineMutation } from '../../../features/kanban/kanbanFiltersApi';

export interface IChanges {
  id: number;
  fieldName: string,
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
};

/* eslint-disable-next-line */
export interface DealsProps {}

export function Deals(props: DealsProps) {
  const [tabNo, setTabNo] = useState('0');
  const [openFilters, setOpenFilters] = useState(false);

  const dispatch = useDispatch();
  const filtersStorage = useSelector((state: RootState) => state.filtersStorage);
  const userId = useSelector<RootState, number>(state => state.user.userProfile?.id || -1);

  const { data: cardDateFilter = [], isFetching: cardDateFilterFetching } = useGetFiltersDeadlineQuery();
  const { data: lastCardDateFilter, isFetching: lastCardDateFilterFetching, isLoading: lastCardDateFilterLoading } = useGetLastUsedFilterDeadlineQuery(userId);
  const [postLastUsedFilter] = usePostLastUsedFilterDeadlineMutation();


  useEffect(() => {
    if (lastCardDateFilterLoading) return;
    if (filtersStorage.filterData.deals?.deadline) return;

    const currentDeadline = (() => {
      /** по умолчанию Все сделки */
      const deadlineDefault = cardDateFilter?.find(f => f.CODE === 6);
      if (!lastCardDateFilter) return deadlineDefault;
      return lastCardDateFilter;
    })();
    if (filtersStorage.filterData.deals?.deadline?.ID === currentDeadline?.ID) return;

    saveFilters({ ...filtersStorage.filterData.deals, deadline: [currentDeadline] });
  }, [lastCardDateFilterLoading]);

  const {
    data: nonCachedData,
    currentData: columns = nonCachedData || [],
    isFetching: columnsIsFetching,
    isLoading,
    refetch
  } = useGetKanbanDealsQuery({
    userId,
    ...(Object.keys(filtersStorage.filterData.deals || {}).length > 0 ? { filter: filtersStorage.filterData.deals } : {}),
  }, {
    skip: Object.keys(filtersStorage.filterData.deals || {}).length === 0
  });

  useEffect(() => {
    if (columnsIsFetching) return;
    setColumnsCache(undefined);
  }, [columns, columnsIsFetching]);

  const [columnsCache, setColumnsCache] = useState<IKanbanColumn[] | undefined>(undefined);

  const saveFilters = (filteringData: IFilteringData) => {
    dispatch(saveFilterData({ 'deals': filteringData }));
  };

  const refreshBoard = useCallback(() => refetch(), []);

  const filterHandlers = {
    filterClick: useCallback(() => {
      setOpenFilters(true);
    }, []),
    filterClose: async (event: any) => {
      if (
        event?.type === 'keydown' &&
        (event?.key === 'Tab' || event?.key === 'Shift')
      ) {
        return;
      }
      setOpenFilters(false);
    },
    filterClear: () => {
      dispatch(clearFilterData('deals'));
    },
    filteringDataChange: async(newValue: IFilteringData) => {
      saveFilters(newValue);
    },
    filterDeadlineChange: (e: SyntheticEvent<Element, Event>, value: IKanbanFilterDeadline) => {
      saveFilters({ ...filtersStorage.filterData.deals, deadline: [value] });

      postLastUsedFilter({
        filter: value,
        userId
      });
    }
  };

  const DealsFilterMemo = useMemo(() =>
    <DealsFilter
      open={openFilters}
      filteringData={filtersStorage.filterData.deals}
      onClose={filterHandlers.filterClose}
      onFilteringDataChange={filterHandlers.filteringDataChange}
      onFilterClear={filterHandlers.filterClear}
    />,
  [openFilters, filtersStorage.filterData.deals]);

  const componentIsFetching = isLoading || Object.keys(filtersStorage.filterData.deals || {}).length === 0;

  const Header = useMemo(() => {
    return (
      <>
        <CustomizedCard
          borders
          className={styles.headerCard}
        >
          <ToggleButtonGroup
            color="primary"
            value={tabNo}
            exclusive
            size="small"
            onChange={(e, value) => {
              if (!value) return;
              setTabNo(value);
            }}
          >
            <ToggleButton value="0" className={styles.toggleButton}>
              <Tooltip title="Доска" arrow>
                <ViewWeekIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="1" className={styles.toggleButton}>
              <Tooltip title="Список" arrow>
                <ViewStreamIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Autocomplete
            style={{
              width: '210px',
              paddingLeft: '15px'
            }}
            options={cardDateFilter}
            disableClearable
            getOptionLabel={option => option.NAME}
            isOptionEqualToValue={(option, value) => option.ID === value.ID}
            value={filtersStorage.filterData.deals?.deadline?.length > 0 ? filtersStorage.filterData.deals.deadline[0] : null}
            onChange={filterHandlers.filterDeadlineChange}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.ID}>
                {option.NAME}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Фильтр по сроку"
              />
            )}
          />
          <Box flex={1} />
          <IconButton
            onClick={refreshBoard}
            disabled={columnsIsFetching}
          >
            {columnsIsFetching
              ? <CircularProgress size={17}/>
              : <RefreshIcon color="primary" />
            }
          </IconButton>
          <IconButton
            onClick={filterHandlers.filterClick}
            disabled={columnsIsFetching}
          >
            <Badge
              color="error"
              variant={Object.keys(filtersStorage.filterData.deals || {}).filter(f => f !== 'deadline').length > 0 ? 'dot' : 'standard'}
            >
              <FilterListIcon color="primary" />
            </Badge>
          </IconButton>
        </CustomizedCard>
      </>
    );
  }
  , [tabNo, filtersStorage.filterData.deals, columnsIsFetching]);

  const KanbanBoardMemo = useMemo(() => <KanbanBoard
    columns={columnsCache || columns}
    isLoading={componentIsFetching}
    setColumnsCache={setColumnsCache}
                                        />, [columns, componentIsFetching, columnsCache]);

  const KanbanListMemo = useMemo(() =>
    <Box className={styles.kanbanListContainer}>
      <KanbanList columns={columnsCache || columns} />
    </Box>
  , [columns, columnsCache]);

  return (
    <Stack
      spacing={2}
      style={{
        width: '100%'
      }}
    >
      {componentIsFetching
        ?
        <div>
          <Skeleton variant="rectangular" className={styles.skeletonHeader} />
          {/* <Skeleton variant="rectangular" className={styles.skeletonBody} /> */}
        </div>
        : Header
      }
      {DealsFilterMemo}
      <div className={styles.dataContainer}>
        {(() => {
          switch (tabNo) {
            case '0':
              return KanbanBoardMemo;
            case '1':
              return KanbanListMemo;
            default:
              return <></>;
          }
        })()}
      </div>
    </Stack>
  );
}

export default Deals;
