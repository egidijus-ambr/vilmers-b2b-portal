## Brief overview

Guidelines for working with Tailwind CSS and design systems in this Medusa storefront project. These rules ensure consistent styling, proper color usage, and maintainable CSS class naming conventions.

## CSS class naming conventions

- Always use lowercase for Tailwind CSS classes
- Use hyphens (-) to separate words in class names, never camelCase or PascalCase
- Remove percentage symbols from class names (e.g., `text-dark-blue-70` not `text-dark-blue-70%`)
- Custom color classes should follow the pattern: `text-{color-name}`, `bg-{color-name}`, `border-{color-name}`

## Design system integration

- Extract colors from Figma design files and add them to the Tailwind config colors section
- Maintain both current design system colors and legacy colors for backward compatibility
- Use descriptive color names that match the design system (e.g., `dark-blue`, `gold-10`, `status-completed`)
- Include opacity variants using rgba values with descriptive names (e.g., `divider: "rgba(34, 45, 55, 0.1)"`)

## Tailwind configuration management

- Add all CSS custom properties from globals.css to the Tailwind config to make them available as utility classes
- Organize colors by category: core colors, status colors, utility colors, and legacy colors
- Use comments to document color purposes and relationships
- Restart the development server after making Tailwind config changes

## Icon and asset handling

- Replace CSS-based icons with proper SVG elements when provided
- Maintain proper SVG attributes including viewBox, fill, stroke, and strokeLinecap
- Use inline SVG for better control and styling consistency

## Development workflow

- Search for incorrectly cased CSS classes before implementing new styles
- Verify color availability in Tailwind config before using custom classes
- Test style changes in the browser to ensure proper application
- Keep the development server running to see changes in real-time
