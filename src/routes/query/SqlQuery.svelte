<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Card,
    Heading,
    Label,
    Table,
    Textarea,
  } from "@varavel/ui";
  import type { QueryResult } from "$lib/client/types";
  import { sqliteValueToDisplay } from "$lib/sqlite";
  import { store } from "$lib/store.svelte";

  let sql = $state("");
  let results = $state<QueryResult[]>([]);
  let totalTime = $state(0);
  let error = $state("");
  let running = $state(false);

  async function execute() {
    if (!store.client || !sql.trim()) return;

    error = "";
    results = [];
    running = true;

    try {
      const output = await store.client.procs.databaseQuery().execute({
        queries: [{ query: sql.trim() }],
      });
      totalTime = output.time;
      results = output.results;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }

  function resultBadgeColor(type: string) {
    switch (type) {
      case "read":
        return "info";
      case "write":
        return "warning";
      case "begin":
        return "neutral";
      case "commit":
        return "success";
      case "rollback":
        return "warning";
      case "error":
        return "error";
      default:
        return "neutral";
    }
  }
</script>

<div class="flex flex-col gap-5">
  <Card padding="lg">
    <div class="flex flex-col gap-3">
      <div>
        <Heading level="2" size="md">Manual SQL query</Heading>
        <p class="mt-1 text-sm text-(--color-text-muted)">
          Run ad-hoc read or write statements directly against the connected
          database.
        </p>
      </div>

      <Label for="sql-editor">SQL Query</Label>
      <Textarea
        id="sql-editor"
        placeholder="SELECT * FROM sqlite_master;"
        bind:value={sql}
        rows={5}
      />
      <div class="flex flex-wrap items-center gap-3">
        <Button
          color="info"
          size="md"
          loading={running}
          disabled={running || !sql.trim()}
          onclick={execute}
        >
          Execute
        </Button>
        {#if !running && results.length > 0}
          <span class="text-xs text-(--color-text-muted)">
            {results.length} result{results.length !== 1 ? "s" : ""} in {totalTime.toFixed(3)}
            s
          </span>
        {/if}
      </div>
    </div>
  </Card>

  {#if error}
    <Alert color="error">{error}</Alert>
  {/if}

  {#each results as result, resultIndex (`${result.time}-${resultIndex}`)}
    <Card padding="lg">
      <div class="mb-3 flex items-center gap-2">
        <Badge color={resultBadgeColor(result.type)} size="sm">
          {result.type}
        </Badge>
        <span class="text-xs text-(--color-text-muted)">
          {result.time.toFixed(4)}
          s
        </span>
        {#if result.txId}
          <span class="text-xs text-(--color-text-muted)">
            tx: {result.txId}
          </span>
        {/if}
        {#if result.lastInsertId !== undefined}
          <span class="text-xs text-(--color-text-muted)">
            lastId: {result.lastInsertId}
          </span>
        {/if}
        {#if result.rowsAffected !== undefined}
          <span class="text-xs text-(--color-text-muted)">
            rows: {result.rowsAffected}
          </span>
        {/if}
      </div>

      {#if result.error}
        <Alert color="error">{result.error}</Alert>
      {/if}

      {#if result.columns && result.rows && result.columns.length > 0}
        <div class="overflow-x-auto">
          <Table.Root size="sm" striped stickyHeader>
            <Table.Header>
              <Table.Row>
                {#each result.columns as col (col)}
                  <Table.Head>{col}</Table.Head>
                {/each}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each result.rows as row, rowIndex (`${result.time}-${rowIndex}`)}
                <Table.Row>
                  {#each row as cell, cellIndex (`${rowIndex}-${cellIndex}`)}
                    <Table.Cell>{sqliteValueToDisplay(cell)}</Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {:else if ["write", "begin", "commit", "rollback"].includes(result.type)}
        <p class="text-sm text-(--color-text-muted)">
          Statement executed successfully with no rows returned.
        </p>
      {/if}
    </Card>
  {/each}
</div>
