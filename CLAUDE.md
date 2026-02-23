# MxExplorer — Project Context

## Project Overview
MxExplorer is a browser bookmarklet tool that lets users browse entities, cache, and constants in any Mendix application. It runs as a self-contained JavaScript snippet injected into a Mendix app's browser tab.

- **Current version:** 1.3.0
- **Created by:** Valcon

## Repository Structure
- `script.js` — Main source file (human-readable)
- `script.min.js` — Minified version used as the actual bookmarklet
- `README.md` — User-facing documentation
- `package.json` — Minimal metadata (name + version only)

## Deployment
The tool is deployed as a browser bookmark. Workflow:
1. Edit `script.js`
2. Minify it into `script.min.js`
3. Wrap in `javascript: (() => {PASTE THE SCRIPT HERE})();` for use as a bookmark URL
- Chrome/Firefox: import via bookmark manager
- Edge: paste as a code snippet in the developer screen

## Key Architectural Notes
- No build system or bundler — plain vanilla JavaScript
- The script runs in the context of a Mendix app tab and accesses `mx.session.sessionData`
- All UI is created dynamically (modals, drag, resize, z-index management)
- Data is fetched via Mendix client APIs
- `mxExplorer` is a global namespace object holding all state

## Core Features
- **Browse entities** — lists entities the logged-in user has read rights to; filter by name
- **Browse cache** — shows non-persistent objects in the current client session
- **Browse constants** — shows client-exposed constants and their values
- **Data window** — shows attributes/associations for a selected object
- **Data grid** — paginated entity browser with XPath filtering, sorting, and column export

## Version History Summary
- **1.2.0** — Styling updates, column export, constants view, NP entity support, resizable modals, ctrl+enter search, logout link
- **1.3.0** — Fixed React client compatibility; improved datagrid refresh (updates data in-place rather than recreating the modal)
- **1.4.0** — Column visibility picker: sticky 👁 button at the far-right of the datagrid header opens a dropdown with checkboxes to show/hide columns; visibility state persists across page navigation

## Coding Conventions
- Single JS file, no modules or imports
- All functions and state on the `mxExplorer` namespace object
- UI components are vanilla DOM manipulation
- Changelog kept as comments at the top of `script.js`
- Version string must be updated in both the comment header and `mxExplorer.version`