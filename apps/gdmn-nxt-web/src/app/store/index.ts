import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/dist/query';
import { accountApi } from '../features/account/accountApi';
import { contactApi } from '../features/contact/contactApi';
import { reconciliationStatementApi } from '../features/reconciliation-statement/reconciliationStatementApi';
import userReducer from '../features/user/userSlice';
import nlpReducer from '../features/nlp/nlpSlice';
import { customersReducer, hierarchyReducer } from '../features/customer/customerSlice';
import { contactGroupApi } from '../features/contact/contactGroupApi';
import { errorMiddleware } from '../features/error-slice/errorMiddleware';
import errorReducer from '../features/error-slice/error-slice';
import settingsReducer from './settingsSlice';
import viewFormsReducer from '../features/view-forms-slice/viewFormsSlice';
import { erModelApi } from '../features/er-model/erModelApi';
import { departmentsApi } from '../features/departments/departmentsApi';
import { customerContractsApi } from '../features/customer-contracts/customerContractsApi';
import { kanbanApi } from '../features/kanban/kanbanApi';
import { actCompletionApi } from '../features/act-completion/actCompletionApi';
import { bankStatementApi } from '../features/bank-statement/bankStatementApi';
import { chartDataApi } from '../features/charts/chartDataApi';
import { nlpQueryApi } from '../features/nlp/nlpApi';
import { sqlEditorApi } from '../features/sql-editor/sqlEditorApi';
import { customerApi } from '../features/customer/customerApi_new';
import filtersReducer from './filtersSlice';
import { contractsListApi } from '../features/contracts-list/contractsListApi';
import { remainsInvoicesApi } from '../features/remains-by-invoices/remainsInvoicesApi';
import { workTypesApi } from '../features/work-types/workTypesApi';
import { labelsApi } from '../features/labels';


export const store = configureStore({
  reducer: {
    viewForms: viewFormsReducer,
    settings: settingsReducer,
    filtersStorage: filtersReducer,
    error: errorReducer,
    user: userReducer,
    nlp: nlpReducer,
    customers: customersReducer,
    customersHierarchy: hierarchyReducer,
    [contactApi.reducerPath]: contactApi.reducer,
    [accountApi.reducerPath]: accountApi.reducer,
    [labelsApi.reducerPath]: labelsApi.reducer,
    [contactGroupApi.reducerPath]: contactGroupApi.reducer,
    [reconciliationStatementApi.reducerPath]: reconciliationStatementApi.reducer,
    [erModelApi.reducerPath]: erModelApi.reducer,
    [departmentsApi.reducerPath]: departmentsApi.reducer,
    [customerContractsApi.reducerPath]: customerContractsApi.reducer,
    [kanbanApi.reducerPath]: kanbanApi.reducer,
    [actCompletionApi.reducerPath]: actCompletionApi.reducer,
    [bankStatementApi.reducerPath]: bankStatementApi.reducer,
    [chartDataApi.reducerPath]: chartDataApi.reducer,
    [nlpQueryApi.reducerPath]: nlpQueryApi.reducer,
    [sqlEditorApi.reducerPath]: sqlEditorApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [contractsListApi.reducerPath]: contractsListApi.reducer,
    [remainsInvoicesApi.reducerPath]: remainsInvoicesApi.reducer,
    [workTypesApi.reducerPath]: workTypesApi.reducer,
    [labelsApi.reducerPath]: labelsApi.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
    .concat(contactApi.middleware)
    .concat(accountApi.middleware)
    .concat(labelsApi.middleware)
    .concat(contactGroupApi.middleware)
    .concat(reconciliationStatementApi.middleware)
    .concat(erModelApi.middleware)
    .concat(departmentsApi.middleware)
    .concat(customerContractsApi.middleware)
    .concat(kanbanApi.middleware)
    .concat(actCompletionApi.middleware)
    .concat(bankStatementApi.middleware)
    .concat(chartDataApi.middleware)
    .concat(nlpQueryApi.middleware)
    .concat(sqlEditorApi.middleware)
    .concat(customerApi.middleware)
    .concat(contractsListApi.middleware)
    .concat(remainsInvoicesApi.middleware)
    .concat(workTypesApi.middleware)
    .concat(labelsApi.middleware)
    .concat(errorMiddleware),
});

setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
