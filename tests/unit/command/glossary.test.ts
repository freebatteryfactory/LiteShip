import { describe, it, expect } from 'vitest';
import { glossaryCommand, GLOSSARY_ENTRIES } from '@czap/command';

describe('@czap/command glossary command', () => {
  it('returns the full catalog as a structured ok result when no term is given', async () => {
    const result = await glossaryCommand.handler({ name: 'glossary', args: {} }, {});
    expect(result.status).toBe('ok');
    expect(result.command).toBe('glossary');
    const payload = result.payload as { term: string | null; entries: readonly unknown[] };
    expect(payload.term).toBeNull();
    expect(payload.entries.length).toBe(GLOSSARY_ENTRIES.length);
  });

  it('matches an exact term', async () => {
    const result = await glossaryCommand.handler({ name: 'glossary', args: { term: 'boundary' } }, {});
    const payload = result.payload as { entries: readonly { term: string }[] };
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]?.term).toBe('boundary');
  });

  it('returns a structured failed result (exitCode > 0) for an unknown term, never a throw', async () => {
    const result = await glossaryCommand.handler({ name: 'glossary', args: { term: 'zzz-not-a-term' } }, {});
    expect(result.status).toBe('failed');
    expect(result.exitCode ?? 0).toBeGreaterThan(0);
  });
});
