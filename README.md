# plugin-content-claude-plugin-commands

Docusaurus plugin for generating a command quick-reference page from a Claude Code plugin manifest. Reads `_index.json` (which groups skill names by workflow stage) and each skill's `SKILL.md` frontmatter to produce a hero-tile MDX page organized by group.

[![Test](https://github.com/joestump/plugin-content-claude-plugin-commands/actions/workflows/test.yml/badge.svg)](https://github.com/joestump/plugin-content-claude-plugin-commands/actions/workflows/test.yml)

## Installation

```bash
npm install plugin-content-claude-plugin-commands lib-artifact-transforms
```

## Quick Start

In `docusaurus.config.ts`:

```typescript
import type { Config } from '@docusaurus/types';

const config: Config = {
  plugins: [
    [
      'plugin-content-claude-plugin-commands',
      {
        manifestPath: '../skills/_index.json',
        skillsDir: '../skills',
        outputPath: '../docs-generated/guides/commands-quick-reference.mdx',
        namespace: 'sdd',
      },
    ],
  ],
};

export default config;
```

Create a manifest at `skills/_index.json` that groups skill names by workflow stage:

```json
{
  "Creating Artifacts": ["adr", "spec"],
  "Sprint Planning": ["plan", "organize", "enrich"],
  "Implementation": ["work", "review"],
  "Drift Detection": ["check", "audit"]
}
```

Each key in the manifest is a group heading; each value is an array of skill directory names. The plugin reads `{skillsDir}/{name}/SKILL.md` for each entry and renders a `<CommandTile>` with its `description` and `argument-hint` frontmatter fields.

## Generated output

The plugin writes a single MDX file (`outputPath`) containing:

- A YAML frontmatter block (`title`, `sidebar_label`, `sidebar_position`)
- One `## {group}` section per manifest key
- A `<div className="command-tiles">` grid with one `<CommandTile>` per skill

Skills without a `SKILL.md` are skipped with a console warning. If the manifest file does not exist or is invalid JSON, the plugin exits silently without writing any output.

## Configuration

```typescript
interface PluginOptions {
  /**
   * Path to the _index.json manifest, relative to siteDir.
   * @default '../skills/_index.json'
   */
  manifestPath?: string;

  /**
   * Directory containing per-skill subdirectories with SKILL.md files,
   * relative to siteDir.
   * @default '../skills'
   */
  skillsDir?: string;

  /**
   * Output path for the generated MDX file, relative to siteDir.
   * @default '../docs-generated/guides/commands-quick-reference.mdx'
   */
  outputPath?: string;

  /**
   * Namespace prefix rendered in tile names.
   * With namespace "sdd", a skill named "adr" renders as /sdd:adr.
   * @default 'sdd'
   */
  namespace?: string;
}
```

## Manifest format

`_index.json` is a flat JSON object where each key is a group label and each value is an ordered array of skill directory names:

```json
{
  "Group Label": ["skill-name-a", "skill-name-b"],
  "Another Group": ["skill-name-c"]
}
```

Groups and skills render in the order they appear in the JSON. Skills that are listed in the manifest but lack a corresponding `SKILL.md` are skipped.

## CommandTile component

The generated MDX uses a `<CommandTile>` JSX component. You must register it in your site's `MDXComponents.tsx`:

```tsx
import CommandTile from '@site/src/components/CommandTile';

export default {
  ...MDXComponents,
  CommandTile,
};
```

A reference implementation is included in the [claude-plugin-sdd](https://github.com/joestump/claude-plugin-sdd) scaffold template at `templates/docusaurus/src/components/CommandTile.tsx`.

## Exported utilities

In addition to the default Docusaurus plugin export, the package exports the following utilities for use in build scripts:

```typescript
import {
  loadManifest,       // (path: string) => CommandManifest | null
  loadCommandGroups,  // (manifest, skillsDir) => CommandGroups
  renderCommandsMdx,  // (groups, namespace) => string
  truncateDescription,
  normalizeArgumentHint,
} from 'plugin-content-claude-plugin-commands';
```

This lets plain Node.js build scripts (e.g. `scripts/generate-commands.js`) reuse the same logic without spinning up a full Docusaurus instance.

## Development

```bash
npm test          # run tests
npm run build     # compile TypeScript
npm run watch     # watch mode
```

## Integration with other plugins

- [`plugin-content-claude-plugin-skills`](https://github.com/joestump/plugin-content-claude-plugin-skills) — Full skill documentation pages from SKILL.md files
- [`plugin-content-adrs`](https://github.com/joestump/plugin-content-adrs) — Architecture Decision Records
- [`plugin-content-openspec`](https://github.com/joestump/plugin-content-openspec) — OpenSpec specifications
- [`lib-artifact-transforms`](https://github.com/joestump/lib-artifact-transforms) — Shared artifact processing utilities

## License

MIT
