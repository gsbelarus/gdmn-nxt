import { Button, IconButton, ButtonProps } from '@mui/material';
import { socialMediaIcons } from '../../social-media-icons';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { MessengerCode } from '@gsbelarus/util-api-types';

export interface SocialMediaButtonProps extends ButtonProps {
  socialName: MessengerCode | undefined
  disableDropdown?: boolean;
};

export function SocialMediaButton(props: SocialMediaButtonProps) {
  const {
    disableDropdown = false,
    socialName = 'telegram',
    ...buttonProps
  } = props;

  if (disableDropdown) {
    return (
      <>
        <Button
          {...buttonProps}
          style={{ borderRadius: '12px' }}
          color="inherit"
          disabled
        >
          {socialMediaIcons[socialName]
            ? <img style={{ width: '20px' }} src={socialMediaIcons[socialName].icon}/>
            : <PanoramaFishEyeIcon/>}
          <ArrowDropDownIcon />
        </Button>
        <IconButton
          disableRipple
          sx={{ pointerEvents: 'none', aspectRatio: '1 / 1' }}
          component="span"
        >
          {socialMediaIcons[socialName]
            ? <img style={{ width: '20px' }} src={socialMediaIcons[socialName].icon}/>
            : <PanoramaFishEyeIcon/>}
        </IconButton>
      </>
    );
  }

  return (
    <>
      <Button
        {...buttonProps}
        style={{ borderRadius: '12px', minWidth: 40 }}
        color="inherit"
      >
        {socialMediaIcons[socialName]
          ? <img style={{ width: '20px' }} src={socialMediaIcons[socialName].icon}/>
          : <PanoramaFishEyeIcon/>}
        <ArrowDropDownIcon />
      </Button>
    </>
  );
}

export default SocialMediaButton;
