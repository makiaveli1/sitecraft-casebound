<svelte:head>
  <title>CASEBOUND — Fixture role control</title>
</svelte:head>

<main class="app-frame" id="casebound-main">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Local test control</p>
      <h1>Fixture role only</h1>
      <p class="page-deck">
        This route exists so CASEBOUND can exercise different server authorization branches. It is not a login,
        identity check, or production permission system.
      </p>
    </div>
    <p class="fixture-warning">
      Choose the fixture role from the permit register or dossier. Protected mutations are still checked by the server policy after the role is selected.
    </p>
  </header>
  <p><a class="button-link" href="/cases">Return to permit register</a></p>
</main>
