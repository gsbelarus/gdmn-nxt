import { IUserProfile } from '@gsbelarus/util-api-types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { baseUrl, baseUrlApi } from '../../const';

export const logoutUser = createAsyncThunk(
  'user/logout',
  () => axios({ method: 'get', url: 'logout', baseURL: baseUrlApi, withCredentials: true })
);

export type LoginStage =
  'LAUNCHING'                  // the application is launching
  | 'QUERY_LOGIN'              // we are in the process of querying server for saved session
  | 'SELECT_MODE'              // choose between belgiss employee and customer mode
  | 'OTHER_LOADINGS'           // processes after getting the user id, but before rendering the app
  | 'CUSTOMER'                 //
  | 'EMPLOYEE'                 //
  | 'SIGN_IN_EMPLOYEE'         // show sign-in or sign-up screen for an employee
  | 'SIGN_IN_CUSTOMER'         // show sign-in or sign-up screen for a customer
  | 'CREATE_CUSTOMER_ACCOUNT'
  | 'CREATE_2FA'
  | 'SET_EMAIL'
  | 'SIGN_IN_2FA';

export interface UserState {
  loginStage: LoginStage;
  userType?: 'CUSTOMER' | 'EMPLOYEE';
  userProfile?: IUserProfile;
  gedeminUser?: boolean;
};

const initialState: UserState = {
  loginStage: 'LAUNCHING',
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    queryLogin: () => ({ loginStage: 'QUERY_LOGIN' } as UserState),
    selectMode: () => ({ loginStage: 'SELECT_MODE' } as UserState),
    signInEmployee: () => ({ loginStage: 'SIGN_IN_EMPLOYEE' } as UserState),
    signInCustomer: () => ({ loginStage: 'SIGN_IN_CUSTOMER' } as UserState),
    createCustomerAccount: () => ({ loginStage: 'CREATE_CUSTOMER_ACCOUNT' } as UserState),
    signedInEmployee: (_, action: PayloadAction<IUserProfile>) => ({ loginStage: 'OTHER_LOADINGS', userType: 'EMPLOYEE', userProfile: action.payload, gedeminUser: true } as UserState),
    signedInCustomer: (_, action: PayloadAction<IUserProfile>) => ({ loginStage: 'OTHER_LOADINGS', userType: 'CUSTOMER', userProfile: action.payload } as UserState),
    signIn2fa: () => ({ loginStage: 'SIGN_IN_2FA' } as UserState),
    create2fa: (_, action: PayloadAction<IUserProfile>) => ({ loginStage: 'CREATE_2FA', userProfile: { ...action.payload } } as UserState),
    setEmail: (_, action: PayloadAction<IUserProfile>) => ({ loginStage: 'SET_EMAIL', userProfile: { ...action.payload } } as UserState),
    renderApp: (state) => {
      state.loginStage = state.userType || 'CUSTOMER'
    }
  },
  extraReducers: (builder) => {
    builder.addCase(logoutUser.fulfilled, () => ({ loginStage: 'SELECT_MODE' }));
  },
});

// Action creators are generated for each case reducer function
export const {
  queryLogin,
  selectMode,
  signInEmployee,
  signInCustomer,
  signedInEmployee,
  signedInCustomer,
  createCustomerAccount,
  renderApp,
  create2fa,
  setEmail,
  signIn2fa
} = userSlice.actions;

export default userSlice.reducer;
