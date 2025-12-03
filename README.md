# Skills Framework Explorer

Interactive, client-only viewer for the SkillsFuture Skills Framework. Load the three official XLSX exports (or the bundled JSON) and explore role requirements, compare roles side by side, or browse skills with knowledge/ability breakdowns and TSC links.

- Live site: https://jinnotgin.github.io/skills-framework-explorer/
- Tech: vanilla HTML/JS/CSS, no build step or dependencies.

## Preloaded dataset
- The app already ships with the latest bundle (as of Q3 2025): 
  - Skills Framework Dataset (Q3 2025)
  - Unique Skills List (Sep 2025), and 
  - TSC to Unique Skills Mapping File (Sep 2025).
- You can still swap in your own files at any time via drag-and-drop (see below).

## Using your own data
- Drag-and-drop the three SkillsFuture XLSX workbooks from https://jobsandskills.skillsfuture.gov.sg/frameworks/skills-frameworks onto the page:
  - Skills Framework Dataset workbook with sheets `Job Role_Description`, `Job Role_TCS_CCS`, `TSC_CCS_K&A`
  - TSC to Unique Skills Mapping File workbook with sheet `TSC to Unique Skill Mapping`
  - Unique Skills List workbook with sheet `Unique Skills List`
- Once loaded, select job roles from the sidebar and click **Analyze Skills** to view role-centric, compare, or skill-centric outputs. Use search/sector filters and click any skill to open the detail panel.

## Notes
- All processing happens in the browser; nothing is uploaded to a server.
