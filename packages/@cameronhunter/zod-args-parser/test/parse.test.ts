import { z } from 'zod/v3';
import { parse } from '../src/index.js';
import { describe, expect, test } from 'vitest';

describe('boolean', () => {
    test('flag', () => {
        const result = parse({ options: z.object({ enable: z.boolean() }) }, ['--enable']);

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

describe('negation', () => {
    test('works for boolean flags', () => {
        const result = parse({ options: z.object({ enable: z.boolean() }) }, ['--no-enable']);

        expect(result).toHaveProperty('options', { enable: false });
    });

    test('has no effect on other types', () => {
        const result = parse({ options: z.object({ 'no-name': z.string() }) }, ['--no-name', 'Cameron']);

        expect(result).toHaveProperty('options', { 'no-name': 'Cameron' });
    });
});

describe('string', () => {
    test('arg value', () => {
        const result = parse({ options: z.object({ name: z.string() }) }, ['--name', 'Cameron']);

        expect(result).toHaveProperty('options', { name: 'Cameron' });
    });

    test('parameter value', () => {
        const result = parse({ options: z.object({ name: z.string() }) }, ['--name=Hunter']);

        expect(result).toHaveProperty('options', { name: 'Hunter' });
    });
});

describe('number', () => {
    test('arg value', () => {
        const result = parse({ options: z.object({ times: z.number().int().positive() }) }, ['--times', '1']);

        expect(result).toHaveProperty('options', { times: 1 });
    });

    test('parameter value', () => {
        const result = parse({ options: z.object({ times: z.number().int().positive() }) }, ['--times=2']);

        expect(result).toHaveProperty('options', { times: 2 });
    });
});

describe('arrays', () => {
    describe('string', () => {
        test('repeated arg value', () => {
            const result = parse({ options: z.object({ file: z.array(z.string()) }) }, [
                '--file',
                'foo',
                '--file',
                'bar',
            ]);

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });

        test('repeated parameter value', () => {
            const result = parse({ options: z.object({ file: z.array(z.string()) }) }, ['--file=foo', '--file=bar']);

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });
    });

    describe('number', () => {
        test('repeated arg value', () => {
            const result = parse({ options: z.object({ file: z.array(z.number()) }) }, ['--file', '1', '--file', '2']);

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });

        test('repeated parameter value', () => {
            const result = parse({ options: z.object({ file: z.array(z.number()) }) }, ['--file=1', '--file=2']);

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });
    });
});

describe('enums', () => {
    test('arg value', () => {
        const result = parse({ options: z.object({ color: z.enum(['red', 'blue']) }) }, ['--color', 'red']);

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse({ options: z.object({ color: z.enum(['red', 'blue']) }) }, ['--color=blue']);

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('literal', () => {
    test('arg value', () => {
        const result = parse({ options: z.object({ color: z.literal('red') }) }, ['--color', 'red']);

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse({ options: z.object({ color: z.literal('blue') }) }, ['--color=blue']);

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('tuples', () => {
    test('simple tuple', () => {
        const result = parse({ options: z.object({ tuple: z.tuple([z.number(), z.number()]) }) }, [
            '--tuple',
            '1',
            '2',
        ]);
        expect(result).toHaveProperty('options', { tuple: [1, 2] });
    });

    test('variadic tuple', () => {
        const result = parse({ options: z.object({ tuple: z.tuple([z.number()]).rest(z.string()) }) }, [
            '--tuple',
            '1',
            'value',
        ]);
        expect(result).toHaveProperty('options', { tuple: [1, 'value'] });
    });
});

describe('positionals', () => {
    test('simple array', () => {
        const result = parse({ positionals: z.array(z.string()) }, ['foo', 'bar', 'baz']);
        expect(result).toHaveProperty('positionals', ['foo', 'bar', 'baz']);
    });

    test('tuple', () => {
        const result = parse({ positionals: z.tuple([z.string(), z.coerce.number()]) }, ['foo', '1']);
        expect(result).toHaveProperty('positionals', ['foo', 1]);
    });
});

test('support for --', () => {
    const result = parse({}, ['--', '--other-arg', 'value']);
    expect(result).toHaveProperty('--', ['--other-arg', 'value']);
});

describe('error cases', () => {
    test('undocumented option', () => {
        expect(() => parse({ options: z.object({}).strict() }, ['--unknown'])).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Unrecognized key(s) in object: 'unknown' at "options"]`
        );
    });

    test('too many positionals', () => {
        expect(() => parse({ positionals: z.tuple([z.string()]) }, ['good', 'bad'])).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Array must contain at most 1 element(s) at "positionals"]`
        );
    });

    describe('invalid parsing', () => {
        test('invalid number value', () => {
            expect(() => parse({ options: z.object({ count: z.number() }) }, ['--count', 'abc'])).toThrow();
        });

        test('invalid boolean value', () => {
            expect(() => parse({ options: z.object({ flag: z.boolean() }) }, ['--flag=maybe'])).toThrow();
        });

        test('missing value for string option', () => {
            expect(() => parse({ options: z.object({ name: z.string() }) }, ['--name'])).toThrow();
        });

        test('missing value for number option', () => {
            expect(() => parse({ options: z.object({ count: z.number() }) }, ['--count'])).toThrow();
        });
    });

    describe('malformed syntax', () => {
        test('triple dash', () => {
            expect(() => parse({ options: z.object({}).strict() }, ['---flag'])).toThrow();
        });

        test('equals with no value', () => {
            const result = parse({ options: z.object({ name: z.string() }) }, ['--name=']);
            expect(result.options.name).toBe('');
        });
    });
});

describe('edge cases', () => {
    test('empty string values', () => {
        const result = parse({ options: z.object({ value: z.string() }) }, ['--value', '']);
        expect(result.options.value).toBe('');
    });

    test('special characters in values', () => {
        const result = parse({ options: z.object({ path: z.string() }) }, ['--path', '/path/with spaces & symbols!']);
        expect(result.options.path).toBe('/path/with spaces & symbols!');
    });

    test('options after positionals', () => {
        const result = parse({ options: z.object({ flag: z.boolean() }), positionals: z.array(z.string()) }, [
            'pos1',
            '--flag',
            'pos2',
        ]);
        expect(result.options.flag).toBe(true);
        expect(result.positionals).toEqual(['pos1', 'pos2']);
    });

    test('mixed options before --', () => {
        const result = parse({ options: z.object({ flag: z.boolean(), name: z.string() }) }, [
            '--flag',
            '--name',
            'test',
            '--',
            '--other',
        ]);
        expect(result.options).toEqual({ flag: true, name: 'test' });
        expect(result['--']).toEqual(['--other']);
    });

    test('empty array initialization', () => {
        const result = parse({ options: z.object({ items: z.array(z.string()).default([]) }) }, []);
        expect(result.options.items).toEqual([]);
    });
});

describe('zod schema features', () => {
    describe('optional fields', () => {
        test('optional field not provided', () => {
            const result = parse({ options: z.object({ name: z.string().optional() }) }, []);
            expect(result.options.name).toBeUndefined();
        });

        test('optional field provided', () => {
            const result = parse({ options: z.object({ name: z.string().optional() }) }, ['--name', 'test']);
            expect(result.options.name).toBe('test');
        });
    });

    describe('default values', () => {
        test('default used when not provided', () => {
            const result = parse({ options: z.object({ count: z.number().default(5) }) }, []);
            expect(result.options.count).toBe(5);
        });

        test('default overridden when provided', () => {
            const result = parse({ options: z.object({ count: z.number().default(5) }) }, ['--count', '10']);
            expect(result.options.count).toBe(10);
        });
    });

    describe('coercion', () => {
        test('coerce string to number', () => {
            const result = parse({ positionals: z.tuple([z.coerce.number()]) }, ['42']);
            expect(result.positionals[0]).toBe(42);
        });

        test('coerce string to boolean in positionals', () => {
            const result = parse({ positionals: z.tuple([z.coerce.boolean()]) }, ['true']);
            expect(result.positionals[0]).toBe(true);
        });
    });

    describe('refinements', () => {
        test('positive number refinement passes', () => {
            const result = parse({ options: z.object({ count: z.number().positive() }) }, ['--count', '5']);
            expect(result.options.count).toBe(5);
        });

        test('positive number refinement fails', () => {
            expect(() => parse({ options: z.object({ count: z.number().positive() }) }, ['--count', '-5'])).toThrow();
        });
    });
});

describe('advanced parsing scenarios', () => {
    test('multiple -- separators (only first one counts)', () => {
        const result = parse({}, ['--flag', '--', 'arg1', '--', 'arg2']);
        expect(result['--']).toEqual(['arg1', '--', 'arg2']);
    });

    test('options and positionals mixed before --', () => {
        const result = parse(
            {
                options: z.object({ verbose: z.boolean(), name: z.string() }),
                positionals: z.array(z.string()),
            },
            ['file1', '--verbose', 'file2', '--name', 'test', 'file3', '--', '--extra']
        );
        expect(result.options).toEqual({ verbose: true, name: 'test' });
        expect(result.positionals).toEqual(['file1', 'file2', 'file3']);
        expect(result['--']).toEqual(['--extra']);
    });

    test('array with no values provided', () => {
        const result = parse({ options: z.object({ files: z.array(z.string()).default([]) }) }, []);
        expect(result.options.files).toEqual([]);
    });

    test('variadic tuple with rest elements', () => {
        const result = parse({ options: z.object({ coords: z.tuple([z.number(), z.number()]).rest(z.string()) }) }, [
            '--coords',
            '1',
            '2',
            'extra1',
            'extra2',
        ]);
        expect(result.options.coords).toEqual([1, 2, 'extra1', 'extra2']);
    });

    test('complex nested validation', () => {
        const result = parse(
            {
                options: z.object({
                    config: z.string().refine((s) => s.endsWith('.json'), 'Must be a JSON file'),
                    port: z.number().int().min(1000).max(65535),
                }),
            },
            ['--config', 'app.json', '--port', '3000']
        );
        expect(result.options).toEqual({ config: 'app.json', port: 3000 });
    });
});

test('kitchen sink', () => {
    const result = parse(
        {
            options: z
                .object({
                    foo: z.boolean().default(false),
                    bar: z.boolean(),
                    baz: z.boolean().default(true),
                    boo: z.boolean().optional(),
                    string: z.string(),
                    number: z.number().int().positive(),
                })
                .strict(),
            positionals: z.tuple([z.string(), z.coerce.number()]),
        },
        ['--foo', '--no-bar', '--string', 'hello', 'positional1', '--number', '1', '2']
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "options": {
          "bar": false,
          "baz": true,
          "foo": true,
          "number": 1,
          "string": "hello",
        },
        "positionals": [
          "positional1",
          2,
        ],
      }
    `);
});
