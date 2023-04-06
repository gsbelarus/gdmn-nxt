import { ServerToClientEvents, ClientToServerEvents, KanbanEvent, SocketRoom } from "@gdmn-nxt/socket";
import { Server } from "socket.io";
import { config } from '@gdmn-nxt/config';


export function StreamingUpdate() {
  const socketIO = new Server<
      ClientToServerEvents,
      ServerToClientEvents
    >({
      cors: {
        credentials: true,
        origin: `http://${config.host}:${config.appPort}`
      }
    });

  socketIO.listen(config.streamingUpdatePort);

  socketIO.on('connection', (socket) => {
    console.log(`⚡ Streaming update: ${socket.id} user just connected!`);

    socket.on('joinToRoom', (roomName) => {
      socket.join(roomName);
    });

    socket.on(KanbanEvent.AddColumn, (column) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.AddColumn, column);
    });

    socket.on(KanbanEvent.UpdateColumn, (column) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.UpdateColumn, column);
    });

    socket.on(KanbanEvent.DeleteColumn, (id) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.DeleteColumn, id);
    });

    socket.on(KanbanEvent.AddCard, (columnId, card) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.AddCard, columnId, card);
    });

    socket.on(KanbanEvent.UpdateCard, (columnId, card) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.UpdateCard, columnId, card);
    });

    socket.on(KanbanEvent.DeleteCard, (columnId, cardId) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.DeleteCard, columnId, cardId);
    });

    socket.on(KanbanEvent.ReorderCards, (columnId, cards) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.ReorderCards, columnId, cards);
    });

    socket.on(KanbanEvent.AddTask, (cartId, task) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.AddTask, cartId, task);
    });

    socket.on(KanbanEvent.UpdateTask, (cartId, task) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.UpdateTask, cartId, task);
    });

    socket.on(KanbanEvent.DeleteTask, (taskId) => {
      socketIO.to(SocketRoom.KanbanBoard).emit(KanbanEvent.DeleteTask, taskId);
    });

  });
};
