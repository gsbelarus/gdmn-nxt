import { BrowserView, MobileView } from 'react-device-detect';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import './sidebar-view.module.less';
import MenuList from '../menu-list/menu-list';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { makeStyles } from '@mui/styles';
import 'react-perfect-scrollbar/dist/css/styles.css';

/* eslint-disable-next-line */
export interface SidebarProps {
  open: boolean;
  onToogle: () => void;
  window?: any;
}

const useStyles = makeStyles(() => ({
  scroll: {
    paddingLeft: '16px',
    paddingRight: '16px',
    '& .ps__rail-y': {
      borderRadius: '12px',
      opacity: 0.5
    },
    '& .ps__thumb-y ': {
      backgroundColor: 'white',
    },
  },
}));


export function Sidebar(props: SidebarProps) {
  const { open, onToogle, window } = props;
  const theme = useTheme();

  const classes = useStyles();

  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));

  const drawer = (
    <>
      <BrowserView>
        <PerfectScrollbar
          className={classes.scroll}
          style={{
            height: matchDownMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)',
          }}
        >
          <MenuList />
        </PerfectScrollbar>
      </BrowserView>
      <MobileView>
        <Box sx={{ px: 2 }}>
          <MenuList />
        </Box>
      </MobileView>
    </>
  );

  const container = window !== undefined ? () => window.document.body : undefined;

  return (
    <Box
      component="nav"
      sx={{ flexShrink: { md: 0 }, width: theme.drawerWidth }}
    >
      <Drawer
        open={open}
        container={container}
        variant={matchDownMd ? 'temporary' : 'persistent'}
        onClose={onToogle}
        anchor="left"
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            ...theme.menu,
            width: theme.drawerWidth,
            borderRight: 'none',
            paddingTop: '25px',
            [theme.breakpoints.up('md')]: {
              top: '70px'
            }
          }
        }}
      >
        {drawer}
      </Drawer>
    </Box>

  );
}

export default Sidebar;
