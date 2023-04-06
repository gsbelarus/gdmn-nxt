import { ICustomer, ICustomerCross, IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { url } from 'inspector';
import { baseUrlApi } from '../../const';

export interface ISortingData {
  field: string;
  sort: 'asc' | 'desc' | null | undefined;
};

export interface IPaginationData {
  pageNo: number;
  pageSize: number;
};

interface IFilteringData {
  [name: string] : any[];
}
export interface IQueryOptions {
  pagination?: IPaginationData;
  filter?: IFilteringData;
  sort?: ISortingData;
};

interface ICustomers {
  contacts: ICustomer[];
};

type ICustomersRequestResult = IRequestResult<ICustomers>;
type ICustomersWithCountRequestResult = IRequestResult<{contacts: ICustomer[], rowCount: any}>;
type ICustomerRequestResult = IRequestResult<{ contact: ICustomer }>;
type ICustomersCrossRequestResult = IRequestResult<{ cross: ICustomerCross[] }>;

let lastOptions: Partial<IQueryOptions>;

export const customerApi = createApi({
  reducerPath: 'customer',
  tagTypes: ['Customers'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getCustomer: builder.query<ICustomer, { customerId: number }>({
      query({ customerId }) {
        return {
          url: `contacts/customerId/${customerId}`,
          method: 'GET'
        };
      },
      transformResponse: (response: ICustomersRequestResult) => response.queries.contacts[0]
    }),
    getCustomers: builder.query<{data: ICustomer[], count?: number}, Partial<IQueryOptions> | void>({
      query(options) {
        const params: string[] = [];

        if (options) lastOptions = options;

        // console.log('options', options);

        for (const [name, value] of Object.entries(options || {})) {
          switch (true) {
            case typeof value === 'object' && value !== null:
              for (const [subName, subKey] of Object.entries(value)) {
                const subParams = [];
                if (typeof subKey === 'object' && subKey !== null) {
                  for (const [subName_l2, subKey_l2] of Object.entries(subKey)) {
                    if (typeof subKey_l2 === 'object' && subKey_l2 !== null) {
                      subParams.push((subKey_l2 as any).ID);
                    };
                    if (typeof subKey_l2 === 'string') {
                      subParams.push(subKey_l2);
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

        // console.log('params', params);
        return {
          url: `contacts?${params.join('&')}`,
          method: 'GET',
        };
      },
      onQueryStarted() {
        console.info('⏩ request', 'GET', `${baseUrlApi}contacts`);
      },
      transformResponse: (response: ICustomersWithCountRequestResult) => ({ data: response.queries?.contacts || [], count: response.queries?.rowCount[0].COUNT || -1 }),
      providesTags: (result, error) =>
        result?.data
          ? [
            ...result?.data.map(({ ID }) => ({ type: 'Customers' as const, ID })),
            { type: 'Customers', id: 'LIST' },
          ]
          : error
            ? [{ type: 'Customers', id: 'ERROR' }]
            : [{ type: 'Customers', id: 'LIST' }]
    }),
    updateCustomer: builder.mutation<ICustomer, Partial<ICustomer> & Pick<ICustomer, 'ID' | 'NAME'>>({
      query(body) {
        const { ID: id } = body;
        return {
          url: `contacts/${id}`,
          method: 'PUT',
          body
        };
      },
      transformResponse: (response: ICustomerRequestResult) => response.queries?.contact,
      // invalidatesTags: (result, error) =>
      //   result
      //     ? [{ type: 'Customers', id: result?.ID }, { type: 'Customers', id: 'LIST' }]
      //     : error
      //       ? [{ type: 'Customers', id: 'ERROR' }]
      //       : [{ type: 'Customers', id: 'LIST' }],
      async onQueryStarted(newCustomer, { dispatch, queryFulfilled }) {
        console.info('⏩ request', 'PUT', `${baseUrlApi}contacts`);
        const patchResult = dispatch(
          customerApi.util.updateQueryData('getCustomers', lastOptions, (draft) => {
            if (Array.isArray(draft.data)) {
              const findIndex = draft.data?.findIndex(c => c.ID = newCustomer.ID);
              if (findIndex >= 0) {
                draft.data[findIndex] = {...draft.data[findIndex], ...newCustomer};
              }
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    addCustomer: builder.mutation<ICustomer, Partial<ICustomer>>({
      query: (body) => ({
        url: 'contacts',
        method: 'POST',
        body
      }),
      transformResponse: (response: ICustomerRequestResult) => response.queries?.contact,
      async onQueryStarted({ ID, ...patch }, { dispatch, queryFulfilled, extra }) {
        console.log('⏩ request', 'POST', `${baseUrlApi}constacts`);
        const { data: addedCustomer } = await queryFulfilled;

        const patchResult = dispatch(
          customerApi.util.updateQueryData('getCustomers', lastOptions, (draft) => {
            if (Array.isArray(draft.data)) {
              draft.data.unshift(addedCustomer);
              if (draft.count) draft.count += 1;
            }
          })
        );
      },
      invalidatesTags: (result, error) =>
        result
          ? [{ type: 'Customers', id: 'LIST' }]
          : error
            ? [{ type: 'Customers', id: 'ERROR' }]
            : [{ type: 'Customers', id: 'LIST' }]
    }),
    deleteCustomer: builder.mutation<{id: number}, number>({
      query: (id) => ({
        url: `contacts/${id}`,
        method: 'DELETE'
      }),
      async onQueryStarted(id, {dispatch, queryFulfilled}) {
        console.log('⏩ request', 'DELETE', `${baseUrlApi}constacts/${id}`);

        const deleteResult = dispatch(
          customerApi.util.updateQueryData('getCustomers', lastOptions, (draft) => {
            if (Array.isArray(draft.data)) {
              const findIndex = draft.data.findIndex(d => d.ID === id);

              if (findIndex >=0 ) {
                draft.data.splice(findIndex, 1);
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
      },
      // invalidatesTags: (result, error, arg) => {
      //   return [{ type: 'Customers', id: result?.id }, { type: 'Customers', id: 'LIST' }];
      // }
    }),
    getCustomersCross: builder.query<ICustomerCross, void>({
      query() {
        return {
          url: 'contacts/customerscross',
          method: 'GET'
        };
      },
      transformResponse: (response: ICustomersCrossRequestResult) => response.queries.cross[0] || [],
    })
  }),
});

export const {
  useGetCustomerQuery,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useAddCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomersCrossQuery
} = customerApi;
