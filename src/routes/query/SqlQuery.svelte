<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Card,
    Kbd,
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
    if (!store.client || !sql.trim() || running) return;

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

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      execute();
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
    <div class="flex flex-col gap-4">
      <div>
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <h2
              class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              Manual SQL Query
            </h2>
          </div>
          <Badge variant="outline" color="neutral" size="sm">
            Ad-hoc execution
          </Badge>
        </div>
        <p class="text-sm text-(--color-text-muted) flex items-center gap-1">
          Run read or write statements directly against the connected database.
          Press <Kbd size="sm">Cmd/Ctrl + Enter</Kbd> to execute.
        </p>
      </div>

      <div class="relative">
        <Textarea
          id="sql-editor"
          placeholder="SELECT * FROM sqlite_master;"
          bind:value={sql}
          onkeydown={handleKeydown}
          rows={6}
          class="font-mono text-sm shadow-inner"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button
          color="info"
          size="md"
          loading={running}
          disabled={running || !sql.trim()}
          onclick={execute}
        >
          Execute Query
        </Button>

        {#if !running && results.length > 0}
          <div
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
          >
            <span>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            <span class="text-base-400">•</span>
            <span>{totalTime.toFixed(3)}s total time</span>
          </div>
        {/if}
      </div>
    </div>
  </Card>

  {#if error}
    <Alert color="error">{error}</Alert>
  {/if}

  {#each results as result, resultIndex (`${result.time}-${resultIndex}`)}
    <Card padding="none" class="overflow-hidden">
      <div class="flex flex-col">
        <div
          class="flex items-center justify-between border-b border-base-400 bg-base-100 p-4"
        >
          <div class="flex items-center gap-3">
            <Badge
              color={resultBadgeColor(result.type)}
              variant="soft"
              size="sm"
              class="uppercase tracking-wider"
            >
              {result.type}
            </Badge>
            <span
              class="text-xs font-mono font-semibold text-(--color-text-muted)"
            >
              {result.time.toFixed(4)}
              s
            </span>
          </div>
          <div class="flex items-center gap-3">
            {#if result.txId}
              <div class="flex items-center gap-1.5">
                <span
                  class="text-xs uppercase tracking-wider text-(--color-text-muted)"
                >
                  TX
                </span>
                <span class="text-xs font-mono font-bold">{result.txId}</span>
              </div>
            {/if}
            {#if result.lastInsertId !== undefined}
              {#if result.txId}
                <span class="text-base-400">•</span>
              {/if}
              <div class="flex items-center gap-1.5">
                <span
                  class="text-xs uppercase tracking-wider text-(--color-text-muted)"
                >
                  Last ID
                </span>
                <span class="text-xs font-mono font-bold text-(--color-info)">
                  {result.lastInsertId}
                </span>
              </div>
            {/if}
            {#if result.rowsAffected !== undefined}
              {#if result.txId || result.lastInsertId !== undefined}
                <span class="text-base-400">•</span>
              {/if}
              <div class="flex items-center gap-1.5">
                <span
                  class="text-xs uppercase tracking-wider text-(--color-text-muted)"
                >
                  Rows
                </span>
                <span
                  class="text-xs font-mono font-bold text-(--color-warning)"
                >
                  {result.rowsAffected}
                </span>
              </div>
            {/if}
          </div>
        </div>

        {#if result.error}
          <div class="p-4">
            <Alert color="error">{result.error}</Alert>
          </div>
        {/if}

        {#if result.columns && result.rows && result.columns.length > 0}
          <div class="overflow-x-auto p-1">
            <Table.Root size="sm" striped stickyHeader variant="ghost">
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
                      <Table.Cell class="font-mono text-sm">
                        {sqliteValueToDisplay(cell)}
                      </Table.Cell>
                    {/each}
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        {:else if ["write", "begin", "commit", "rollback"].includes(result.type) && !result.error}
          <div class="p-8 text-center">
            <p
              class="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              Statement executed successfully
            </p>
            <p class="mt-1 text-xs text-(--color-text-muted)">
              No rows returned
            </p>
          </div>
        {/if}
      </div>
    </Card>
  {/each}
</div>
