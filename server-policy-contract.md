# CASEBOUND server-policy contract

This file translates Experience Contract revision 2 into a small implementation boundary before framework code exists. It is not a production security policy and does not add authentication.

## Authority boundary

The server policy/store is the only authority for:

- current fictional case data;
- current case record version;
- whether the current server-resolved fixture role may request an action;
- payload validation;
- stale/replayed expected-version rejection;
- accepted mutation and audit-line creation.

SvelteKit routes/actions may translate requests into calls to this boundary and translate returned results into pages/form state. They may not reproduce or weaken the policy rules separately.

## Fixture roles

### `intake_clerk`

Allowed:

- `set_completeness`
- `add_intake_note`

Forbidden:

- `add_review_finding`
- `approve_case`
- `return_for_changes`
- `update_applicant_fact`

### `reviewing_officer`

Allowed:

- `add_review_finding`
- `approve_case`
- `return_for_changes`

Forbidden:

- `update_applicant_fact`
- intake-only administrative mutation unless a later contract revision explicitly grants it

`update_applicant_fact` exists as a deliberately forbidden crafted-request target in this fixture. Applicant facts are read-only to both review roles.

## Mutation input

Every protected mutation receives server-side values shaped conceptually as:

```text
role
case_id
action
payload
expected_version
```

The browser may supply `case_id`, `action`, `payload`, and `expected_version` as request intent. The role must come from the server fixture-role session/locals bridge, not from a trusted browser field.

## Check order

For a protected mutation:

1. Resolve the current fixture role on the server.
2. Load the current case by ID.
3. If missing, return `not_found` and do not mutate.
4. Validate that the requested action is known.
5. Check role permission for the action.
6. If forbidden, return `denied` and do not mutate/version-bump.
7. Validate the payload for the action.
8. If invalid, return `invalid` and do not mutate/version-bump.
9. Compare `expected_version` with current case version.
10. If mismatched, return `stale` and do not mutate/version-bump.
11. Apply exactly the allowed mutation.
12. Increment the case version once.
13. Append one fictional audit entry naming the fixture role and action.
14. Return `accepted` with the authoritative updated case/version.

The initial implementation may choose a slightly different internal order only if direct tests prove forbidden/invalid/stale requests cannot change case data or version and the resulting user-facing state remains unambiguous. Do not leak sensitive production-style policy detail; this fixture contains no real sensitive data.

## Result shapes

### Accepted

```text
{
  ok: true,
  kind: "accepted",
  case: <authoritative updated case>,
  audit_entry: <new audit entry>
}
```

### Validation failure

```text
{
  ok: false,
  kind: "invalid",
  status: 422,
  field_errors: {...},
  submitted: <safe values needed for recovery>,
  current_version: <unchanged version>
}
```

### Permission denied

```text
{
  ok: false,
  kind: "denied",
  status: 403,
  action: <requested action>,
  role: <server-resolved fixture role>,
  current_version: <unchanged version>
}
```

### Stale/replayed request

```text
{
  ok: false,
  kind: "stale",
  status: 409,
  expected_version: <submitted version>,
  current_version: <server version>,
  case: <current authoritative case>
}
```

### Missing case

```text
{
  ok: false,
  kind: "not_found",
  status: 404,
  case_id: <requested fictional ID>
}
```

## Initial fictional cases

Use a very small deterministic set. Suggested first three cases:

- `PR-1042` — complete enough for Reviewing Officer approval path;
- `PR-1047` — missing one required item for Intake Clerk completeness/validation path;
- `PR-1051` — under review with an existing finding for return-for-changes path.

Names, addresses and descriptions must be clearly fictional.

## Direct evidence requirements

The policy tests must prove at minimum:

1. Intake Clerk completeness update succeeds and increments version once.
2. Intake Clerk direct `approve_case` attempt returns denied and leaves deep case state/version unchanged.
3. Reviewing Officer review finding succeeds and increments version once.
4. Reviewing Officer direct `update_applicant_fact` attempt returns denied and leaves deep case state/version unchanged.
5. Invalid payload returns validation failure and leaves case state/version unchanged.
6. Old expected version after another accepted mutation returns stale and leaves current case state/version unchanged.
7. Missing case returns not-found without creating a new record.
8. Reset restores the exact deterministic initial fixture.
9. The mutation function receives role from its caller but SvelteKit integration later proves that caller uses the server-resolved fixture session rather than a browser role field.

## Explicit non-goals

- real authentication;
- password handling;
- OAuth/OIDC;
- persistent database storage;
- multi-process consistency;
- distributed locking;
- production audit logging;
- legal/municipal workflow accuracy;
- real personal data;
- external network writes.

Those would require separate contracts and evidence.
