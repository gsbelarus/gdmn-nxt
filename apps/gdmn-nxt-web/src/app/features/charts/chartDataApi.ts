import { IChartSumByperiod, IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { baseUrlApi } from '../../const';

interface IChartData{
  sumByperiod: IChartSumByperiod[];
};

type IChartDataRequestResult = IRequestResult<IChartData>;

export interface IChartFilter {
  [key: string]: any
};

export const chartDataApi = createApi({
  reducerPath: 'chartData',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getSumByPeriod: builder.query<IChartSumByperiod[], IChartFilter>({
      query: (options) => {
        const params = [];

        for (const [name, value] of Object.entries(options)) {
          params.push(`${name}=${Array.isArray(value) ? value.join(',') : value}`);
        };

        return ({
          url: `${baseUrlApi}charts/sumbyperiod?${params.join('&')}`,
          method: 'GET',
        });
      },
      onQueryStarted(options) {
        const params = [];

        for (const [name, value] of Object.entries(options)) {
          params.push(`${name}=${value}`);
        };

        console.info('⏩ request', 'GET', `${baseUrlApi}charts/sumbyperiod?${params.join('&')}`);
      },
      transformResponse: (response: IChartDataRequestResult) => response.queries?.sumByperiod.map(el => ({ ...el, ONDATE: new Date(el.ONDATE) })) || [],
    })
  })
});

export const { useGetSumByPeriodQuery } = chartDataApi;
