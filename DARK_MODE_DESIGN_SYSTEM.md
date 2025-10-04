# Dark Mode Design System

## Overview

The MEV Analytics Platform implements a comprehensive dark mode design system using Tailwind CSS's class-based dark mode approach. The theme is toggled via a context provider and persists across sessions using localStorage.

---

## Theme Implementation

### Theme Provider
- **Location**: `frontend/src/contexts/ThemeContext.jsx`
- **Method**: Class-based (`dark` class on root element)
- **Persistence**: localStorage (`theme` key)
- **Default**: System preference detection via `prefers-color-scheme`

### Toggle Mechanism
```jsx
// Theme toggle in header
<Button variant="ghost" size="sm" onClick={toggleTheme}>
  {isDark ? <Sun /> : <Moon />}
</Button>
```

---

## Color Palette

### Background Colors

#### Primary Backgrounds
- **Light Mode**: `bg-gray-50` (#F9FAFB)
- **Dark Mode**: `bg-gray-900` (#111827)

#### Card/Surface Backgrounds
- **Light Mode**: `bg-white` (#FFFFFF)
- **Dark Mode**: `bg-gray-800` (#1F2937)

#### Secondary Surfaces
- **Light Mode**: `bg-gray-100` (#F3F4F6)
- **Dark Mode**: `bg-gray-700` (#374151)

### Text Colors

#### Primary Text
- **Light Mode**: `text-gray-900` (#111827)
- **Dark Mode**: `text-gray-100` (#F3F4F6)

#### Secondary Text
- **Light Mode**: `text-gray-600` (#4B5563)
- **Dark Mode**: `text-gray-300` (#D1D5DB)

#### Tertiary/Muted Text
- **Light Mode**: `text-gray-500` (#6B7280)
- **Dark Mode**: `text-gray-400` (#9CA3AF)

### Border Colors

#### Default Borders
- **Light Mode**: `border-gray-200` (#E5E7EB)
- **Dark Mode**: `border-gray-700` (#374151)

#### Dividers
- **Light Mode**: `border-gray-200` (#E5E7EB)
- **Dark Mode**: `border-gray-700` (#374151)

---

## Brand Colors

### Primary (Blue)
Used for primary actions, links, and active states.

| Shade | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| 50 | #EFF6FF | - | Backgrounds |
| 100 | #DBEAFE | #1E3A8A | Active backgrounds |
| 500 | #3B82F6 | #3B82F6 | Default |
| 600 | #2563EB | #2563EB | Hover |
| 900 | #1E3A8A | #DBEAFE | Active dark |

### Secondary (Purple)
Used for secondary actions and accents.

| Shade | Light Mode | Dark Mode |
|-------|------------|-----------|
| 500 | #A855F7 | #A855F7 |
| 600 | #9333EA | #9333EA |

### Success (Green)
Used for profit indicators and success states.

| Shade | Light Mode | Dark Mode |
|-------|------------|-----------|
| 500 | #10B981 | #10B981 |
| 600 | #059669 | #059669 |

### Warning (Yellow/Orange)
Used for moderate risk and warnings.

| Shade | Light Mode | Dark Mode |
|-------|------------|-----------|
| 500 | #F59E0B | #F59E0B |
| 600 | #D97706 | #D97706 |

### Danger (Red)
Used for high risk and error states.

| Shade | Light Mode | Dark Mode |
|-------|------------|-----------|
| 500 | #EF4444 | #EF4444 |
| 600 | #DC2626 | #DC2626 |

---

## MEV-Specific Colors

### Opportunity Types
```js
mev: {
  profit: '#10B981',      // Green
  moderate: '#F59E0B',    // Orange
  risk: '#EF4444',        // Red
  arbitrage: '#3B82F6',   // Blue
  liquidation: '#8B5CF6', // Purple
  sandwich: '#F97316',    // Orange
}
```

### Usage Examples
- **Arbitrage**: Blue badge (`bg-blue-500 text-white`)
- **Liquidation**: Purple badge (`bg-purple-500 text-white`)
- **Sandwich**: Orange badge (`bg-orange-500 text-white`)

---

## Component Patterns

### Cards
```jsx
<Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
    <CardTitle className="text-gray-900 dark:text-gray-100">
      Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-gray-600 dark:text-gray-400">Content</p>
  </CardContent>
</Card>
```

### Buttons

#### Primary Button
- **Light**: `bg-primary-600 hover:bg-primary-700 text-white`
- **Dark**: Same (maintains contrast)

#### Secondary Button
- **Light**: `bg-gray-200 hover:bg-gray-300 text-gray-900`
- **Dark**: `bg-gray-700 hover:bg-gray-600 text-gray-100`

#### Ghost Button
- **Light**: `hover:bg-gray-100 text-gray-700`
- **Dark**: `hover:bg-gray-800 text-gray-300`

### Navigation

#### Sidebar
- **Background Light**: `bg-white border-gray-200`
- **Background Dark**: `bg-gray-800 border-gray-700`

#### Active Navigation Item
- **Light**: `bg-primary-100 text-primary-900`
- **Dark**: `bg-primary-900 text-primary-100`

#### Inactive Navigation Item
- **Light**: `text-gray-600 hover:bg-gray-50`
- **Dark**: `text-gray-300 hover:bg-gray-700`

### Header/Top Bar
- **Background Light**: `bg-white border-gray-200`
- **Background Dark**: `bg-gray-800 border-gray-700`

### Dropdowns/Modals
- **Background Light**: `bg-white shadow-lg ring-1 ring-black ring-opacity-5`
- **Background Dark**: `bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5`
- **Item Hover Light**: `hover:bg-gray-100`
- **Item Hover Dark**: `hover:bg-gray-700`

---

## Form Elements

### Input Fields
```jsx
<input className="
  w-full px-3 py-2 
  border border-gray-300 dark:border-gray-600 
  bg-white dark:bg-gray-700 
  text-gray-900 dark:text-gray-100
  rounded-lg
  focus:ring-2 focus:ring-primary-500
" />
```

### Select Dropdowns
```jsx
<select className="
  px-4 py-2 
  border border-gray-300 dark:border-gray-600 
  bg-white dark:bg-gray-700 
  text-gray-900 dark:text-gray-100
  rounded-lg
" />
```

---

## Interactive States

### Hover States
- **Cards**: `hover:bg-gray-50 dark:hover:bg-gray-800`
- **Buttons**: Darker shade of base color
- **Links**: `hover:text-gray-700 dark:hover:text-gray-200`

### Focus States
- **All Interactive Elements**: `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`
- **Dark Mode Offset**: `dark:focus:ring-offset-gray-900`

### Active States
- **Navigation**: `bg-primary-100 dark:bg-primary-900`
- **Buttons**: Pressed state with darker shade

### Disabled States
- **Opacity**: `disabled:opacity-50`
- **Cursor**: `disabled:cursor-not-allowed`

---

## Badges & Tags

### Opportunity Type Badges
```jsx
// Arbitrage
<span className="bg-blue-500 text-white px-2 py-1 rounded-full">
  Arbitrage
</span>

// Liquidation
<span className="bg-purple-500 text-white px-2 py-1 rounded-full">
  Liquidation
</span>

// Sandwich
<span className="bg-orange-500 text-white px-2 py-1 rounded-full">
  Sandwich
</span>
```

### Risk Level Badges
```jsx
// Low Risk
<span className="bg-green-100 text-green-600 px-2 py-1 rounded">
  Low Risk
</span>

// Medium Risk
<span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded">
  Medium Risk
</span>

// High Risk
<span className="bg-red-100 text-red-600 px-2 py-1 rounded">
  High Risk
</span>
```

### Confidence Badges
```jsx
<span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
  85% confidence
</span>
```

---

## Data Visualization

### Profit Indicators
- **Positive**: `text-green-600` (both modes)
- **Negative**: `text-red-600` (both modes)
- **Neutral**: `text-gray-600 dark:text-gray-400`

### Progress Bars
```jsx
<div className="w-full bg-gray-700 rounded-full h-3">
  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" 
       style={{ width: '75%' }} />
</div>
```

### Status Indicators
- **Success**: `bg-green-500` dot
- **Warning**: `bg-yellow-500` dot
- **Error**: `bg-red-500` dot
- **Info**: `bg-blue-500` dot

---

## Education System

### Module Cards
- **Background**: `bg-gray-800` (dark mode)
- **Hover**: `hover:bg-gray-750 border-blue-500`
- **Completed**: Green checkmark `text-green-400`

### Difficulty Badges
```jsx
// Beginner
<span className="bg-green-900 text-green-400 px-2 py-1 rounded">
  beginner
</span>

// Intermediate
<span className="bg-yellow-900 text-yellow-400 px-2 py-1 rounded">
  intermediate
</span>

// Advanced
<span className="bg-red-900 text-red-400 px-2 py-1 rounded">
  advanced
</span>
```

---

## Shadows & Elevation

### Card Shadows
- **Light Mode**: `shadow-sm` (subtle)
- **Dark Mode**: `shadow-sm` (maintains depth)
- **Hover**: `hover:shadow-md`

### Modal/Dropdown Shadows
- **Both Modes**: `shadow-lg ring-1 ring-black ring-opacity-5`

---

## Transitions & Animations

### Standard Transitions
```css
transition-colors    /* Color changes */
transition-all       /* All properties */
transition-shadow    /* Shadow changes */
```

### Durations
- **Fast**: `duration-150` (150ms)
- **Normal**: `duration-200` (200ms)
- **Slow**: `duration-300` (300ms)

### Custom Animations
```js
animation: {
  'fade-in': 'fadeIn 0.5s ease-in-out',
  'slide-up': 'slideUp 0.3s ease-out',
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

---

## Typography

### Font Families
- **Sans**: Inter, system-ui, sans-serif
- **Mono**: JetBrains Mono, monospace

### Headings
```jsx
// H1
<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">

// H2
<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">

// H3
<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
```

### Body Text
```jsx
// Primary
<p className="text-gray-900 dark:text-gray-100">

// Secondary
<p className="text-gray-600 dark:text-gray-400">

// Small
<p className="text-sm text-gray-500 dark:text-gray-400">
```

---

## Accessibility

### Contrast Ratios
All color combinations meet WCAG AA standards:
- **Normal Text**: 4.5:1 minimum
- **Large Text**: 3:1 minimum
- **UI Components**: 3:1 minimum

### Focus Indicators
- Visible focus ring on all interactive elements
- `focus:ring-2 focus:ring-primary-500`

### Screen Reader Support
- Semantic HTML elements
- ARIA labels where needed
- Skip to content link

---

## Best Practices

### Always Pair Light/Dark Classes
```jsx
// ✅ Good
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// ❌ Bad
<div className="bg-white text-gray-900">
```

### Use Semantic Color Names
```jsx
// ✅ Good
<Button variant="primary">Submit</Button>

// ❌ Bad
<Button className="bg-blue-600">Submit</Button>
```

### Maintain Consistent Spacing
- Use Tailwind's spacing scale (4px increments)
- Consistent padding/margin across similar components

### Test Both Modes
- Always test components in both light and dark mode
- Verify contrast ratios
- Check hover/focus states

---

## Implementation Checklist

When adding new components:

- [ ] Add `dark:` variants for all background colors
- [ ] Add `dark:` variants for all text colors
- [ ] Add `dark:` variants for all border colors
- [ ] Test hover states in both modes
- [ ] Test focus states in both modes
- [ ] Verify contrast ratios
- [ ] Check on different screen sizes
- [ ] Test with system theme changes

---

## Future Enhancements

### Potential Additions
1. **Custom Theme Colors**: Allow users to customize accent colors
2. **High Contrast Mode**: Enhanced contrast for accessibility
3. **Auto Theme Switching**: Based on time of day
4. **Theme Presets**: Multiple dark mode variants (OLED, Midnight, etc.)
5. **Reduced Motion**: Respect `prefers-reduced-motion`

---

## Resources

- **Tailwind Dark Mode Docs**: https://tailwindcss.com/docs/dark-mode
- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

*Last Updated: 2024*
