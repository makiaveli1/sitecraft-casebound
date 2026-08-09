import { ROLE_COOKIE, normalizeRole } from '$lib/server/fixture-session.js';

export async function handle({ event, resolve }) {
  event.locals.fixtureRole = normalizeRole(event.cookies.get(ROLE_COOKIE));
  return resolve(event);
}
