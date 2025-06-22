import { defineConfig } from 'vitest/config';
import pkg from '../../package.json' with { type: 'json' }

export default defineConfig({
    test: {
        projects: pkg.workspaces,
    },
});
