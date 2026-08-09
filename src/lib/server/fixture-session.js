import { ROLES } from './casebound-policy.js';

export const ROLE_COOKIE = 'casebound_fixture_role';

export function normalizeRole(value) {
  return value === ROLES.REVIEWING_OFFICER
    ? ROLES.REVIEWING_OFFICER
    : ROLES.INTAKE_CLERK;
}

export function setFixtureRole(cookies, requestedRole) {
  const role = normalizeRole(requestedRole);
  cookies.set(ROLE_COOKIE, role, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });
  return role;
}
