# Risy DAO Theme Guide

## Color Scheme
- Primary gradient: `linear-gradient(135deg, #6366F1, #3B82F6, #2DD4BF)`
- Background: Dark theme with `bg-gray-900` (#111827) as base
- Text: White (`text-white`) for main content
- Secondary text: `text-gray-400` (#9CA3AF) for less prominent content
- Accent colors:
  - Indigo: `text-indigo-400` (#818CF8) (hover: `text-indigo-300` (#A5B4FC))
  - Buttons: `bg-indigo-600` (#4F46E5) (hover: `bg-indigo-700` (#4338CA))
  - Success: `text-green-400` (#34D399)
  - Warning: `text-yellow-400` (#FBBF24)
  - Error: `text-red-400` (#F87171)

## Typography
- Font family: 'Poppins' (weights: 300, 400, 600, 700)
- Heading sizes:
  - H1: `text-4xl` (2.25rem)
  - H2: `text-3xl` (1.875rem)
  - H3: `text-2xl` (1.5rem)
  - H4: `text-xl` (1.25rem)
- Body text: `text-base` (1rem)
- Small text: `text-sm` (0.875rem)

## Spacing & Layout
- Container: `container mx-auto px-4 sm:px-6 lg:px-8`
- Section spacing: `py-12 md:py-16 lg:py-20`
- Grid system: 
  - Default: `grid grid-cols-1`
  - Tablet: `md:grid-cols-2`
  - Desktop: `lg:grid-cols-4`
- Gap spacing: `gap-4 md:gap-6 lg:gap-8`

## Component Styles
### Cards
- Background: `bg-gray-800`
- Rounded corners: `rounded-lg`
- Shadow: `shadow-lg`
- Padding: `p-6`

## Animation Classes
Reference to animations in styles.css:

```21:29:assets/styles.css
.animate-float {
    animation: float 6s ease-in-out infinite;
}

@keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
}
```


## Hover Effects
- Links: Smooth transition with `transition`
- Cards: Scale transform on hover with shadow increase
- Buttons: Background color change with `transition`

## Responsive Design
- Mobile-first approach
- Breakpoints:
  - sm: 375px
  - md: 768px
  - lg: 1024px
- Responsive padding adjustments
- Column adjustments using Tailwind's responsive prefixes

## Custom UI Elements
- Custom scrollbar styling with dark theme colors
- Language dropdown with custom styling
- Gradient text effect using `text-gradient` class

## Accessibility
- High contrast text colors
- Proper heading hierarchy
- Screen reader classes available (`sr-only`)

This theme follows a modern, dark-mode design language with emphasis on gradients and smooth animations, while maintaining readability and accessibility standards.