# Grounded store analysis and retrieval

Approved scope: implement the ATIKA, So Vintage and unsupported-brief findings; production must use real retrieval and RRF, never seeded inventory or fallback profiles. Baseline production is master 4b91f21 and all 13 baseline tests pass.

Execution: implement in the clean tracked checkout on fix/grounded-store-retrieval; preserve existing untracked spdd files. User has explicitly authorized implementation and deployment, so no additional plan approval is required.

1. Pin regressions in tests: ATIKA linked/main stock text, Unicode brands/eras, event versus boho, missing size/budget, unsupported vape brief, retrieval outages, fabricated vintage tags and mock checkout rejection.
2. Extract bounded same-site content with per-page provenance; remove fixture fallback; preserve event role, historical evidence, mixed categories and unknown size. Normalize brands/eras and retain category coverage.
3. Replace production seeded-lot ranking with grounded supplier retrieval. Preserve explicit budget. No inventory/price/ROI/order is invented from supplier documents. Disable mock commerce endpoints and remove misleading UI/homepage claims.
4. Fix ingestion to retain source descriptions without invented aesthetics. Introduce versioned grounded documents and an actual full-text/fuzzy RRF RPC over that content; disable hash vectors rather than calling them semantic search. Show source URLs, dates and ranks. No result/error fallback to seeds.
5. Populate the grounded index from actual public source pages; verify SQL ranks/fusion and actual API results. Keep historical index rows separate for rollback.
6. Run tests, typecheck, lint/build, independent review and live browser regressions. Deploy the tested commit to the existing Vercel project and verify its production alias.

Review focus: missing retrieval service; unrelated vertical with a valid budget; historical event copy; unsupported catalog coverage; cache invalidation after schema/profile changes.

Ruling: the database contains directory records, not purchasable inventory. The live product will return cited supplier research and explicitly state that no verified purchasable lots exist. Fabricated lots remain unreachable; no automatic buying plan is manufactured.

Ruling: no semantic embedding provider is configured. Genuine database RRF will fuse full-text and fuzzy search, labelled accurately. Hash vectors will not be presented as semantic retrieval.

Implementation evidence:
- Original five grounding regressions observed failing before implementation; now pass.
- Live testing found HTTP→HTTPS same-host crawl exclusion; regression observed RED then GREEN after host normalization.
- Redirect safety test observed RED then GREEN after manual validation before each redirect fetch.
- Applied additive grounded-evidence migration and fetched three real supplier profiles into version 2. Kept all legacy documents for rollback, excluded from new RPC.
- Public-role integration verified actual full-text/fuzzy ranks and exact RRF arithmetic, wrong-vertical exclusion, no-match and cache refresh.
- Initial production build hit sandbox DNS restrictions fetching configured fonts; repeated with network access.
- Final independent review found four issues: discarded typed-brief vertical, budget-clear fallback, policy rerun losing edits, and market confirmation dead end. Added three regression tests and observed RED→GREEN (23/23 suite). Removed unavailable inventory-policy UI, eliminating its misleading claims and state-loss path. Added product-category confirmation controls to RFQ editing.
- Chrome DevTools local check confirmed historical market/era evidence and budget unknown state; RFQ categories and budget can be edited from the store result.
