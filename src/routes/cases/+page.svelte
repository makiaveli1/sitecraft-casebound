<script>
  import { onMount } from 'svelte';

  let { data } = $props();

  const filters = [
    ['all', 'All cases'],
    ['intake', 'Intake'],
    ['under_review', 'Under review'],
    ['approved', 'Approved'],
    ['returned_for_changes', 'Returned'],
  ];

  function roleLabel(role) {
    return role === data.roles.REVIEWING_OFFICER ? 'Reviewing Officer' : 'Intake Clerk';
  }

  function statusLabel(status) {
    return {
      intake: 'Intake',
      under_review: 'Under review',
      approved: 'Approved',
      returned_for_changes: 'Returned',
    }[status] ?? status.replaceAll('_', ' ');
  }

  function returnTo() {
    return data.filter === 'all' ? '/cases' : `/cases?state=${encodeURIComponent(data.filter)}`;
  }

  onMount(() => {
    if (data.roleFocus) {
      document.querySelector('#fixture-role-status')?.focus();
    }
  });
</script>

<svelte:head>
  <title>CASEBOUND — Permit register</title>
  <meta
    name="description"
    content="Local fictional SITECRAFT forward test for server-authoritative permit-review permissions."
  />
</svelte:head>

<a class="skip-link" href="#casebound-main">Skip to permit register</a>

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
    <input type="hidden" name="returnTo" value={returnTo()} />
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

<main id="casebound-main" class="app-frame" tabindex="-1">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Fictional permit registry / {data.cases.length} shown of {data.totalCount}</p>
      <h1>Permit register</h1>
      <p class="page-deck">
        Open one dossier to review the accountable record. The browser may simplify which actions you see,
        but every protected change is accepted or denied again on the server.
      </p>
    </div>
    <p class="fixture-warning">
      This is a local SITECRAFT test with invented people and records. The role switch is a testing control,
      not a login or identity check.
    </p>
  </header>

  <nav class="filter-strip" aria-label="Filter permit register by state">
    <span class="registry-meta">Register state</span>
    {#each filters as [value, label]}
      <a
        href={value === 'all' ? '/cases' : `/cases?state=${value}`}
        aria-current={data.filter === value ? 'page' : undefined}
      >{label}</a>
    {/each}
  </nav>

  <div class="registry-head" aria-hidden="true">
    <span>Permit</span>
    <span>Applicant</span>
    <span>Proposed work</span>
    <span>State</span>
    <span>Version</span>
  </div>

  {#if data.cases.length > 0}
    <ol class="registry-list" aria-label="Fictional permit cases">
      {#each data.cases as caseRecord}
        <li class="registry-row">
          <a href={`/cases/${caseRecord.id}`} aria-label={`Open permit ${caseRecord.id}`}>
            {caseRecord.id}
          </a>
          <span class="registry-applicant">{caseRecord.applicant.name}</span>
          <span class="registry-project">
            <strong>{caseRecord.applicant.project}</strong>
            <span>{caseRecord.applicant.address}</span>
          </span>
          <span class="status-stamp" data-state={caseRecord.status}>{statusLabel(caseRecord.status)}</span>
          <span class="version-mark">v{caseRecord.version}</span>
        </li>
      {/each}
    </ol>
  {:else}
    <section class="empty-ledger" aria-labelledby="empty-register-title">
      <p class="eyebrow">No matching registry entries</p>
      <h2 id="empty-register-title">Nothing is filed under this state.</h2>
      <p>The fixture still contains {data.totalCount} fictional permit cases.</p>
      <a class="button-link" href="/cases">Show all cases</a>
    </section>
  {/if}
</main>
