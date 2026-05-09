<svelte:head>
  <title>Explorer | NSQLite UI</title>
</svelte:head>

<script lang="ts">
  import { Card, Container, Heading } from "@varavel/ui";
</script>

<Container maxWidth="full" padded>
  <div class="flex flex-col gap-6">
    <div>
      <Heading level="2" size="lg">Database explorer</Heading>
      <p class="mt-1 text-sm text-(--color-text-muted)">
        Inspect tables and views, review schema metadata, and page through
        read-only previews.
      </p>
    </div>

    <Card padding="lg">
      <p class="text-sm text-(--color-text-muted)">
        Select a table or view from the sidebar to inspect it.
      </p>
    </Card>
  </div>
</Container>
