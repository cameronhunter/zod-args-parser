import type * as z3 from 'zod/v3';
import type * as z4 from 'zod/v4/core';
import { parse as z4Parse } from 'zod/v4/core';

export type ZodTypeAny = z3.ZodTypeAny | z4.$ZodType;
export type ZodTuple = z3.ZodTuple | z4.$ZodTuple;
export type ZodArrayAny = z3.ZodArray<z3.ZodTypeAny> | z4.$ZodArray<z4.$ZodType>;
export type ZodObjectAny = z3.AnyZodObject | z4.$ZodObject;

export type ZodObjectOutput<T extends { [name: string]: ZodTypeAny }> = {
    [name in keyof T]: ZodOutput<T[name]>;
};

export type ZodOutput<T extends ZodTypeAny> = T extends z4.$ZodType
    ? z4.output<T>
    : T extends z3.ZodTypeAny
    ? z3.output<T>
    : never;

export type ZodTypeDefType = z4.$ZodTypeDef['type'];

export function zodParse(input: ZodTypeAny, values: unknown) {
    if (isZod4(input)) {
        return z4Parse(input, values);
    }

    return input.parse(values);
}

// TODO: Make this type safe with generics
export function getZodObjectShape(object: ZodObjectAny | undefined) {
    if (!object) {
        return undefined;
    }

    return isZod4(object) ? object._zod.def.shape : object._def.shape();
}

export function getZodType(validator: ZodTypeAny): z4.$ZodTypeDef['type'] {
    if (isZod4(validator)) {
        return validator._zod.def.type;
    }

    switch (validator._def.typeName) {
        case 'ZodBoolean':
            return 'boolean';
        case 'ZodArray':
            return 'array';
        case 'ZodTuple':
            return 'tuple';
        case 'ZodNumber':
            return 'number';
        case 'ZodString':
            return 'string';
        case 'ZodLiteral':
            return 'literal';
        case 'ZodEnum':
            return 'enum';
        default:
            throw new Error(`Unsupported type: "${validator._def.typeName}"`);
    }
}

export function isZod4(input: unknown): input is z4.$ZodType {
    return Boolean(input && typeof input === 'object' && '_zod' in input);
}
