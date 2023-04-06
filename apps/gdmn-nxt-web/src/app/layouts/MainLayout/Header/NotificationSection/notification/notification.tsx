import './notification.module.less';
import {
  Badge,
  Box,
  ClickAwayListener,
  Divider,
  Fade,
  Icon,
  IconButton,
  Paper,
  Popper,
  Stack,
  Theme,
  Typography
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import CustomizedCard from 'apps/gdmn-nxt-web/src/app/components/Styled/customized-card/customized-card';
import { makeStyles } from '@mui/styles';
import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import NotificationList from '../notification-list/notification-list';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import { ClientToServerEvents, IMessage, ServerToClientEvents, getSocketClient } from '@gdmn-nxt/socket';
import logo from './NoNotifications.png'; // with import
import { Socket } from 'socket.io-client';

const useStyles = makeStyles((theme: Theme) => ({
  popper: {
    zIndex: 2000,
    '&[x-placement*="bottom"] $arrow': {
      top: 0,
      left: 0,
      marginTop: '-0.71em',
      marginLeft: 4,
      marginRight: 4,
      '&::before': {
        transformOrigin: '0 100%'
      }
    },
  },
  arrow: {
    position: 'absolute',
    width: '0.71em',
    height: '0.71em',
    boxSizing: 'border-box',
    color: theme.palette.background.paper,
    '&::before': {
      content: '""',
      margin: 'auto',
      display: 'block',
      width: '100%',
      height: '100%',
      boxShadow: theme.shadows[1],
      backgroundColor: 'currentColor',
      transform: 'translateY(-50%) rotate(45deg)'
    }
  },
  mainPaper: {
    marginRight: 20,
    width: '20vw',
    minWidth: '400px',
    minHeight: '300px',
    display: 'flex'
  },
  header: {
    padding: '16px 24px'
  },
  badgeFadeIn: {
    animationName: '$fadeIn',
    animationDuration: '1000ms',
  },
  badgeFadeOut: {
    animationName: '$fadeOut',
    animationDuration: '1000ms',
  },
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0
    },
    '100%': {
      opacity: 1,
    }
  },
  '@keyframes fadeOut': {
    '0%': {
      opacity: 1
    },
    '100%': {
      opacity: 0
    }
  }
}));

/* eslint-disable-next-line */
export interface NotificationProps {}

export function Notification(props: NotificationProps) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [anchorProfileEl, setAnchorProfileEl] = useState(null);
  const [arrowRef, setArrowRef] = useState<HTMLElement | null>(null);
  // const arrowRef = useRef<HTMLElement | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [socketClient, setsocketClient] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>();

  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    const socket = getSocketClient('notifications');
    setsocketClient(socket);
  }, []);

  useEffect(() => {
    if (!socketClient) return;

    socketClient?.on?.('messages', (data: IMessage[]) => {
      setMessages(data);
    });
  }, [socketClient]);

  /** Disable scrolling for main window when notifications are opened */
  const preventDefault = useCallback((e: Event) => e.preventDefault(), []);

  const keys: { [key: string]: number } = { 'ArrowUp': 1, 'ArrowDown': 1 };
  const preventDefaultForScrollKeys = useCallback((e: KeyboardEvent) => {
    if (keys[e.key]) {
      preventDefault(e);
      return false;
    }
    return true;
  }, []);

  const wheelOpt = { passive: false };
  const wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
  useEffect(() => {
    if (open) {
      window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
      window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
      window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
      window.addEventListener('keydown', preventDefaultForScrollKeys, false);
    } else {
      window.removeEventListener('DOMMouseScroll', preventDefault, false);
      window.removeEventListener(wheelEvent, preventDefault, false);
      window.removeEventListener('touchmove', preventDefault, false);
      window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
    };
  }, [open]);

  // useEffect(() => {
  //   if (!open) {
  //     const timer = setTimeout(() => {
  //       setFadeOut(!fadeOut);
  //     }, 1000);
  //     return () => clearTimeout(timer);
  //   };
  //   return;
  // });

  const handleDeleteNotification = (id: number) => {
    socketClient?.emit('delete', id);
  };

  const handleToogle = (target: any) => {
    setAnchorProfileEl(target);
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box
      sx={{
        mx: 2
      }}
    >
      <IconButton
        size="large"
        onClick={(event: any) => handleToogle(event.currentTarget)}
      >
        <Badge
          // classes={{
          //   dot: clsx(classes.badgeFadeIn, { [classes.badgeFadeOut]: fadeOut }),
          // }}
          color="error"
          variant="standard"
          badgeContent={messages.length}
        >
          <NotificationsOutlinedIcon color="secondary" />
        </Badge>
      </IconButton>
      <Popper
        className={classes.popper}
        open={open}
        placement="bottom"
        anchorEl={anchorProfileEl}
        transition
        popperOptions={{
          modifiers: [
            {
              name: 'arrow',
              options: {
                enabled: true,
                element: arrowRef
              }
            }
          ]
        }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper className={classes.mainPaper} elevation={15}>
              <ClickAwayListener onClickAway={handleClose}>
                <CustomizedCard borders style={{ flex: 1, display: 'flex' }}>
                  <span className={classes.arrow} ref={setArrowRef} />
                  <Stack direction="column" style={{ maxHeight: '50vh', flex: 1, display: 'flex' }}>
                    <Stack
                      className={classes.header}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <Typography variant="h3">
                        Уведомления
                      </Typography>
                    </Stack>
                    <Divider />
                    {messages.length > 0
                      ? <PerfectScrollbar>
                        <NotificationList messages={messages} onDelete={handleDeleteNotification} />
                      </PerfectScrollbar>
                      : <Stack
                        flex={1}
                        display="flex"
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        >
                        {/* <Icon fontSize="large">
                          <NotificationsOffOutlinedIcon fontSize="large" color="action" />
                        </Icon> */}
                        <img src={logo} alt="" draggable={false} width="150" color="red" />
                        <Typography variant="h4" color={'GrayText'}>Пока нет уведомлений</Typography>
                      </Stack>}
                  </Stack>
                </CustomizedCard>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default Notification;
