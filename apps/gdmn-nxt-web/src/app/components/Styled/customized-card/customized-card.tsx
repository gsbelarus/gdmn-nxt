import { Card } from '@mui/material';
import './customized-card.module.less';
import { styled, Theme } from '@mui/material/styles';

interface ICustomizedCardProps {
  theme?: Theme
  borders?: boolean;
  boxShadows?: boolean;
};

const CustomizedCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'borders' && prop !== 'boxShadows'
})<ICustomizedCardProps>(({ theme, borders = false, boxShadows = false }) => ({
  ...(borders ? { border: `1px solid ${theme.mainContent.borderColor }` } : {}),
  ...(boxShadows ? { boxShadow: `${(theme.shadows as Array<any>)[1]}` } : { boxShadow: 'none' }),
  '.MuiCardHeader-root': {
    paddingTop: '10px',
    paddingBottom: '10px'
  },
  '.card-toolbar': {
    padding: '12px 24px 12px 24px'
  }

}));

export default CustomizedCard;
