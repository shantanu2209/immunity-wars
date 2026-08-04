import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index.js';

describe('@immunity-wars/server scaffold', () => {
  it('compiles, resolves and is importable by the test runner', () => {
    expect(PACKAGE_NAME).toBe('@immunity-wars/server');
  });
});
