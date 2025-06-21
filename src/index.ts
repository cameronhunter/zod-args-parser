import z, { ZodFirstPartyTypeKind } from 'zod/v3';

export function parse<Options extends z.ZodRawShape, Positionals extends z.ZodTuple | z.ZodArray<z.ZodTypeAny>>(
    config: { options?: Options; positionals?: Positionals },
    args: string[] = process.argv.slice(2)
): { options: z.objectOutputType<Options, z.ZodTypeAny>; positionals: z.output<Positionals> } {
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

            const typeName = validator._def.typeName as ZodFirstPartyTypeKind;

            switch (typeName) {
                case ZodFirstPartyTypeKind.ZodBoolean: {
                    const value = parts.at(1) === undefined ? true : parseValue(parts.at(1)!, typeName);
                    // @ts-expect-error
                    options[nonNegatedName] = negated ? !value : value;
                    break;
                }
                case ZodFirstPartyTypeKind.ZodArray: {
                    // @ts-expect-error
                    options[fullName] ||= [];
                    // @ts-expect-error
                    options[fullName].push(parseValue(parts.at(1) ?? args[i + 1], validator._def.type._def.typeName));
                    if (parts.at(1) === undefined) {
                        i++;
                    }
                    break;
                }
                case ZodFirstPartyTypeKind.ZodTuple: {
                    const tuple = validator._def.items;
                    const value = tuple.map((item: any, j: number) => parseValue(args[i + 1 + j]!, item._def.typeName));

                    let advance = tuple.length;

                    if (validator._def.rest) {
                        const rest = args.slice(i + 1 + advance, args.length);
                        value.push(...rest.map((value) => parseValue(value, validator._def.rest._def.typeName)));
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
        options: config.options ? z.object(config.options).strict().parse(options) : ({} as any),
        positionals: config.positionals ? config.positionals.parse(positionals) : ([] as any),
        ...(passthrough ? { '--': passthrough } : undefined),
    };
}

function parseValue(input: string, typeName: ZodFirstPartyTypeKind) {
    switch (typeName) {
        case ZodFirstPartyTypeKind.ZodBoolean:
            return input === 'true' || input === '1';
        case ZodFirstPartyTypeKind.ZodNumber:
            return Number(input);
        default:
            return input;
    }
}
