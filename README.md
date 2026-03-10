# Skills Framework Explorer

Vue 3 single-page app for exploring Singapore's SkillsFuture Skills Framework data. The app stays fully client-side: it ships with a preloaded dataset and can also parse the official XLSX workbooks directly in the browser.

## Stack

- Vue 3 + TypeScript
- Vite
- Pinia
- Vue Router
- Tailwind CSS
- JSZip + SheetJS (`xlsx`)
- Vitest

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Unit tests:

```bash
npm test
```

## What the App Does

- Explore job roles by sector and track
- Analyse selected roles into a role-centric skills view
- Compare two analysed roles side by side
- Browse the same results from a skill-centric view
- Inspect proficiency levels, knowledge, abilities, related TSCs, and critical work functions

## Data Sources

The app supports two client-side data paths:

- Preloaded zip asset at [`/Users/ufinity/Documents/GitHub/skills-framework-explorer/public/data/skills-framework-data.json.zip`](/Users/ufinity/Documents/GitHub/skills-framework-explorer/public/data/skills-framework-data.json.zip)
- Manual upload of the official SkillsFuture XLSX workbooks:
  - Skills Framework Dataset workbook with `Job Role_Description`, `Job Role_TCS_CCS`, `TSC_CCS_K&A`
  - TSC to Unique Skill Mapping workbook with `TSC to Unique Skill Mapping`
  - Unique Skills List workbook with `Unique Skills List`

## Notes

- Firebase Hosting now serves the Vite build output from `dist/`.
- The previous single-file implementation is preserved at [`/Users/ufinity/Documents/GitHub/skills-framework-explorer/legacy/index-legacy.html`](/Users/ufinity/Documents/GitHub/skills-framework-explorer/legacy/index-legacy.html) as a migration reference.
