import { BrowserView, MobileView } from 'react-device-detect';
import { Box, Drawer, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import styles from './sidebar-view.module.less';
import MenuList from '../menu-list/menu-list';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { makeStyles } from '@mui/styles';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { IPermissionByUser } from '@gsbelarus/util-api-types';
import { useRef, useState } from 'react';
import { margin } from '@mui/system';
import CustomizedScrollBox from 'apps/gdmn-nxt-web/src/app/components/Styled/customized-scroll-box/customized-scroll-box';
import { Header } from '../../Header';

/* eslint-disable-next-line */
export interface SidebarProps {
  open: boolean;
  onToogle: () => void;
  window?: any;
}

const useStyles = makeStyles(() => ({
  scroll: {
    // height: 'calc(100vh - 70px)',
    paddingLeft: '16px',
    paddingRight: '16px',
    '& .ps__rail-y': {
      borderRadius: '12px',
      opacity: 0.5,
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
      <BrowserView style={{ position: 'relative', flex: 1 }}>
        <CustomizedScrollBox
          className={classes.scroll}
          withBlur
          backgroundColor={theme.menu?.backgroundColor}
        >
          <MenuList />
        </CustomizedScrollBox>
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
            // [theme.breakpoints.up('md')]: {
            //   top: '50px',
            //   marginTop: '25px'
            // }
          }
        }}
      >
        <Toolbar style={{ backgroundColor: theme.menu?.backgroundColor, paddingLeft: '16px' }}>
          <Header onDrawerToggle={() => {}} />
        </Toolbar>
        {drawer}
      </Drawer>
    </Box>

  );
}

export default Sidebar;
