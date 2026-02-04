# GitHub Copilot Chat Course Codebase

## Project Overview

**Bucks2Bar**: Monthly budget tracker demonstrating GitHub Copilot Chat capabilities. Simple vanilla JavaScript web application with Bootstrap UI and Chart.js visualization - no build tools or frameworks.

## Architecture

- **Frontend-only**: Single HTML page with vanilla JavaScript
- **No build step**: Files run directly in browser - open `index.html` to test
- **CDN dependencies**: Bootstrap 5.3.3 (UI) and Chart.js (visualization) loaded from CDN
- **Data storage**: Client-side only - no backend, no localStorage, data resets on refresh

## Development Workflow

```bash
# No installation needed - just open the file
start index.html          # Windows
open index.html           # macOS
xdg-open index.html       # Linux
```

## Code Patterns

### Chart.js Integration

- **Chart lifecycle**: Destroy existing chart before creating new one to prevent memory leaks
- **Global chart instance**: `chartInstance` variable tracks the active Chart.js object
- **Data collection**: `validateAndCollectData()` extracts and validates all form inputs
- **Export feature**: Use `chartInstance.toBase64Image()` for PNG download

### Form Validation

- **Bootstrap validation classes**: Add `is-invalid` class to show errors, remove on valid input
- **Empty inputs default to 0**: Treat blank fields as zero, not as errors
- **Pre-populated data**: Default values demonstrate the app functionality

### Event Handling

- Initialize all event listeners in `window.onload` callback
- Use `shown.bs.tab` Bootstrap event to auto-render chart when switching tabs
- Validate before rendering to prevent broken chart states

### File Structure

- [index.html](../index.html): Bootstrap tabs, 12-month form with income/expense inputs
- [script.js](../script.js): Chart rendering, validation, event handlers - all in global scope

## Key Conventions

- **No ES modules**: Scripts loaded as classic `<script>` tags (no `type="module"`)
- **Global scope**: All functions/variables in script.js are window-scoped
- **Bootstrap tabs for navigation**: Data entry vs. chart visualization
- **Month abbreviations**: Use 3-letter codes (Jan, Feb, Mar...) for chart labels

## Common Tasks

- **Adding validation**: Use `.classList.add('is-invalid')` and Bootstrap's `.invalid-feedback` div
- **Modifying chart**: Update `renderChart()` function and Chart.js options
- **Adding form fields**: Add input with `.income-input` or `.expense-input` class, ensure proper validation in `validateAndCollectData()`
- **Testing**: Refresh browser after changes (no hot reload)
