# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **EPMCDMETST-72536** — Habit tracker UI: new static `packages/habit-tracker-ui` page with add,
  check-off, delete with confirmation, daily reset, and localStorage persistence with backup, plus
  Jest/jsdom tests (60 passing) and a package tsconfig added to root project references. See
  `Docs/EPMCDMETST-72536/` for verification and known limitations.

- **EPMCDMETST-47868** — Stays advanced filters & currency viewing options (T01–T06 foundation):
  new `packages/stays-currency` workspace with centralized currency configuration (FR-31, FR-35,
  NFR-25), server-side advanced filters with supported-value validation (FR-28–30), rate
  validation/conversion/fallback logic (FR-36, FR-37, NFR-23/24), and a real Open Exchange Rates
  provider adapter that stays disabled pending T01 vendor-verification evidence. See
  `code-review.md` (`EPMCDMETST-47868` section) for review details and test evidence.
