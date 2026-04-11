import { createTheme, alpha, type Theme } from '@mui/material/styles';
import type { ThemeConfig } from './themeConfig';
import { generateScale, generateNeutralScale, tokens } from './tokens';

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
  const neutral = generateNeutralScale(config.brandColor);

  const isLight = config.mode === 'light';

  const background = {
    default: isLight ? '#F8FAFB'  : '#0F0F0F',
    paper:   isLight ? '#FFFFFF'  : neutral[900],
  };

  const text = {
    primary:   isLight ? neutral[900] : neutral[50],
    secondary: isLight ? neutral[600] : neutral[400],
    disabled:  isLight ? neutral[400] : neutral[700],
  };

  const divider = isLight ? alpha('#000000', 0.06) : alpha('#ffffff', 0.08);

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
        light:       primary[400],
        main:        primary[500],
        dark:        primary[700],
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
      body1:   { fontSize: '13px', lineHeight: 1.5 },
      body2:   { fontSize: '12px', lineHeight: 1.5 },
      caption: { fontSize: '11px', lineHeight: 1.5 },
      overline: {
        fontSize:      '10px',
        fontWeight:    600,
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
          root: {
            borderRadius: '6px',
            backgroundColor: isLight ? '#F3F3F5' : alpha('#ffffff', 0.06),
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '&.Mui-focused': {
              backgroundColor: isLight ? '#EAEAEF' : alpha('#ffffff', 0.10),
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1.5px solid',
                borderColor: primary[500],
              },
            },
            '&.Mui-error': {
              backgroundColor: '#FEF2F2',
              '& .MuiOutlinedInput-notchedOutline': {
                border: '1.5px solid',
                borderColor: '#DC2626',
              },
            },
            '&.Mui-disabled': {
              backgroundColor: isLight ? '#F8FAFB' : alpha('#ffffff', 0.03),
              opacity: 0.6,
            },
          },
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
          root: {
            fontSize: '12px',
            padding: '10px 12px',
            borderColor: isLight ? neutral[100] : alpha('#ffffff', 0.07),
            verticalAlign: 'middle',
          },
          head: {
            fontWeight: 600,
            fontSize: '11px',
            color: isLight ? neutral[500] : neutral[400],
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            backgroundColor: isLight ? '#F8FAFB' : neutral[900],
            padding: '10px 12px',
          },
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
          root: {
            borderRadius: '12px',
            backgroundImage: 'none',
            border: `1px solid ${isLight ? '#E8EEEC' : alpha('#ffffff', 0.08)}`,
            boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          },
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
          root: {
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'none',
            minHeight: '40px',
            padding: '8px 12px',
            color: isLight ? neutral[500] : neutral[400],
            '&.Mui-selected': {
              fontWeight: 600,
              color: primary[600],
            },
          },
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
          root: {
            fontSize: '12px',
            color: isLight ? neutral[500] : neutral[400],
          },
          separator: {
            color: isLight ? neutral[300] : neutral[600],
          },
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
          root: {
            borderColor: isLight ? neutral[100] : alpha('#ffffff', 0.08),
          },
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
