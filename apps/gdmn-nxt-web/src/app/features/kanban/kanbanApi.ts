import { IContactWithID, IKanbanCard, IKanbanColumn, IRequestResult } from "@gsbelarus/util-api-types";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/dist/query/react";
import { baseUrlApi } from '../../const';

interface IKanban{
  columns: IKanbanColumn[];
  cards: IKanbanCard[];
};

type IKanbanRequestResult = IRequestResult<IKanban>;

export const kanbanApi = createApi({
  reducerPath: 'kanban',
  tagTypes: ['Kanban', 'Column', 'Card'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getKanbanDeals: builder.query<IKanbanColumn[], void>({
      query() {
        return {
          url: `kanban/data/deals`,
          method: 'GET'
        }
      },
      async onQueryStarted(){console.log('⏩ request', "GET", `${baseUrlApi}kanban/data/deals`)},
      transformResponse: (response: IKanbanRequestResult) => response.queries?.columns || [],
      providesTags: (result, error) =>
        result
        ? [
            ...result.map(({ ID }) => ({ type: 'Column' as const, ID })),
            { type: 'Column', id: 'LIST' }
          ]
        : error
          ? [{ type: 'Column', id: 'ERROR' }]
          : [{ type: 'Column', id: 'LIST' }]

    }),
    updateColumn: builder.mutation<IKanbanColumn[], Partial<IKanbanColumn>>({
      query(body) {
        const { ID:id } = body;
        return {
          url: `kanban/columns/${id}`,
          method: 'PUT',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.columns || [],
      invalidatesTags: (result, error) => {
        return result
          ? [
              ...result.map(({ ID }) => ({ type: 'Column' as const, ID })),
              { type: 'Column', id: 'LIST' }
            ]
          : error
            ? [{ type: 'Column', id: 'ERROR' }]
            : [{ type: 'Column', id: 'LIST' }]
        }
    }),
    addColumn: builder.mutation<IKanbanColumn[], Partial<IKanbanColumn>>({
      query(body) {
        return {
          url: `kanban/columns`,
          method: 'POST',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.columns || [],
      invalidatesTags: (result, error) => {
        return result
          ? [{ type: 'Column', id: 'LIST' }]
          : error
            ? [{ type: 'Column', id: 'ERROR' }]
            : [{ type: 'Column', id: 'LIST' }]
        }
    }),
    deleteColumn: builder.mutation<{id: number}, number>({
      query(id) {
        return {
          url: `kanban/columns/${id}`,
          method: 'DELETE'
        }
      },
      invalidatesTags: (result, error) => {
        const id = result?.id;

        return result
          ? [
              { type: 'Column' as const, id: id },
              { type: 'Column', id: 'LIST' }
            ]
          : [{ type: 'Column', id: 'LIST' }]
        }
    }),
    reorderColumns: builder.mutation<IKanbanColumn[], IKanbanColumn[]>({
      query(body) {
        return {
          url: `kanban/reordercolumns`,
          method: 'PUT',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.columns || [],
      invalidatesTags: (result, error) =>
        result
          ? [
              ...result.map(({ ID }) => ({ type: 'Column' as const, ID })),
              { type: 'Column', id: 'LIST' }
            ]
          : error
            ? [{ type: 'Column', id: 'LIST' }]
            : [{ type: 'Column', id: 'ERROR' }]
    }),
    addCard: builder.mutation<IKanbanCard[], Partial<IKanbanCard>>({
      query(body) {
        return {
          url: `kanban/cards`,
          method: 'POST',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.cards || [],
      invalidatesTags: (result, error) => {
        return result
          ? [...result.map(({USR$MASTERKEY}) => ({ type: 'Column' as const, USR$MASTERKEY }))]
          : error
            ? [{ type: 'Column', id: 'ERROR' }]
            : [{ type: 'Column', id: 'LIST' }]
        }
    }),
    updateCard: builder.mutation<IKanbanCard[], Partial<IKanbanCard>>({
      query(body) {
        const { ID: id } = body;
        return {
          url: `kanban/cards/${id}`,
          method: 'PUT',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.cards || [],
      invalidatesTags: (result, error) => {
        return result
          ? [
              ...result.map(({USR$MASTERKEY}) => ({ type: 'Column' as const, USR$MASTERKEY })),
              { type: 'Column', id: 'LIST' }
            ]
          : error
            ? [{ type: 'Column', id: 'ERROR' }]
            : [{ type: 'Column', id: 'LIST' }]
        }
    }),
    deleteCard: builder.mutation<{ID: number, USR$MASTERKEY: number}, number>({
      query(id) {
        return {
          url: `kanban/cards/${id}`,
          method: 'DELETE'
        }
      },
      invalidatesTags: (result, error) => {
        const USR$MASTERKEY = result?.USR$MASTERKEY;

        return result
          ? [
              { type: 'Column' as const, id: USR$MASTERKEY },
              { type: 'Column', id: 'LIST' }
            ]
          : error
            ? [{ type: 'Column', id: 'LIST' }]
            : [{ type: 'Column', id: 'ERROR' }]
        }
    }),
    reorderCards: builder.mutation<IKanbanCard[], IKanbanCard[]>({
      query(body) {
        return {
          url: `kanban/reordercards`,
          method: 'PUT',
          body: body
        }
      },
      transformResponse: (response: IKanbanRequestResult) => response.queries?.cards || [],
      invalidatesTags: (result, error) => {
        console.log('invalidatesTags', result);
        return result
          ? [
              ...result.map(({ USR$MASTERKEY }) => ({ type: 'Column' as const, USR$MASTERKEY  })),
              { type: 'Column', id: 'LIST' }
            ]
          : error
            ? [{ type: 'Column', id: 'LIST' }]
            : [{ type: 'Column', id: 'ERROR' }]
          }
    }),


  })
});

export const {
  useGetKanbanDealsQuery,
  useUpdateColumnMutation,
  useAddColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
  useAddCardMutation,
  useUpdateCardMutation,
  useDeleteCardMutation,
  useReorderCardsMutation
} = kanbanApi;