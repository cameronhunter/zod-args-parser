import {
    getZodType,
    type ZodArrayAny,
    type ZodObjectOutput,
    type ZodOutput,
    type ZodTuple,
    type ZodTypeAny,
    type ZodTypeDefType,
} from './zod-compatibility.js';

export function parse<Options extends { [option: string]: ZodTypeAny }, Positionals extends ZodTuple | ZodArrayAny>(
    config: { options?: Options; positionals?: Positionals },
    args: string[] = process.argv.slice(2)
): { options: ZodObjectOutput<Options>; positionals: ZodOutput<Positionals> } {
    const options = {};
    const positionals = [];

    let passthrough: string[] | undefined;

    for (let i = 0, len = args.length; i < len; i++) {
        const arg = args.at(i)!;

        if (arg === '--') {
            passthrough = args.slice(i + 1);
        }

        if (arg.startsWith('--')) {
            const negated = arg.startsWith('--no-');
            const parts = arg.slice(2).split('=');
            const fullName = parts.at(0)!;
            const nonNegatedName = negated ? fullName.slice(3) : fullName;
            const validator = config.options?.[fullName] || config.options?.[nonNegatedName];

            if (!validator) {
                const consumeNextArg = args[i + 1] !== undefined && !args[i + 1]?.startsWith('--');
                // @ts-expect-error
                options[fullName] = consumeNextArg ? args[i + 1] : true;
                if (consumeNextArg) {
                    i++;
                }
                continue;
            }

            const typeName = getZodType(validator);

            switch (typeName) {
                case 'boolean': {
                    const value = parts.at(1) === undefined ? true : parseValue(parts.at(1)!, typeName);
                    // @ts-expect-error
                    options[nonNegatedName] = negated ? !value : value;
                    break;
                }
                case 'array': {
                    // @ts-expect-error
                    options[fullName] ||= [];
                    // @ts-expect-error
                    options[fullName].push(parseValue(parts.at(1) ?? args[i + 1], getZodType(validator._def.type)));
                    if (parts.at(1) === undefined) {
                        i++;
                    }
                    break;
                }
                case 'tuple': {
                    const tuple = validator._def.items;
                    const value = tuple.map((item: any, j: number) => parseValue(args[i + 1 + j]!, getZodType(item)));

                    let advance = tuple.length;

                    if (validator._def.rest) {
                        const rest = args.slice(i + 1 + advance, args.length);
                        value.push(...rest.map((value) => parseValue(value, getZodType(validator._def.rest))));
                        advance += rest.length;
                    }

                    // @ts-expect-error
                    options[fullName] = value;
                    i += advance;
                    break;
                }
                default: {
                    // @ts-expect-error
                    options[fullName] = parseValue(parts.at(1) ?? args[i + 1], typeName);
                    if (parts.at(1) === undefined) {
                        i++;
                    }
                    break;
                }
            }
        } else {
            positionals.push(arg);
        }
    }

    return {
        options: config.options ? z3.object(config.options).strict().parse(options) : ({} as any),
        positionals: config.positionals ? config.positionals.parse(positionals) : ([] as any),
        ...(passthrough ? { '--': passthrough } : undefined),
    };
}

function parseValue(input: string, typeName: ZodTypeDefType) {
    switch (typeName) {
        case 'boolean':
            return input === 'true' || input === '1';
        case 'number':
            return Number(input);
        default:
            return input;
    }
}
