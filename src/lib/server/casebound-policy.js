export const ROLES = Object.freeze({
  INTAKE_CLERK: 'intake_clerk',
  REVIEWING_OFFICER: 'reviewing_officer',
});

export const ACTIONS = Object.freeze({
  SET_COMPLETENESS: 'set_completeness',
  ADD_INTAKE_NOTE: 'add_intake_note',
  ADD_REVIEW_FINDING: 'add_review_finding',
  APPROVE_CASE: 'approve_case',
  RETURN_FOR_CHANGES: 'return_for_changes',
  UPDATE_APPLICANT_FACT: 'update_applicant_fact',
});

const KNOWN_ACTIONS = new Set(Object.values(ACTIONS));
const PERMISSIONS = Object.freeze({
  [ROLES.INTAKE_CLERK]: new Set([
    ACTIONS.SET_COMPLETENESS,
    ACTIONS.ADD_INTAKE_NOTE,
  ]),
  [ROLES.REVIEWING_OFFICER]: new Set([
    ACTIONS.ADD_REVIEW_FINDING,
    ACTIONS.APPROVE_CASE,
    ACTIONS.RETURN_FOR_CHANGES,
  ]),
});

export function canRoleRequest(role, action) {
  return Boolean(PERMISSIONS[role]?.has(action));
}

export function allowedActionsForRole(role) {
  return [...(PERMISSIONS[role] ?? [])];
}

function clone(value) {
  return structuredClone(value);
}

function initialCases() {
  return {
    'PR-1042': {
      id: 'PR-1042',
      version: 3,
      status: 'under_review',
      applicant: {
        name: 'Mara Ellery',
        address: '18 Linden Row',
        project: 'Rear studio addition',
      },
      completeness: {
        complete: true,
        missingItems: [],
      },
      intakeNotes: ['Application indexed and fee marker confirmed.'],
      reviewFindings: [],
      decision: null,
      audit: [
        { id: 'AUD-091', role: 'system_fixture', action: 'fixture_seed', version: 3 },
      ],
    },
    'PR-1047': {
      id: 'PR-1047',
      version: 1,
      status: 'intake',
      applicant: {
        name: 'Devon Pike',
        address: '42 Quarry Lane',
        project: 'Shopfront accessibility alterations',
      },
      completeness: {
        complete: false,
        missingItems: ['Site drainage note'],
      },
      intakeNotes: [],
      reviewFindings: [],
      decision: null,
      audit: [
        { id: 'AUD-092', role: 'system_fixture', action: 'fixture_seed', version: 1 },
      ],
    },
    'PR-1051': {
      id: 'PR-1051',
      version: 4,
      status: 'under_review',
      applicant: {
        name: 'Imani Vale',
        address: '7 Orchard Mews',
        project: 'Courtyard canopy and lighting',
      },
      completeness: {
        complete: true,
        missingItems: [],
      },
      intakeNotes: ['Drawing set received as revision B.'],
      reviewFindings: [
        { text: 'Clarify the canopy edge setback from the shared boundary.', status: 'open' },
      ],
      decision: null,
      audit: [
        { id: 'AUD-093', role: 'system_fixture', action: 'fixture_seed', version: 4 },
      ],
    },
  };
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validExpectedVersion(value) {
  return Number.isInteger(value) && value >= 1;
}

function validatePayload(action, payload, currentCase) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const fieldErrors = {};

  if (action === ACTIONS.SET_COMPLETENESS) {
    if (typeof safePayload.complete !== 'boolean') {
      fieldErrors.complete = 'Choose whether the packet is complete.';
    }
    if (safePayload.complete === false) {
      const missingItems = Array.isArray(safePayload.missingItems)
        ? safePayload.missingItems.map(textValue).filter(Boolean)
        : [];
      if (missingItems.length === 0) {
        fieldErrors.missingItems = 'List at least one missing item when the packet is incomplete.';
      }
    }
  }

  if (action === ACTIONS.ADD_INTAKE_NOTE) {
    const note = textValue(safePayload.note);
    if (note.length < 4 || note.length > 240) {
      fieldErrors.note = 'Intake note must be between 4 and 240 characters.';
    }
  }

  if (action === ACTIONS.ADD_REVIEW_FINDING) {
    const finding = textValue(safePayload.finding);
    if (finding.length < 4 || finding.length > 300) {
      fieldErrors.finding = 'Review finding must be between 4 and 300 characters.';
    }
  }

  if (action === ACTIONS.APPROVE_CASE) {
    if (!currentCase.completeness.complete) {
      fieldErrors.decision = 'A case cannot be approved until intake completeness is confirmed.';
    }
    const note = textValue(safePayload.note);
    if (note.length > 300) {
      fieldErrors.note = 'Decision note must be 300 characters or fewer.';
    }
  }

  if (action === ACTIONS.RETURN_FOR_CHANGES) {
    const reason = textValue(safePayload.reason);
    if (reason.length < 4 || reason.length > 300) {
      fieldErrors.reason = 'Return reason must be between 4 and 300 characters.';
    }
  }

  return fieldErrors;
}

function applyAllowedMutation(currentCase, action, payload) {
  const nextCase = clone(currentCase);

  if (action === ACTIONS.SET_COMPLETENESS) {
    nextCase.completeness.complete = payload.complete;
    nextCase.completeness.missingItems = payload.complete
      ? []
      : payload.missingItems.map(textValue).filter(Boolean);
    if (nextCase.status === 'intake' && payload.complete) {
      nextCase.status = 'under_review';
    }
  } else if (action === ACTIONS.ADD_INTAKE_NOTE) {
    nextCase.intakeNotes.push(textValue(payload.note));
  } else if (action === ACTIONS.ADD_REVIEW_FINDING) {
    nextCase.reviewFindings.push({
      text: textValue(payload.finding),
      status: 'open',
    });
  } else if (action === ACTIONS.APPROVE_CASE) {
    nextCase.status = 'approved';
    nextCase.decision = {
      type: 'approved',
      note: textValue(payload.note),
    };
  } else if (action === ACTIONS.RETURN_FOR_CHANGES) {
    nextCase.status = 'returned_for_changes';
    nextCase.decision = {
      type: 'returned_for_changes',
      note: textValue(payload.reason),
    };
  }

  return nextCase;
}

export function createCaseboundStore() {
  let cases = initialCases();
  let auditSequence = 100;

  function getCase(caseId) {
    return cases[caseId] ? clone(cases[caseId]) : null;
  }

  function listCases() {
    return Object.values(cases)
      .map((item) => clone(item))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function reset() {
    cases = initialCases();
    auditSequence = 100;
    return listCases();
  }

  function mutate({ role, caseId, action, payload = {}, expectedVersion }) {
    const currentCase = cases[caseId];
    if (!currentCase) {
      return {
        ok: false,
        kind: 'not_found',
        status: 404,
        caseId,
      };
    }

    if (!KNOWN_ACTIONS.has(action)) {
      return {
        ok: false,
        kind: 'invalid',
        status: 422,
        fieldErrors: { action: 'Unknown case action.' },
        submitted: clone(payload),
        currentVersion: currentCase.version,
      };
    }

    const allowed = PERMISSIONS[role];
    if (!allowed || !allowed.has(action)) {
      return {
        ok: false,
        kind: 'denied',
        status: 403,
        action,
        role,
        currentVersion: currentCase.version,
      };
    }

    const fieldErrors = validatePayload(action, payload, currentCase);
    if (!validExpectedVersion(expectedVersion)) {
      fieldErrors.expectedVersion = 'Expected record version is required.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        kind: 'invalid',
        status: 422,
        fieldErrors,
        submitted: clone(payload),
        currentVersion: currentCase.version,
      };
    }

    if (expectedVersion !== currentCase.version) {
      return {
        ok: false,
        kind: 'stale',
        status: 409,
        expectedVersion,
        currentVersion: currentCase.version,
        case: clone(currentCase),
      };
    }

    const nextCase = applyAllowedMutation(currentCase, action, payload);
    nextCase.version = currentCase.version + 1;
    const auditEntry = {
      id: `AUD-${++auditSequence}`,
      role,
      action,
      version: nextCase.version,
    };
    nextCase.audit.push(auditEntry);
    cases[caseId] = nextCase;

    return {
      ok: true,
      kind: 'accepted',
      status: 200,
      case: clone(nextCase),
      auditEntry: clone(auditEntry),
    };
  }

  return Object.freeze({
    getCase,
    listCases,
    mutate,
    reset,
  });
}

export const caseboundStore = createCaseboundStore();
