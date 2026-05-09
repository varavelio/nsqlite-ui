<script lang="ts">
  import { Alert, Badge, Card, Skeleton } from "@varavel/ui";
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
</script>

<div class="flex flex-col gap-5">
  {#if error}
    <Alert color="error">{error}</Alert>
  {/if}

  {#if loading && !status}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each { length: 4 } as _, i (i)}
        <Card padding="lg">
          <div class="flex flex-col gap-2">
            <Skeleton class="h-3 w-16" />
            <Skeleton class="h-5 w-32" />
          </div>
        </Card>
      {/each}
    </div>
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card padding="lg">
        <Skeleton class="mb-3 h-4 w-20" />
        <div class="flex flex-wrap gap-3">
          {#each { length: 6 } as _, i (i)}
            <Skeleton class="h-6 w-24" />
          {/each}
        </div>
      </Card>
      <Card padding="lg">
        <Skeleton class="mb-3 h-4 w-20" />
        <div class="flex flex-wrap gap-3">
          {#each { length: 3 } as _, i (i)}
            <Skeleton class="h-6 w-24" />
          {/each}
        </div>
      </Card>
    </div>
  {:else if status}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card padding="lg">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-(--color-text-muted)">Server</span>
          <span class="text-sm font-medium">
            {status.name} v{status.version}
          </span>
        </div>
      </Card>

      <Card padding="lg">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-(--color-text-muted)">Uptime</span>
          <span class="text-sm font-medium">
            {formatUptime(status.stats.uptimeSeconds)}
          </span>
        </div>
      </Card>

      <Card padding="lg">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-(--color-text-muted)">Started At</span>
          <span class="text-sm font-medium">
            {formatDate(status.stats.startedAt)}
          </span>
        </div>
      </Card>

      <Card padding="lg">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-(--color-text-muted)">Total HTTP Reqs</span>
          <span class="text-sm font-medium">
            {status.stats.totals.httpRequests.toLocaleString()}
          </span>
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card padding="lg">
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

      <Card padding="lg">
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
    </div>
  {/if}
</div>
