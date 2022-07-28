import { StrictMode, useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom';

import { RootState, store } from './app/store';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// rename mui-license.ts.sample -> mui-license.ts
// put in bought license key
import { registerMUI } from './mui-license';
import { Theme, ThemeProvider } from '@mui/material/styles';
import { theme } from './app/theme';
import { LoginStage } from './app/features/user/userSlice';
import { MainLayout } from './app/layouts/MainLayout';
import { ReconciliationAct } from './app/pages/Analytics/UserReports/ReconciliationAct';
import { CustomersList } from './app/pages/Customers/customers-list/customers-list';
import { Dashboard } from './app/pages/Dashboard/dashboard/dashboard';
import { OrderList } from './app/pages/Customers/order-list/order-list';
import { ErModel } from './app/er-model/er-model';
import App from './app/app';
import CustomerHomePage from './app/customer-home-page/customer-home-page';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { CssBaseline } from '@mui/material';
import StandardOrder from './app/standard-order/standard-order';
import ReconciliationStatement from './app/reconciliation-statement/reconciliation-statement';
import Deals from './app/pages/Dashboard/deals/deals';
import SalesFunnel from './app/pages/Analytics/sales-funnel/sales-funnel';
import { ErModelDomains } from './app/er-model-domains/er-model-domains';
import BaseForm from './app/base-form/base-form';
import CustomerDetails from './app/pages/Customers/customer-details/customer-details';
import { NlpMain } from './app/nlp-main/nlp-main';
import { SqlEditor } from './app/components/System/sql-editor/sql-editor';
import CustomersMap from './app/customers/customers-map/customers-map';
import RemainsByInvoices from './app/pages/Analytics/UserReports/remains-by-invoices/remains-by-invoices';
import Labels from './app/pages/Managment/Lables';

registerMUI();

const Main = () => {
  const customization = useSelector((state: RootState) => state.settings.customization);
  const loginStage = useSelector<RootState, LoginStage>(state => state.user.loginStage);
  const savedTheme = useRef<Theme>(theme(customization));

  useEffect(() => {
    savedTheme.current = theme(customization);
  }, [customization]);

  return (
    <BrowserRouter>
      <StrictMode>
        <CssBaseline>
          <ThemeProvider theme={savedTheme.current}>
            {
              loginStage === 'EMPLOYEE' ?
                <Routes>
                  <Route path="/employee" element={<MainLayout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="dashboard/deals" element={<Deals />} />
                    <Route path="dashboard/map" element={<CustomersMap />} />
                    <Route path="customers">
                      <Route path="list" element={<CustomersList />} />
                      <Route path="list/details/:id" element={<CustomerDetails />} />
                    </Route>
                    <Route path="customers/orders/list" element={<OrderList />} />
                    <Route path="reports/reconciliation" element={<ReconciliationAct />} />
                    <Route path="reports/reconciliation/:customerId" element={<ReconciliationAct />} />
                    <Route path="reports/remainbyinvoices" element={<RemainsByInvoices />} />
                    <Route path="analytics/salesfunnel" element={<SalesFunnel />} />
                    <Route path="labels" element={<Labels />}/>
                  </Route>
                  <Route path="/system" element={<BaseForm />}>
                    <Route path="er-model-domains" element={<ErModelDomains />} />
                    <Route path="er-model" element={<ErModel />} />
                    <Route path="nlp-main" element={<NlpMain />} />
                    <Route path="sql-editor" element={<SqlEditor />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/employee/dashboard" />} />
                </Routes>
                : loginStage === 'CUSTOMER' ?
                  <Routes>
                    <Route path="/customer" element={<CustomerHomePage />}>
                      <Route path="standard-order" element={<StandardOrder />} />
                      <Route path="reconciliation-statement" element={<ReconciliationStatement custId={148333193} />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/customer" />} />
                  </Routes>
                  :
                  <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
            }
          </ThemeProvider>
        </CssBaseline>
      </StrictMode>
    </BrowserRouter>
  );
};

ReactDOM.render(
  <Provider store={store}>
    <Main />
  </Provider>,
  document.getElementById('root')
);
