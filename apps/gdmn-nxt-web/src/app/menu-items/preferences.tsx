import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Settings from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import { IMenuItem } from '.';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditNotificationsIcon from '@mui/icons-material/EditNotifications';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';

const preferences: IMenuItem = {
  id: 'system',
  title: 'Система',
  type: 'group',
  children: [
    {
      id: 'settings',
      title: 'Настройки',
      type: 'item',
      url: 'system/settings',
      icon: <Settings color="secondary" />
    },
    {
      id: 'permissions',
      title: 'Настройка прав',
      type: 'collapse',
      url: 'system/permissions',
      actionCheck: {
        name: 'permissions',
        method: 'forGroup'
      },
      icon: <AdminPanelSettingsIcon color="secondary" />,
      children: [
        {
          id: 'permissions-view',
          title: 'Действия',
          type: 'item',
          url: 'system/permissions/list',
          actionCheck: {
            name: 'permissions',
            method: 'forGroup'
          },
        },
        {
          id: 'permissions-usergroups',
          title: 'Группы пользователей',
          type: 'item',
          url: 'system/permissions/usergroups',
          actionCheck: {
            name: 'permissions',
            method: 'forGroup'
          },
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Центр уведомлений',
      type: 'item',
      actionCheck: {
        name: 'notifications',
        method: 'forGroup'
      },
      url: 'system/notifications',
      icon: <EditNotificationsIcon color="secondary" />
    },
    {
      id: 'faq',
      title: 'База знаний',
      type: 'item',
      url: 'system/faq',
      icon: <HelpIcon color="secondary" />
    },
    {
      id: 'updates-history',
      title: 'История обновлений',
      type: 'item',
      url: 'system/updates-history',
      icon: <TipsAndUpdatesIcon color="secondary" />
    },
  ]
};

export default preferences;
