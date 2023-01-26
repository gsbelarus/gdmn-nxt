
import { IRequestResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { baseUrlApi } from '../../const';

interface IFaqs{
  faqs: fullFaq[];
};

export interface faq {
  USR$QUESTION: string,
  USR$ANSWER: string
}

export interface fullFaq {
  USR$QUESTION: string,
  USR$ANSWER: string,
  ID: number
}

type FaqResponse = fullFaq[];
type IFaqRequestResult = IRequestResult<IFaqs>

export const faqApi = createApi({
  reducerPath: 'faq',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  tagTypes: ['faq'],
  endpoints: (builder) => ({
    getAllfaqs: builder.query<FaqResponse, void>({
      query: () => 'faq',
      transformResponse: (response: IFaqRequestResult) => response.queries?.faqs || [],
      providesTags: result => ['faq']
    }),
    addfaq: builder.mutation<faq[], faq>({
      query: (body) => ({
        url: 'faq',
        method: 'POST',
        body
      }),
      invalidatesTags: ['faq']
    }),
    editFaq: builder.mutation<faq[], [faq, number]>({
      query: ([body, id]) => ({
        url: `faq/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['faq']
    }),
    deleteFaq: builder.mutation<faq[], number>({
      query: (id) => ({
        url: `faq/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['faq']
    })
  })
});

export const {
  useGetAllfaqsQuery,
  useAddfaqMutation,
  useEditFaqMutation,
  useDeleteFaqMutation
} = faqApi;
