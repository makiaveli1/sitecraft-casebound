<script>
  import { onMount } from 'svelte';

  let { data, form } = $props();

  const labels = {
    intake: 'Intake',
    under_review: 'Under review',
    approved: 'Approved',
    returned_for_changes: 'Returned for changes',
  };

  function roleLabel(role) {
    return role === data.roles.REVIEWING_OFFICER ? 'Reviewing Officer' : 'Intake Clerk';
  }

  function can(action) {
    return data.allowedActions.includes(action);
  }

  function resultTitle(result) {
    return {
      accepted: 'Server accepted the change',
      fixture_reset: 'Fixture restored',
      invalid: 'The server needs a correction',
      denied: 'The server denied this action',
      stale: 'This dossier changed before your request arrived',
      not_found: 'The permit case was not found',
    }[result?.kind] ?? 'Server response';
  }

  function submittedValue(key, fallback = '') {
    return form?.result?.submitted?.[key] ?? fallback;
  }

  function submittedMissingItems() {
    const value = form?.result?.submitted?.missingItems;
    return Array.isArray(value)
      ? value.join('\n')
      : data.caseRecord.completeness.missingItems.join('\n');
  }

  onMount(() => {
    const failureKinds = new Set(['invalid', 'denied', 'stale']);
    const target = form?.result && failureKinds.has(form.result.kind)
      ? document.querySelector('#server-result')
      : data.roleFocus
        ? document.querySelector('#fixture-role-status')
        : !form?.result
          ? document.querySelector('#dossier-title')
          : null;
    target?.focus();
  });
</script>

<svelte:head>
  <title>{data.caseRecord.id} — CASEBOUND</title>
</svelte:head>

<a class="skip-link" href="#casebound-main">Skip to permit dossier</a>

<header class="fixture-bar" aria-label="CASEBOUND fixture controls">
  <div class="fixture-identity">
    <span class="fixture-mark" aria-hidden="true">CB</span>
    <div>
      <p class="fixture-kicker">Local authorization fixture · not authentication</p>
      <p class="fixture-name">CASEBOUND / Permit Review Workspace</p>
    </div>
  </div>

  <form class="role-switcher" method="POST" action="/fixture-role">
    <span id="fixture-role-status" tabindex="-1">Fixture role: <strong>{roleLabel(data.role)}</strong></span>
    <input type="hidden" name="returnTo" value={`/cases/${data.caseRecord.id}`} />
    <button
      type="submit"
      name="role"
      value={data.roles.INTAKE_CLERK}
      aria-pressed={data.role === data.roles.INTAKE_CLERK}
    >
      Intake Clerk
    </button>
    <button
      type="submit"
      name="role"
      value={data.roles.REVIEWING_OFFICER}
      aria-pressed={data.role === data.roles.REVIEWING_OFFICER}
    >
      Reviewing Officer
    </button>
  </form>
</header>

<main id="casebound-main" class="dossier-shell" tabindex="-1">
  <div class="dossier-topline">
    <a class="back-link" href="/cases">← Permit register</a>
    <span class="registry-meta">Fictional record · process-local fixture</span>
  </div>

  {#if form?.result}
    <section
      id="server-result"
      class="server-result"
      data-kind={form.result.kind}
      tabindex="-1"
      aria-labelledby="server-result-title"
      aria-live="polite"
    >
      <p class="result-label">Server result / {form.result.status}</p>
      <h2 id="server-result-title">{resultTitle(form.result)}</h2>

      {#if form.result.kind === 'accepted'}
        <p>
          The authoritative record is now version <strong>{form.result.case.version}</strong>.
          Audit reference: <strong>{form.result.auditEntry.id}</strong>.
        </p>
      {:else if form.result.kind === 'fixture_reset'}
        <p>The deterministic local fixture was restored. This is not a production action.</p>
      {:else if form.result.kind === 'denied'}
        <p>
          <strong>{roleLabel(form.result.role)}</strong> is not allowed to request
          <strong>{form.result.action.replaceAll('_', ' ')}</strong>. The record remains version
          <strong>{form.result.currentVersion}</strong>.
        </p>
      {:else if form.result.kind === 'stale'}
        <p>
          Your request expected version <strong>{form.result.expectedVersion}</strong>, but the server is already on
          <strong>version {form.result.currentVersion}</strong>. Review the current dossier before trying again.
        </p>
      {:else if form.result.kind === 'invalid'}
        <p>The server rejected the submitted values. Nothing was changed.</p>
        {#if form.result.fieldErrors}
          <ul>
            {#each Object.entries(form.result.fieldErrors) as [field, message]}
              <li><strong>{field}</strong>: {message}</li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>
  {/if}

  <div class="dossier-layout">
    <article class="dossier-paper" aria-labelledby="dossier-title">
      <header class="dossier-heading">
        <div>
          <p class="eyebrow">Permit dossier / accountable record</p>
          <h1 id="dossier-title" tabindex="-1">{data.caseRecord.id}</h1>
          <p class="page-deck">{data.caseRecord.applicant.project}</p>
        </div>
        <div class="dossier-reference">
          <span class="field-label">Record state</span>
          <span class="status-stamp" data-state={data.caseRecord.status}>
            {labels[data.caseRecord.status] ?? data.caseRecord.status}
          </span>
          <span class="field-label">Server version</span>
          <strong>v{data.caseRecord.version}</strong>
        </div>
      </header>

      <section class="dossier-section" aria-labelledby="applicant-facts-title">
        <div class="section-margin">
          <p class="eyebrow">Section 01</p>
          <h2 id="applicant-facts-title">Applicant facts</h2>
          <span class="owner-label">Owner: applicant fixture / read-only to review roles</span>
        </div>
        <div class="section-body">
          <div class="fact-grid">
            <div class="fact">
              <span class="field-label">Applicant</span>
              <strong>{data.caseRecord.applicant.name}</strong>
            </div>
            <div class="fact">
              <span class="field-label">Site address</span>
              <strong>{data.caseRecord.applicant.address}</strong>
            </div>
            <div class="fact">
              <span class="field-label">Proposed work</span>
              <p>{data.caseRecord.applicant.project}</p>
            </div>
            <div class="fact">
              <span class="field-label">Review rule</span>
              <p>Neither fixture review role owns these submitted facts.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="dossier-section" aria-labelledby="intake-title">
        <div class="section-margin">
          <p class="eyebrow">Section 02</p>
          <h2 id="intake-title">Intake record</h2>
          <span class="owner-label">Owner: Intake Clerk</span>
        </div>
        <div class="section-body">
          <div class="fact-grid">
            <div class="fact">
              <span class="field-label">Completeness</span>
              <strong>{data.caseRecord.completeness.complete ? 'Complete' : 'Incomplete'}</strong>
            </div>
            <div class="fact">
              <span class="field-label">Missing items</span>
              {#if data.caseRecord.completeness.missingItems.length}
                <ul class="note-list">
                  {#each data.caseRecord.completeness.missingItems as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              {:else}
                <p>None recorded.</p>
              {/if}
            </div>
          </div>

          <span class="field-label">Intake notes</span>
          {#if data.caseRecord.intakeNotes.length}
            <ol class="note-list">
              {#each data.caseRecord.intakeNotes as note}
                <li>{note}</li>
              {/each}
            </ol>
          {:else}
            <p>No intake notes recorded.</p>
          {/if}
        </div>
      </section>

      <section class="dossier-section" aria-labelledby="review-findings-title">
        <div class="section-margin">
          <p class="eyebrow">Section 03</p>
          <h2 id="review-findings-title">Review findings</h2>
          <span class="owner-label">Owner: Reviewing Officer</span>
        </div>
        <div class="section-body">
          {#if data.caseRecord.reviewFindings.length}
            <ol class="finding-list">
              {#each data.caseRecord.reviewFindings as finding}
                <li>
                  {finding.text}
                  <span class="registry-meta"> / {finding.status}</span>
                </li>
              {/each}
            </ol>
          {:else}
            <p>No review findings are recorded.</p>
          {/if}
        </div>
      </section>

      <section class="dossier-section" aria-labelledby="decision-title">
        <div class="section-margin">
          <p class="eyebrow">Section 04</p>
          <h2 id="decision-title">Decision endorsement</h2>
          <span class="owner-label">Owner: Reviewing Officer / server-authorized</span>
        </div>
        <div class="section-body">
          {#if data.caseRecord.decision}
            <span class="status-stamp" data-state={data.caseRecord.status}>
              {labels[data.caseRecord.status] ?? data.caseRecord.decision.type}
            </span>
            {#if data.caseRecord.decision.note}
              <p>{data.caseRecord.decision.note}</p>
            {/if}
          {:else}
            <p>No final decision has been endorsed.</p>
          {/if}
        </div>
      </section>

      <section class="dossier-section" aria-labelledby="audit-title">
        <div class="section-margin">
          <p class="eyebrow">Section 05</p>
          <h2 id="audit-title">Version line</h2>
          <span class="owner-label">Fixture audit / not production logging</span>
        </div>
        <div class="section-body">
          <ol class="audit-list">
            {#each data.caseRecord.audit as entry}
              <li>
                <strong>{entry.id}</strong> · {entry.action.replaceAll('_', ' ')} · {entry.role.replaceAll('_', ' ')} · v{entry.version}
              </li>
            {/each}
          </ol>
        </div>
      </section>
    </article>

    <aside class="review-margin" aria-labelledby="review-margin-title">
      <header class="review-margin-header">
        <p class="eyebrow">Server-endorsed review margin</p>
        <h2 id="review-margin-title">{roleLabel(data.role)}</h2>
        <p>
          These controls reflect the current fixture role for clarity. The server policy still checks every submitted action independently.
        </p>
      </header>

      {#if can('set_completeness')}
        <section class="review-block" aria-labelledby="completeness-action-title">
          <p class="eyebrow">Intake action</p>
          <h3 id="completeness-action-title">Record completeness</h3>
          <form class="stack" method="POST" action="?/setCompleteness">
            <input type="hidden" name="expectedVersion" value={data.caseRecord.version} />
            <div class="radio-row">
              <label>
                <input
                  type="radio"
                  name="complete"
                  value="yes"
                  checked={submittedValue('complete', data.caseRecord.completeness.complete) === true}
                />
                Complete
              </label>
              <label>
                <input
                  type="radio"
                  name="complete"
                  value="no"
                  checked={submittedValue('complete', data.caseRecord.completeness.complete) === false}
                />
                Incomplete
              </label>
            </div>
            <label class="stack-label">
              <span class="field-label">Missing items, one per line</span>
              <textarea name="missingItems">{submittedMissingItems()}</textarea>
            </label>
            <button class="primary" type="submit">Save intake completeness</button>
          </form>
        </section>

        <section class="review-block" aria-labelledby="intake-note-action-title">
          <p class="eyebrow">Intake action</p>
          <h3 id="intake-note-action-title">Add intake note</h3>
          <form class="stack" method="POST" action="?/addIntakeNote">
            <input type="hidden" name="expectedVersion" value={data.caseRecord.version} />
            <label class="stack-label">
              <span class="field-label">Note</span>
              <textarea name="note">{submittedValue('note')}</textarea>
            </label>
            <button type="submit">Add intake note</button>
          </form>
        </section>
      {/if}

      {#if can('add_review_finding')}
        <section class="review-block" aria-labelledby="finding-action-title">
          <p class="eyebrow">Review action</p>
          <h3 id="finding-action-title">Add finding</h3>
          <form class="stack" method="POST" action="?/addReviewFinding">
            <input type="hidden" name="expectedVersion" value={data.caseRecord.version} />
            <label class="stack-label">
              <span class="field-label">Finding</span>
              <textarea name="finding">{submittedValue('finding')}</textarea>
            </label>
            <button type="submit">Record review finding</button>
          </form>
        </section>
      {/if}

      {#if can('approve_case')}
        <section class="review-block" aria-labelledby="decision-action-title">
          <p class="eyebrow">Decision authority</p>
          <h3 id="decision-action-title">Endorse this dossier</h3>

          <form class="stack" method="POST" action="?/approveCase">
            <input type="hidden" name="expectedVersion" value={data.caseRecord.version} />
            <label class="stack-label">
              <span class="field-label">Optional approval note</span>
              <textarea name="note">{submittedValue('note')}</textarea>
            </label>
            <button class="primary" type="submit">Approve case</button>
          </form>

          <form class="stack" method="POST" action="?/returnForChanges">
            <input type="hidden" name="expectedVersion" value={data.caseRecord.version} />
            <label class="stack-label">
              <span class="field-label">Reason for return</span>
              <textarea name="reason">{submittedValue('reason')}</textarea>
            </label>
            <button class="danger-outline" type="submit">Return for changes</button>
          </form>
        </section>
      {/if}

      <section class="review-block">
        <p class="permission-note">
          UI visibility is not authorization proof. Direct forbidden POST requests are part of this forward test and must be denied by the server policy even when no matching control appears here.
        </p>

        <details class="fixture-tools">
          <summary>Local fixture tools</summary>
          <p class="permission-note">Testing only. Reset restores the deterministic in-memory cases.</p>
          <form class="stack" method="POST" action="?/resetFixture">
            <button type="submit">Reset local fixture</button>
          </form>
        </details>
      </section>
    </aside>
  </div>
</main>
