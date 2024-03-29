import React from 'react';
import analytics from './analytics';
import dashboard from './dashboard';
import managment from './managment';
import preferences from './preferences';
import { systemMenu } from './system';
import { ActionMethod, Permissions } from '@gsbelarus/util-api-types';

type IType = 'group' | 'collapse' | 'item'
export interface IMenuItem {
  id: string;
  title?: string;
  url?: string;
  type: IType;
  icon?: React.ReactElement;
  children?: IMenuItem[];
  checkAction?: number;
  actionCheck?: {
    name: keyof Permissions;
    method: ActionMethod;
  }
}

// TODO доделать systemMenu или убрать вовсе
const menuItems = {
  items: [dashboard, managment, analytics, preferences].concat(process.env.NODE_ENV === 'development' ? systemMenu : [])
};

export default menuItems;
