import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import pluginContentClaudePluginCommands, {
  truncateDescription,
  normalizeArgumentHint,
  loadManifest,
  loadCommandGroups,
  renderCommandsMdx,
} from '../index';

describe('plugin-content-claude-plugin-commands', () => {
  describe('module export', () => {
    it('should export a default function', () => {
      expect(typeof pluginContentClaudePluginCommands).toBe('function');
    });

    it('should return a plugin object with required fields', () => {
      const mockContext = { siteDir: '/tmp/site' } as any;
      const plugin = pluginContentClaudePluginCommands(mockContext, {});
      expect(plugin.name).toBe('docusaurus-plugin-content-claude-plugin-commands');
      expect(typeof plugin.loadContent).toBe('function');
      expect(typeof plugin.getPathsToWatch).toBe('function');
    });
  });

  describe('truncateDescription', () => {
    it('returns the string unchanged when under the limit', () => {
      expect(truncateDescription('short')).toBe('short');
    });

    it('truncates at a word boundary and appends ellipsis', () => {
      const long = 'word '.repeat(40).trim();
      const result = truncateDescription(long, 20);
      expect(result.endsWith('…')).toBe(true);
      expect(result.length).toBeLessThanOrEqual(21);
    });
  });

  describe('normalizeArgumentHint', () => {
    it('returns empty string for undefined', () => {
      expect(normalizeArgumentHint(undefined)).toBe('');
    });

    it('joins arrays', () => {
      expect(normalizeArgumentHint(['[topic]', '--module', '<name>'])).toBe('[topic] --module <name>');
    });

    it('passes strings through', () => {
      expect(normalizeArgumentHint('[description]')).toBe('[description]');
    });
  });

  describe('loadManifest', () => {
    it('returns null when file does not exist', () => {
      expect(loadManifest('/nonexistent/path/_index.json')).toBeNull();
    });

    it('returns null and warns on invalid JSON', () => {
      const tmp = join(tmpdir(), `test-manifest-${Date.now()}.json`);
      writeFileSync(tmp, 'not json');
      const result = loadManifest(tmp);
      rmSync(tmp);
      expect(result).toBeNull();
    });

    it('parses a valid manifest', () => {
      const tmp = join(tmpdir(), `test-manifest-${Date.now()}.json`);
      writeFileSync(tmp, JSON.stringify({ 'Group A': ['adr', 'spec'] }));
      const result = loadManifest(tmp);
      rmSync(tmp);
      expect(result).toEqual({ 'Group A': ['adr', 'spec'] });
    });
  });

  describe('loadCommandGroups', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = join(tmpdir(), `test-skills-${Date.now()}`);
      mkdirSync(join(tmpDir, 'adr'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'adr', 'SKILL.md'),
        '---\nname: adr\ndescription: Create an ADR\nargument-hint: [description]\n---\n',
      );
      mkdirSync(join(tmpDir, 'spec'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'spec', 'SKILL.md'),
        '---\nname: spec\ndescription: Create a spec\n---\n',
      );
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true });
    });

    it('resolves entries from manifest and SKILL.md files', () => {
      const manifest = { 'Creating Artifacts': ['adr', 'spec'] };
      const groups = loadCommandGroups(manifest, tmpDir);
      expect(groups['Creating Artifacts']).toHaveLength(2);
      expect(groups['Creating Artifacts'][0].name).toBe('adr');
      expect(groups['Creating Artifacts'][0].argumentHint).toBe('[description]');
    });

    it('skips skills with missing SKILL.md', () => {
      const manifest = { 'Creating Artifacts': ['adr', 'missing'] };
      const groups = loadCommandGroups(manifest, tmpDir);
      expect(groups['Creating Artifacts']).toHaveLength(1);
    });

    it('omits groups where all skills are missing', () => {
      const manifest = { 'Empty Group': ['missing'] };
      const groups = loadCommandGroups(manifest, tmpDir);
      expect(groups['Empty Group']).toBeUndefined();
    });
  });

  describe('renderCommandsMdx', () => {
    it('renders a valid MDX string with frontmatter and tiles', () => {
      const groups = {
        'Creating Artifacts': [
          { name: 'adr', description: 'Create an ADR', argumentHint: '[description]' },
        ],
      };
      const mdx = renderCommandsMdx(groups, 'sdd');
      expect(mdx).toContain('sidebar_label: "Quick Reference"');
      expect(mdx).toContain('command-tiles');
      expect(mdx).toContain('<CommandTile');
      expect(mdx).toContain('"adr"');
      expect(mdx).toContain('"sdd"');
    });
  });
});
