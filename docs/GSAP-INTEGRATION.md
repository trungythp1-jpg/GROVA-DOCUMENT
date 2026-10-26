# GSAP UI Motion for GROVA DOCUMENT

## Purpose
This project uses plain HTML, CSS, and JavaScript on GitHub Pages. The optional GSAP enhancement is progressive: the app works normally if the GSAP CDN is unavailable, and respects `prefers-reduced-motion`.

## Official AI skills
- Repository: https://github.com/greensock/gsap-skills
- Install for a local coding agent from the project root: `npx skills add https://github.com/greensock/gsap-skills`
- The skill guides coding agents; it is not itself a runtime dependency. Runtime animation is loaded separately from the GSAP CDN in `index.html`.

## Implemented scope
- Subtle entrance transition for the active page.
- Staggered entrance for dashboard statistic cards and document cards.
- Small hover lift for primary/secondary buttons.
- No animation hooks in Firestore services, permissions, calculations, printing, or debt workflows.
- No schema, business-rule, or framework changes.

## Safety rules
- Keep animation non-blocking and decorative.
- Respect reduced-motion preferences.
- Never animate form values or change layout-critical dimensions.
- Verify navigation, print/PDF, iPad viewport, and no-GSAP fallback before merging.
