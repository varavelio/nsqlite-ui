<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Card,
    CodeBlock,
    Heading,
    Input,
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
    sqliteValueToDisplay,
  } from "$lib/sqlite";
  import { store } from "$lib/store.svelte";

  type ExplorerObject = {
    name: string;
    type: string;
    sql: string | null;
    tableName: string | null;
  };

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

  const pageSizeOptions = [10, 25, 50, 100];
  const pageSizeItems = pageSizeOptions.map((o) => ({
    value: String(o),
    label: String(o),
  }));

  let objectFilter = $state("");
  let objects = $state<ExplorerObject[]>([]);
  let objectsLoading = $state(true);
  let objectsError = $state("");
  let selectedObjectName = $state("");

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
  let currentPage = $state(1);
  let schemaRequestId = 0;

  $effect(() => {
    if (selectPageSize !== String(pageSize)) {
      handlePageSizeChange(selectPageSize);
    }
  });

  let filteredObjects = $derived.by(() => {
    const filter = objectFilter.trim().toLowerCase();
    if (!filter) return objects;
    return objects.filter((item) => {
      const haystack = `${item.name} ${item.type}`.toLowerCase();
      return haystack.includes(filter);
    });
  });

  let selectedObject = $derived(
    objects.find((item) => item.name === selectedObjectName) ?? null,
  );

  let primaryKeyColumns = $derived.by(() =>
    columns
      .filter((column) => (column.pk ?? 0) > 0)
      .sort((a, b) => (a.pk ?? 0) - (b.pk ?? 0))
      .map((column) => column.name),
  );

  let totalPages = $derived.by(() => {
    if (totalRows === null) return 1;
    return Math.max(1, Math.ceil(totalRows / pageSize));
  });

  let showingFrom = $derived(
    totalRows === null || totalRows === 0
      ? 0
      : (currentPage - 1) * pageSize + 1,
  );
  let showingTo = $derived(
    totalRows === null || totalRows === 0
      ? 0
      : Math.min(totalRows, (currentPage - 1) * pageSize + previewRows.length),
  );

  let objectDefinition = $derived(selectedObject?.sql ?? null);
  let previewSummary = $derived(
    `Showing ${showingFrom}-${showingTo} of ${totalRows?.toLocaleString() ?? "-"} rows.`,
  );

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

  function parseObjects(result: QueryResult): ExplorerObject[] {
    return readResultRowsToObjects(result).map((row) => ({
      name: String(row.name ?? ""),
      type: String(row.type ?? ""),
      sql: row.sql === null ? null : String(row.sql),
      tableName: row.tbl_name === null ? null : String(row.tbl_name),
    }));
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

  async function loadObjects() {
    objectsLoading = true;
    objectsError = "";

    try {
      const [result] = await runQueries([
        `SELECT name, type, tbl_name, sql\n         FROM sqlite_master\n         WHERE type IN ('table', 'view')\n           AND name NOT LIKE 'sqlite_%'\n         ORDER BY CASE WHEN type = 'table' THEN 0 ELSE 1 END, name;`,
      ]);

      if (result?.error) {
        throw new Error(result.error);
      }

      objects = parseObjects(result);

      if (!objects.some((item) => item.name === selectedObjectName)) {
        selectedObjectName = objects[0]?.name ?? "";
      }

      await loadSelectedObject();
    } catch (error) {
      objectsError = error instanceof Error ? error.message : String(error);
      objects = [];
      selectedObjectName = "";
    } finally {
      objectsLoading = false;
    }
  }

  async function loadSelectedObject() {
    if (!selectedObject) {
      columns = [];
      indexes = [];
      foreignKeys = [];
      previewColumns = [];
      previewRows = [];
      totalRows = null;
      schemaError = "";
      schemaLoading = false;
      return;
    }

    const requestId = ++schemaRequestId;
    schemaLoading = true;
    schemaError = "";

    try {
      const safeName = quoteSqliteIdentifier(selectedObject.name);
      const pragmaName = JSON.stringify(selectedObject.name);
      const metadataResults = await runQueries([
        `PRAGMA table_info(${pragmaName});`,
        `PRAGMA index_list(${pragmaName});`,
        `PRAGMA foreign_key_list(${pragmaName});`,
        `SELECT COUNT(*) AS total_rows FROM ${safeName};`,
      ]);
      const metadataTime = totalTime;

      if (requestId !== schemaRequestId) return;

      const [columnsResult, indexesResult, foreignKeysResult, countResult] =
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
        objectName: selectedObject.name,
        columnNames: nextColumns.map((column) => column.name),
        primaryKeyColumns: nextPrimaryKeyColumns,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      const [previewResult] = await runQueries([previewQuery]);
      const previewTime = totalTime;

      if (requestId !== schemaRequestId) return;

      if (previewResult?.error) {
        throw new Error(previewResult.error);
      }

      columns = nextColumns;
      indexes = nextIndexes;
      foreignKeys = nextForeignKeys;
      totalRows = parseCount(countResult);
      previewColumns = previewResult?.columns ?? [];
      previewRows = previewResult?.rows ?? [];
      totalTime = metadataTime + previewTime;
    } catch (error) {
      if (requestId !== schemaRequestId) return;

      schemaError = error instanceof Error ? error.message : String(error);
      columns = [];
      indexes = [];
      foreignKeys = [];
      previewColumns = [];
      previewRows = [];
      totalRows = null;
    } finally {
      if (requestId === schemaRequestId) {
        schemaLoading = false;
      }
    }
  }

  function selectObject(name: string) {
    if (selectedObjectName === name) return;
    selectedObjectName = name;
    currentPage = 1;
    void loadSelectedObject();
  }

  function handlePageSizeChange(value: string) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0) return;
    pageSize = nextValue;
    currentPage = 1;
    void loadSelectedObject();
  }

  function handlePageChange(pageNumber: number) {
    currentPage = pageNumber;
    void loadSelectedObject();
  }

  onMount(() => {
    if (store.client) {
      void loadObjects();
    } else {
      objects = [];
      selectedObjectName = "";
      objectsLoading = false;
    }
  });
</script>

<div class="flex">
  <div class="flex flex-col gap-4 p-4">
    <div>
      <Heading level="3" size="sm">Objects</Heading>
      <p class="mt-1 text-xs text-(--color-text-muted)">
        Browse available tables and views from sqlite_master.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <Label for="explorer-filter" size="sm">Filter</Label>
      <Input
        id="explorer-filter"
        bind:value={objectFilter}
        placeholder="Search tables or views"
      />
    </div>

    <div class="max-h-[60dvh] overflow-y-auto">
      {#if objectsLoading}
        <div class="flex flex-col gap-2">
          {#each { length: 6 } as _, i (i)}
            <Skeleton class="h-10 w-full" />
          {/each}
        </div>
      {:else}
        <div class="flex flex-col gap-1">
          {#each filteredObjects as item (item.name)}
            <Button
              variant="ghost"
              alignContent="left"
              active={selectedObjectName === item.name}
              onclick={() => selectObject(item.name)}
              class="justify-between"
            >
              <span class="truncate text-sm font-medium">{item.name}</span>
              <Badge
                color={item.type === "view" ? "neutral" : "info"}
                size="sm"
              >
                {item.type}
              </Badge>
            </Button>
          {:else}
            <p class="px-3 py-3 text-sm text-(--color-text-muted)">
              No matching objects.
            </p>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="flex flex-col gap-6">
    <div>
      <Heading level="2" size="lg">Database explorer</Heading>
      <p class="mt-1 text-sm text-(--color-text-muted)">
        Inspect tables and views, review schema metadata, and page through
        read-only previews.
      </p>
    </div>

    {#if objectsError}
      <Alert color="error">{objectsError}</Alert>
    {/if}

    {#if schemaError}
      <Alert color="error">{schemaError}</Alert>
    {/if}

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div class="flex min-w-0 flex-col gap-6">
        {#if selectedObject}
          <Card padding="lg">
            <div class="flex flex-col gap-4">
              <div
                class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <Heading level="3" size="md">{selectedObject.name}</Heading>
                    <Badge
                      color={selectedObject.type === "view" ? "neutral" : "info"}
                      size="sm"
                    >
                      {selectedObject.type}
                    </Badge>
                  </div>
                  <p class="mt-1 text-sm text-(--color-text-muted)">
                    {columns.length} columns · {indexes.length} indexes · {foreignKeys.length}
                    foreign keys
                  </p>
                </div>

                <div
                  class="flex flex-wrap items-center gap-3 text-xs text-(--color-text-muted)"
                >
                  <span>Total rows: {totalRows?.toLocaleString() ?? "—"}</span>
                  <span>Query time: {totalTime.toFixed(4)}s</span>
                </div>
              </div>

              {#if schemaLoading}
                <div class="flex flex-col gap-2">
                  <Skeleton class="h-4 w-48" />
                  <Skeleton class="h-32 w-full" />
                </div>
              {/if}

              <div
                class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"
              >
                <Card padding="lg">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <Heading level="4" size="sm">Columns</Heading>
                    <span class="text-xs text-(--color-text-muted)">
                      PKs: {primaryKeyColumns.length > 0
                      ? primaryKeyColumns.join(", ")
                      : "None"}
                    </span>
                  </div>

                  <div class="overflow-x-auto">
                    <Table.Root size="sm" striped stickyHeader>
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
                            <Table.Cell class="font-medium">
                              {column.name}
                            </Table.Cell>
                            <Table.Cell>{column.type || "—"}</Table.Cell>
                            <Table.Cell>
                              {column.notnull === 1 ? "No" : "Yes"}
                            </Table.Cell>
                            <Table.Cell>{column.dflt_value ?? "—"}</Table.Cell>
                            <Table.Cell>
                              {column.pk ? `#${column.pk}` : "—"}
                            </Table.Cell>
                          </Table.Row>
                        {:else}
                          <Table.Row>
                            <Table.Cell
                              colspan={5}
                              class="text-sm text-(--color-text-muted)"
                            >
                              No column metadata available.
                            </Table.Cell>
                          </Table.Row>
                        {/each}
                      </Table.Body>
                    </Table.Root>
                  </div>
                </Card>

                <div class="flex flex-col gap-4">
                  <Card padding="lg">
                    <Heading level="4" size="sm">Indexes</Heading>
                    <div class="mt-3 flex flex-col gap-2">
                      {#each indexes as index (index.name)}
                        <div
                          class="rounded-xl border border-(--color-border-primary) p-3"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <span class="text-sm font-medium">
                              {index.name}
                            </span>
                            <Badge
                              color={index.unique === 1 ? "success" : "neutral"}
                              size="sm"
                            >
                              {index.unique === 1 ? "unique" : "non-unique"}
                            </Badge>
                          </div>
                          <p class="mt-1 text-xs text-(--color-text-muted)">
                            origin: {index.origin ?? "—"} · partial: {index.partial ===
                          1
                            ? "yes"
                            : "no"}
                          </p>
                        </div>
                      {:else}
                        <p class="text-sm text-(--color-text-muted)">
                          No indexes found.
                        </p>
                      {/each}
                    </div>
                  </Card>

                  <Card padding="lg">
                    <Heading level="4" size="sm">Foreign keys</Heading>
                    <div class="mt-3 flex flex-col gap-2">
                      {#each foreignKeys as foreignKey (`${foreignKey.id}-${foreignKey.seq}`)}
                        <div
                          class="rounded-xl border border-(--color-border-primary) p-3 text-sm"
                        >
                          <p class="font-medium">
                            {foreignKey.from ?? "?"} → {foreignKey.table ?? "?"}
                            .{foreignKey.to ?? "?"}
                          </p>
                          <p class="mt-1 text-xs text-(--color-text-muted)">
                            on update: {foreignKey.on_update ?? "—"} · on
                            delete: {foreignKey.on_delete ??
                            "—"}
                            · match: {foreignKey.match ?? "—"}
                          </p>
                        </div>
                      {:else}
                        <p class="text-sm text-(--color-text-muted)">
                          No foreign keys found.
                        </p>
                      {/each}
                    </div>
                  </Card>
                </div>
              </div>

              <Card padding="lg">
                <Heading level="4" size="sm">Definition SQL</Heading>
                <div class="mt-3">
                  <CodeBlock
                    rawCode={objectDefinition ?? "Definition unavailable."}
                    title="SQL"
                    showDownload={false}
                    scrollX={true}
                    scrollY={false}
                  />
                </div>
              </Card>
            </div>
          </Card>

          <Card padding="lg">
            <div class="flex flex-col gap-4">
              <div
                class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <Heading level="4" size="sm">Preview rows</Heading>
                  <p class="mt-1 text-xs text-(--color-text-muted)">
                    {previewSummary}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <Label size="sm">Page size</Label>
                  <Select
                    items={pageSizeItems}
                    bind:value={selectPageSize}
                    size="sm"
                  />
                </div>
              </div>

              <div class="overflow-x-auto">
                <Table.Root size="sm" striped stickyHeader>
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
                          class="text-sm text-(--color-text-muted)"
                        >
                          No preview data available.
                        </Table.Cell>
                      </Table.Row>
                    {:else}
                      {#each previewRows as row, rowIndex (`${currentPage}-${rowIndex}`)}
                        <Table.Row>
                          {#each row as cell, cellIndex (`${rowIndex}-${cellIndex}`)}
                            <Table.Cell>
                              {sqliteValueToDisplay(cell)}
                            </Table.Cell>
                          {/each}
                        </Table.Row>
                      {:else}
                        <Table.Row>
                          <Table.Cell
                            colspan={previewColumns.length}
                            class="text-sm text-(--color-text-muted)"
                          >
                            No rows returned for this page.
                          </Table.Cell>
                        </Table.Row>
                      {/each}
                    {/if}
                  </Table.Body>
                </Table.Root>
              </div>

              {#if totalRows !== null && totalRows > 0}
                <Pagination
                  count={totalRows}
                  page={currentPage}
                  perPage={pageSize}
                  onPageChange={handlePageChange}
                  showSummary={false}
                />
              {/if}
            </div>
          </Card>
        {:else}
          <Card padding="lg">
            <p class="text-sm text-(--color-text-muted)">
              {objectsLoading
              ? "Loading database objects..."
              : "Select a table or view to inspect it."}
            </p>
          </Card>
        {/if}
      </div>
    </div>
  </div>
</div>
