<script>
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} — CASEBOUND</title>
</svelte:head>

<main class="app-frame" id="casebound-main">
  <header class="page-heading">
    <div>
      <p class="eyebrow">CASEBOUND server response / {page.status}</p>
      <h1>{page.status === 404 ? 'Dossier not found' : 'Fixture unavailable'}</h1>
      <p class="page-deck">
        {page.error?.message ?? 'The local CASEBOUND fixture could not complete this request.'}
      </p>
    </div>
    <p class="fixture-warning">
      This page reports only the local fictional fixture state. It does not represent a production permit system.
    </p>
  </header>
  <p><a class="button-link" href="/cases">Return to permit register</a></p>
</main>
