<svelte:head>
  <title>Dashboard | NSQLite UI</title>
</svelte:head>

<script lang="ts">
  import { Container, Heading } from "@varavel/ui";
  import SystemStatus from "./SystemStatus.svelte";
</script>

<div class="flex flex-col gap-6">
  <div>
    <Heading level="2" size="lg">System dashboard</Heading>
    <p class="mt-1 text-sm text-(--color-text-muted)">
      Monitor runtime health, request volume, and queue activity for the
      connected NSQLite server.
    </p>
  </div>

  <SystemStatus />
</div>
