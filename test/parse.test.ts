import { z } from 'zod/v3';
import { parse } from '../src/index.js';
import { describe, expect, test } from 'vitest';

describe('boolean', () => {
    test('flag', () => {
        const result = parse(['--enable'], { options: { enable: z.boolean() } });

        expect(result).toHaveProperty('options', { enable: true });
    });

    describe('value', () => {
        test('true', () => {
            const result = parse(['--enable=true'], { options: { enable: z.boolean() } });

            expect(result).toHaveProperty('options', { enable: true });
        });

        test('false', () => {
            const result = parse(['--enable=false'], { options: { enable: z.boolean() } });

            expect(result).toHaveProperty('options', { enable: false });
        });
    });
});

describe('negation', () => {
    test('works for boolean flags', () => {
        const result = parse(['--no-enable'], { options: { enable: z.boolean() } });

        expect(result).toHaveProperty('options', { enable: false });
    });

    test('has no effect on other types', () => {
        const result = parse(['--no-name', 'Cameron'], { options: { 'no-name': z.string() } });

        expect(result).toHaveProperty('options', { 'no-name': 'Cameron' });
    });
});

describe('string', () => {
    test('arg value', () => {
        const result = parse(['--name', 'Cameron'], { options: { name: z.string() } });

        expect(result).toHaveProperty('options', { name: 'Cameron' });
    });

    test('parameter value', () => {
        const result = parse(['--name=Hunter'], { options: { name: z.string() } });

        expect(result).toHaveProperty('options', { name: 'Hunter' });
    });
});

describe('number', () => {
    test('arg value', () => {
        const result = parse(['--times', '1'], { options: { times: z.number().int().positive() } });

        expect(result).toHaveProperty('options', { times: 1 });
    });

    test('parameter value', () => {
        const result = parse(['--times=2'], { options: { times: z.number().int().positive() } });

        expect(result).toHaveProperty('options', { times: 2 });
    });
});

describe('arrays', () => {
    describe('string', () => {
        test('repeated arg value', () => {
            const result = parse(['--file', 'foo', '--file', 'bar'], { options: { file: z.array(z.string()) } });

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });

        test('repeated parameter value', () => {
            const result = parse(['--file=foo', '--file=bar'], { options: { file: z.array(z.string()) } });

            expect(result).toHaveProperty('options', { file: ['foo', 'bar'] });
        });
    });

    describe('number', () => {
        test('repeated arg value', () => {
            const result = parse(['--file', '1', '--file', '2'], { options: { file: z.array(z.number()) } });

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });

        test('repeated parameter value', () => {
            const result = parse(['--file=1', '--file=2'], { options: { file: z.array(z.number()) } });

            expect(result).toHaveProperty('options', { file: [1, 2] });
        });
    });
});

describe('enums', () => {
    test('arg value', () => {
        const result = parse(['--color', 'red'], { options: { color: z.enum(['red', 'blue']) } });

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse(['--color=blue'], { options: { color: z.enum(['red', 'blue']) } });

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('literal', () => {
    test('arg value', () => {
        const result = parse(['--color', 'red'], { options: { color: z.literal('red') } });

        expect(result).toHaveProperty('options', { color: 'red' });
    });

    test('parameter value', () => {
        const result = parse(['--color=blue'], { options: { color: z.literal('blue') } });

        expect(result).toHaveProperty('options', { color: 'blue' });
    });
});

describe('tuples', () => {
    test('simple tuple', () => {
        const result = parse(['--tuple', '1', '2'], { options: { tuple: z.tuple([z.number(), z.number()]) } });
        expect(result).toHaveProperty('options', { tuple: [1, 2] });
    });

    test('variadic tuple', () => {
        const result = parse(['--tuple', '1', 'value'], { options: { tuple: z.tuple([z.number()]).rest(z.string()) } });
        expect(result).toHaveProperty('options', { tuple: [1, 'value'] });
    });
});

describe('positionals', () => {
    test('simple array', () => {
        const result = parse(['foo', 'bar', 'baz'], { positionals: z.array(z.string()) });
        expect(result).toHaveProperty('positionals', ['foo', 'bar', 'baz']);
    });

    test('tuple', () => {
        const result = parse(['foo', '1'], { positionals: z.tuple([z.string(), z.coerce.number()]) });
        expect(result).toHaveProperty('positionals', ['foo', 1]);
    });
});

test('support for --', () => {
    const result = parse(['--', '--other-arg', 'value'], {});
    expect(result).toHaveProperty('--', ['--other-arg', 'value']);
});

describe('error cases', () => {
    test('undocumented option', () => {
        expect(() => parse(['--unknown'], { options: {} })).toThrowErrorMatchingInlineSnapshot(`
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
});

test('kitchen sink', () => {
    const result = parse(['--foo', '--no-bar', '--string', 'hello', 'positional1', '--number', '1', '2'], {
        options: {
            foo: z.boolean(),
            bar: z.boolean(),
            baz: z.boolean().default(true),
            string: z.string(),
            number: z.number().int().positive(),
        },
        positionals: z.tuple([z.string(), z.coerce.number()]),
    });

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
