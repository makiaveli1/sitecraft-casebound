import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  ROLES,
  createCaseboundStore,
} from '../src/lib/server/casebound-policy.js';

function snapshot(store, caseId) {
  return store.getCase(caseId);
}

test('intake clerk can confirm completeness and the server increments version exactly once', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1047');
  const result = store.mutate({
    role: ROLES.INTAKE_CLERK,
    caseId: 'PR-1047',
    action: ACTIONS.SET_COMPLETENESS,
    expectedVersion: before.version,
    payload: { complete: true, missingItems: [] },
  });

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'accepted');
  assert.equal(result.case.version, before.version + 1);
  assert.equal(result.case.completeness.complete, true);
  assert.deepEqual(result.case.completeness.missingItems, []);
  assert.equal(result.case.status, 'under_review');
  assert.equal(result.auditEntry.role, ROLES.INTAKE_CLERK);
  assert.equal(result.auditEntry.action, ACTIONS.SET_COMPLETENESS);
  assert.deepEqual(snapshot(store, 'PR-1047'), result.case);
});

test('intake clerk direct approval attempt is denied and cannot change case state or version', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1042');
  const result = store.mutate({
    role: ROLES.INTAKE_CLERK,
    caseId: 'PR-1042',
    action: ACTIONS.APPROVE_CASE,
    expectedVersion: before.version,
    payload: { note: 'Crafted approval attempt.' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'denied');
  assert.equal(result.status, 403);
  assert.equal(result.role, ROLES.INTAKE_CLERK);
  assert.equal(result.currentVersion, before.version);
  assert.deepEqual(snapshot(store, 'PR-1042'), before);
});

test('reviewing officer can add a finding and the server increments version exactly once', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1042');
  const result = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1042',
    action: ACTIONS.ADD_REVIEW_FINDING,
    expectedVersion: before.version,
    payload: { finding: 'Confirm the rear elevation dimension before endorsement.' },
  });

  assert.equal(result.ok, true);
  assert.equal(result.case.version, before.version + 1);
  assert.equal(result.case.reviewFindings.length, before.reviewFindings.length + 1);
  assert.equal(
    result.case.reviewFindings.at(-1).text,
    'Confirm the rear elevation dimension before endorsement.',
  );
  assert.deepEqual(snapshot(store, 'PR-1042'), result.case);
});

test('reviewing officer direct applicant-fact mutation is denied and cannot change case state or version', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1042');
  const result = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1042',
    action: ACTIONS.UPDATE_APPLICANT_FACT,
    expectedVersion: before.version,
    payload: { field: 'address', value: '999 Crafted Request Road' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'denied');
  assert.equal(result.status, 403);
  assert.equal(result.currentVersion, before.version);
  assert.deepEqual(snapshot(store, 'PR-1042'), before);
});

test('invalid payload is rejected without changing the case or record version', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1047');
  const result = store.mutate({
    role: ROLES.INTAKE_CLERK,
    caseId: 'PR-1047',
    action: ACTIONS.ADD_INTAKE_NOTE,
    expectedVersion: before.version,
    payload: { note: 'x' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'invalid');
  assert.equal(result.status, 422);
  assert.match(result.fieldErrors.note, /between 4 and 240/i);
  assert.equal(result.currentVersion, before.version);
  assert.deepEqual(snapshot(store, 'PR-1047'), before);
});

test('case-state validation blocks approval of an incomplete packet without mutation', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1047');
  const result = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1047',
    action: ACTIONS.APPROVE_CASE,
    expectedVersion: before.version,
    payload: { note: 'Should not be accepted.' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'invalid');
  assert.equal(result.status, 422);
  assert.match(result.fieldErrors.decision, /cannot be approved/i);
  assert.deepEqual(snapshot(store, 'PR-1047'), before);
});

test('an old expected version is rejected after another accepted mutation and cannot overwrite current state', () => {
  const store = createCaseboundStore();
  const original = snapshot(store, 'PR-1042');

  const accepted = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1042',
    action: ACTIONS.ADD_REVIEW_FINDING,
    expectedVersion: original.version,
    payload: { finding: 'First accepted review finding.' },
  });
  assert.equal(accepted.ok, true);

  const currentBeforeReplay = snapshot(store, 'PR-1042');
  const stale = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1042',
    action: ACTIONS.APPROVE_CASE,
    expectedVersion: original.version,
    payload: { note: 'This request was prepared against the old version.' },
  });

  assert.equal(stale.ok, false);
  assert.equal(stale.kind, 'stale');
  assert.equal(stale.status, 409);
  assert.equal(stale.expectedVersion, original.version);
  assert.equal(stale.currentVersion, currentBeforeReplay.version);
  assert.deepEqual(stale.case, currentBeforeReplay);
  assert.deepEqual(snapshot(store, 'PR-1042'), currentBeforeReplay);
});

test('missing case returns not found without creating a record', () => {
  const store = createCaseboundStore();
  const beforeList = store.listCases();
  const result = store.mutate({
    role: ROLES.INTAKE_CLERK,
    caseId: 'PR-9999',
    action: ACTIONS.ADD_INTAKE_NOTE,
    expectedVersion: 1,
    payload: { note: 'This case does not exist.' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'not_found');
  assert.equal(result.status, 404);
  assert.equal(store.getCase('PR-9999'), null);
  assert.deepEqual(store.listCases(), beforeList);
});

test('unknown role cannot obtain a protected mutation', () => {
  const store = createCaseboundStore();
  const before = snapshot(store, 'PR-1042');
  const result = store.mutate({
    role: 'browser_supplied_admin',
    caseId: 'PR-1042',
    action: ACTIONS.APPROVE_CASE,
    expectedVersion: before.version,
    payload: { note: 'Invented role must not gain authority.' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'denied');
  assert.equal(result.status, 403);
  assert.deepEqual(snapshot(store, 'PR-1042'), before);
});

test('reset restores the exact deterministic fixture after accepted mutations', () => {
  const store = createCaseboundStore();
  const initial = store.listCases();
  const before = snapshot(store, 'PR-1042');
  const accepted = store.mutate({
    role: ROLES.REVIEWING_OFFICER,
    caseId: 'PR-1042',
    action: ACTIONS.ADD_REVIEW_FINDING,
    expectedVersion: before.version,
    payload: { finding: 'Temporary mutation before fixture reset.' },
  });
  assert.equal(accepted.ok, true);
  assert.notDeepEqual(store.listCases(), initial);

  store.reset();
  assert.deepEqual(store.listCases(), initial);
});
