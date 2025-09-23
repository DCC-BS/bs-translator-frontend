# Tailwind CSS v4 Migration Guide

## Summary of Changes

Your Tailwind v3 color configuration has been successfully upgraded to the new v4 CSS theme format. Here's what was changed:

### New Files Created

1. **`app/assets/css/theme.css`** - Contains all your color definitions using the new `@theme` directive
2. **`app/assets/css/primary-overrides.css`** - Handles runtime customizable primary colors
3. **`tailwind.v4.config.ts`** - Simplified Tailwind v4 configuration

### Modified Files

1. **`app/assets/css/main.css`** - Updated import order to include theme files before Tailwind
2. **`tailwind.config.ts`** - Removed color imports and configuration (kept original as backup)

## Key Changes in v4 Format

### Color Definition Format
**Before (v3):**
```typescript
const colors = {
    green: {
        50: "#F2F7F3",
        100: "#DDECDE",
        // ...
    }
};
```

**After (v4):**
```css
@theme {
  --color-green-50: #F2F7F3;
  --color-green-100: #DDECDE;
  /* ... */
}
```

### Benefits of v4 Approach

1. **Better Performance**: Colors are defined at the CSS level, reducing JavaScript bundle size
2. **Runtime Customization**: Easy to override colors with CSS custom properties
3. **Better Browser Support**: Uses native CSS features
4. **Improved DX**: No need to rebuild when changing colors

### Migrated Color Palettes

All your existing color palettes have been migrated:
- ✅ Green (10 shades)
- ✅ Blue (10 shades) 
- ✅ Purple (10 shades)
- ✅ Red (10 shades)
- ✅ Gray (11 shades including gray-20)
- ✅ Brown (10 shades)
- ✅ Yellow (10 shades)
- ✅ Teal (10 shades)

### Primary Color Handling

The dynamic primary colors that can be overridden by the Bettingen site at runtime are now handled in `primary-overrides.css` using RGB values that can be easily customized.

### Usage in Components

Your existing component code should continue to work without changes:
```vue
<!-- These will still work -->
<div class="bg-green-500 text-white">
<div class="border-blue-300">
<div class="text-purple-600">
```

### Next Steps

1. **Test thoroughly** - Verify all colors render correctly across your application
2. **Update primary color overrides** - If needed, adjust the RGB values in `primary-overrides.css`
3. **Clean up** - Once verified, you can remove the old `colors.ts` file and original config
4. **Consider OKLCH** - For even better color consistency, consider converting to OKLCH format

### File Structure
```
app/assets/css/
├── main.css (updated)
├── theme.css (new - all color definitions)
├── primary-overrides.css (new - runtime customizable colors)
└── ...other css files
```

## Troubleshooting

If you encounter issues:
1. Ensure the import order in `main.css` is correct (theme files before tailwindcss)
2. Check that all color references in components still work
3. Verify primary color overrides work as expected
4. Consider using the simplified `tailwind.v4.config.ts` if needed

The migration preserves all your existing color values while providing a more maintainable and performant structure for Tailwind CSS v4.