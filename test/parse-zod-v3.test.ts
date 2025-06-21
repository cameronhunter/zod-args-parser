import { z } from 'zod/v3';
import { parse } from '../src/index.js';
import { describe, expect, test } from 'vitest';

describe('boolean', () => {
    test('flag', () => {
        const result = parse({ options: { enable: z.boolean() } }, ['--enable']);

        expect(result).toHaveProperty('options', { enable: true });
    });

    describe('value', () => {
        test('true', () => {
            const result = parse({ options: { enable: z.boolean() } }, ['--enable=true']);

            expect(result).toHaveProperty('options', { enable: true });
        });

        test('false', () => {
            const result = parse({ options: { enable: z.boolean() } }, ['--enable=false']);

            expect(result).toHaveProperty('options', { enable: false });
        });
    });
});

describe('negation', () => {
    test('works for boolean flags', () => {
        const result = parse({ options: { enable: z.boolean() } }, ['--no-enable']);

        expect(result).toHaveProperty('options', { enable: false });
    });

    test('has no effect on other types', () => {
        const result = parse({ options: { 'no-name': z.string() } }, ['--no-name', 'Cameron']);

        expect(result).toHaveProperty('options', { 'no-name': 'Cameron' });
    });
});

describe('string', () => {
    test('arg value', () => {
        const result = parse({ options: { name: z.string() } }, ['--name', 'Cameron']);

        expect(result).toHaveProperty('options', { name: 'Cameron' });
    });

    test('parameter value', () => {
        const result = parse({ options: { name: z.string() } }, ['--name=Hunter']);

        expect(result).toHaveProperty('options', { name: 'Hunter' });
    });
});

describe('number', () => {
    test('arg value', () => {
        const result = parse({ options: { times: z.number().int().positive() } }, ['--times', '1']);

        expect(result).toHaveProperty('options', { times: 1 });
    });

    test('parameter value', () => {
        const result = parse({ options: { times: z.number().int().positive() } }, ['--times=2']);

        expect(result).toHaveProperty('options', { times: 2 });
    });
});

describe('arrays', () => {
    describe('string', () => {
        test('repeated arg value', () => {
            const result = parse({ options: { file: z.array(z.string()) } }, ['--file', 'foo', '--file', 'bar']);

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });

        test('repeated parameter value', () => {
            const result = parse({ options: { file: z.array(z.string()) } }, ['--file=foo', '--file=bar']);

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });
    });

    describe('number', () => {
        test('repeated arg value', () => {
            const result = parse({ options: { file: z.array(z.number()) } }, ['--file', '1', '--file', '2']);

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });

        test('repeated parameter value', () => {
            const result = parse({ options: { file: z.array(z.number()) } }, ['--file=1', '--file=2']);

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });
    });
});

describe('enums', () => {
    test('arg value', () => {
        const result = parse({ options: { color: z.enum(['red', 'blue']) } }, ['--color', 'red']);

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse({ options: { color: z.enum(['red', 'blue']) } }, ['--color=blue']);

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('literal', () => {
    test('arg value', () => {
        const result = parse({ options: { color: z.literal('red') } }, ['--color', 'red']);

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse({ options: { color: z.literal('blue') } }, ['--color=blue']);

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('tuples', () => {
    test('simple tuple', () => {
        const result = parse({ options: { tuple: z.tuple([z.number(), z.number()]) } }, ['--tuple', '1', '2']);
        expect(result).toHaveProperty('options', { tuple: [1, 2] });
    });

    test('variadic tuple', () => {
        const result = parse({ options: { tuple: z.tuple([z.number()]).rest(z.string()) } }, ['--tuple', '1', 'value']);
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
        expect(() => parse({ options: {} }, ['--unknown'])).toThrowErrorMatchingInlineSnapshot(`
          [ZodError: [
            {
              "code": "unrecognized_keys",
              "keys": [
                "unknown"
              ],
              "path": [],
              "message": "Unrecognized key(s) in object: 'unknown'"
            }
          ]]
        `);
    });

    test('too many positionals', () => {
        expect(() => parse({ positionals: z.tuple([z.string()]) }, ['good', 'bad']))
            .toThrowErrorMatchingInlineSnapshot(`
          [ZodError: [
            {
              "code": "too_big",
              "maximum": 1,
              "inclusive": true,
              "exact": false,
              "type": "array",
              "path": [],
              "message": "Array must contain at most 1 element(s)"
            }
          ]]
        `);
    });
});

test('kitchen sink', () => {
    const result = parse(
        {
            options: {
                foo: z.boolean(),
                bar: z.boolean(),
                baz: z.boolean().default(true),
                string: z.string(),
                number: z.number().int().positive(),
            },
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
