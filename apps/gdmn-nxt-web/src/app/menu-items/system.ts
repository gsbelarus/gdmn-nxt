import { IMenuItem } from '.';

export const systemMenu: IMenuItem = {
  id: 'system',
  title: 'Система',
  type: 'group',
  children: [
    {
      id: 'er-model-domains',
      title: 'Domains',
      type: 'item',
      url: '/system/er-model-domains'
    },
    {
      id: 'er-model',
      title: 'Entities',
      type: 'item',
      url: '/system/er-model'
    },
    {
      id: 'nlp-main',
      title: 'NLP',
      type: 'item',
      url: '/system/nlp-main'
    },
    {
      id: 'sql-eitor',
      title: 'SQL editor',
      type: 'item',
      url: '/system/sql-editor'
    }
  ]
};
