import z, { ZodFirstPartyTypeKind } from 'zod/v3';

export function parse<Options extends z.ZodRawShape, Positionals extends z.ZodTuple | z.ZodArray<z.ZodTypeAny>>(
    args: string[] = process.argv.slice(2),
    config: { options?: Options; positionals?: Positionals }
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
                    options[name] ||= [];
                    // @ts-expect-error
                    options[name].push(parseValue(parts.at(1) ?? args[i + 1], validator._def.type._def.typeName));
                    if (parts.at(1) === undefined) {
                        i++;
                    }
                    break;
                }
                default: {
                    // @ts-expect-error
                    options[name] = parseValue(parts.at(1) ?? args[i + 1], typeName);
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
