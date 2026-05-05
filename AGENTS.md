## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `body-clock/milkcrate`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and root `docs/adr/` when present. See `docs/agents/domain.md`.

## Documentation safety

Never write secrets, credentials, tokens, private keys, production URLs with embedded credentials, or real customer data into `docs/`. Use placeholders like `<TOKEN>` or `<DATABASE_URL>` in documentation examples.
