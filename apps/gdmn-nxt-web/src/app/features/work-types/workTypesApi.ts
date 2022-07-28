import { IWorkType, IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { baseUrlApi } from '../../const';

interface IWorkTypes{
  workTypes: IWorkType[];
};

type IWorkTypesRequestResult = IRequestResult<IWorkTypes>;

export const workTypesApi = createApi({
  reducerPath: 'workTypes',
  tagTypes: ['workType'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getWorkTypes: builder.query<IWorkType[], { id?: number, contractJob?: number[] } >({
      query: ({ id, contractJob }) => {
        let urlString = '';
        if (Array.isArray(contractJob) && contractJob.length > 0) {
          urlString = `/contractJobKey/${contractJob.join()}`;
        };

        if (id) {
          urlString = `/${id}`;
        };

        return {
          url: `worktypes${urlString}`,
          method: 'GET',
        };
      },
      transformResponse: (response: IWorkTypesRequestResult) => response.queries?.workTypes || [],
      providesTags: (result, error) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'workType' as const, ID })),
            { type: 'workType', id: 'LIST' },
          ]
          : error
            ? [{ type: 'workType', id: 'ERROR' }]
            : [{ type: 'workType', id: 'LIST' }]
    }),
  })
});

export const { useGetWorkTypesQuery } = workTypesApi;
