import React from 'react';
import analytics from './analytics';
import dashboard from './dashboard';
import managment from './managment';
import { systemMenu } from './system';

export interface IMenuItem {
  id: string;
  title?: string;
  url?: string;
  type: string;
  icon?: React.ReactElement;
  children?: IMenuItem[];
}

// TODO доделать systemMenu или убрать вовсе
const menuItems = {
  items: [dashboard, managment, analytics].concat(process.env.NODE_ENV === 'development' ? systemMenu : [])
};

export default menuItems;
