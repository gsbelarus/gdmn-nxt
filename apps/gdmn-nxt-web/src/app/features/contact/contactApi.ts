import { IBaseContact, IRequestResult, IWithID, IContactWithID, IContactPerson, IEmployee, IQueryOptions, IFavoriteContact } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseUrlApi } from '../../const';

export interface IContacts {
  contacts: (IBaseContact & IWithID)[];
};

export type IContactRequestResult = IRequestResult<IContacts>;

export interface IPersons {
  persons: IContactPerson[];
  rowCount: number;
};

export type IContactPersonsRequestResult = IRequestResult<IPersons>;

export interface IEmployees {
  employees: IEmployee[];
};

export type IEmployeesRequestResult = IRequestResult<IEmployees>;

const cachedOptions: Partial<IQueryOptions>[] = [];

export const contactApi = createApi({
  reducerPath: 'contact',
  tagTypes: ['Persons'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getAllContacts: builder.query<IContactRequestResult, void>({
      query: () => 'contacts',
      providesTags: result => ['Persons']
    }),
    getContactByTaxId: builder.query<IContactRequestResult, { taxId: string }>({
      query: ({ taxId }) => `contacts/taxId/${taxId}`,
      providesTags: result => ['Persons']
    }),
    getContactPersons: builder.query<{ records: IContactPerson[], count: number }, Partial<IQueryOptions> | void>({
      query: (options) => {
        /** Сохраняем параметры запроса */
        const lastOptions: Partial<IQueryOptions> = { ...options };

        if (!cachedOptions.includes(lastOptions)) {
          cachedOptions.push(lastOptions);
        }

        const params: string[] = [];

        for (const [name, value] of Object.entries(options || {})) {
          switch (true) {
            case typeof value === 'object' && value !== null:
              for (const [subName, subKey] of Object.entries(value)) {
                const subParams = [];
                if (typeof subKey === 'object' && subKey !== null) {
                  for (const [subNameNested, subKeyNested] of Object.entries(subKey)) {
                    if (typeof subKeyNested === 'object' && subKeyNested !== null) {
                      subParams.push((subKeyNested as any).ID);
                    };
                    if (typeof subKeyNested === 'string') {
                      subParams.push(subKeyNested);
                    };
                  }
                } else {
                  subParams.push(subKey);
                };
                params.push(`${subName}=${subParams}`);
              };
              break;

            default:
              params.push(`${name}=${value}`);
              break;
          }
        };

        return {
          url: `contacts/persons${params.length > 0 ? `?${params.join('&')}` : ''}`,
          method: 'GET'
        };
      },
      transformResponse: (response: IContactPersonsRequestResult) => ({ records: response.queries?.persons || [], count: response.queries?.rowCount || 0 }),
      providesTags: (result, error) => {
        return (
          result
            ? [...result.records.map(({ ID }) => ({ type: 'Persons' as const, ID })), { type: 'Persons', id: 'LIST' }]
            : ['Persons']);
      }
    }),
    getContactPersonById: builder.query<IContactPerson[], number>({
      query: (personId) => `contacts/persons${personId}`
    }),
    addContactPerson: builder.mutation<IContactPerson, Partial<IContactWithID>>({
      query: (body) => {
        return {
          url: 'contacts/persons',
          method: 'POST',
          body
        };
      },
      transformResponse: (response: IContactPersonsRequestResult) => response.queries?.persons[0] || null,
      invalidatesTags: [{ type: 'Persons', id: 'LIST' }],
      async onQueryStarted({ ID, ...patch }, { dispatch, queryFulfilled }) {
        try {
          const { data: addedContact } = await queryFulfilled;
          cachedOptions.forEach(async opt => {
            const options = Object.keys(opt).length > 0 ? opt : undefined;
            dispatch(
              contactApi.util.updateQueryData('getContactPersons', options, (draft) => {
                const findIndex = draft?.records.findIndex(({ ID }) => ID === addedContact.ID);
                if (findIndex > 0) return;

                draft?.records.unshift(addedContact);
                if (draft.count) draft.count += 1;
              })
            );
          });
        } catch (error) {
          console.error(error);
        }
      },
    }),
    updateContactPerson: builder.mutation<IContactPerson, Partial<IContactWithID>>({
      query: (body) => ({
        url: `contacts/persons/${body.ID}`,
        method: 'PUT',
        body
      }),
      transformResponse: (response: IContactPersonsRequestResult) => response.queries.persons[0] || null,
      invalidatesTags: (result, error, arg) => {
        return result
          ? [{ type: 'Persons', id: arg.ID }, { type: 'Persons', id: 'LIST' }]
          : ['Persons'];
      },
      async onQueryStarted(newContact, { dispatch, queryFulfilled }) {
        cachedOptions?.forEach(async opt => {
          const options = Object.keys(opt).length > 0 ? opt : undefined;
          const patchResult = dispatch(
            contactApi.util.updateQueryData('getContactPersons', options, (draft) => {
              if (Array.isArray(draft?.records)) {
                const findIndex = draft.records?.findIndex(c => c.ID === newContact.ID);
                if (findIndex >= 0) {
                  draft.records[findIndex] = { ...draft.records[findIndex], ...newContact };
                }
              }
            })
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        });
      },
    }),
    deleteContactPerson: builder.mutation<IContactWithID, number>({
      query: (id) => ({
        url: `contacts/persons/${id}`,
        method: 'DELETE'
      }),
      transformResponse: (response: IContactPersonsRequestResult) => response.queries.persons[0] || null,
      invalidatesTags: (result, error, arg) =>
        result
          ? [{ type: 'Persons', id: 'LIST' }]
          : error
            ? [{ type: 'Persons', id: 'ERROR' }]
            : [{ type: 'Persons', id: 'LIST' }],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        cachedOptions?.forEach(async opt => {
          const options = Object.keys(opt).length > 0 ? opt : undefined;
          const deleteResult = dispatch(
            contactApi.util.updateQueryData('getContactPersons', options, (draft) => {
              if (Array.isArray(draft?.records)) {
                const findIndex = draft?.records.findIndex(d => d.ID === id);

                if (findIndex >= 0) {
                  draft?.records.splice(findIndex, 1);
                  if (draft.count) draft.count -= 1;
                }
              }
            })
          );
          try {
            await queryFulfilled;
          } catch (error) {
            deleteResult.undo();
          }
        });
      },
    }),
    getEmployees: builder.query<IEmployee[], number | void>({
      query: (id) => ({
        url: `contacts/employees${id ? `/${id}` : ''}`,
        method: 'GET'
      }),
      transformResponse: (response: IEmployeesRequestResult) => response.queries?.employees || [],
      onQueryStarted(id) {
        console.info('⏩ request', 'GET', `${baseUrlApi}contacts/employees${id ? `/${id}` : ''}`);
      },
    }),
    addFavorite: builder.mutation<IFavoriteContact, number>({
      query: (contactID) => ({
        url: `contacts/favorites/${contactID}`,
        method: 'POST'
      }),
      async onQueryStarted(contactID, { dispatch, queryFulfilled }) {
        cachedOptions?.forEach(async opt => {
          const options = Object.keys(opt).length > 0 ? opt : undefined;
          const patchResult = dispatch(
            contactApi.util.updateQueryData('getContactPersons', options, (draft) => {
              if (Array.isArray(draft?.records)) {
                const findIndex = draft?.records?.findIndex(c => c.ID === contactID);
                if (findIndex >= 0) {
                  draft.records[findIndex] = { ...draft.records[findIndex], isFavorite: true };
                }
              }
            })
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        });
      },
    }),
    deleteFavorite: builder.mutation<IFavoriteContact, number>({
      query: (contactID) => ({
        url: `contacts/favorites/${contactID}`,
        method: 'DELETE',
      }),
      async onQueryStarted(contactID, { dispatch, queryFulfilled }) {
        cachedOptions?.forEach(async opt => {
          const options = Object.keys(opt).length > 0 ? opt : undefined;
          const patchResult = dispatch(
            contactApi.util.updateQueryData('getContactPersons', options, (draft) => {
              if (Array.isArray(draft?.records)) {
                const findIndex = draft?.records?.findIndex(c => c.ID === contactID);
                if (findIndex >= 0) {
                  draft.records[findIndex] = { ...draft.records[findIndex], isFavorite: false };
                }
              }
            })
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        });
      },
    })
  }),
});

export const {
  useGetAllContactsQuery,
  useGetContactByTaxIdQuery,
  useGetContactPersonsQuery,
  useAddContactPersonMutation,
  useUpdateContactPersonMutation,
  useDeleteContactPersonMutation,
  useGetEmployeesQuery,
  useAddFavoriteMutation,
  useDeleteFavoriteMutation
} = contactApi;
