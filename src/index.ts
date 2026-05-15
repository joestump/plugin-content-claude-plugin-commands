import type { LoadContext, Plugin } from '@docusaurus/types';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { parseFrontmatter, extractField } from 'lib-artifact-transforms';

export interface PluginOptions {
  /** Path to the _index.json manifest, relative to siteDir. */
  manifestPath?: string;
  /** Directory containing per-skill subdirectories with SKILL.md files, relative to siteDir. */
  skillsDir?: string;
  /** Output path for the generated MDX file, relative to siteDir. */
  outputPath?: string;
  /** Namespace prefix rendered in tile names, e.g. "sdd" → `/sdd:init`. Defaults to "sdd". */
  namespace?: string;
}

export type CommandManifest = Record<string, string[]>;

export interface CommandEntry {
  name: string;
  description: string;
  argumentHint: string;
}

export type CommandGroups = Record<string, CommandEntry[]>;

const DEFAULT_MANIFEST_PATH = '../skills/_index.json';
const DEFAULT_SKILLS_DIR = '../skills';
const DEFAULT_OUTPUT_PATH = '../docs-generated/guides/commands-quick-reference.mdx';
const DEFAULT_NAMESPACE = 'sdd';
const DESCRIPTION_MAX_CHARS = 140;

export function truncateDescription(description: string, max = DESCRIPTION_MAX_CHARS): string {
  if (description.length <= max) return description;
  const slice = description.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

export function normalizeArgumentHint(raw: string | string[] | undefined): string {
  if (!raw) return '';
  if (Array.isArray(raw)) return raw.map(String).join(' ').trim();
  return String(raw).trim();
}

export function loadManifest(manifestPath: string): CommandManifest | null {
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as CommandManifest;
  } catch {
    console.warn(`[plugin-content-claude-plugin-commands] Invalid JSON at ${manifestPath}`);
    return null;
  }
}

export function loadCommandGroups(
  manifest: CommandManifest,
  skillsDir: string,
): CommandGroups {
  const groups: CommandGroups = {};

  for (const [groupName, skillNames] of Object.entries(manifest)) {
    const entries: CommandEntry[] = [];

    for (const name of skillNames) {
      const skillMd = join(skillsDir, name, 'SKILL.md');
      if (!existsSync(skillMd)) {
        console.warn(`[plugin-content-claude-plugin-commands] ${name}/SKILL.md not found, skipping`);
        continue;
      }
      const { metadata } = parseFrontmatter(readFileSync(skillMd, 'utf-8'));
      const description = truncateDescription(
        String(extractField<string>(metadata, 'description') ?? '').trim(),
      );
      const argumentHint = normalizeArgumentHint(
        extractField<string | string[]>(metadata, 'argument-hint'),
      );
      entries.push({ name, description, argumentHint });
    }

    if (entries.length > 0) {
      groups[groupName] = entries;
    }
  }

  return groups;
}

export function renderCommandsMdx(groups: CommandGroups, namespace: string): string {
  const lines: string[] = [
    '---',
    'title: "Commands — Quick Reference"',
    'sidebar_label: "Quick Reference"',
    'sidebar_position: 1',
    'description: "Quick-access tiles for all plugin skills, organized by workflow stage."',
    '---',
    '',
    '# Commands',
    '',
    'All plugin skills are invoked as Claude Code slash commands. Browse by workflow stage:',
    '',
  ];

  for (const [groupName, entries] of Object.entries(groups)) {
    lines.push(`## ${groupName}`, '', '<div className="command-tiles">', '');
    for (const { name, description, argumentHint } of entries) {
      lines.push(
        `  <CommandTile` +
        ` name={${JSON.stringify(name)}}` +
        ` description={${JSON.stringify(description)}}` +
        ` argumentHint={${JSON.stringify(argumentHint)}}` +
        ` href={${JSON.stringify(`/skills/${name}`)}}` +
        ` namespace={${JSON.stringify(namespace)}}` +
        ` />`,
      );
    }
    lines.push('</div>', '');
  }

  return lines.join('\n');
}

export default function pluginContentClaudePluginCommands(
  context: LoadContext,
  options: PluginOptions,
): Plugin<void> {
  const manifestPath = resolve(context.siteDir, options.manifestPath ?? DEFAULT_MANIFEST_PATH);
  const skillsDir = resolve(context.siteDir, options.skillsDir ?? DEFAULT_SKILLS_DIR);
  const outputPath = resolve(context.siteDir, options.outputPath ?? DEFAULT_OUTPUT_PATH);
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;

  return {
    name: 'docusaurus-plugin-content-claude-plugin-commands',

    async loadContent() {
      const manifest = loadManifest(manifestPath);
      if (!manifest) {
        console.log('[plugin-content-claude-plugin-commands] No manifest found, skipping.');
        return;
      }

      const groups = loadCommandGroups(manifest, skillsDir);
      if (Object.keys(groups).length === 0) {
        console.log('[plugin-content-claude-plugin-commands] No command entries resolved, skipping.');
        return;
      }

      const mdx = renderCommandsMdx(groups, namespace);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, mdx);
      console.log(`[plugin-content-claude-plugin-commands] Generated ${outputPath}`);
    },

    getPathsToWatch() {
      return [manifestPath, join(skillsDir, '*/SKILL.md')];
    },
  };
}
