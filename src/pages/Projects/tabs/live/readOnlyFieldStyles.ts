/** Keeps disabled TextField values readable (MUI defaults to low opacity). */
export const READONLY_DISABLED_TEXTFIELD_SX = {
  '& .MuiInputBase-root.Mui-disabled': {
    opacity: 1,
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: 'currentColor',
    color: 'text.primary',
    opacity: 1,
  },
} as const
