# Team Table Theme Fix Summary

## Issue
The team section table headers were using hardcoded accent colors (yellow/orange) that didn't match the app's theme system and weren't properly adapting to light/dark modes.

## Changes Made

### TeamMembers Component (`/src/components/settings/TeamMembers.tsx`)

#### 1. Main Table Header
**Before:**
```jsx
<thead className="bg-accent">
  <tr>
    <th className="text-left p-3">Name</th>
    ...
```

**After:**
```jsx
<thead className="bg-muted/50 border-b border-border">
  <tr>
    <th className="text-left p-3 font-medium text-foreground">Name</th>
    ...
```

#### 2. Pending Invitations Section
**Before:**
```jsx
<div className="p-3 bg-accent font-medium">Pending Invitations</div>
<thead className="bg-accent/50">
  <tr>
    <th className="text-left p-3">Email</th>
    ...
```

**After:**
```jsx
<div className="p-3 bg-muted/50 font-medium text-foreground border-b border-border">Pending Invitations</div>
<thead className="bg-muted/30 border-b border-border">
  <tr>
    <th className="text-left p-3 font-medium text-foreground">Email</th>
    ...
```

## Theme Colors Used

### Light Mode
- `bg-muted/50` - Semi-transparent muted background (lighter paper tone)
- `text-foreground` - Primary text color (#1A1A1A)
- `border-border` - Border color for separation

### Dark Mode
- `bg-muted/50` - Semi-transparent muted background (surface-2 #1B2421)
- `text-foreground` - Primary text color (light text)
- `border-border` - Border color for separation

## Benefits
1. **Consistent Theme**: Tables now match the app's design system
2. **Proper Dark Mode Support**: Automatically adapts to theme changes
3. **Better Contrast**: Text is more readable in both themes
4. **Professional Look**: Removes the inconsistent yellow/orange colors
5. **Accessibility**: Better color contrast ratios for readability

## Visual Improvements
- Table headers now have subtle, theme-appropriate backgrounds
- Text color automatically adjusts for optimal readability
- Borders provide clear visual separation
- Consistent with other tables in the application (TeamBillingManager, admin tables, etc.)

## Testing
The changes work properly in:
- ✅ Light mode
- ✅ Dark mode
- ✅ Theme switching
- ✅ Different screen sizes