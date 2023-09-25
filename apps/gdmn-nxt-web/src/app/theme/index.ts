import { ColorMode } from '@gsbelarus/util-api-types';
import { colors } from '@mui/material';
import * as locales from '@mui/material/locale';
import { createTheme, ThemeOptions } from '@mui/material/styles';
import { ICustomization } from '../store/settingsSlice';
import componentStyleOverrides from './componentStyleOverrides';
import { styledTheme } from './styles';
import themeTypography from './typography';

declare module '@mui/material/styles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Theme extends styledTheme {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface ThemeOptions extends styledTheme {}
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    laptop: true;
    ultraWide: true;
  }
};

export const theme = (customization: ICustomization) => {
  const themeOption = {
    // fontFamily: '"Roboto Condensed", sans-serif',
    // fontFamily: '"Lato", sans-serif',
    // fontFamily: '"PT Sans", sans-serif',
    fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'].join(','),
    ...(customization.colorMode === ColorMode.Light
      ? {
        backgroundColor: colors.grey[100],
        backgroundDefault: colors.blue[300],
        backgroundSecond: colors.blue[300],
        textColor: colors.grey[800],
        secondaryColor: colors.common.white,
        headColor: colors.common.white,
        paper: colors.common.white,
        customization,
        borderColor: '#f0f0f0',
        buttonTextColor: 'white'
      }
      : {
        backgroundColor: colors.grey[900],
        backgroundDefault: colors.blueGrey[900],
        backgroundSecond: colors.blue[300],
        textColor: colors.common.white,
        secondaryColor: colors.grey[300],
        headColor: colors.grey[300],
        paper: colors.grey[800],
        customization,
        borderColor: '#303030',
        buttonTextColor: 'white'
      }
    )
  };

  const themeOptions: ThemeOptions = {
    color: colors,
    drawerWidth: 260,
    headColor: themeOption.headColor,
    textColor: themeOption.textColor,
    fontFamily: themeOption.fontFamily,
    palette: {
      mode: themeOption.customization.colorMode,
      background: {
        paper: themeOption.paper,
        default: colors.common.white,
      },
      primary: {
        main: themeOption.backgroundSecond,
        contrastText: themeOption.headColor,
      },
      secondary: {
        main: themeOption.secondaryColor
      },
      text: {
        primary: themeOption.textColor
      },
    },
    menu: {
      backgroundColor: themeOption.backgroundDefault,
      color: themeOption.headColor
    },
    mainContent: {
      backgroundColor: themeOption.backgroundColor,
      width: '100%',
      minHeight: 'calc(100vh - 10px)',
      flexGrow: 1,
      padding: '20px',
      marginTop: '10px',
      marginRight: '20px',
      borderRadius: '12px',
      borderColor: themeOption.borderColor,
      buttonTextColor: themeOption.buttonTextColor
    },
    breakpoints: {
      /** breakpoints берём немного с меньше, чем разрешение экрана*/
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1280,
        xl: 1536,
        laptop: 1366,
        ultraWide: 1920
      }
    }
  };

  // const themes = createTheme({...themeOptions, typography: { fontFamily: 'fantasy' }}, locales.ruRU);
  // console.log('themeTypography(themeOptions)', themeTypography(themeOptions));
  const themes = createTheme({ ...themeOptions, typography: { ...themeTypography(themeOptions) } }, locales.ruRU);
  // themes.typography = { ...themeTypography(themeOptions), fontFamily: 'fantasy', fontSize: 30 };
  // themes.typography = { ...themes.typography, fontFamily: 'fantasy' };
  themes.components = { ...locales.ruRU.components, ...componentStyleOverrides(themeOptions) };
  themes.shadows[1] = themeOption.customization.colorMode === ColorMode.Dark
    ? '0px 4px 20px rgba(100, 110, 120, 0.3)'
    : '0px 4px 20px rgba(170, 180, 190, 0.3)';

  return themes;
};
