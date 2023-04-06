import { IKanbanCard, IKanbanColumn, IKanbanTask } from '@gsbelarus/util-api-types';
export interface InterServerEvents {
  ping: () => void;
  joinToRoom: (roomName: string) => void;
}
export interface ServerToClientEvents extends InterServerEvents, KanbanEvents {
  messages: (data: IMessage[]) => void;
  messagesByUser_response: (data: IMessage[]) => void;
  sendMessageToUsers_response: (status: number, statusText: string) => void;
}

export interface ClientToServerEvents extends InterServerEvents, KanbanEvents {
  delete: (notificationId: number) => void;
  messagesByUser_request: (userId: number) => void;
  sendMessageToUsers_request: (message: string, userIDs: number[]) => void;
}

export interface IMessage {
  id: number;
  date: Date;
  title: string;
  text: string;
};

export interface IUser {
  userId: number;
  socketId: string;
};

export interface INotification {
  id: number;
  date: Date;
  userId?: number;
  title: string;
  message: string;
}

export enum SocketRoom {
  KanbanBoard = 'KanbanBoard',
}

export enum KanbanEvent {
  AddColumn     = 'add_column',
  UpdateColumn  = 'update_column',
  DeleteColumn  = 'delete_column',
  AddCard       = 'add_card',
  UpdateCard    = 'update_card',
  DeleteCard    = 'delete_card',
  ReorderCards  = 'reorder_card',
  AddTask       = 'add_task',
  UpdateTask    = 'update_task',
  DeleteTask    = 'delete_task',
}

interface KanbanEvents {
  [KanbanEvent.AddColumn]: (column: IKanbanColumn) => void;
  [KanbanEvent.UpdateColumn]: (column: IKanbanColumn) => void;
  [KanbanEvent.DeleteColumn]: (id: number) => void;
  [KanbanEvent.AddCard]: (columnId: number, card: IKanbanCard) => void;
  [KanbanEvent.UpdateCard]: (columnId: number, card: Partial<IKanbanCard>) => void;
  [KanbanEvent.DeleteCard]: (columnId: number, id: number) => void;
  [KanbanEvent.ReorderCards]: (columnId: number, cards: IKanbanCard[]) => void;
  [KanbanEvent.AddTask]: (cardId: number, task: IKanbanTask) => void;
  [KanbanEvent.UpdateTask]: (cardId: number, task: Partial<IKanbanTask>) => void;
  [KanbanEvent.DeleteTask]: (id: number) => void;
}
