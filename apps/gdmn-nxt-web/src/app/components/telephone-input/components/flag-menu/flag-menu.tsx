import { Box, Menu, MenuProps } from '@mui/material';
import { DEFAULT_LANG } from '../../constants';
import { ISO_CODES, TelInputCountry } from '../../constants/countries';
import { FlagSize } from '../../types';
import { MutableRefObject, useMemo } from 'react';
import FlagMenuItem from '../flag-menu-item/flag-menu-item';
import CustomizedScrollBox from '@gdmn-nxt/components/Styled/customized-scroll-box/customized-scroll-box';
import styles from './flag-menu.module.less';

/** Some countries with too long name */
const excludeCountries: TelInputCountry[] = ['IO', 'AC', 'TA'];

const sortCountryCodes = (countryCodes: readonly TelInputCountry[], displayNames: Intl.DisplayNames): TelInputCountry[] => {
  return [...countryCodes].sort((countryCodeA, countryCodeB) => {
    const countryA = displayNames.of(countryCodeA) as string;
    const countryB = displayNames.of(countryCodeB) as string;

    return countryA.localeCompare(countryB);
  });
};

export interface FlagMenuProps extends Partial<MenuProps> {
  isoCode: TelInputCountry | null;
  onlyCountries?: TelInputCountry[];
  flagSize?: FlagSize;
  onSelectCountry: (isoCode: TelInputCountry) => void;
  popupRef?: MutableRefObject<any>
}

export function FlagMenu(props: FlagMenuProps) {
  const {
    className,
    anchorEl,
    isoCode,
    onSelectCountry,
    onlyCountries = [],
    flagSize = 'small',
    popupRef,
    ...rest
  } = props;

  const displayNames = useMemo(() => {
    return new Intl.DisplayNames(DEFAULT_LANG, { type: 'region' });
  }, []);

  const codesSorted = useMemo(() => sortCountryCodes(ISO_CODES, displayNames), [displayNames]);

  const countriesFiltered = (() => {
    if (onlyCountries.length > 0) {
      return codesSorted.filter((isoCode) => onlyCountries.includes(isoCode));
    };

    if (excludeCountries.length > 0) {
      return codesSorted.filter((isoCode) => !excludeCountries.includes(isoCode));
    };

    return codesSorted;
  })();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      id="select-country"
      className={`TelInput-Menu ${className ?? ''}`}
      MenuListProps={{
        role: 'listbox',
        'aria-activedescendant': isoCode ? `country-${isoCode}` : '',
        'aria-labelledby': 'select-country'
      }}
      ref={popupRef}
      {...rest}
    >
      <Box className={styles.menuContent}>
        <CustomizedScrollBox>
          {countriesFiltered.map((isoCodeItem) =>
            <FlagMenuItem
              onSelectCountry={onSelectCountry}
              key={isoCodeItem}
              isoCode={isoCodeItem}
              countryName={displayNames.of(isoCodeItem)}
              selected={isoCodeItem === isoCode}
              id={`country-${isoCodeItem}`}
              flagSize={flagSize}
            />
          )}
        </CustomizedScrollBox>
      </Box>
    </Menu>
  );
}

export default FlagMenu;
