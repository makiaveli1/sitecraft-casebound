import {
  ROLES,
  allowedActionsForRole,
  caseboundStore,
} from '$lib/server/casebound-policy.js';

const FILTERS = new Set(['all', 'intake', 'under_review', 'approved', 'returned_for_changes']);

export function load({ url, locals }) {
  const requestedFilter = url.searchParams.get('state') ?? 'all';
  const filter = FILTERS.has(requestedFilter) ? requestedFilter : 'all';
  const allCases = caseboundStore.listCases();
  const cases = filter === 'all'
    ? allCases
    : allCases.filter((item) => item.status === filter);

  return {
    role: locals.fixtureRole,
    roles: ROLES,
    allowedActions: allowedActionsForRole(locals.fixtureRole),
    roleFocus: url.searchParams.get('focus') === 'role',
    filter,
    cases,
    totalCount: allCases.length,
  };
}
