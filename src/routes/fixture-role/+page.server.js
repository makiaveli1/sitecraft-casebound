import { redirect } from '@sveltejs/kit';
import { setFixtureRole } from '$lib/server/fixture-session.js';

function safeReturnTo(value) {
  return typeof value === 'string' && value.startsWith('/cases')
    ? value
    : '/cases';
}

function roleFocusReturnTo(value) {
  const target = new URL(safeReturnTo(value), 'http://casebound.local');
  target.searchParams.set('focus', 'role');
  return `${target.pathname}${target.search}${target.hash}`;
}

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    setFixtureRole(cookies, data.get('role'));
    redirect(303, roleFocusReturnTo(data.get('returnTo')));
  },
};
