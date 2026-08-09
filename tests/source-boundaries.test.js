import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const protectedActions = read('src/routes/cases/[caseId]/+page.server.js');
const dossierPage = read('src/routes/cases/[caseId]/+page.svelte');
const registerPage = read('src/routes/cases/+page.svelte');
const policySource = read('src/lib/server/casebound-policy.js');
const roleSessionSource = read('src/lib/server/fixture-session.js');
const combinedUiSource = `${dossierPage}\n${registerPage}`.toLowerCase();


test('declared framework surface stays intentionally small and exact', () => {
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  assert.deepEqual(packageJson.devDependencies, {
    '@sveltejs/adapter-node': '5.5.7',
    '@sveltejs/kit': '2.70.1',
    '@sveltejs/vite-plugin-svelte': '7.2.0',
    svelte: '5.56.8',
    vite: '8.1.5',
  });

  const forbiddenPackages = [
    'next', 'react', 'react-dom', 'astro',
    'auth.js', 'next-auth', '@auth/core', 'lucia',
    'prisma', '@prisma/client', 'drizzle-orm',
    'zustand', 'redux', '@reduxjs/toolkit',
    'gsap', 'three', 'framer-motion',
  ];
  const declared = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);
  for (const name of forbiddenPackages) {
    assert.equal(declared.has(name), false, `Unexpected dependency: ${name}`);
  }
});


test('protected dossier actions use the server-resolved role rather than a submitted role field', () => {
  assert.ok(protectedActions.includes('role: locals.fixtureRole'));
  assert.equal(protectedActions.includes("data.get('role')"), false);
  assert.equal(protectedActions.includes('payload.role'), false);
  assert.ok(protectedActions.includes('caseboundStore.mutate'));
});


test('local role cookie is explicitly fixture-only and server-hook resolved', () => {
  assert.ok(roleSessionSource.includes("casebound_fixture_role"));
  assert.ok(roleSessionSource.includes('httpOnly: true'));
  assert.ok(roleSessionSource.includes("sameSite: 'lax'"));
  const hookSource = read('src/hooks.server.js');
  assert.ok(hookSource.includes('event.locals.fixtureRole'));
  assert.ok(hookSource.includes('event.cookies.get(ROLE_COOKIE)'));
});


test('forbidden applicant-fact mutation remains a direct-test target, not a normal visible control', () => {
  assert.ok(protectedActions.includes('updateApplicantFact'));
  assert.ok(protectedActions.includes('ACTIONS.UPDATE_APPLICANT_FACT'));
  assert.equal(dossierPage.includes('?/updateApplicantFact'), false);
  assert.equal(combinedUiSource.includes('update applicant fact'), false);
});


test('UI copy explicitly refuses to equate role selection or button visibility with authorization', () => {
  assert.ok(combinedUiSource.includes('not authentication'));
  assert.ok(combinedUiSource.includes('server'));
  assert.ok(dossierPage.toLowerCase().includes('ui visibility is not authorization proof'));
});


test('first pass keeps media, canvas, WebGL and permanent animation runtimes out of the source', () => {
  const sourceFiles = [
    'src/routes/+layout.svelte',
    'src/routes/+error.svelte',
    'src/routes/cases/+page.svelte',
    'src/routes/cases/[caseId]/+page.svelte',
    'src/app.css',
  ];
  const source = sourceFiles.map(read).join('\n').toLowerCase();
  for (const token of ['<img', '<video', '<canvas', 'webgl', 'requestanimationframe(', 'setinterval(']) {
    assert.equal(source.includes(token), false, `Unexpected visual/runtime surface: ${token}`);
  }
});


test('server policy remains framework-independent', () => {
  assert.equal(policySource.includes('@sveltejs/'), false);
  assert.equal(policySource.includes('$app/'), false);
  assert.equal(policySource.includes('$lib/'), false);
  assert.ok(policySource.includes('createCaseboundStore'));
  assert.ok(policySource.includes("kind: 'denied'"));
  assert.ok(policySource.includes("kind: 'stale'"));
  assert.ok(policySource.includes("kind: 'invalid'"));
  assert.ok(policySource.includes("kind: 'not_found'"));
});
