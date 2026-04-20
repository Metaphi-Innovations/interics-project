import { createTheme, alpha, type Theme } from '@mui/material/styles';
import type { ThemeConfig } from './themeConfig';
import { generateScale, tokens } from './tokens';

// ─── Custom breakpoints ───────────────────────────────────────────────────────

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs:   true; // 0px     — mobile portrait
    sm:   true; // 600px   — mobile landscape
    md:   true; // 900px   — tablet
    lg:   true; // 1024px  — small laptop
    xl:   true; // 1280px  — large laptop
    xxl:  true; // 1440px  — desktop
    xxxl: true; // 1600px  — wide desktop
    uhd:  true; // 1920px  — ultra wide
  }
}

// ─── Theme factory ────────────────────────────────────────────────────────────

export function generateTheme(config: ThemeConfig): Theme {
  const primary = generateScale(config.brandColor);

  const isLight = config.mode === 'light';

  const background = {
    default: isLight ? '#F8FAFB' : '#0F0F0F',
    paper:   isLight ? '#FFFFFF' : '#292929',
  };

  const text = {
    primary:   isLight ? '#111827' : '#FFFFFF',
    secondary: isLight ? '#6B7280' : '#A0A0A0',
    disabled:  isLight ? '#9CA3AF' : '#555555',
  };

  const divider = isLight ? '#E5E7EB' : '#3A3A3A';

  const fontFamilyString =
    config.fontFamily === 'Helvetica Neue'
      ? 'Helvetica Neue, Helvetica, Arial, system-ui, sans-serif'
      : `'${config.fontFamily}', system-ui, sans-serif`;

  return createTheme({
    breakpoints: {
      values: {
        xs:   0,
        sm:   600,
        md:   900,
        lg:   1024,
        xl:   1280,
        xxl:  1440,
        xxxl: 1600,
        uhd:  1920,
      },
    },

    palette: {
      mode: config.mode,
      primary: {
        main:        '#107E68',
        light:       '#13A386',
        dark:        '#0A5C4D',
        contrastText: '#FFFFFF',
      },
      error:   { main: '#DC2626', light: '#FEE2E2', contrastText: '#ffffff' },
      success: { main: '#16A34A', light: '#DCFCE7', contrastText: '#ffffff' },
      warning: { main: '#D97706', light: '#FEF3C7', contrastText: '#ffffff' },
      info:    { main: '#0284C7', light: '#E0F2FE', contrastText: '#ffffff' },
      text: {
        primary:   text.primary,
        secondary: text.secondary,
        disabled:  text.disabled,
      },
      background,
      divider,
      ...(isLight ? {} : {
        action: {
          hover:    'rgba(255,255,255,0.05)',
          selected: 'rgba(255,255,255,0.08)',
        },
      }),
    },

    typography: {
      fontFamily: fontFamilyString,
      fontSize: 13,
      htmlFontSize: 13,
      fontWeightRegular: tokens.fontWeight.normal,
      fontWeightMedium:  tokens.fontWeight.medium,
      fontWeightBold:    tokens.fontWeight.bold,
      h1: { fontSize: '28px', fontWeight: 700, lineHeight: 1.25 },
      h2: { fontSize: '22px', fontWeight: 700, lineHeight: 1.25 },
      h3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.3  },
      h4: { fontSize: '16px', fontWeight: 600, lineHeight: 1.4  },
      h5: { fontSize: '14px', fontWeight: 600, lineHeight: 1.4  },
      h6: { fontSize: '13px', fontWeight: 600, lineHeight: 1.5  },
      // Body: explicit weights; caption/overline a bit stronger for UI chrome
      body1: {
        fontSize:   '13px',
        lineHeight: 1.5,
        fontWeight: tokens.fontWeight.normal,
      },
      body2: {
        fontSize:   '12px',
        lineHeight: 1.5,
        fontWeight: tokens.fontWeight.normal,
      },
      caption: {
        fontSize:   '11px',
        lineHeight: 1.5,
        fontWeight: tokens.fontWeight.medium,
      },
      overline: {
        fontSize:      '10px',
        lineHeight:    1.5,
        fontWeight:    tokens.fontWeight.semibold,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
      },
    },

    shape: { borderRadius: 6 },

    spacing: 4,

    // MUI requires exactly 25 shadow values (indices 0–24)
    shadows: [
      'none',
      tokens.shadow.sm,
      tokens.shadow.md,
      tokens.shadow.lg,
      tokens.shadow.xl,
      ...Array(20).fill(tokens.shadow.xl),
    ] as any,

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 200ms ease, color 200ms ease',
          },
          'input[type=number]': {
            MozAppearance: 'textfield',
          },
          'input[type=number]::-webkit-outer-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          'input[type=number]::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '6px',
          },
          sizeSmall:  { fontSize: '12px', padding: '3px 10px'  },
          sizeMedium: { fontSize: '13px', padding: '5px 14px'  },
          sizeLarge:  { fontSize: '14px', padding: '7px 18px'  },
        },
      },

      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },

      MuiInputBase: {
        styleOverrides: {
          inputSizeSmall: {
            fontSize: '12px',
            padding: '6px 10px',
          },
          input: {
            fontSize: '13px',
            padding: '8px 12px',
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: '6px',
            backgroundColor: theme.palette.action.hover,
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '&.Mui-focused': {
              backgroundColor: theme.palette.action.selected,
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1.5px solid',
                borderColor: theme.palette.primary.main,
              },
            },
            '&.Mui-error': {
              backgroundColor: theme.palette.mode === 'light'
                ? theme.palette.error.light
                : alpha(theme.palette.error.main, 0.15),
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1.5px solid',
                borderColor: theme.palette.error.main,
              },
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.background.default,
              opacity: 0.6,
            },
          }),
        },
      },

      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '12px',
            padding: '10px 12px',
            borderColor: theme.palette.divider,
            verticalAlign: 'middle',
          }),
          head: ({ theme }) => ({
            fontWeight: 600,
            fontSize: '11px',
            color: theme.palette.text.secondary,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            backgroundColor: theme.palette.background.default,
            padding: '10px 12px',
          }),
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            height: '44px',
            '&:hover': {
              backgroundColor: isLight ? alpha(primary[500], 0.05) : alpha('#ffffff', 0.03),
            },
            '&.Mui-selected': {
              backgroundColor: isLight ? alpha(primary[500], 0.06) : alpha(primary[500], 0.12),
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            height: '22px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '999px',
            padding: '0 8px',
          },
          label: {
            padding: '0 4px',
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: '12px',
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'light' ? tokens.shadow.sm : 'none',
          }),
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '16px',
            '&:last-child': {
              paddingBottom: '16px',
            },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '10px',
            backgroundImage: 'none',
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '15px',
            fontWeight: 600,
            padding: '16px 20px',
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '0 20px 16px',
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 20px',
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            width: 480,
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: '40px',
          },
          indicator: {
            height: '2px',
            borderRadius: '2px',
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'none',
            minHeight: '40px',
            padding: '8px 12px',
            color: theme.palette.text.secondary,
            '&.Mui-selected': {
              fontWeight: 600,
              color: theme.palette.primary.main,
            },
          }),
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '13px',
            padding: '7px 14px',
            minHeight: '36px',
            gap: '8px',
            '&[data-destructive="true"]': {
              color: tokens.color.error[600],
            },
          },
        },
      },

      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: '13px',
          },
          secondary: {
            fontSize: '11px',
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: tokens.borderRadius.sm,
          },
        },
      },

      MuiBreadcrumbs: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '12px',
            color: theme.palette.text.secondary,
          }),
          separator: ({ theme }) => ({
            color: theme.palette.text.disabled,
          }),
        },
      },

      MuiAvatar: {
        styleOverrides: {
          root: {
            width: '32px',
            height: '32px',
            fontSize: '12px',
            fontWeight: 600,
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
          }),
        },
      },

      MuiPaper: {
        styleOverrides: {
          elevation0: { boxShadow: 'none' },
          elevation1: { boxShadow: tokens.shadow.sm },
          elevation2: { boxShadow: tokens.shadow.md },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: { borderRadius: tokens.borderRadius.lg },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: tokens.borderRadius.lg },
        },
      },
    },
  });
}
