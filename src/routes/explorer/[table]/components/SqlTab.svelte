<script lang="ts">
  import { CodeBlock } from "@varavel/ui";

  let { objectDefinition = null }: { objectDefinition: string | null } =
    $props();
</script>

<CodeBlock
  rawCode={objectDefinition ?? "Definition unavailable."}
  title="SQL Definition"
  showDownload={false}
  scrollX={true}
  scrollY={false}
/>
