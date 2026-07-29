import { posix, win32 } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  canonicalPhysicalPath,
  relativePhysicalPath,
  type PhysicalPathSemantics,
} from '../../../packages/cli/src/internal/physical-path.js';

function semantics(
  path: typeof posix | typeof win32,
  aliases: Readonly<Record<string, string>>,
): PhysicalPathSemantics {
  return { path, realpath: (value) => aliases[value] ?? value };
}

describe('physical path identity', () => {
  test('treats macOS /var and /private/var spellings as one physical tree', () => {
    const fs = semantics(posix, {
      '/var/folders/job/consumer/node_modules': '/private/var/folders/job/consumer/node_modules',
      '/var/folders/job/consumer/node_modules/liteship/dist/index.js':
        '/private/var/folders/job/consumer/node_modules/liteship/dist/index.js',
    });
    expect(canonicalPhysicalPath('/var/folders/job/consumer/node_modules', fs)).toBe(
      '/private/var/folders/job/consumer/node_modules',
    );
    expect(
      relativePhysicalPath(
        '/var/folders/job/consumer/node_modules',
        '/var/folders/job/consumer/node_modules/liteship/dist/index.js',
        fs,
      ),
    ).toBe('liteship/dist/index.js');
  });

  test('canonicalizes Windows 8.3 aliases and preserves spaces and Unicode', () => {
    const fs = semantics(win32, {
      'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\consumer': 'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\consumer',
      'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\consumer\\node_modules\\@scope\\démo file.js':
        'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\consumer\\node_modules\\@scope\\démo file.js',
    });
    expect(
      relativePhysicalPath(
        'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\consumer',
        'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\consumer\\node_modules\\@scope\\démo file.js',
        fs,
      ),
    ).toBe('node_modules\\@scope\\démo file.js');
  });

  test('refuses siblings and prefix-confusable paths after canonicalization', () => {
    const fs = semantics(posix, {});
    expect(relativePhysicalPath('/tmp/app', '/tmp/application/index.js', fs)).toBeNull();
    expect(relativePhysicalPath('/tmp/app', '/tmp/app/../escape.js', fs)).toBeNull();
  });
});
