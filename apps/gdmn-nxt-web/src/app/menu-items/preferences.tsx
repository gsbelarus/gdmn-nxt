import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Settings from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import { IMenuItem } from '.';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditNotificationsIcon from '@mui/icons-material/EditNotifications';

const preferences: IMenuItem = {
  id: 'preferences',
  title: 'Система',
  type: 'group',
  children: [
    {
      id: 'account',
      title: 'Аккаунт',
      type: 'item',
      url: 'preferences/account',
      icon: <AccountCircleIcon color="secondary" />
    },
    {
      id: 'settings',
      title: 'Настройки',
      type: 'item',
      url: 'preferences/settings',
      icon: <Settings color="secondary" />
    },
    {
      id: 'permissions',
      title: 'Настройка прав',
      type: 'collapse',
      checkAction: 8,
      icon: <AdminPanelSettingsIcon color="secondary" />,
      children: [
        {
          id: 'permissions-view',
          title: 'Действия',
          type: 'item',
          url: 'preferences/permissions/list'
        },
        {
          id: 'permissions-usergroups',
          title: 'Группы пользователей',
          type: 'item',
          url: 'preferences/permissions/usergroups'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Центр уведомлений',
      type: 'item',
      checkAction: 10,
      url: 'preferences/notifications',
      icon: <EditNotificationsIcon color="secondary" />
    },
    {
      id: 'faq',
      title: 'Часто задаваемые вопросы',
      type: 'item',
      url: 'preferences/faq',
      icon: <HelpIcon color="secondary" />
    }
  ]
};

export default preferences;
