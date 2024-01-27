import { Divider, InputAdornment, Stack, TextField, TextFieldProps } from '@mui/material';
import React, { FocusEvent, useRef, useState } from 'react';
import SocialMediaButton from './components/social-media-button/social-media-button';
import SocialMediaMenu from './components/social-media-menu/social-media-menu';
import { MessengerCode } from '@gsbelarus/util-api-types';
import { socialMediaIcons } from './social-media-icons';
export * from './social-media-icons';

type BaseTextFieldProps = Omit<
  TextFieldProps,
  'onChange' | 'select' | 'type' | 'multiline' | 'defaultValue'
>;

export interface ISocialMedia {
    text: string;
    name: MessengerCode;
    link?: string
}

export interface socialMediaInputProps extends BaseTextFieldProps {
  onChange: (value: ISocialMedia) => void;
  value: ISocialMedia;
  disableDropdown?: boolean;
}

export function SocialMediaInput(props: socialMediaInputProps) {
  const {
    onChange,
    onFocus,
    onDoubleClick,
    value,
    disableDropdown,
    disabled,
    inputProps,
    InputProps,
    className,
    ...restTextFieldProps
  } = props;

  const textFieldRef = useRef<HTMLDivElement>(null);
  const inputDigitsRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const handleOpen = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): void => {
    event.preventDefault();

    if (!disabled || !disableDropdown) {
      setAnchorEl(textFieldRef.current);
    };
  };

  const handleFocus = (
    event: FocusEvent<HTMLInputElement, Element>
  ): void => {
    onFocus?.(event);
  };

  const handleDoubleClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ): void => {
    const inputElement = inputDigitsRef.current as HTMLInputElement;
    inputElement.setSelectionRange(0, inputElement.value.length);
    onDoubleClick?.(event);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleSocialChange = (socialValue: MessengerCode) => {
    handleClose();
    onChange({ ...value, name: socialValue, link: socialMediaIcons[`${socialValue as MessengerCode}`].link });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleClose();
    onChange({ ...value, text: (e.target.value).replace(/\s+/g, ' ') });
  };

  return (
    <>
      <TextField
        {...restTextFieldProps}
        disabled={disabled}
        value={value.text}
        ref={textFieldRef}
        inputRef={inputDigitsRef}
        onDoubleClick={handleDoubleClick}
        onChange={handleTextChange}
        onFocus={handleFocus}
        inputProps={{
          ...inputProps
        }}
        InputProps={{
          ...InputProps,
          startAdornment: (
            <InputAdornment position="start">
              <Stack direction="row">
                <SocialMediaButton
                  socialName={value.name}
                  onClick={handleOpen}
                  disabled={disabled}
                  disableDropdown={Boolean(disableDropdown)}
                />
                <Divider orientation="vertical" flexItem />
              </Stack>

            </InputAdornment>
          ),
        }}
      />
      {!disableDropdown ? (
        <SocialMediaMenu
          anchorEl={anchorEl}
          socialName={value.name}
          onClose={handleClose}
          onChangeSocial={handleSocialChange}
        />
      ) : null}
    </>
  );
}

export default SocialMediaInput;
