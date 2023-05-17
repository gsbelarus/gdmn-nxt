import styles from './deals.module.less';
import KanbanBoard from '../../../components/Kanban/kanban-board/kanban-board';
import { useDispatch, useSelector } from 'react-redux';
import React, { ChangeEvent, SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toggleMenu } from '../../../store/settingsSlice';
import { useGetKanbanDealsQuery } from '../../../features/kanban/kanbanApi';
import { CircularIndeterminate } from '../../../components/helpers/circular-indeterminate/circular-indeterminate';
import { RootState } from '../../../store';
import { UserState } from '../../../features/user/userSlice';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import { Autocomplete, Badge, BottomNavigation, BottomNavigationAction, Button, CircularProgress, IconButton, Skeleton, Stack, TextField, Tooltip, Box } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import KanbanList from '../../../components/Kanban/kanban-list/kanban-list';
import { IKanbanCard, IKanbanColumn, IKanbanFilterDeadline, IPermissionByUser } from '@gsbelarus/util-api-types';
import DealsFilter, { IFilteringData } from '../../../components/Kanban/deals-filter/deals-filter';
import { clearFilterData, saveFilterData } from '../../../store/filtersSlice';
import { useGetFiltersDeadlineQuery, useGetLastUsedFilterDeadlineQuery, usePostLastUsedFilterDeadlineMutation } from '../../../features/kanban/kanbanFiltersApi';

export interface IChanges {
  id: number;
  fieldName: string,
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
};

export const compareCards = (columns: IKanbanColumn[], newCard: any, oldCard: IKanbanCard) => {
  const changesArr: IChanges[] = [];

  const deal = newCard.DEAL;
  const contact = newCard.DEAL?.CONTACT || {};
  const performer = newCard.DEAL?.PERFORMERS[0] || {};
  const secondPerformer = newCard.DEAL?.PERFORMERS[1] || {};

  if ((deal?.USR$AMOUNT || 0) !== (oldCard.DEAL?.USR$AMOUNT || 0)) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Сумма',
      oldValue: Number(oldCard.DEAL?.USR$AMOUNT) || 0,
      newValue: deal.USR$AMOUNT || 0
    });
  }
  if (contact.ID !== oldCard.DEAL?.CONTACT?.ID) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Клиент',
      oldValue: oldCard.DEAL?.CONTACT?.NAME,
      newValue: contact.NAME
    });
  };
  if (deal?.USR$NAME !== oldCard.DEAL?.USR$NAME) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Наименование',
      oldValue: oldCard.DEAL?.USR$NAME,
      newValue: deal.USR$NAME
    });
  };
  if (performer.ID !== oldCard.DEAL?.PERFORMERS?.[0]?.ID) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Исполнитель',
      oldValue: oldCard.DEAL?.PERFORMERS?.[0]?.NAME,
      newValue: performer.NAME
    });
  };
  if (secondPerformer.ID !== oldCard.DEAL?.PERFORMERS?.[1]?.ID) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Второй исполнитель',
      oldValue: oldCard.DEAL?.PERFORMERS?.[1]?.NAME,
      newValue: secondPerformer.NAME
    });
  };
  if (newCard.USR$MASTERKEY !== oldCard.USR$MASTERKEY) {
    changesArr.push({
      id: newCard.ID,
      fieldName: 'Этап',
      oldValue: columns.find(column => column.ID === oldCard.USR$MASTERKEY)?.USR$NAME || '',
      newValue: columns.find(column => column.ID === newCard.USR$MASTERKEY)?.USR$NAME || ''
    });
  };

  return changesArr;
};


/* eslint-disable-next-line */
export interface DealsProps {}

export function Deals(props: DealsProps) {
  const [tabNo, setTabNo] = useState(0);
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
    filter: {
      // deadline: kanbanFilter.deadline.CODE,
      ...filtersStorage.filterData.deals,
    }
  });


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

  const componentIsFetching = isLoading;

  const Header = useMemo(() => {
    return (
      <>
        <CustomizedCard
          borders
          className={styles.headerCard}
        >
          <Autocomplete
            style={{
              width: '210px',
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
        <CustomizedCard
          borders
          className={styles.switchViewCard}
        >
          <BottomNavigation
            value={tabNo}
            className={styles.bottomNavigation}
            onChange={(e, newValue: number) => {
              setTabNo(newValue);
            }}
          >
            <Tooltip title="Доска" arrow>
              <BottomNavigationAction style={{ padding: 0, margin: 0 }} icon={<ViewWeekIcon />} />
            </Tooltip>
            <Tooltip title="Список" arrow>
              <BottomNavigationAction style={{ padding: 0, margin: 0 }} icon={<ViewStreamIcon />} />
            </Tooltip>
          </BottomNavigation>
        </CustomizedCard>
      </>
    );
  }
  , [tabNo, filtersStorage.filterData.deals, columnsIsFetching]);

  const KanbanBoardMemo = useMemo(() => <KanbanBoard columns={columns} isLoading={componentIsFetching} />, [columns, componentIsFetching]);

  const KanbanListMemo = useMemo(() => <KanbanList columns={columns} />, [columns]);

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
          <Skeleton variant="rectangular" height={'70px'} style={{ borderRadius: '12px 12px 0 0' }}/>
          <Skeleton variant="rectangular" height={'40px'} width={'235px'} style={{ borderRadius: '0 0 12px 12px' }}/>
        </div>
        : Header
      }
      {DealsFilterMemo}
      <div className={styles.dataContainer}>
        {(() => {
          switch (tabNo) {
            case 0:
              return KanbanBoardMemo;
            case 1:
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
