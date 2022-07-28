import { ICustomer, IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { url } from 'inspector';
import { baseUrlApi } from '../../const';

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
};

interface ICustomers {
  contacts: ICustomer[];
};

type ICustomersRequestResult = IRequestResult<ICustomers>;
type ICustomerRequestResult = IRequestResult<{ contact: ICustomer }>;

export const customerApi = createApi({
  reducerPath: 'customer',
  tagTypes: ['Customers'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getCustomers: builder.query<ICustomer[], Partial<IQueryOptions> | void>({
      // query: (options) => 'contacts',
      query(options) {
        console.log('options', options);
        const params = [];

        for (const [name, value] of Object.entries(options || {})) {
          console.log(name, value);
          switch (true) {
            case typeof value === 'object' && value !== null:
              for (const [subName, subKey] of Object.entries(value)) {
                params.push(`${subName}=${subKey}`);
              };
              break;

            default:
              params.push(`${name}=${value}`);
              break;
          }
        };

        console.log('params', params);
        return {
          url: `contacts?${params.join('&')}`,
          method: 'GET',
        }
      },
      onQueryStarted() {
        console.info('⏩ request', 'GET', `${baseUrlApi}contacts`);
      },
      transformResponse: (response: ICustomersRequestResult) => response.queries?.contacts || [],
      providesTags: (result, error) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'Customers' as const, ID })),
            { type: 'Customers', id: 'LIST' },
          ]
          : error
            ? [{ type: 'Customers', id: 'ERROR' }]
            : [{ type: 'Customers', id: 'LIST' }]
    }),
    updateCustomer: builder.mutation<ICustomer, Partial<ICustomer>>({
      query(body) {
        const { ID: id } = body;
        return {
          url: `contacts/${id}`,
          method: 'PUT',
          body
        };
      },
      transformResponse: (response: ICustomerRequestResult) => response.queries?.contact,
      invalidatesTags: (result, error) =>
        result
          ? [{ type: 'Customers', id: result?.ID }, { type: 'Customers', id: 'LIST' }]
          : error
              ? [{ type: 'Customers', id: 'ERROR' }]
              : [{ type: 'Customers', id: 'LIST' }],
      onQueryStarted() {
        console.info('⏩ request', 'PUT', `${baseUrlApi}contacts`);
      },

    }),
    addCustomer: builder.mutation<ICustomersRequestResult, Partial<ICustomer>>({
      query: (body) => ({
        url: 'contacts',
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error) =>
        result
          ? [
            ...result.queries.contacts.map(({ ID }) => ({ type: 'Customers' as const, ID })),
            { type: 'Customers', id: 'LIST' },
          ]
          : error
            ? [{ type: 'Customers', id: 'ERROR' }]
            : [{ type: 'Customers', id: 'LIST' }]

    }),
    deleteCustomer: builder.mutation<{id: number}, number>({
      query: (id) => ({
        url: `contacts/${id}`,
        method: 'DELETE'
      }),
      onQueryStarted(id) {
        console.log('⏩ request', 'DELETE', `${baseUrlApi}constacts/${id}`);
      },
      invalidatesTags: (result, error, arg) => {
        console.log('result', result);
        console.log('arg', arg);

        return [{ type: 'Customers', id: 'LIST' }];
      }
    })
  }),
});

export const {
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useAddCustomerMutation,
  useDeleteCustomerMutation
} = customerApi;
