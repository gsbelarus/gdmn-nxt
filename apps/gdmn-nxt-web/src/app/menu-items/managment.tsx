import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LabelIcon from '@mui/icons-material/Label';
import WorkIcon from '@mui/icons-material/Work';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { IMenuItem } from '.';


const managment: IMenuItem = {
  id: 'managment',
  title: 'Управление',
  type: 'group',
  children: [
    {
      id: 'dealsGroup',
      title: 'Сделки',
      type: 'collapse',
      url: 'managment/deals',
      icon: <WorkIcon color="secondary" />,
      children: [
        {
          id: 'deals',
          title: 'Список',
          type: 'item',
          url: 'managment/deals/list',
        },
        {
          id: 'dealSources',
          title: 'Источники заявок',
          type: 'item',
          url: 'managment/deals/dealSources',
        },
        {
          id: 'denyReasons',
          title: 'Причины отказа',
          type: 'item',
          url: 'managment/deals/denyReasons',
        },
      ]
    },
    {
      id: 'tasksGroup',
      title: 'Задачи',
      type: 'collapse',
      url: 'managment/tasks',
      icon: <TaskAltIcon color="secondary" />,
      children: [
        {
          id: 'tasks',
          title: 'Список',
          type: 'item',
          url: 'managment/tasks/list',
        },
        {
          id: 'taskTypes',
          title: 'Типы задач',
          type: 'item',
          url: 'managment/tasks/taskTypes',
        },
      ]
    },
    {
      id: 'customers',
      title: 'Клиенты',
      type: 'collapse',
      url: 'managment/customers',
      icon: <PeopleAltIcon color="secondary" />,
      children: [
        {
          id: 'customers-list',
          title: 'Список клиентов',
          type: 'item',
          url: 'managment/customers/list'
        },
      ]
    },
    {
      id: 'labels',
      title: 'Метки',
      type: 'item',
      url: 'managment/labels',
      icon: <LabelIcon color="secondary" />,
    },
  ]
};

export default managment;
