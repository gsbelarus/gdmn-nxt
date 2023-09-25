
import { IAuthResult } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseUrlApi } from '../../const';

export const authApi = createApi({
  reducerPath: 'auth',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    generateOtpQR: builder.mutation<{ qr: string; base32: string }, { userId: number, email: string }>({
      query: (body) => ({
        url: 'user/otp/generate',
        method: 'POST',
        body
      }),
    }),
    verifyOtp: builder.mutation<IAuthResult, { userId: number, code: string }>({
      query: (body) => ({
        url: 'user/otp/verify',
        method: 'POST',
        body
      }),
    }),
    disableOtp: builder.mutation<IAuthResult, { userId: number, code: string }>({
      query: (body) => ({
        url: 'user/otp/disable',
        method: 'POST',
        body
      }),
    }),
  })
});

export const {
  useGenerateOtpQRMutation,
  useVerifyOtpMutation,
  useDisableOtpMutation
} = authApi;
