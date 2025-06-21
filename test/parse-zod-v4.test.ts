import { z } from 'zod/v4';
import { parse } from '../src/index.js';
import { describe, expect, test } from 'vitest';

describe('boolean', () => {
    test('flag', () => {
        const result = parse({ options: z.object({ enable: z.boolean() }) }, ['--enable']);

        expect(result).toHaveProperty('options', { enable: true });
    });

    test('stringbool flag', () => {
        const result = parse({ options: z.object({ enable: z.stringbool() }) }, ['--enable']);

        expect(result).toHaveProperty('options', { enable: true });
    });

    describe('value', () => {
        test('true', () => {
            const result = parse({ options: z.object({ enable: z.boolean() }) }, ['--enable=true']);

            expect(result).toHaveProperty('options', { enable: true });
        });

        test('false', () => {
            const result = parse({ options: z.object({ enable: z.boolean() }) }, ['--enable=false']);

            expect(result).toHaveProperty('options', { enable: false });
        });
    });
});
