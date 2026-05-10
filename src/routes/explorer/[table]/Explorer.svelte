<script lang="ts">
  import { Alert, Card, Skeleton, Tabs } from "@varavel/ui";
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
  import PreviewDataTab from "./components/PreviewDataTab.svelte";
  import SchemaTab from "./components/SchemaTab.svelte";
  import SqlTab from "./components/SqlTab.svelte";
  import type { ColumnInfo, ForeignKeyInfo, IndexInfo } from "./types";

  let { initialTable = "" }: { initialTable?: string } = $props();

  let activeTab = $state("data");

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
      totalRows = null;
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

    {#if schemaLoading}
      <Card padding="lg">
        <div class="flex flex-col gap-2">
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-32 w-full" />
        </div>
      </Card>
    {:else}
      {#snippet dataSnippet()}
        <PreviewDataTab
          {previewSummary}
          {previewColumns}
          {previewRows}
          {pageIndex}
          bind:selectPageSize
          {pageSizeItems}
          {totalRows}
          {countingRows}
          {hasNextPage}
          {countTotalRows}
          {handlePrevPage}
          {handleNextPage}
        />
      {/snippet}

      {#snippet schemaSnippet()}
        <SchemaTab {columns} {indexes} {foreignKeys} {primaryKeyColumns} />
      {/snippet}

      {#snippet sqlSnippet()}
        <SqlTab {objectDefinition} />
      {/snippet}

      <Tabs
        bind:value={activeTab}
        items={[
          { value: "data", label: "Preview Data", content: dataSnippet },
          { value: "schema", label: "Schema", content: schemaSnippet },
          { value: "sql", label: "Definition", content: sqlSnippet }
        ]}
      />
    {/if}
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
