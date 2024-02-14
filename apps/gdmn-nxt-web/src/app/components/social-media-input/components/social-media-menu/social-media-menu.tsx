import { Box, Menu, MenuProps, Theme } from '@mui/material';
import styles from './social-media-menu.module.less';
import SocialMediaMenuItem from '../social-media-item/social-media-menu-item';
import { IIconsNames, socialMediaIcons } from '../../social-media-icons';
import { MutableRefObject } from 'react';
import { makeStyles } from '@mui/styles';

export interface SocialMediaMenuProps extends Partial<MenuProps> {
  socialName: IIconsNames | undefined;
  onChangeSocial: (value: string) => void;
  popupRef?: MutableRefObject<any>
}

const useStyles = makeStyles((theme: Theme) => ({
  popup: {
    '& .MuiList-root': {
      padding: '0px !important'
    }
  }
}));

export function SocialMediaMenu(props: SocialMediaMenuProps) {
  const {
    className,
    anchorEl,
    socialName,
    onChangeSocial,
    popupRef,
    ...rest
  } = props;

  const classes = useStyles();

  return (
    <Menu
      ref={popupRef}
      className={classes.popup}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      {...rest}
    >
      <Box className={styles.menuContent} >
        {Object.keys(socialMediaIcons).map((socialNameItem, index) =>
          <SocialMediaMenuItem
            onSelectSocial={onChangeSocial}
            key={index}
            socialName={socialNameItem as IIconsNames}
            selected={socialNameItem === socialName}
          />
        )}
      </Box>
    </Menu>
  );
}

export default SocialMediaMenu;
