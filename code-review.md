# DocSync-Bot — Code Review (Step 6)

Self-review of the Step 5 implementation, performed before opening the PR, using the capstone's required
checklist. Issues found during this pass were fixed directly in the implementation (not left as follow-ups),
and the tests below confirm the fixes.

| Review Area | Review Question | Finding | Resolution |
|---|---|---|---|
| **Correctness** | Does each component behave as specified in `requirements.md`? | The Python signature regex (`PY_DEF_RE` / docstring adapter's `defRe`) only matched `def foo(...)`, silently skipping `async def foo(...)` — a real correctness bug for any async Python codebase. | Fixed both regexes to `^(?:async\s+)?def\s+...`; added a regression test (`diffAnalyzer.test.ts`, "matches 'async def' functions"). |
| **Security** | Are secrets excluded from output? Is user input validated? | `redactSecrets()` is applied to the outbound LLM prompt (verified by test), credentials are only ever read from env vars/`.env` (gitignored), and `.gitignore` excludes `.env`. Confirmed no path in the codebase logs `GITHUB_MODELS_TOKEN`/Confluence credentials. | No change needed; confirmed via `redactSecrets.test.ts` and `suggestionEngine.test.ts` ("redacts secrets embedded in the existing doc content"). |
| **Error Handling** | Are all API failures, missing files, and empty repos handled gracefully? | Confluence fetch failures and malformed OpenAPI/YAML files in the repo scan were wrapped in `try/catch` in `collectDocs`, but neither branch had a test proving the whole run still completes. Missing/malformed `docsync.config.json` was already tested. | Added `integration.test.ts` cases: "does not crash when the repo contains a non-OpenAPI YAML file" and "degrades gracefully when the Confluence client fails" — both now pass. |
| **Test Coverage** | Do tests cover the happy path AND the 'Not Found' / missing-field edge cases? | Adapters had happy-path tests but no "nothing found" cases (Markdown with no `docsync:ref`, OpenAPI operation with no `x-docsync-ref`, Confluence page with no parameter bullets). `GitDiffSource`'s added/removed-file branches were only exercised indirectly. | Added explicit "no match" tests to `adapters.test.ts` and a dedicated `gitSource.test.ts` covering added-file (`baseContent` undefined) and removed-file (`headContent` undefined) cases. Suite grew from 62 → 70 tests, all passing. |
| **Code Clarity** | Are function names self-explanatory? Is logic easy to follow without comments? | Generally yes; names like `detectDrift`, `resolveLinks`, `redactSecrets`, `checkRepo` are self-describing. A few regex-heavy functions (Python docstring parsing) rely on inline comments, which is appropriate given the regex density. | No change needed. |
| **DRY Principle** | Is there duplicated logic that can be refactored into a shared function? | `languageParsers.ts` (`parseTypeScript`) and `docstringAdapter.ts` (`parseTsDocModels`) each independently walked `sourceFile.getFunctions()` / `getClasses().getMethods()` with the same traversal shape — duplicated logic. | Extracted `forEachTsFunctionLike()` in `languageParsers.ts` and had both call sites reuse it. Verified no behavior change (all adapter + diff tests still pass). |
| **Dependency Safety** | Does Copilot flag any known-vulnerable package versions? | `npm audit` initially reported 2 **critical** advisories via `simple-git@3.27` (`@simple-git/argv-parser` unsafe `VISUAL` editor detection). | Bumped `simple-git` to `^4.0.2` (critical findings resolved: `npm audit` now shows 0 critical/high/moderate). Remaining 7 **low**-severity advisories are all in transitive `jest`/`ts-jest` dev dependencies (not shipped in any published artifact) — accepted as a documented known limitation rather than downgrading the test toolchain. |

## Summary
All findings from this review were fixed directly (not deferred), and are reflected in the commit history. Final
state: 70/70 tests passing, clean `tsc --build` across all 3 workspace packages, 0 critical/high/moderate `npm
audit` findings.

---

## EPMCDMETST-47868

Self-review of the `packages/stays-currency` implementation (T01–T06, per `impl-plan.md`) before opening
the PR, using the capstone's required checklist. Scope: files under `packages/stays-currency/src` and
`packages/stays-currency/test`, reviewed against `requirements.md` §5 (FR-27–FR-37, NFR-23–NFR-25). Issues
found during this pass were fixed directly in the implementation, and the tests below confirm the fixes.

| Review Area | Review Question | Finding | Resolution |
|---|---|---|---|
| **Correctness** | Does each component behave as specified in `requirements.md`? | T06's own acceptance criteria require testing "exact original/base-price fallback with an explanatory notice" (FR-37), but no code assembled a `ConversionResult`/fallback notice at all — `rateConversion.ts` only exposed low-level `fetchValidatedRate`/`convertAmountMinorUnits` primitives. | Added `convertListings()` in `rateConversion.ts`: converts each listing when a validated rate is available, otherwise falls back to the exact original/base price with notice `"Showing the original price in <base>; a live <target> rate was unavailable."`. Covered by 5 new tests in `rateConversion.test.ts`. |
| **Security** | Are secrets excluded from output? Is user input validated? | `OpenExchangeRatesProvider`'s `app_id` credential is read only from `env.OPEN_EXCHANGE_RATES_APP_ID` (never hardcoded) and never appears in any thrown error message or log statement (confirmed via repo-wide search) — satisfies NFR-24. However, T04's acceptance criteria explicitly require "supported-value validation" for advanced-filter input, and none existed: an unsupported/mistyped `propertyType`/`mealPlan`/`cancellationPolicy` value silently matched zero listings instead of being rejected. | Added `validateAdvancedFilterCriteria()` plus canonical `SUPPORTED_CANCELLATION_POLICIES`/`SUPPORTED_MEAL_PLANS`/`SUPPORTED_PROPERTY_TYPES` lists in `advancedFilters.ts`, returning explicit error strings for unsupported values. Covered by 4 new tests in `advancedFilters.test.ts`. |
| **Error Handling** | Are all API failures, missing files, and empty repos handled gracefully? | `fetchValidatedRate`'s timeout/retry/deadline logic (2s per-attempt, 1 retry, 5s deadline, `Retry-After` honored) and `OpenExchangeRatesProvider`'s 429/5xx-vs-4xx handling were already implemented and tested. `convertListings` over an empty listings array returns `{ ...active, results: [] }` without error. | No change needed; confirmed via the existing `fetchValidatedRate`/`openExchangeRatesProvider.test.ts` suites plus the new "echoes the active ... revision" empty-listings test. |
| **Test Coverage** | Do tests cover the happy path AND the 'Not Found' / missing-field edge cases? | Missing-rate fallback (FR-37) and unsupported-filter-value rejection were untested (see Correctness/Security findings above); `resolveOpenExchangeRatesProviderFromEnv`'s T01-gate-closed path was already tested. A later dedicated verification pass found 3 further gaps against the literal acceptance-criteria text: T04 requires tests for "all seven categories" but `mealPlan`/`paymentOptions` were never exercised through `applyAdvancedFilters`; T06 requires "each required base/target pair" but GBP and AED never appeared in any `convertAmountMinorUnits` test; and `convertListings` had no per-listing error isolation (one unsupported-currency listing would fail the whole batch instead of falling back). | Added the 5 `convertListings` tests and 4 `validateAdvancedFilterCriteria` tests noted above, then 6 more in the verification pass: `mealPlan`/`paymentOptions` filter tests, EUR→GBP and USD→AED conversion tests, a `Retry-After`-header-value assertion, and a defensive-fallback test for an unsupported listing currency (with `convertListings` now wrapping the per-listing conversion in try/catch). Suite grew from 48 → 63 tests in `stays-currency`, all passing. |
| **Code Clarity** | Are function names self-explanatory? Is logic easy to follow without comments? | `rateConversion.ts` had a `RateUnavailableError` class that was never thrown or caught anywhere (dead code), and `fetchValidatedRate` captured a `lastError` variable that was never read (only suppressed with `void lastError`) — both were dead weight that could mislead a reader about which error path is actually used. | Removed the unused `RateUnavailableError` class and the unused `lastError` variable/`void` suppression; behavior is unchanged (confirmed by passing tests). |
| **DRY Principle** | Is there duplicated logic that Copilot can refactor into a shared function? | `advancedFilters.ts` had `matchesAnyAmenity()` and `matchesAnyPaymentOption()` as two functions with byte-for-byte identical logic (array-membership OR-match), differing only in parameter names. | Merged both into a single `matchesAnyOfArray()` reused for amenities and payment options. Verified no behavior change (all filter tests still pass). |
| **Dependency Safety** | Does Copilot flag any known-vulnerable package versions? | `npm audit` reports 0 critical/high, 3 moderate (`ts-morph`/`@ts-morph/common` → `minimatch` ReDoS-class advisory) and 7 low (`jest`/`ts-jest`/`deepmerge` chain, including a prototype-poisoning advisory in `deepmerge`). `packages/stays-currency` itself declares zero runtime dependencies — every flagged package is a transitive dev/test-toolchain dependency shared with the rest of the monorepo, not something this ticket introduced. | No fix applicable within this ticket's scope; accepted as a pre-existing, documented known limitation consistent with the Dependency Safety precedent in the EPMCDMETST-47860 review above. |

## Summary
All real findings from this review, plus 3 further gaps found by a subsequent dedicated verification pass
(all seven filter categories actually exercised, every required currency pair tested, per-listing error
isolation in `convertListings`), were fixed directly: the FR-37 fallback-with-notice path and the T04
"supported-value validation" acceptance criterion were both missing and have been implemented and tested;
two dead-code items were removed; one duplicated pair of filter-matching functions was merged. Final state:
**19/19 test suites, 138/138 tests passing repo-wide** (63/63 in `packages/stays-currency`), clean
`tsc --build`/`tsc --build --noEmit` across all workspace packages, and `npm audit` unchanged at 0
critical/high (3 moderate / 7 low, all pre-existing transitive dev-dependency findings, not introduced by
this ticket).

**Ready for PR**, with one caveat to call out in the PR description: `EPMCDMETST-47868-T05` (the real
`OpenExchangeRatesProvider`) is implemented and tested against mocked HTTP responses, but remains
functionally disabled (`resolveOpenExchangeRatesProviderFromEnv()` always returns `undefined`) because
`MOCK_PROVIDER_VERIFICATION.passes` is `false` — real T01 vendor verification evidence must replace that
mock record before the provider can be enabled in production.
