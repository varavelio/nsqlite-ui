<script lang="ts">
  import { Button, Card, Select, Table } from "@varavel/ui";
  import type { SqliteValue } from "$lib/client/types";
  import { sqliteValueToDisplay } from "$lib/sqlite";

  let {
    previewSummary,
    previewColumns,
    previewRows,
    pageIndex,
    selectPageSize = $bindable(),
    pageSizeItems,
    totalRows,
    countingRows,
    hasNextPage,
    countTotalRows,
    handlePrevPage,
    handleNextPage,
  }: {
    previewSummary: string;
    previewColumns: string[];
    previewRows: SqliteValue[][];
    pageIndex: number;
    selectPageSize: string;
    pageSizeItems: { value: string; label: string }[];
    totalRows: number | null;
    countingRows: boolean;
    hasNextPage: boolean;
    countTotalRows: () => void;
    handlePrevPage: () => void;
    handleNextPage: () => void;
  } = $props();
</script>

<Card padding="none" class="overflow-hidden">
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
                <Table.Cell class="font-mono text-sm max-w-[300px] truncate">
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
      class="border-t border-base-400 bg-base-100 p-4 flex flex-wrap items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <p class="text-xs text-(--color-text-muted)">
          {previewSummary}
        </p>
        <Button
          variant="outline"
          size="sm"
          class="h-6 px-2 text-xs"
          loading={countingRows}
          onclick={countTotalRows}
        >
          {totalRows === null ? "Count" : "Recount"}
        </Button>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
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
    </div>
  {/if}
</Card>
