import './menu-collapse.module.less';
import { Collapse, List, ListItemButton, ListItemIcon, ListItemText, Theme, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import MenuItem from '../menu-item/menu-item';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { IMenuItem } from 'apps/gdmn-nxt-web/src/app/menu-items';
import { makeStyles } from '@mui/styles';
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const useStyles = makeStyles((theme: Theme) => ({
  menuCollapse: {
    marginBottom: 3,
    borderRadius: theme.mainContent.borderRadius,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, .3)',
    },
    '&.Mui-selected': {
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, .3)',
      },
    },
  }
}));


export interface MenuCollapseProps {
  menu: IMenuItem;
  level?: number;
}

export function MenuCollapse(props: MenuCollapseProps) {
  const { menu, level = 0 } = props;
  const classes = useStyles();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = () => {
    setOpen(!open);
    setSelected(!selected ? menu.id : null);
  };

  const menus = menu.children?.map((item: IMenuItem) => {
    switch (item.type) {
      case 'item':
        return <MenuItem
          key={item.id}
          item={item}
          level={level + 1}
               />;
      case 'collapse': return <MenuCollapse menu={item} level={level + 1} />;

      default:
        return (
          <Typography
            key={item.id}
            variant="h4"
            color="error"
            align="center"
          >
            Ошибка отображения
          </Typography>
        );
    }
  });

  const menuIcon = menu.icon;

  const location = useLocation();

  const findPath = (fullUrl: string | undefined): boolean => {
    const url = fullUrl?.split('/');
    const path = location.pathname.split('/');
    if (!url) return false;
    for (let i = 0;i < url.length;i++) {
      if (path[i + 2] !== url[i]) {
        return false;
      }
    }
    return true;
  };

  const findCollapseObject = (countMassive: IMenuItem[]): IMenuItem[] => {
    let count: IMenuItem[] = [];
    for (let i = 0;i < countMassive.length;i++) {
      const fil: IMenuItem[] = countMassive[i].children?.filter((value) => value.type === 'collapse') || [];
      count = count.concat(fil);
    }
    if (count?.length === 0) {
      return [];
    } else {
      return count?.concat(findCollapseObject(count));
    }
  };

  useEffect(() => {
    const currentPath = findPath(menu.url);
    if (currentPath) {
      setOpen(true);
      return;
    }
    const allCollapseObject = findCollapseObject([menu]).concat(menu);
    if (!allCollapseObject.every(value => !findPath(value.url))) {
      setOpen(true);
    }
  }, [location]);

  return (
    <>
      <ListItemButton
        className={classes.menuCollapse}
        sx={{
          pl: `${level * 24}px`
        }}
        selected={open}
        onClick={handleClick}
      >
        <ListItemIcon color="secondary" sx={{ minWidth: !menu.icon ? 18 : 36 }}>
          {menuIcon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="h4"
              color="inherit"
              sx={{ my: 'auto' }}
            >
              {menu.title}
            </Typography>
          }
        />
        {(open) ? (
          <KeyboardArrowUpIcon style={{ marginTop: 'auto', marginBottom: 'auto' }} />
        ) : (
          <KeyboardArrowDownIcon style={{ marginTop: 'auto', marginBottom: 'auto' }} />
        )}
      </ListItemButton>
      <Collapse
        in={open}
        timeout="auto"
        unmountOnExit
      >
        <List
          component="div"
          disablePadding
          sx={{
            position: 'relative',
            '&:after': {
              content: '\'\'',
              position: 'absolute',
              left: '32px',
              top: 0,
              height: '100%',
              width: '1px',
              opacity: 1,
            }
          }}
        >
          {menus}
        </List>
      </Collapse>
    </>
  );
}

export default MenuCollapse;
