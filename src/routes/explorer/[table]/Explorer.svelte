<script lang="ts">
  import {
    Alert,
    Badge,
    Bento,
    Button,
    Card,
    CodeBlock,
    Kbd,
    Label,
    Pagination,
    Select,
    Skeleton,
    Table,
  } from "@varavel/ui";
  import { onMount } from "svelte";
  import type { QueryResult, SqliteValue } from "$lib/client/types";
  import {
    buildExplorerPreviewQuery,
    quoteSqliteIdentifier,
    readResultRowsToObjects,
    type SqlitePrimitive,
    sqliteValueToDisplay,
    sqliteValueToPrimitive,
  } from "$lib/sqlite";
  import { store } from "$lib/store.svelte";

  type ColumnInfo = {
    cid: number | null;
    name: string;
    type: string | null;
    notnull: number | null;
    dflt_value: string | null;
    pk: number | null;
  };

  type IndexInfo = {
    seq: number | null;
    name: string;
    unique: number | null;
    origin: string | null;
    partial: number | null;
  };

  type ForeignKeyInfo = {
    id: number | null;
    seq: number | null;
    table: string | null;
    from: string | null;
    to: string | null;
    on_update: string | null;
    on_delete: string | null;
    match: string | null;
  };

  let { initialTable = "" }: { initialTable?: string } = $props();

  const pageSizeOptions = [10, 25, 50, 100];
  const pageSizeItems = pageSizeOptions.map((o) => ({
    value: String(o),
    label: String(o),
  }));

  let selectedObjectName = $state("");
  $effect(() => {
    if (initialTable !== selectedObjectName) {
      selectedObjectName = initialTable;
      pageIndex = 0;
      cursorHistory = [{}];
      if (store.client && initialTable) {
        void loadSelectedObject();
      }
    }
  });

  let schemaLoading = $state(false);
  let schemaError = $state("");
  let columns = $state<ColumnInfo[]>([]);
  let indexes = $state<IndexInfo[]>([]);
  let foreignKeys = $state<ForeignKeyInfo[]>([]);
  let previewColumns = $state<string[]>([]);
  let previewRows = $state<SqliteValue[][]>([]);
  let totalRows = $state<number | null>(null);
  let totalTime = $state(0);
  let pageSize = $state(25);
  let selectPageSize = $state("25");
  let schemaRequestId = 0;
  let objectDefinition = $state<string | null>(null);

  // Pagination state
  let cursorHistory = $state<Record<string, SqlitePrimitive>[]>([{}]);
  let pageIndex = $state(0);
  let hasNextPage = $state(false);
  let countingRows = $state(false);

  $effect(() => {
    if (selectPageSize !== String(pageSize)) {
      const nextValue = Number(selectPageSize);
      if (Number.isFinite(nextValue) && nextValue > 0) {
        pageSize = nextValue;
        cursorHistory = [{}];
        pageIndex = 0;
        void loadSelectedObject();
      }
    }
  });

  let primaryKeyColumns = $derived.by(() =>
    columns
      .filter((column) => (column.pk ?? 0) > 0)
      .sort((a, b) => (a.pk ?? 0) - (b.pk ?? 0))
      .map((column) => column.name),
  );

  let showingFrom = $derived(
    previewRows.length === 0 ? 0 : pageIndex * pageSize + 1,
  );
  let showingTo = $derived(pageIndex * pageSize + previewRows.length);

  let previewSummary = $derived(
    previewRows.length === 0
      ? "No data to display."
      : `Showing ${showingFrom}-${showingTo}${totalRows !== null ? ` of ${totalRows.toLocaleString()}` : ""}.`,
  );

  async function countTotalRows() {
    if (!store.client || !selectedObjectName) return;
    countingRows = true;
    try {
      const safeName = quoteSqliteIdentifier(selectedObjectName);
      const [countResult] = await runQueries([
        `SELECT COUNT(*) AS total_rows FROM ${safeName};`,
      ]);
      totalRows = parseCount(countResult);
    } catch (e) {
      console.error("Failed to count rows", e);
    } finally {
      countingRows = false;
    }
  }

  async function runQueries(queries: string[]): Promise<QueryResult[]> {
    if (!store.client) {
      throw new Error("Not connected to an NSQLite server");
    }
    const output = await store.client.procs.databaseQuery().execute({
      queries: queries.map((query) => ({ query })),
    });
    totalTime = output.time;
    return output.results;
  }

  function parseColumns(result: QueryResult): ColumnInfo[] {
    return readResultRowsToObjects(result).map((row) => ({
      cid: typeof row.cid === "number" ? row.cid : null,
      name: String(row.name ?? ""),
      type: row.type === null ? null : String(row.type),
      notnull: typeof row.notnull === "number" ? row.notnull : null,
      dflt_value: row.dflt_value === null ? null : String(row.dflt_value),
      pk: typeof row.pk === "number" ? row.pk : null,
    }));
  }

  function parseIndexes(result: QueryResult): IndexInfo[] {
    return readResultRowsToObjects(result).map((row) => ({
      seq: typeof row.seq === "number" ? row.seq : null,
      name: String(row.name ?? ""),
      unique: typeof row.unique === "number" ? row.unique : null,
      origin: row.origin === null ? null : String(row.origin),
      partial: typeof row.partial === "number" ? row.partial : null,
    }));
  }

  function parseForeignKeys(result: QueryResult): ForeignKeyInfo[] {
    return readResultRowsToObjects(result).map((row) => ({
      id: typeof row.id === "number" ? row.id : null,
      seq: typeof row.seq === "number" ? row.seq : null,
      table: row.table === null ? null : String(row.table),
      from: row.from === null ? null : String(row.from),
      to: row.to === null ? null : String(row.to),
      on_update: row.on_update === null ? null : String(row.on_update),
      on_delete: row.on_delete === null ? null : String(row.on_delete),
      match: row.match === null ? null : String(row.match),
    }));
  }

  function parseCount(result: QueryResult): number | null {
    const rows = readResultRowsToObjects(result);
    const value = rows[0]?.total_rows;
    return typeof value === "number" ? value : null;
  }

  function parseSql(result: QueryResult): string | null {
    const rows = readResultRowsToObjects(result);
    const value = rows[0]?.sql;
    return value === null ? null : String(value ?? "");
  }

  async function loadSelectedObject() {
    if (!selectedObjectName) {
      columns = [];
      indexes = [];
      foreignKeys = [];
      previewColumns = [];
      previewRows = [];
      totalRows = null;
      objectDefinition = null;
      schemaError = "";
      schemaLoading = false;
      return;
    }

    const requestId = ++schemaRequestId;
    schemaLoading = true;
    schemaError = "";

    try {
      const pragmaName = JSON.stringify(selectedObjectName);
      const metadataResults = await runQueries([
        `PRAGMA table_info(${pragmaName});`,
        `PRAGMA index_list(${pragmaName});`,
        `PRAGMA foreign_key_list(${pragmaName});`,
        `SELECT sql FROM sqlite_master WHERE name = ${pragmaName};`,
      ]);
      const metadataTime = totalTime;

      if (requestId !== schemaRequestId) return;

      const [columnsResult, indexesResult, foreignKeysResult, sqlResult] =
        metadataResults;

      const metadataError = metadataResults.find(
        (result) => result?.error,
      )?.error;
      if (metadataError) {
        throw new Error(metadataError);
      }

      const nextColumns = parseColumns(columnsResult);
      const nextIndexes = parseIndexes(indexesResult);
      const nextForeignKeys = parseForeignKeys(foreignKeysResult);
      const nextPrimaryKeyColumns = nextColumns
        .filter((column) => (column.pk ?? 0) > 0)
        .sort((a, b) => (a.pk ?? 0) - (b.pk ?? 0))
        .map((column) => column.name);

      const previewQuery = buildExplorerPreviewQuery({
        objectName: selectedObjectName,
        columnNames: nextColumns.map((column) => column.name),
        primaryKeyColumns: nextPrimaryKeyColumns,
        limit: pageSize + 1, // Request limit + 1 to check for next page
        cursor: cursorHistory[pageIndex],
      });

      const [previewResult] = await runQueries([previewQuery]);
      const previewTime = totalTime;

      if (requestId !== schemaRequestId) return;

      if (previewResult?.error) {
        throw new Error(previewResult.error);
      }

      const returnedRows = previewResult?.rows ?? [];
      hasNextPage = returnedRows.length > pageSize;
      const displayRows = hasNextPage
        ? returnedRows.slice(0, pageSize)
        : returnedRows;

      columns = nextColumns;
      indexes = nextIndexes;
      foreignKeys = nextForeignKeys;
      objectDefinition = parseSql(sqlResult);
      previewColumns = previewResult?.columns ?? [];
      previewRows = displayRows;
      totalTime = metadataTime + previewTime;
    } catch (error) {
      if (requestId !== schemaRequestId) return;

      schemaError = error instanceof Error ? error.message : String(error);
      columns = [];
      indexes = [];
      foreignKeys = [];
      objectDefinition = null;
      previewColumns = [];
      previewRows = [];
      totalRows = null;
    } finally {
      if (requestId === schemaRequestId) {
        schemaLoading = false;
      }
    }
  }

  function handleNextPage() {
    if (!hasNextPage || previewRows.length === 0) return;

    // Extract cursor from the last row
    const lastRow = previewRows[previewRows.length - 1];
    const newCursor: Record<string, SqlitePrimitive> = {};
    const orderCols =
      primaryKeyColumns.length > 0
        ? primaryKeyColumns
        : previewColumns.slice(0, 1);

    for (const col of orderCols) {
      const colIdx = previewColumns.indexOf(col);
      if (colIdx >= 0) {
        newCursor[col] = sqliteValueToPrimitive(
          lastRow[colIdx] ?? { null: true },
        );
      }
    }

    cursorHistory.push(newCursor);
    pageIndex++;
    void loadSelectedObject();
  }

  function handlePrevPage() {
    if (pageIndex > 0) {
      cursorHistory.pop();
      pageIndex--;
      void loadSelectedObject();
    }
  }

  onMount(() => {
    if (store.client && selectedObjectName) {
      void loadSelectedObject();
    } else {
      schemaLoading = false;
    }
  });
</script>

<div class="flex flex-col gap-5">
  {#if schemaError}
    <Alert color="error">{schemaError}</Alert>
  {/if}

  {#if selectedObjectName}
    <h1 class="text-2xl font-bold tracking-tight">
      {selectedObjectName}
    </h1>

    <Bento.Grid>
      {#if schemaLoading}
        <Bento.Item deskCols="12">
          <Card padding="lg">
            <div class="flex flex-col gap-2">
              <Skeleton class="h-4 w-48" />
              <Skeleton class="h-32 w-full" />
            </div>
          </Card>
        </Bento.Item>
      {/if}

      <!-- COLUMNS & INDEXES -->
      <Bento.Item deskCols="8" deskRows="2">
        <Card padding="none" class="h-full overflow-hidden flex flex-col">
          <div
            class="flex items-center justify-between border-b border-base-400 bg-base-100 p-4"
          >
            <div class="flex items-center gap-2">
              <h3
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Columns
              </h3>
              <Badge variant="outline" color="neutral" size="sm">
                {columns.length}
              </Badge>
            </div>
            <div
              class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              PKs: <span class="font-mono text-(--color-text)">
                {primaryKeyColumns.length > 0 ? primaryKeyColumns.join(", ") : "None"}
              </span>
            </div>
          </div>

          <div class="overflow-x-auto flex-1 p-1">
            <Table.Root size="sm" striped stickyHeader variant="ghost">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Nullable</Table.Head>
                  <Table.Head>Default</Table.Head>
                  <Table.Head>PK</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each columns as column (column.name)}
                  <Table.Row>
                    <Table.Cell class="font-medium font-mono text-sm">
                      {column.name}
                    </Table.Cell>
                    <Table.Cell class="font-mono text-sm text-(--color-info)">
                      {column.type || "—"}
                    </Table.Cell>
                    <Table.Cell>
                      {column.notnull === 1 ? "No" : "Yes"}
                    </Table.Cell>
                    <Table.Cell class="font-mono text-sm">
                      {column.dflt_value ?? "—"}
                    </Table.Cell>
                    <Table.Cell
                      class="font-mono text-sm text-(--color-warning)"
                    >
                      {column.pk ? `#${column.pk}` : "—"}
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell
                      colspan={5}
                      class="text-center text-(--color-text-muted) py-8"
                    >
                      No column metadata available.
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="4" deskRows="2">
        <div class="flex flex-col gap-5 h-full">
          <Card padding="none" class="flex-1 overflow-hidden flex flex-col">
            <div
              class="flex items-center justify-between border-b border-base-400 bg-base-100 p-4"
            >
              <h3
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Indexes
              </h3>
              <Badge variant="outline" color="neutral" size="sm">
                {indexes.length}
              </Badge>
            </div>
            <div class="p-4 flex-1 overflow-y-auto">
              <div class="flex flex-col gap-3">
                {#each indexes as index (index.name)}
                  <div
                    class="rounded-lg border border-base-400 bg-base-100 p-3"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm font-mono font-medium truncate">
                        {index.name}
                      </span>
                      <Badge
                        color={index.unique === 1 ? "success" : "neutral"}
                        variant="soft"
                        size="sm"
                        class="uppercase tracking-wider shrink-0"
                      >
                        {index.unique === 1 ? "unique" : "non-unique"}
                      </Badge>
                    </div>
                    <p
                      class="mt-2 text-xs text-(--color-text-muted) uppercase tracking-wider"
                    >
                      Origin: <span class="font-mono text-(--color-text)">
                        {index.origin ?? "—"}
                      </span>
                      <span class="mx-2">•</span>
                      Partial: <span class="font-mono text-(--color-text)">
                        {index.partial === 1 ? "yes" : "no"}
                      </span>
                    </p>
                  </div>
                {:else}
                  <p class="text-sm text-(--color-text-muted) text-center py-4">
                    No indexes found.
                  </p>
                {/each}
              </div>
            </div>
          </Card>

          <Card padding="none" class="flex-1 overflow-hidden flex flex-col">
            <div
              class="flex items-center justify-between border-b border-base-400 bg-base-100 p-4"
            >
              <h3
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Foreign Keys
              </h3>
              <Badge variant="outline" color="neutral" size="sm">
                {foreignKeys.length}
              </Badge>
            </div>
            <div class="p-4 flex-1 overflow-y-auto">
              <div class="flex flex-col gap-3">
                {#each foreignKeys as foreignKey (`${foreignKey.id}-${foreignKey.seq}`)}
                  <div
                    class="rounded-lg border border-base-400 bg-base-100 p-3"
                  >
                    <p class="font-mono text-sm font-medium">
                      {foreignKey.from ?? "?"}
                      <span class="text-(--color-text-muted)">→</span>
                      {foreignKey.table ?? "?"}
                      .{foreignKey.to ?? "?"}
                    </p>
                    <p
                      class="mt-2 text-[10px] text-(--color-text-muted) uppercase tracking-wider"
                    >
                      Update: <span class="font-mono text-(--color-text)">
                        {foreignKey.on_update ?? "—"}
                      </span>
                      <span class="mx-2">•</span>
                      Delete: <span class="font-mono text-(--color-text)">
                        {foreignKey.on_delete ?? "—"}
                      </span>
                    </p>
                  </div>
                {:else}
                  <p class="text-sm text-(--color-text-muted) text-center py-4">
                    No foreign keys found.
                  </p>
                {/each}
              </div>
            </div>
          </Card>
        </div>
      </Bento.Item>

      <Bento.Item deskCols="12">
        <CodeBlock
          rawCode={objectDefinition ?? "Definition unavailable."}
          title="SQL Definition"
          showDownload={false}
          scrollX={true}
          scrollY={false}
        />
      </Bento.Item>

      <Bento.Item deskCols="12">
        <Card padding="none" class="overflow-hidden">
          <div
            class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-base-400 bg-base-100 p-4"
          >
            <div class="flex flex-col gap-1">
              <h3
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Preview Data
              </h3>
              <p class="text-xs text-(--color-text-muted)">
                {previewSummary}
              </p>
            </div>

            <div class="flex items-center gap-3">
              <span
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Page size
              </span>
              <Select
                items={pageSizeItems}
                bind:value={selectPageSize}
                size="sm"
                class="w-24"
              />
            </div>
          </div>

          <div class="overflow-x-auto p-1">
            <Table.Root size="sm" striped stickyHeader variant="ghost">
              <Table.Header>
                <Table.Row>
                  {#each previewColumns as column (column)}
                    <Table.Head>{column}</Table.Head>
                  {/each}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#if previewColumns.length === 0}
                  <Table.Row>
                    <Table.Cell
                      colspan={1}
                      class="text-center text-(--color-text-muted) py-8"
                    >
                      No preview data available.
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  {#each previewRows as row, rowIndex (`${pageIndex}-${rowIndex}`)}
                    <Table.Row>
                      {#each row as cell, cellIndex (`${rowIndex}-${cellIndex}`)}
                        <Table.Cell
                          class="font-mono text-sm max-w-[300px] truncate"
                        >
                          {sqliteValueToDisplay(cell)}
                        </Table.Cell>
                      {/each}
                    </Table.Row>
                  {:else}
                    <Table.Row>
                      <Table.Cell
                        colspan={previewColumns.length}
                        class="text-center text-(--color-text-muted) py-8"
                      >
                        No rows returned for this page.
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                {/if}
              </Table.Body>
            </Table.Root>
          </div>

          {#if previewColumns.length > 0}
            <div
              class="border-t border-base-400 bg-base-100 p-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <p class="text-xs text-(--color-text-muted)">
                  {previewSummary}
                </p>
                {#if totalRows === null}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-6 px-2 text-xs"
                    loading={countingRows}
                    onclick={countTotalRows}
                  >
                    Count
                  </Button>
                {/if}
              </div>
              {#if pageIndex > 0 || hasNextPage}
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageIndex === 0}
                    onclick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onclick={handleNextPage}
                  >
                    Next
                  </Button>
                </div>
              {/if}
            </div>
          {/if}
        </Card>
      </Bento.Item>
    </Bento.Grid>
  {:else}
    <Card padding="lg" class="flex flex-col items-center justify-center py-20">
      <div class="flex items-center gap-2 mb-2">
        <div class="h-2 w-2 rounded-full bg-(--color-info)"></div>
        <span
          class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
        >
          Table Explorer
        </span>
      </div>
      <p class="text-sm text-(--color-text-muted)">
        Select a table or view from the sidebar to inspect its schema and data.
      </p>
    </Card>
  {/if}
</div>
