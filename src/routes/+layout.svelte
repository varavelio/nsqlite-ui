<script lang="ts">
  import "../app.css";

  import { Code, Database, LayoutDashboard, LogOut } from "@lucide/svelte";
  import {
    Button,
    Container,
    Nav,
    Skeleton,
    ThemePicker,
    UiProvider,
  } from "@varavel/ui";
  import { Loader } from "@varavel/ui/brand";
  import { AppLayout } from "@varavel/ui/layouts";
  import { page } from "$app/state";
  import { store } from "$lib/store.svelte";
  import AuthWall from "./AuthWall.svelte";

  let { children } = $props();

  let initialized = $derived(store.loaded);
  let pathname = $derived(page.url.pathname);

  let dbObjects = $state<{ name: string; type: string }[]>([]);
  let dbObjectsLoading = $state(false);

  async function loadDbObjects() {
    if (!store.client) {
      dbObjects = [];
      return;
    }
    dbObjectsLoading = true;
    try {
      const output = await store.client.procs.databaseQuery().execute({
        queries: [
          {
            query: `SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY CASE WHEN type = 'table' THEN 0 ELSE 1 END, name;`,
          },
        ],
      });
      const result = output.results[0];
      if (result.error) {
        throw new Error(result.error);
      }
      dbObjects = (result.rows ?? []).map((row) => ({
        name: String(row[0]?.text ?? row[0]?.integer ?? ""),
        type: String(row[1]?.text ?? row[1]?.integer ?? ""),
      }));
    } catch {
      dbObjects = [];
    } finally {
      dbObjectsLoading = false;
    }
  }

  $effect(() => {
    if (store.client) {
      void loadDbObjects();
    } else {
      dbObjects = [];
    }
  });

  function handleLogout() {
    store.logout();
  }
</script>

{#if !initialized}
  <div class="flex h-dvh w-dvw items-center justify-center overflow-hidden">
    <Loader size="lg" />
  </div>
{:else}
  <UiProvider>
    <AuthWall>
      <AppLayout
        primaryRegion="header"
        maxWidth="xl"
        sidebarWidth="md"
        closeSidebarOnRouteChange={true}
      >
        {#snippet headerLeft()}
          <div class="flex items-center gap-3">
            <img
              src="https://cdn.jsdelivr.net/gh/varavelio/nsqlite@dbf7ff/assets/logo.svg"
              alt="NSQLite Logo"
              class="h-6"
            >
            <span class="text-2xl font-semibold font-mono italic">UI</span>
          </div>
        {/snippet}

        {#snippet headerRight()}
          <div class="flex items-center gap-2">
            <ThemePicker variant="ghost" />
            <Button
              variant="ghost"
              color="neutral"
              icon={LogOut}
              onclick={handleLogout}
            >
              Logout
            </Button>
          </div>
        {/snippet}

        {#snippet sidebarCenter()}
          <Nav.Root>
            <Nav.Item
              href="/"
              label="Dashboard"
              icon={LayoutDashboard}
              active={pathname === "/"}
            />
            <Nav.Item
              href="/query"
              label="Query"
              icon={Code}
              active={pathname === "/query"}
            />
            <Nav.Group label="Explorer" icon={Database} open={true}>
              {#if dbObjectsLoading}
                <div class="flex flex-col gap-2 px-2 py-1">
                  {#each { length: 5 } as _, i (i)}
                    <Skeleton class="h-8 w-full" />
                  {/each}
                </div>
              {:else}
                {#each dbObjects as obj}
                  <Nav.Item
                    href={`/explorer/${encodeURIComponent(obj.name)}`}
                    label={obj.name}
                    active={pathname === `/explorer/${encodeURIComponent(obj.name)}`}
                  />
                {:else}
                  <p class="px-3 py-2 text-xs text-(--color-text-muted)">
                    No tables or views found.
                  </p>
                {/each}
              {/if}
            </Nav.Group>
          </Nav.Root>
        {/snippet}

        {#snippet main()}
          <Container padded maxWidth="full" class="py-4">
            {@render children()}
          </Container>
        {/snippet}
      </AppLayout>
    </AuthWall>
  </UiProvider>
{/if}
