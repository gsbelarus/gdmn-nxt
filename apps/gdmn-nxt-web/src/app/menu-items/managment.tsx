import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LabelIcon from '@mui/icons-material/Label';
import { IMenuItem } from '.';


const managment: IMenuItem = {
  id: 'managment',
  title: 'Управление',
  type: 'group',
  children: [
    {
      id: 'customers',
      title: 'Клиенты',
      type: 'collapse',
      icon: <PeopleAltIcon color="secondary" />,
      children: [
        {
          id: 'customers-list',
          title: 'Список клиентов',
          type: 'item',
          url: 'customers/list'
        },
      ]
    },
    {
      id: 'labels',
      title: 'Метки',
      type: 'item',
      url: 'labels',
      icon: <LabelIcon color="secondary" />,
    }
  ]
};

export default managment;
