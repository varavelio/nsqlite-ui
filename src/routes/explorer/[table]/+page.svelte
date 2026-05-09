<svelte:head>
  <title>Explorer | NSQLite UI</title>
</svelte:head>

<script lang="ts">
  import { Container } from "@varavel/ui";
  import { page } from "$app/state";
  import Explorer from "./Explorer.svelte";

  let tableName = $derived(
    page.params.table ? decodeURIComponent(page.params.table) : "",
  );
</script>

<Explorer initialTable={tableName} />
