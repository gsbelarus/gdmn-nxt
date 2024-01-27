import { Box, Menu, MenuProps } from '@mui/material';
import styles from './social-media-menu.module.less';
import SocialMediaMenuItem from '../social-media-item/social-media-menu-item';
import { socialMediaIcons } from '../../social-media-icons';
import { MessengerCode } from '@gsbelarus/util-api-types';

export interface SocialMediaMenuProps extends Partial<MenuProps> {
  socialName: MessengerCode | undefined;
  onChangeSocial: (value: MessengerCode) => void;
}

export function SocialMediaMenu(props: SocialMediaMenuProps) {
  const {
    className,
    anchorEl,
    socialName,
    onChangeSocial,
    ...rest
  } = props;

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      {...rest}
    >
      <Box className={styles.menuContent}>
        {Object.keys(socialMediaIcons).map((socialNameItem, index) =>
          <SocialMediaMenuItem
            onSelectSocial={onChangeSocial}
            key={index}
            socialName={socialNameItem as MessengerCode}
            selected={socialNameItem === socialName}
          />
        )}
      </Box>
    </Menu>
  );
}

export default SocialMediaMenu;
