import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { DEFAULT_ISO_CODE, TelInputCountry } from './constants/countries';
import UseDigits from './hooks/useDigits';
import React, { FocusEvent, MutableRefObject, useRef, useState } from 'react';
import FlagButton from './components/flag-button/flag-button';
import { FlagSize, TelInputInfo } from './types';
import FlagMenu from './components/flag-menu/flag-menu';
import { getPhoneCodeOfCountry } from './helpers/countries';
import {
  isValidPhoneNumber,
  validatePhoneNumberLength,
  ValidatePhoneNumberLengthResult,
} from 'libphonenumber-js';

export * from './types';


type BaseTextFieldProps = Omit<
  TextFieldProps,
  'onChange' | 'select' | 'type' | 'multiline' | 'defaultValue'
>;

export interface TelephoneInputProps extends BaseTextFieldProps {
  onChange?: (value: string, info: TelInputInfo) => void;
  value?: string;
  defaultCountry?: TelInputCountry;
  onlyCountries?: TelInputCountry[];
  disableDropdown?: boolean;
  disableFormatting?: boolean;
  popupRef?: MutableRefObject<any>;
  flagSize?: FlagSize;
   /**
   * Если true, то код страны будет недоступен для ручного изменения
   * @default false
   */
  fixedCode?: boolean;
  /**
   * Если true, то можно будет ввести только то количество цифр, которые допустимы для выбранной страны
   * @default false
   */
  strictMode?: boolean;
}

export function TelephoneInput(props: TelephoneInputProps) {
  const {
    onChange,
    onFocus,
    onDoubleClick,
    value,
    defaultCountry,
    onlyCountries,
    disableDropdown,
    disableFormatting = false,
    disabled,
    inputProps,
    InputProps,
    flagSize = 'small',
    className,
    fixedCode = false,
    popupRef,
    strictMode,
    ...restTextFieldProps
  } = props;

  const textFieldRef = useRef<HTMLDivElement>(null);
  const inputDigitsRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const { onInputChange, onCountryChange, inputRef, isoCode, inputValue } =
  UseDigits({
    defaultCountry: defaultCountry || DEFAULT_ISO_CODE,
    value: value ?? '',
    onChange,
    onlyCountries,
    disableFormatting,
    fixedCode,
    strictMode
  });

  const handleOpenFlagsMenu = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): void => {
    event.preventDefault();

    if (!disabled || !disableDropdown) {
      setAnchorEl(textFieldRef.current);
    };
  };

  const handleChangeCountry = (newCountry: TelInputCountry): void => {
    setAnchorEl(null);
    onCountryChange(newCountry);

    if (inputRef.current) {
      inputRef.current.focus();
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

  const handleCloseFlagsMenu = (): void => {
    setAnchorEl(null);
  };

  const isoCodeWithPlus = isoCode
    ? `+${getPhoneCodeOfCountry(isoCode)}`
    : '';

  const validInputValue = fixedCode
    ? inputValue.replace(isoCodeWithPlus, '').trimStart()
    : inputValue;

  return (
    <>
      <TextField
        className={`TelInput-TextField ${className || ''}`}
        type="tel"
        disabled={disabled}
        value={validInputValue}
        ref={textFieldRef}
        inputRef={inputDigitsRef}
        onDoubleClick={handleDoubleClick}
        onChange={onInputChange}
        onFocus={handleFocus}
        inputProps={{
          ...inputProps
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ flexShrink: 0 }}>
              <FlagButton
                isFlagsMenuOpened={Boolean(anchorEl)}
                isoCode={isoCode}
                onClick={handleOpenFlagsMenu}
                disabled={disabled}
                flagSize={flagSize}
                disableDropdown={Boolean(disableDropdown)}
                fixedCode={fixedCode}
              />
            </InputAdornment>
          ),
          ...InputProps
        }}
        {...restTextFieldProps}
      />
      {!disableDropdown ? (
        <FlagMenu
          popupRef={popupRef}
          anchorEl={anchorEl}
          onlyCountries={onlyCountries}
          isoCode={isoCode}
          onClose={handleCloseFlagsMenu}
          onSelectCountry={handleChangeCountry}
          flagSize={flagSize}
        />
      ) : null}
    </>
  );
}

export function validatePhoneNumber(phone: string) {
  if (!phone || phone.length === 0) return;

  const resultsMap: {[key in ValidatePhoneNumberLengthResult]: string} = {
    INVALID_COUNTRY: 'Некорректная страна',
    INVALID_LENGTH: 'Некорректная длина',
    NOT_A_NUMBER: 'Допустимы только цифры',
    TOO_LONG: 'Слишком длинный',
    TOO_SHORT: 'Слишком короткий',
  };

  if (!isValidPhoneNumber(phone)) {
    const result = validatePhoneNumberLength(phone);
    return (result && resultsMap[result]) ?? 'Некорректный номер';
  }

  return;
}

export default TelephoneInput;
