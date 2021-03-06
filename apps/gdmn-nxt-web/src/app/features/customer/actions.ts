import { IContactWithID, IContactWithLabels, ICustomer } from "@gsbelarus/util-api-types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import customerAPI from "./customerApi";

export interface ValidationErrors {
  errorMessage: string
  field_errors?: Record<string, string>
};

export const fetchCustomers = createAsyncThunk<
ICustomer[] | ValidationErrors,
  {[optionName: string]: any} | void,
  {rejectValue:ValidationErrors}
>(
  "customers/fetchCustomers",
  async (options, { rejectWithValue}) => {
    try {
      const response = await customerAPI.customers.list(options);

      return response;

    } catch (error: any) {
      const err: AxiosError<ValidationErrors> = error;
      // if (!err.response){
      //   throw error;
      // }

      return rejectWithValue(error);
    }
  }
);

export const fetchCustomersByRootID = createAsyncThunk<
ICustomer[] | ValidationErrors,
  string,
  {rejectValue:ValidationErrors}
>(
  "customers/fetchCustomersByTaxID",
  async (rootID, { rejectWithValue}) => {
    try {
      const response = await customerAPI.customers.listByRootID(rootID);

      return response;

    } catch (error: any) {
      const err: AxiosError<ValidationErrors> = error;
      // if (!err.response){
      //   throw error;
      // }

      return rejectWithValue(error);
    }
  }
);


export const updateCustomer = createAsyncThunk<
  any,
  ICustomer,
  {
    rejectValue: ValidationErrors
    //fulfilledMeta: IContactWithID
  }
  >(
  "customers/updateCustomers",
  async (customerData: ICustomer, { fulfillWithValue, rejectWithValue }) => {
    try {
      const response = await customerAPI.customers.update(customerData);

      return response;

    } catch (error: any) {
      const err: AxiosError<ValidationErrors> = error;
      // if (!err.response){
      //   throw error;
      // }

      return rejectWithValue(error);
    }

    //return response.data.customer;

    // normalize the data so reducers can responded to a predictable payload, in this case: `action.payload = { users: {}, articles: {}, comments: {} }`
    //const normalized = normalize(data, articleEntity);
    //return normalized.entities;
  }
);

export const addCustomer = createAsyncThunk(
  "customers/addCustomer",
  async (newCustomer: ICustomer, { fulfillWithValue, rejectWithValue }) => {
    try {
      const response = await customerAPI.customers.add(newCustomer);

      return (response);

    } catch (error: any) {
      console.log('addCustomer', error.errorMessage);
      return rejectWithValue(error);

    };
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/deleteCustomer",
  async (id: number, { fulfillWithValue, rejectWithValue} ) => {
    try {
      const response = await customerAPI.customers.delete(id);

      return fulfillWithValue(response);

    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);


export const fetchHierarchy = createAsyncThunk<
ICustomer[] | ValidationErrors,
  void,
  {rejectValue:ValidationErrors}
>(
  "customers/fetchHierarchy",
  async (_, { rejectWithValue}) => {
    try {
      const response = await customerAPI.customers.hierarchy();

      return response;

    } catch (error: any) {
      const err: AxiosError<ValidationErrors> = error;

      return rejectWithValue(error);
    }
  }
);
