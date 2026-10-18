import type { PPVariant } from "app-structures";

/** The variant that `nameOrAlias` names, matched by name or alias, or `undefined` if there is none. */
export function findVariant(
    variants: readonly PPVariant[] | undefined,
    nameOrAlias: string | undefined,
): PPVariant | undefined {
    if (nameOrAlias === undefined) {
        return undefined;
    }

    return variants?.find(
        (candidate) => candidate.name === nameOrAlias || candidate.aliases.includes(nameOrAlias),
    );
}
