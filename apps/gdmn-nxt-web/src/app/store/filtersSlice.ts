import { GridFilterModel } from '@mui/x-data-grid-pro';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IFilteringData } from '../customers/customers-filter/customers-filter';

export interface IFiltersState {
  filterModels: { [key: string]: GridFilterModel | undefined };
  filterData: { [key: string]: IFilteringData };
  activeKanbanDealsFilter: IActiveKanbanDealsFilter,
  kanbanDealsFilter: IKanbanDealsFilter,
};

export interface IDateFilter {
  ID: number,
  name: string
}

export interface IActiveKanbanDealsFilter {
  deadline: IDateFilter
};

export interface IKanbanDealsFilter {
  dateFilter:IDateFilter[]
};

const initialState: IFiltersState = {
  filterModels: {},
  filterData: {},
  kanbanDealsFilter: {
    dateFilter: [
      {
        ID: 1,
        name: 'Только активные'
      },
      {
        ID: 2,
        name: 'Срок сегодня'
      },
      {
        ID: 3,
        name: 'Срок завтра'
      },
      {
        ID: 4,
        name: 'Срок просрочен'
      },
      {
        ID: 5,
        name: 'Без срока'
      },
      {
        ID: 6,
        name: 'Все сделки'
      },
    ]
  },
  activeKanbanDealsFilter: {
    deadline: {
      ID: 6,
      name: 'Все сделки'
    }
  }
};

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    saveFilterData: (state, action: PayloadAction<{ [key: string]: IFilteringData }>) => {
      return { ...state, filterData: { ...state.filterData, ...action.payload } };
    },
    saveFilterModel: (state, action: PayloadAction<{ [key: string]: GridFilterModel | undefined }>) => {
      return { ...state, filterModels: { ...state.filterModels, ...action.payload } };
    },
    clearFilterData: (state) => {
      return { ...state, filterData: {} };
    },
    setActiveKanbanDealsFilter: (state, action: PayloadAction<IActiveKanbanDealsFilter>) => {
      return { ...state, activeKanbanDealsFilter: { ...action.payload }}
    }
  }
});

export const {
  saveFilterData,
  saveFilterModel,
  clearFilterData,
  setActiveKanbanDealsFilter
} = filtersSlice.actions;

export default filtersSlice.reducer;
