# CASEBOUND

CASEBOUND is a fictional permit-review workspace built to test a part of SITECRAFT that visual demos could not prove: **real server-owned permissions and mutation boundaries**.

## Concept

The interface presents permit cases as review dossiers. Different fictional roles can inspect the same case but do not have the same authority to change it. The important rule is that the server, not a hidden or disabled button in the browser, decides whether an action is allowed.

This makes CASEBOUND both a product-design exercise and a security/architecture exercise.

## Highlights

- Server-backed SvelteKit application
- Multiple fictional roles with meaningfully different permissions
- Server-enforced authorization for mutations
- Direct forbidden-action tests
- Validation, allowed actions, denied actions, and stale/replayed-action handling
- Permit-dossier visual language rather than generic dashboard cards
- Accessible semantic controls and explicit denial feedback
- Node tests for the permission boundary
- Separate server-policy contract documenting the intended authority model

## Tech stack

- Svelte 5
- SvelteKit
- Vite
- `@sveltejs/adapter-node`
- Node's built-in test runner

## Install and run

```bash
npm install
npm run dev
```

The development server is configured for `127.0.0.1:4174`.

Build and run the Node version with:

```bash
npm run build
npm start
```

## Tests

```bash
npm test
npm run check:server
```

The test suite is intentionally interested in more than whether a button disappears. It exercises the server policy itself so a disallowed role cannot bypass the interface and submit a protected action directly.

## Project structure

```text
.
├── src/                        # SvelteKit application and server policy
├── tests/                      # Permission and behaviour tests
├── server-policy-contract.md   # Human-readable authority model
├── svelte.config.js
├── vite.config.js
├── package.json
└── package-lock.json
```

Generated `.svelte-kit`, `build`, and `node_modules` folders are intentionally excluded.

## Why the server boundary matters

A disabled button is not security. A determined client can still construct a request manually. CASEBOUND therefore keeps the authoritative permission decision on the server and treats the interface as a reflection of that policy, not as the policy itself.

The UI still explains why an action is unavailable, but hiding or showing controls is only a usability feature.

## Design approach

The visual system borrows from review sheets, permit dossiers, annotations, and official working papers. That gives the product a recognizable job-specific identity without resorting to fake terminal styling or a wall of generic cards.

Motion is deliberately quiet because the important drama in this product is authority: who can act, what changed, and why something was denied.

## What SITECRAFT learned from it

CASEBOUND closed a major gap in the Sitecraft test suite by forcing the system to reason about:

- server/client ownership;
- authorization before implementation;
- permission-sensitive routes and mutations;
- denied and replayed actions;
- a framework chosen because the job required a meaningful server boundary, not because a framework was fashionable.

## Status

**Portfolio / application architecture study.** CASEBOUND uses fictional local data and roles. It is not connected to a real permitting authority or identity provider.

## Credits

Designed and built as part of the SITECRAFT website-system development programme.
