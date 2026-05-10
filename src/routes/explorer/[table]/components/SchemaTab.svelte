<script lang="ts">
  import { Badge, Bento, Card, Table } from "@varavel/ui";
  import type { ColumnInfo, ForeignKeyInfo, IndexInfo } from "../types";

  let {
    columns = [],
    indexes = [],
    foreignKeys = [],
    primaryKeyColumns = [],
  }: {
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreignKeys: ForeignKeyInfo[];
    primaryKeyColumns: string[];
  } = $props();
</script>

<Bento.Grid>
  <!-- COLUMNS & INDEXES -->
  <Bento.Item deskCols="8" deskRows="6">
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
                <Table.Cell class="font-mono text-sm text-(--color-warning)">
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

  <Bento.Item deskCols="4" deskRows="6">
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
              <div class="rounded-lg border border-base-400 bg-base-100 p-3">
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
              <div class="rounded-lg border border-base-400 bg-base-100 p-3">
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
</Bento.Grid>
