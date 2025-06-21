import z, { ZodFirstPartyTypeKind } from 'zod/v3';
import { fromZodError } from 'zod-validation-error';

type Configuration<Options extends z.AnyZodObject, Positionals extends z.ZodTuple | z.ZodArray<z.ZodTypeAny>> = {
    options?: Options;
    positionals?: Positionals;
};

export function parse<Options extends z.AnyZodObject, Positionals extends z.ZodTuple | z.ZodArray<z.ZodTypeAny>>(
    config: Configuration<Options, Positionals>,
    args: string[] = process.argv.slice(2)
): { options: z.output<Options>; positionals: z.output<Positionals> } {
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
            const [fullName, optionalValue] = arg.slice(2).split('=', 2);
            const nonNegatedName = negated ? arg.slice('--no-'.length) : fullName!;
            const validators = config.options?._def.shape();
            const validator = validators?.[fullName!] || validators?.[nonNegatedName];

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
                    const value = optionalValue === undefined ? true : parseValue(optionalValue, typeName);
                    // @ts-expect-error
                    options[nonNegatedName] = negated ? !value : value;
                    break;
                }
                case ZodFirstPartyTypeKind.ZodArray: {
                    // @ts-expect-error
                    options[fullName] ||= [];
                    // @ts-expect-error
                    options[fullName].push(parseValue(optionalValue ?? args[i + 1], validator._def.type._def.typeName));
                    if (optionalValue === undefined) {
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
                    options[fullName] = parseValue(optionalValue ?? args[i + 1], typeName);
                    if (optionalValue === undefined) {
                        i++;
                    }
                    break;
                }
            }
        } else {
            positionals.push(arg);
        }
    }

    const result = z.object(config).safeParse({ options, positionals });

    if (!result.success) {
        throw fromZodError(result.error);
    }

    return {
        ...(result.data as any),
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
