import { PPVariant } from "app-structures";
import { BrokerClient } from "../clients/BrokerClient";

/**
 * Gets how many players a variant can calculate at once: its healthy instances. A broker that
 * predates the count answers without it, which counts as none, so that nothing is queued for a
 * variant that may never calculate it.
 *
 * @param variant The variant, as the broker answered it.
 */
export function calculatorCount(
    variant: Pick<PPVariant, "healthyInstanceCount">,
): number {
    const count: unknown = variant.healthyInstanceCount;

    return typeof count === "number" && Number.isFinite(count) && count > 0
        ? Math.floor(count)
        : 0;
}

/**
 * Looks up how many players a variant can calculate at once.
 *
 * @param name The name of the variant.
 * @param actingUid The uid of the person the lookup acts for.
 * @returns The count, or `null` if the variant could not be fetched.
 */
export async function getVariantCalculatorCount(
    name: string,
    actingUid: number,
): Promise<number | null> {
    const variant = await BrokerClient.getVariant(name, actingUid);

    return variant === null ? null : calculatorCount(variant);
}
