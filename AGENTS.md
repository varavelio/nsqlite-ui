## Maintaining this file (AGENTS.md)

- This file (`AGENTS.md`) is the central source of truth for AI agent behavior in this repository.
- When adding new instructions, keep them concise, actionable, and grouped under clear section headers.
- Preserve all existing sections unless explicitly asked to remove them.
- When you add or update instructions, also update this section to reflect the change date and nature of the change.
- Use English for all content in this file.
- Write instructions as clear directives using MUST, SHOULD, NEVER, ALWAYS for unambiguous agent parsing.
- Order sections by importance/priority (most critical rules first).
- Use consistent formatting: `##` for major categories, `###` for subcategories, `####` for tool sections.
- Remove outdated instructions entirely rather than commenting them out or leaving them in place.
- Avoid ambiguity: each instruction should have one clear interpretation. Prefer specific examples over abstract descriptions.
- When referencing code paths, files, or tools, use inline code formatting.
- Keep section headers short and descriptive (2-5 words preferred).

## Svelte And SvelteKit

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available Svelte MCP Tools:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## UI Component Library Usage

- You MUST use `@varavel/ui` components whenever possible instead of writing custom TailwindCSS styles.
- Before building any UI element, check if `@varavel/ui` already provides a component for it. You can explore available components by listing the directory at `node_modules/@varavel/ui`.
- Only fall back to custom TailwindCSS when `@varavel/ui` does not provide the needed component and building from primitives would be unreasonable.
- Always import from `@varavel/ui` using its public API (check the package's `package.json` `exports` field or `src/index.ts` for available exports).
