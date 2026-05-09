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
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-text-muted)">Server</span>
            <span class="text-sm font-medium">
              {status.name} v{status.version}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-text-muted)">Uptime</span>
            <span class="text-sm font-medium">
              {formatUptime(status.stats.uptimeSeconds)}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-text-muted)">Started At</span>
            <span class="text-sm font-medium">
              {formatDate(status.stats.startedAt)}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="3">
        <Card padding="lg" class="h-full">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-(--color-text-muted)">
              Total HTTP Reqs
            </span>
            <span class="text-sm font-medium">
              {status.stats.totals.httpRequests.toLocaleString()}
            </span>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full">
          <h3 class="mb-3 text-sm font-semibold">Totals</h3>
          <div class="flex flex-wrap gap-3">
            <div class="flex items-center gap-2">
              <Badge color="info" size="sm">Reads</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.reads.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="warning" size="sm">Writes</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.writes.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="neutral" size="sm">Begins</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.begins.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="success" size="sm">Commits</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.commits.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="warning" size="sm">Rollbacks</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.rollbacks.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="error" size="sm">Errors</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.errors.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="info" size="sm">HTTP Reqs</Badge>
              <span class="text-sm font-mono">
                {status.stats.totals.httpRequests.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="6" deskRows="2">
        <Card padding="lg" class="h-full">
          <h3 class="mb-3 text-sm font-semibold">Queued</h3>
          <div class="flex flex-wrap gap-3">
            <div class="flex items-center gap-2">
              <Badge color="neutral" size="sm">Begins</Badge>
              <span class="text-sm font-mono">
                {status.stats.queued.begins.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="warning" size="sm">Writes</Badge>
              <span class="text-sm font-mono">
                {status.stats.queued.writes.toLocaleString()}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Badge color="info" size="sm">HTTP Reqs</Badge>
              <span class="text-sm font-mono">
                {status.stats.queued.httpRequests.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </Bento.Item>

      <Bento.Item deskCols="12">
        <Card padding="none" class="h-full overflow-hidden">
          <div class="p-4 border-b border-base-400">
            <h3 class="text-sm font-semibold">
              Recent Activity (Last 10 minutes)
            </h3>
          </div>
          <div class="overflow-x-auto">
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
