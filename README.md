# Copilot-Capstone

## EPMCDMETST-71461: local security and recovery prototype

Greenfield implementation on `feature/EPMCDMETST-71461`, independent of DocSync-Bot.
This is the approved **P0 synthetic-data prototype**, not full Jira acceptance or a production service.

### Run locally

Requires Node **24.x** and npm. From this checkout:

```powershell
npm ci
npm run typecheck
npm test
npm run ci:check
```

`npm test` compiles TypeScript and runs the complete Node test suite. The CI entry point runs the same
typecheck/build/tests. No separate lint tool is configured; typechecking is not claimed as linting.

### Implemented contracts

- Verified-identity port, privileged MFA checks, default-deny four-role authorization, owner checks,
  administrator-controlled local role policy, strict command schemas, safe errors/correlation IDs.
- SQLite transactions commit state/version, `(jobId, processPdf, 1)` outcome, logical output and
  required audit together. Inputs are immutable; the prototype has one processing step and input version.
  Required audit failure prevents mutation, read disclosure and normal denial responses.
- Durable leases and compare-and-swap updates reject stale workers. Initial execution plus three
  retries; transient delays are 1s, 2s, 4s. Claims consume the persisted budget even if the process dies.
  Password challenges have a separate three-invalid-entry limit; cancelling a prompt consumes none.
- Passwords are passed in memory for one processor call, never saved to database, audit or backup.
  Restarts require a fresh prompt. JavaScript string zeroization cannot be guaranteed.
- AES-256-GCM snapshots using an injected 32-byte key. The archive includes jobs, outcomes, logical
  outputs, local role policy and historical audit, but no input PDFs or credentials.
  A configured private directory receives exclusive staged ciphertext; preparation audit precedes
  rename and completion audit precedes a successful response. An audit failure may leave an
  unadvertised encrypted staged/final file. Directory permissions/ACLs remain the caller's responsibility.
- Restore verifies authenticated integrity, exact schema and output/idempotency invariants, rejects
  live local workers, and atomically imports state with its audit event. Active audit history is retained;
  historical backup audit is inspection-only. Expired restored leases are cleared.
- Child-process termination tests cover both sides of job/restore commit and persisted password
  challenges. Tests also cover audit failures, retry limits, leases, key/tamper/schema rejection,
  role policy, credential sentinels and the client prompt contract.

### Integration and client boundaries

Core entry: [JobService](packages/core/src/jobs.ts). Inject trusted `IdentityProvider`, `PdfProcessor`,
`BackupKeyProvider`, `ArchivePublisher` and local `Store` implementations.
The only input references are `fixture-plain` and `fixture-encrypted`; their inventory is in
[inventory.json](tests/fixtures/inventory.json). Fakes and test keys exist **only in tests**.
They exercise processor contracts; there is **no real PDF library or encrypted-PDF support claim**.

The extension command **Capstone: Resume Synthetic Job (Test Only)** routes through core authorization,
then prompts if needed. As specified by the role matrix, only administrators/operators may resume;
end users may submit/read/cancel their own jobs, not invoke worker execution.
The entry is CommonJS with dynamically loaded ESM core. It explicitly requires a Node 24 extension host
and reports an unsupported host without loading SQLite. Identity/PDF/key integrations are intentionally
unconfigured and fail closed; the shipped command does not silently become a working authenticated product.
No extension-host or VSIX installation validation is claimed; automated client tests use a narrow UI port.

[action.yml](action.yml) and [the workflow](.github/workflows/prototype-checks.yml) run isolated checks on
Windows/Linux with read-only repository permissions, no password inputs, deployment or release.
The Action entry point is validated locally; remote workflow runs remain unverified until separately
authorized publication. It is not a durable backend or cross-run job scheduler.

### Unpassed gates

- Real OIDC/PKCE/MFA integration, managed key custody, TLS, encrypted active SQLite storage,
  tamper-resistant audit, supported real PDFs and shared durable worker infrastructure.
- Automated operational backup scheduling, production recovery objectives, full Jira acceptance,
  extension-host validation, remote CI, publication and deployment.

SQLite/audit here is local and not tamper-proof or encrypted at rest. No real user data, credentials,
external product mutations or production resources are used. Tests prove at-least-once local execution
with one committed logical output, **not exactly-once external delivery**.