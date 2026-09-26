# Restore the richer LotPilot interface

User-approved scope: recover parts of the original interface, particularly pentagon charts and rich cards, without reverting grounded retrieval or introducing fixtures.

- Reuse RadarChart and the previous card/grid/list visual treatment for real supplier leads.
- Represent missing radar values as unknown, never zero or a manufactured score. Label evidence indicators as availability, not quality ratings.
- Restore a useful sidebar with example briefs, live sourcing progress and actual result counts.
- Restore store imagery and compact expandable profile details.
- Add a sourcing overview with stated budget, retrieved suppliers and verified inventory count; unavailable economics stay unknown.
- Keep commerce disabled and retain all backend grounding regressions. Check types, lint, regression tests and desktop/mobile browser rendering.
- Push and deploy the correction under the user's existing publication authorization. Resume the demo recording after UI verification.

Validation: typecheck and lint passed; existing grounding suite 23/23. Chrome DevTools verified live ATIKA retrieval with three evidence charts, grid/list switching and persisted preference, valid SVG paths, and narrow layout without horizontal overflow. Source text remains cited, stock/price/ROI/reliability remain unverified. Corrected chart label clipping found during visual inspection.
