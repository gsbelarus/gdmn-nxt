import { Components, ThemeOptions, Paper, colors } from '@mui/material';
import * as locales from '@mui/material/locale';

export default function componentStyleOverrides(theme: ThemeOptions): Components {
  return {
    MuiToolbar: {
      styleOverrides: {
        root: {
          height: '70px',
          padding: '15px'
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          color: theme.palette?.background?.default,
          background: theme.color.grey[200]
        }
      }
    },
    MuiAutocomplete: {
      ...locales.ruRU.components?.MuiAutocomplete,
      styleOverrides: {
        paper: {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          boxShadow: '0px 4px 5px -2px rgb(0 0 0 / 20%), 0px 7px 10px 1px rgb(0 0 0 / 14%), 0px 2px 16px 1px rgb(0 0 0 / 12%)',
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: '12px',
        },
      }
    },
    MuiButton: {
      styleOverrides: {
        text: {
          letterSpacing: '1px'
        },
        contained: {
          color: theme.mainContent.buttonTextColor,
          letterSpacing: '1px'
        },
        outlined: {
          letterSpacing: '1px'
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          color: theme.textColor,
          padding: '24px'
        },
        title: {
          fontSize: '1.125rem'
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: theme.textColor,
          padding: '24px',
          fontSize: '1.125rem'
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        }
      }
    },
  };
}
