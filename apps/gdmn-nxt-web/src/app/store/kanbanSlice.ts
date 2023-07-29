import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IKanbanState {
  cardIdForOpen: number
};

const initialState: IKanbanState = {
  cardIdForOpen: -1
};

export const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    setCardIdForOpen: (state, action: PayloadAction<number>) => {
      return { ...state, cardIdForOpen: action.payload };
    }
  }
});

export const {
  setCardIdForOpen
} = kanbanSlice.actions;

export default kanbanSlice.reducer;
