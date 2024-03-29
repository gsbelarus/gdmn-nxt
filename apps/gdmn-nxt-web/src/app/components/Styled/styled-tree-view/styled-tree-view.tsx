import TreeItem from '@mui/lab/TreeItem/TreeItem';
import TreeView from '@mui/lab/TreeView/TreeView';
import { alpha, styled } from '@mui/material/styles';
import { gdmnTheme } from '../../../theme/gdmn-theme';
import './styled-tree-view.module.less';

export const StyledTreeView = styled(TreeView)(({ theme }) => ({
  color:
    theme.textColor,
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  WebkitFontSmoothing: 'auto',
  letterSpacing: 'normal',
}));

export const StyledTreeItem = styled(TreeItem)(() => ({
  '& .Mui-selected': {
    fontSize: gdmnTheme.typography.mediumUI.fontSize,
    backgroundColor: gdmnTheme.palette.primary.main
  },
  '& .MuiTreeItem-content': {
    fontSize: gdmnTheme.typography.mediumUI.fontSize,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  },
  '& .MuiTreeItem-label': {
    fontSize: gdmnTheme.typography.mediumUI.fontSize,
    fontFamily: 'inherit',
  },
  '& .MuiTreeItem-iconContainer': {
    '& .close': {
      opacity: 0.3,
    },
    color: gdmnTheme.palette.grey['600'],
    width: 12,
    fontSize: gdmnTheme.typography.mediumUI.fontSize,
    fontFamily: 'inherit'
  },
  '& .MuiTreeItem-group': {
    marginLeft: 13,
    paddingLeft: 4,
    borderLeft: `1px dotted ${alpha(gdmnTheme.palette.text.primary, 0.4)}`,
  },
}));

