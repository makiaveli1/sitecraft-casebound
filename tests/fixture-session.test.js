import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../src/lib/server/casebound-policy.js';
import {
  ROLE_COOKIE,
  normalizeRole,
  setFixtureRole,
} from '../src/lib/server/fixture-session.js';


test('fixture role normalization never invents authority from an unknown browser value', () => {
  assert.equal(normalizeRole(ROLES.INTAKE_CLERK), ROLES.INTAKE_CLERK);
  assert.equal(normalizeRole(ROLES.REVIEWING_OFFICER), ROLES.REVIEWING_OFFICER);
  assert.equal(normalizeRole('browser_supplied_admin'), ROLES.INTAKE_CLERK);
  assert.equal(normalizeRole(undefined), ROLES.INTAKE_CLERK);
});


test('fixture role helper writes the bounded local cookie settings and returns the normalized role', () => {
  const writes = [];
  const cookies = {
    set(name, value, options) {
      writes.push({ name, value, options });
    },
  };

  const role = setFixtureRole(cookies, ROLES.REVIEWING_OFFICER);
  assert.equal(role, ROLES.REVIEWING_OFFICER);
  assert.deepEqual(writes, [
    {
      name: ROLE_COOKIE,
      value: ROLES.REVIEWING_OFFICER,
      options: {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      },
    },
  ]);
});


test('unknown role input writes Intake Clerk rather than persisting an invented role', () => {
  const writes = [];
  const cookies = {
    set(name, value, options) {
      writes.push({ name, value, options });
    },
  };

  const role = setFixtureRole(cookies, 'browser_supplied_admin');
  assert.equal(role, ROLES.INTAKE_CLERK);
  assert.equal(writes[0].value, ROLES.INTAKE_CLERK);
});
