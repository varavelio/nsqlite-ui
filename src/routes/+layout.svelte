<script lang="ts">
  import "../app.css";

  import { Code, Database, LayoutDashboard, LogOut } from "@lucide/svelte";
  import { Button, Nav, ThemePicker, UiProvider } from "@varavel/ui";
  import { Loader } from "@varavel/ui/brand";
  import { AppLayout } from "@varavel/ui/layouts";
  import { page } from "$app/state";
  import { store } from "$lib/store.svelte";
  import AuthWall from "./AuthWall.svelte";

  let { children } = $props();

  let initialized = $derived(store.loaded);
  let pathname = $derived(page.url.pathname);

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
            <Nav.Item
              href="/explorer"
              label="Explorer"
              icon={Database}
              active={pathname === "/explorer"}
            />
          </Nav.Root>
        {/snippet}

        {#snippet main()}
          {@render children()}
        {/snippet}
      </AppLayout>
    </AuthWall>
  </UiProvider>
{/if}
