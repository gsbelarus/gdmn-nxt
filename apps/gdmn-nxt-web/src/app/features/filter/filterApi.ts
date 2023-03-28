
import { IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseUrlApi } from '../../const';

export interface IDeadlineFilter {
  deadlines: Deadline[]
};

export interface Deadline {
  FILTERCODE: number,
  NAME: string
}

type DeadlineResponse = Deadline[];

type IDeadlineRequestResult = IRequestResult<IDeadlineFilter>

export const filterApi = createApi({
  reducerPath: 'filters',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  tagTypes: ['deadline'],
  endpoints: (builder) => ({
    getDeadlineFilter: builder.query<DeadlineResponse, void>({
      query: () => 'filters/deadline',
      transformResponse: (response: IDeadlineRequestResult) => response.queries?.deadlines || [],
      providesTags: result => ['deadline']
    }),
  })
});

export const {
  useGetDeadlineFilterQuery,
} = filterApi
