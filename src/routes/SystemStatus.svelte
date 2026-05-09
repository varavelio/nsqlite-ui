<script lang="ts">
  import { Alert, Badge, Bento, Card, Skeleton, Table } from "@varavel/ui";
  import { onMount } from "svelte";
  import type { SystemStatusOutput } from "$lib/client/types";
  import { store } from "$lib/store.svelte";

  let status = $state<SystemStatusOutput | null>(null);
  let error = $state("");
  let loading = $state(true);
  let interval: ReturnType<typeof setInterval>;

  async function fetchStatus() {
    if (!store.client) return;
    try {
      status = await store.client.procs.systemStatus().execute();
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchStatus();
    interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  });

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  }

  function formatDate(d: Date): string {
    return d.toLocaleString();
  }

  function formatTime(d: string): string {
    const date = new Date(d);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const minutesSorted = $derived.by(() => {
    if (!status?.stats?.minutes) return [];
    return Object.entries(status.stats.minutes)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 10);
  });
</script>

<div class="flex flex-col gap-5">
  {#if error}
    <Alert color="error">{error}</Alert>
  {/if}

  {#if loading && !status}
    <Bento.Grid>
      {#each { length: 4 } as _, i (i)}
        <Bento.Item deskCols="3">
          <Card padding="lg" class="h-full">
            <div class="flex flex-col gap-2">
              <Skeleton class="h-3 w-16" />
              <Skeleton class="h-5 w-32" />
            </div>
          </Card>
        </Bento.Item>
      {/each}

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full">
          <Skeleton class="mb-3 h-4 w-20" />
          <div class="flex flex-wrap gap-3">
            {#each { length: 6 } as _, i (i)}
              <Skeleton class="h-6 w-24" />
            {/each}
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full">
          <Skeleton class="mb-3 h-4 w-20" />
          <div class="flex flex-wrap gap-3">
            {#each { length: 3 } as _, i (i)}
              <Skeleton class="h-6 w-24" />
            {/each}
          </div>
        </Card>
      </Bento.Item>
    </Bento.Grid>
  {:else if status}
    <Bento.Grid>
      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-(--color-success)"></div>
              <span
                class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
              >
                Server
              </span>
            </div>
            <span class="text-2xl font-bold tracking-tight">
              {status.name}
              <span class="text-sm font-normal text-(--color-text-muted)">
                v{status.version}
              </span>
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1.5">
            <span
              class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              Uptime
            </span>
            <span class="text-2xl font-bold tracking-tight">
              {formatUptime(status.stats.uptimeSeconds)}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1.5">
            <span
              class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              Started At
            </span>
            <span class="text-lg font-bold tracking-tight">
              {formatDate(status.stats.startedAt)}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1.5">
            <span
              class="text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)"
            >
              Total HTTP Requests
            </span>
            <span class="text-2xl font-bold tracking-tight">
              {status.stats.totals.httpRequests.toLocaleString()}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full flex flex-col">
          <div class="mb-4 flex items-center justify-between">
            <h3
              class="text-sm font-bold uppercase tracking-wider text-(--color-text)"
            >
              Total Operations
            </h3>
            <Badge variant="soft" color="neutral" size="sm">Cumulative</Badge>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Reads</span>
              <span class="text-lg font-mono font-semibold">
                {status.stats.totals.reads.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Writes</span>
              <span class="text-lg font-mono font-semibold">
                {status.stats.totals.writes.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Begins</span>
              <span class="text-lg font-mono font-semibold">
                {status.stats.totals.begins.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Commits</span>
              <span
                class="text-lg font-mono font-semibold text-(--color-success)"
              >
                {status.stats.totals.commits.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Rollbacks</span>
              <span
                class="text-lg font-mono font-semibold text-(--color-warning)"
              >
                {status.stats.totals.rollbacks.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Errors</span>
              <span
                class="text-lg font-mono font-semibold text-(--color-error)"
              >
                {status.stats.totals.errors.toLocaleString()}
              </span>
            </Card>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full flex flex-col">
          <div class="mb-4 flex items-center justify-between">
            <h3
              class="text-sm font-bold uppercase tracking-wider text-(--color-text)"
            >
              Queued Operations
            </h3>
            <Badge variant="soft" color="warning" size="sm">In-flight</Badge>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Begins</span>
              <span class="text-lg font-mono font-semibold">
                {status.stats.queued.begins.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">Writes</span>
              <span class="text-lg font-mono font-semibold">
                {status.stats.queued.writes.toLocaleString()}
              </span>
            </Card>
            <Card
              bg="100"
              padding="sm"
              class="flex flex-col gap-1 border border-base-400"
            >
              <span class="text-xs text-(--color-text-muted)">HTTP Reqs</span>
              <span class="text-lg font-mono font-semibold text-(--color-info)">
                {status.stats.queued.httpRequests.toLocaleString()}
              </span>
            </Card>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="12">
        <Card padding="none" class="h-full overflow-hidden">
          <div
            class="p-4 border-b border-base-400 flex items-center justify-between bg-base-100"
          >
            <h3 class="text-sm font-bold uppercase tracking-wider">
              Recent Activity
            </h3>
            <Badge variant="outline" color="neutral" size="sm">
              Last 10 minutes
            </Badge>
          </div>
          <div class="overflow-x-auto p-1">
            <Table.Root variant="ghost">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Time</Table.Head>
                  <Table.Head>HTTP Reqs</Table.Head>
                  <Table.Head>Reads</Table.Head>
                  <Table.Head>Writes</Table.Head>
                  <Table.Head>Begins</Table.Head>
                  <Table.Head>Commits</Table.Head>
                  <Table.Head>Rollbacks</Table.Head>
                  <Table.Head>Errors</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each minutesSorted as [ time, mstats ] (time)}
                  <Table.Row>
                    <Table.Cell class="font-mono text-xs">
                      {formatTime(time)}
                    </Table.Cell>
                    <Table.Cell>
                      {mstats.httpRequests.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>{mstats.reads.toLocaleString()}</Table.Cell>
                    <Table.Cell>{mstats.writes.toLocaleString()}</Table.Cell>
                    <Table.Cell>{mstats.begins.toLocaleString()}</Table.Cell>
                    <Table.Cell>{mstats.commits.toLocaleString()}</Table.Cell>
                    <Table.Cell>{mstats.rollbacks.toLocaleString()}</Table.Cell>
                    <Table.Cell
                      class={mstats.errors > 0 ? "text-(--color-error)" : ""}
                    >
                      {mstats.errors.toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell
                      colspan={8}
                      class="text-center text-(--color-text-muted) py-8"
                    >
                      No recent activity recorded
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
      </Bento.Item>
    </Bento.Grid>
  {/if}
</div>
