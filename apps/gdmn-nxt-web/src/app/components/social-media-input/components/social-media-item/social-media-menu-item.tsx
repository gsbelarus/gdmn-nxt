import { MenuItem, MenuItemProps, Typography } from '@mui/material';
import { Styled } from './styled';
import { socialMediaIcons } from '../../social-media-icons';
import { MessengerCode } from '@gsbelarus/util-api-types';

export interface SocialMediaMenuItemProps extends MenuItemProps {
  socialName: MessengerCode;
  onSelectSocial: (isoCode: MessengerCode) => void;
}

export function SocialMediaMenuItem(props: SocialMediaMenuItemProps) {
  const {
    socialName,
    onSelectSocial,
    ...menuItemProps
  } = props;

  const handleClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    event.preventDefault();
    onSelectSocial(socialName as MessengerCode);
  };

  return (
    <MenuItem
      {...menuItemProps}
      onClick={handleClick}
      role="option"
      data-testid={`option-${socialName}`}
    >
      <Styled.ListItemIcon>
        <img style={{ width: '30px' }} src={socialMediaIcons[socialName].icon}/>
      </Styled.ListItemIcon>
      <Styled.ListItemText>
        {socialName}
      </Styled.ListItemText>
    </MenuItem>
  );
}

export default SocialMediaMenuItem;
