import { error, fail } from '@sveltejs/kit';
import {
  ACTIONS,
  ROLES,
  allowedActionsForRole,
  caseboundStore,
} from '$lib/server/casebound-policy.js';

function caseOr404(caseId) {
  const caseRecord = caseboundStore.getCase(caseId);
  if (!caseRecord) {
    error(404, {
      message: `Permit case ${caseId} was not found in this local fixture.`,
      code: 'CASE_NOT_FOUND',
    });
  }
  return caseRecord;
}

function text(data, key) {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

function expectedVersion(data) {
  const value = Number.parseInt(text(data, 'expectedVersion'), 10);
  return Number.isInteger(value) ? value : null;
}

function mutationResponse(result) {
  if (!result.ok) {
    return fail(result.status, { result });
  }
  return { result };
}

async function runMutation({ request, locals, params }, action, toPayload) {
  const data = await request.formData();
  const result = caseboundStore.mutate({
    role: locals.fixtureRole,
    caseId: params.caseId,
    action,
    expectedVersion: expectedVersion(data),
    payload: toPayload(data),
  });
  return mutationResponse(result);
}

export function load({ params, locals, url }) {
  return {
    caseRecord: caseOr404(params.caseId),
    role: locals.fixtureRole,
    roles: ROLES,
    allowedActions: allowedActionsForRole(locals.fixtureRole),
    roleFocus: url.searchParams.get('focus') === 'role',
  };
}

export const actions = {
  setCompleteness: (event) => runMutation(
    event,
    ACTIONS.SET_COMPLETENESS,
    (data) => ({
      complete: text(data, 'complete') === 'yes',
      missingItems: text(data, 'missingItems')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    }),
  ),

  addIntakeNote: (event) => runMutation(
    event,
    ACTIONS.ADD_INTAKE_NOTE,
    (data) => ({ note: text(data, 'note') }),
  ),

  addReviewFinding: (event) => runMutation(
    event,
    ACTIONS.ADD_REVIEW_FINDING,
    (data) => ({ finding: text(data, 'finding') }),
  ),

  approveCase: (event) => runMutation(
    event,
    ACTIONS.APPROVE_CASE,
    (data) => ({ note: text(data, 'note') }),
  ),

  returnForChanges: (event) => runMutation(
    event,
    ACTIONS.RETURN_FOR_CHANGES,
    (data) => ({ reason: text(data, 'reason') }),
  ),

  updateApplicantFact: (event) => runMutation(
    event,
    ACTIONS.UPDATE_APPLICANT_FACT,
    (data) => ({
      field: text(data, 'field'),
      value: text(data, 'value'),
    }),
  ),

  resetFixture: ({ params }) => {
    caseboundStore.reset();
    return {
      result: {
        ok: true,
        kind: 'fixture_reset',
        status: 200,
        case: caseOr404(params.caseId),
      },
    };
  },
};
