import z, { ZodFirstPartyTypeKind } from 'zod/v3';

export function getZodType(validator: z.ZodTypeAny): ZodFirstPartyTypeKind {
    if (validator.isOptional() || validator._def.defaultValue !== undefined) {
        return getZodType(validator._def.innerType || validator);
    }

    return validator._def.typeName;
}
