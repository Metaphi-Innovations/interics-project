# CLAUDE.md — Foundation Design System

**Read this file completely before writing any code in this project.**

---

## 1. What this project is

This is a **reusable React foundation** — clone it as the starting point for any new SaaS application.

It includes:
- Complete design system with 90+ components
- Runtime theme switching (color, font, dark/light mode)
- Light and dark mode support
- 8 custom responsive breakpoints
- Fully responsive app layout (desktop sidebar + mobile drawer)
- Pre-built navigation, forms, charts, and data tables

---

## 2. Tech stack

- **React 19.2.4** + **Vite 8.0.1** + **TypeScript 5.9.3**
- **MUI v7.3.9** — Material Design components
- **@mui/icons-material 7.3.9** — Icon buttons, status icons
- **@mui/lab 7.0.1-beta.23** — Timeline component
- **@mui/x-date-pickers 8.27.2** — Date/time inputs
- **React Router 7.13.2** — Client-side routing
- **Recharts 3.8.1** — Chart library (Line, Bar, Pie, Area, Radar)
- **React Hook Form + Zod** — Form validation (NOT installed yet, add when needed)
- **Tiptap 3.21.0** — Rich text editor (StarterKit + Link + Placeholder)
- **Zustand 5.0.12** — Toast state management
- **chroma-js 3.2.0** — Color scale generation
- **dayjs 1.11.20** — Date formatting
- **lucide-react 1.7.0** — SVG icons (navigation, UI, features)
- **@emotion/react & @emotion/styled** — MUI styling (required dependency)

---

## 3. Project structure

```
foundation/
├── src/
│   ├── design-system/
│   │   ├── tokens.ts                    ← Brand color, spacing, shadows
│   │   ├── themeConfig.ts              ← Theme config type + defaults
│   │   ├── generateTheme.ts            ← MUI theme factory
│   │   ├── ThemeContext.tsx            ← useFoundationTheme() hook
│   │   └── components/
│   │       ├── index.ts                ← Main barrel export
│   │       ├── primitives/             ← Button, Input, etc.
│   │       │   ├── Button/
│   │       │   ├── IconButton/
│   │       │   ├── Input/
│   │       │   ├── Toggle/
│   │       │   ├── Select/
│   │       │   ├── Checkbox/
│   │       │   ├── Radio/
│   │       │   └── index.ts
│   │       ├── display/                ← Badge, Chip, Tag, Avatar, etc.
│   │       │   ├── Badge/
│   │       │   ├── Avatar/
│   │       │   ├── AvatarGroup/
│   │       │   ├── Chip/
│   │       │   ├── Tag/
│   │       │   ├── ProfileCard/
│   │       │   └── index.ts
│   │       ├── cards/                  ← Card, StatsCard, ImageCard
│   │       │   ├── Card/
│   │       │   ├── StatsCard/
│   │       │   ├── ImageCard/
│   │       │   └── index.ts
│   │       ├── charts/                 ← LineChart, BarChart, etc.
│   │       │   ├── LineChart/
│   │       │   ├── BarChart/
│   │       │   ├── PieChart/
│   │       │   ├── AreaChart/
│   │       │   ├── RadarChart/
│   │       │   └── index.ts
│   │       ├── data-table/             ← DataTable with sorting/filtering
│   │       │   ├── DataTable/
│   │       │   └── index.ts
│   │       ├── feedback/               ← Toast, Modal, Dialog, Popover
│   │       │   ├── Toast/
│   │       │   ├── useToast.ts
│   │       │   ├── Modal/
│   │       │   ├── Popover/
│   │       │   └── index.ts
│   │       ├── forms/                  ← FileUpload, RichTextEditor
│   │       │   ├── FileUpload/
│   │       │   ├── RichTextEditor/
│   │       │   └── index.ts
│   │       ├── infographics/           ← Infographic SVG components
│   │       └── navigation/             ← AppShell, Sidebar, Topbar
│   │           ├── AppShell/
│   │           ├── Sidebar/
│   │           ├── Topbar/
│   │           ├── CommandPalette/
│   │           └── index.ts
│   ├── pages/
│   │   ├── Preview/index.tsx           ← Component showcase
│   │   └── Settings/
│   │       ├── index.tsx               ← Theme settings panel
│   │       └── components/
│   │           └── SettingsFab.tsx     ← Floating action button
│   ├── components/                     ← App-specific wrapper components
│   ├── App.tsx                         ← Root component + routing
│   └── main.tsx                        ← React DOM mount point
├── package.json
├── tsconfig.app.json
└── CLAUDE.md                           ← You are here
```

---

## 4. Theme system

### How it works

1. **ThemeConfig** (defined in `themeConfig.ts`):
   - `brandColor`: Hex string (default: `#6366F1` — Indigo)
   - `fontFamily`: String (default: `"Inter"`)
   - `mode`: `"light" | "dark"` (default: `"light"`)

2. **Persistence**: Saved to localStorage key `foundation:theme`

3. **generateTheme()** (in `generateTheme.ts`):
   - Takes `ThemeConfig` → returns MUI Theme object
   - Derives all colors from brand color using `chroma-js`
   - Sets Typography, Component overrides, Spacing, Breakpoints

4. **FoundationThemeProvider** (in `ThemeContext.tsx`):
   - Wraps the entire app
   - Loads saved config from localStorage on mount
   - Google Fonts loader (skipped for "Helvetica Neue")

### To change the brand color

The **ONLY** value to change for rebranding:

```typescript
// src/design-system/tokens.ts
export const BRAND_COLOR = '#6366F1';
```

All 11-stop color scales (primary, neutral, error, success, warning, info) derive automatically from this value.

### To access theme in components

```typescript
import { useFoundationTheme } from '@/design-system/ThemeContext'

function MyComponent() {
  const { isDark, setMode, config, muiTheme } = useFoundationTheme()

  return (
    <Box sx={{ color: muiTheme.palette.primary.main }}>
      {isDark ? 'Dark mode' : 'Light mode'}
    </Box>
  )
}
```

**Hook returns:**
- `config: ThemeConfig` — current theme config
- `setConfig: (config) => void` — set entire config
- `setBrandColor: (hex) => void` — quick setter
- `setFontFamily: (font) => void` — quick setter
- `setMode: ('light' | 'dark') => void` — quick setter
- `toggleMode: () => void` — toggle dark/light
- `isDark: boolean` — computed from mode
- `muiTheme: Theme` — current MUI theme object

### Available fonts

From `themeConfig.ts` — all loaded via Google Fonts:

- `"Inter"` (default)
- `"Plus Jakarta Sans"`
- `"DM Sans"`
- `"Geist"`
- `"Manrope"`
- `"Poppins"`
- `"Helvetica Neue"` (system font, no loading needed)

### Available color presets

From `themeConfig.ts`:

- `#6366F1` — Indigo (default)
- `#7C3AED` — Violet
- `#2563EB` — Blue
- `#0D9488` — Teal
- `#059669` — Green
- `#EA580C` — Orange
- `#E11D48` — Rose
- `#475569` — Slate

### Breakpoints

Defined in `generateTheme.ts` — **8 breakpoints**:

| Name | Min Width |
|------|-----------|
| xs   | 0px       |
| sm   | 600px     |
| md   | 900px     |
| lg   | 1024px    |
| xl   | 1280px    |
| xxl  | 1440px    |
| xxxl | 1600px    |
| uhd  | 1920px    |

Usage in `sx` prop:
```typescript
sx={{ display: { xs: 'none', lg: 'flex' } }}
sx={{ p: { xs: 2, md: 4, lg: 5 } }}
```

---

## 5. Import rules — CRITICAL

### UI Components (90%+ of cases)

Read from single barrel export:

```typescript
✅ import { Button, Input, Card, Badge } from '@/design-system/components'
```

**Never** import MUI components directly for UI:
```typescript
❌ import { TextField } from '@mui/material'
❌ import { Button } from '@mui/material'
```

**Exception** — Layout primitives + hooks only:
```typescript
✅ import { Box, Stack, Grid } from '@mui/material'
✅ import { Typography } from '@mui/material'
✅ import { useTheme, alpha } from '@mui/material/styles'
✅ import { useMediaQuery } from '@mui/material'
```

### Tokens

```typescript
✅ import { tokens } from '@/design-system/tokens'

sx={{ color: tokens.color.primary[500] }}
sx={{ p: tokens.spacing[4] }}
```

### Theme context hook

```typescript
✅ import { useFoundationTheme } from '@/design-system/ThemeContext'

const { isDark, setMode } = useFoundationTheme()
```

### Icons

**Navigation, sidebar, topbar, page headers, features** (16–20px):
```typescript
✅ import { Home, Settings, Users, Bell } from 'lucide-react'

<Home size={16} strokeWidth={1.75} />
<Bell size={18} strokeWidth={1.75} />
```

**MUI widget icons only** (close buttons, sort arrows, validation icons inside MUI components):
```typescript
✅ import CloseIcon from '@mui/icons-material/Close'
✅ import SortIcon from '@mui/icons-material/Sort'

<IconButton><CloseIcon /></IconButton>
```

### Colors

**Never hardcode hex values:**
```typescript
❌ sx={{ color: '#6366F1' }}

✅ sx={{ color: tokens.color.primary[500] }}
✅ sx={{ color: theme.palette.primary.main }}
✅ sx={{ bgcolor: alpha('#000000', 0.05) }}
```

### Spacing

**Never hardcode pixel values:**
```typescript
❌ sx={{ padding: '16px', gap: '8px' }}

✅ sx={{ p: 4, gap: 2 }}
```

MUI spacing scale: `1 unit = 4px`
- `0` = 0px
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `5` = 20px
- etc.

### TypeScript — verbatimModuleSyntax

`tsconfig.app.json` requires **`import type`** for type-only imports:

```typescript
✅ import type { SxProps } from '@mui/material'
✅ import type { Theme } from '@mui/material/styles'
✅ import { useTheme } from '@mui/material/styles'

❌ import { SxProps } from '@mui/material'
❌ import { Theme } from '@mui/material/styles'
```

---

## 6. App layout structure

### Overview

**Desktop (lg+)**:
```
┌──────────────────────────────────────┐
│  Permanent Sidebar  │ Topbar (52px)  │
│  (240px or 64px)    ├────────────────┤
│                     │ Content (flex) │
│                     │                │
└──────────────────────────────────────┘
```

**Mobile/Tablet (<lg)**:
```
┌──────────────────────────────────────┐
│ Hamburger  Topbar (52px)    Bell SJ  │
├──────────────────────────────────────┤
│ Content (full width)                 │
│ [Drawer slides in on hamburger]      │
└──────────────────────────────────────┘
```

### AppShell (`src/design-system/components/navigation/AppShell/index.tsx`)

**Breakpoint logic:**
```typescript
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
```

**Desktop (lg+)**:
- Permanent Sidebar visible (width: 240px or 64px)
- Collapse toggle in Sidebar logo area
- Hamburger hidden in Topbar
- Content flex-shrinks next to Sidebar

**Mobile/Tablet (<lg)**:
- No permanent Sidebar
- Drawer appears on hamburger click (temporary overlay)
- Content full width
- Drawer auto-closes when resizing to desktop

**State:**
```typescript
const [collapsed, setCollapsed] = useState(...)     // Desktop only
const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
```

Sidebar widths:
- Expanded: `240px`
- Collapsed: `64px` (desktop only)

Content padding:
```typescript
p: { xs: 2, md: 3, lg: 4 }  // 8px, 12px, 16px
```

### Sidebar (`src/design-system/components/navigation/Sidebar/index.tsx`)

**Logo area (52px height)**:

*Expanded (240px)*:
- Blue gradient square with "F"
- "Foundation" text
- Collapse chevron (left arrow)
- Clicking arrow → collapses to 64px

*Collapsed (64px)*:
- Just the blue gradient "F" square, centered
- Clicking logo → expands to 240px

**Navigation**:
- Renders `navConfig` items
- Active nav items: subtle brand bg pill + brand text
- Icons: 16px from lucide-react

**Bottom section**:
- Divider
- "Help & Docs" NavItem with `?` icon
- href: `/docs`

**Mobile drawer**:
- Always rendered at 240px (not collapsible)
- Closes on route change
- Closes when clicking collapse toggle

### Topbar (`src/design-system/components/navigation/Topbar/index.tsx`)

**Height**: 52px (constant `TOPBAR_HEIGHT`)

**Layout** (left to right):

1. **LEFT**: Hamburger icon (conditional)
   - Shown if `showMenuButton={true}` (mobile/tablet only)
   - 32×32px IconButton with Menu icon (18px)
   - Triggers drawer open

2. **SEARCH PILL**: Always left-aligned, immediately after hamburger
   - xs: 34px (icon only)
   - sm: 200px (icon + "Search..." text)
   - md: 240px (+ ⌘K kbd label)
   - lg: 280px
   - Click triggers command palette

3. **SPACER**: `<Box sx={{ flex: 1 }} />` pushes right section to end

4. **RIGHT**: Bell + Divider + UserMenu
   - Bell: 34×34 IconButton, shows notification badge
   - Divider: vertical, subtle opacity
   - UserMenu: Avatar trigger + dropdown (profile, settings, theme toggle, sign out)

**Props:**
```typescript
interface TopbarProps {
  onMenuToggle: () => void
  user: UserMenuUser
  notificationCount?: number
  onNotificationClick?: () => void
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onSearchClick?: () => void
  showMenuButton?: boolean  // true on mobile, false on desktop
}
```

### Responsive per breakpoint

| Breakpoint | Sidebar | Hamburger | Search pill width |
|------------|---------|-----------|-------------------|
| xs (<600)  | Drawer  | ✓ shown   | 34px (icon)       |
| sm-md      | Drawer  | ✓ shown   | 200px             |
| lg+ (1024) | Perm    | ✗ hidden  | 280px             |

---

## 7. Component inventory

### All components available via single import:

```typescript
import {
  // Primitives
  Button, IconButton, Input, Toggle, Select, Checkbox, Radio,

  // Display
  Badge, Avatar, AvatarGroup, Chip, Tag, ProfileCard,

  // Cards
  Card, StatsCard, ImageCard,

  // Charts
  LineChart, BarChart, PieChart, AreaChart, RadarChart,

  // Data Table
  DataTable,

  // Feedback
  Modal, Popover, useToast,

  // Forms
  FileUpload, RichTextEditor,

  // Navigation
  AppShell, Sidebar, Topbar, CommandPalette,

  // Type exports
  type NavConfig, type UserMenuUser,
} from '@/design-system/components'
```

### Key component props

**Button**:
- `variant`: "primary" | "secondary" | "neutral"
- `size`: "sm" | "md" | "lg"
- `disabled`: boolean
- `fullWidth`: boolean

**Input**:
- `size`: "sm" | "md" | "lg"
- `disabled`: boolean
- `error`: boolean
- `helperText`: string

**Badge**:
- `color`: "primary" | "neutral" | "error" | "success" | "warning" | "info"
- `variant`: "dot" boolean
- `max`: number

**Avatar**:
- `size`: "xs" | "sm" | "md" | "lg" | "xl"
- `src`: string
- `name`: string

**Card**:
- `sx`: SxProps (any MUI sx)
- `children`: ReactNode

**DataTable**:
- `data`: T[]
- `columns`: Column<T>[]
- `isLoading`: boolean
- `onRowClick`: (row: T) => void

**Modal**:
- `open`: boolean
- `onClose`: () => void
- `title`: string
- `children`: ReactNode

**RichTextEditor**:
- `value`: string
- `onChange`: (html: string) => void
- `placeholder`: string

---

## 8. Responsive design rules

### Pattern 1: sx prop (90% of cases)

For style changes only:
```typescript
sx={{ display: { xs: 'none', lg: 'flex' } }}
sx={{ p: { xs: 2, md: 4, lg: 5 } }}
sx={{ fontSize: { xs: '12px', md: '16px' } }}
```

### Pattern 2: useMediaQuery (structural rendering)

When component renders differently:
```typescript
import { useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

function MyComponent() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  return isDesktop ? <DesktopLayout /> : <MobileLayout />
}
```

### Pattern 3: MUI Grid (columns)

```typescript
import { Grid } from '@mui/material'

<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6, lg: 3 }} />
</Grid>
```

### Never write raw @media queries

```typescript
❌ sx={{
     '@media (max-width: 600px)': { display: 'none' }
   }}

✅ sx={{ display: { xs: 'none', sm: 'block' } }}
```

---

## 9. Self-check before every file

Before submitting any code, verify:

**Architecture:**
- ☐ Importing from `@/design-system/components` (not MUI)?
- ☐ Using `tokens` for colors?
- ☐ Using Lucide icons for nav/UI (not MUI icons)?
- ☐ All `import type` for type-only imports?
- ☐ No hardcoded hex colors?
- ☐ No hardcoded px values?
- ☐ No `any` TypeScript types?

**Responsive:**
- ☐ Works on xs (375px)?
- ☐ Works on lg (1024px)?
- ☐ Uses `sx` prop, `useMediaQuery`, or Grid?
- ☐ No raw `@media` queries?

**Quality:**
- ☐ Loading state handled?
- ☐ Empty state handled?
- ☐ Error state handled?
- ☐ All props have explicit TypeScript types?

---

## 10. Common Claude Code prompts

**Start every prompt with:**
```
Read CLAUDE.md first. Then: [your request]
```

**To generate a new component:**
```
Read CLAUDE.md. Add [ComponentName] to
src/design-system/components/[category]/.

Props: [describe what it does]

Follow all design system rules in CLAUDE.md:
- Import from @/design-system/components (not @mui)
- Use tokens for colors
- Use import type for types
- No hardcoded hex or px values
```

**To audit for violations:**
```
Read CLAUDE.md. Audit the entire src/ codebase for violations:

- Direct imports from @mui/material (should be @/design-system/components)
- Hardcoded hex colors (should use tokens)
- Hardcoded spacing values in px (should use MUI spacing scale)
- Missing TypeScript types (should have explicit types)
- Raw @media queries (should use sx responsive or useMediaQuery)

List all violations found and fix them.
```

**If Claude Code drifts:**
```
Stop. Read CLAUDE.md again.

You broke rule [#X]:
[what was wrong]

Rewrite the code following CLAUDE.md exactly.
```

---

## 11. Tokens reference

**Color example:**
```typescript
sx={{ color: tokens.color.primary[500] }}          // Brand color
sx={{ color: tokens.color.neutral[600] }}          // Gray
sx={{ color: tokens.color.error[500] }}            // Red
sx={{ color: tokens.color.success[500] }}          // Green
sx={{ color: tokens.color.warning[500] }}          // Orange
sx={{ color: tokens.color.info[500] }}             // Blue
```

**Spacing example:**
```typescript
sx={{ p: 2 }}          // 8px
sx={{ gap: 3 }}        // 12px
sx={{ mt: 4 }}         // 16px margin-top
sx={{ px: { xs: 2, md: 4 } }}  // 8px xs, 16px md
```

**Shadow example:**
```typescript
sx={{ boxShadow: tokens.shadow.sm }}   // Subtle
sx={{ boxShadow: tokens.shadow.md }}   // Medium
sx={{ boxShadow: tokens.shadow.lg }}   // Large
```

---

## 12. localStorage keys

- `foundation:theme` — Persisted ThemeConfig
- `foundation:sidebar-collapsed` — Sidebar collapsed state (desktop)

---

## Final note

This foundation is **intentionally prescriptive**. Every rule in CLAUDE.md exists because:
1. It keeps code consistent across the app
2. It prevents common design system mistakes
3. It makes refactoring easier
4. It ensures dark mode works everywhere

If you find a rule that doesn't make sense, **fix CLAUDE.md** — don't work around it.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
