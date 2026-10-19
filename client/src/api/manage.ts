import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query";
import { canGrantTo } from "../admin/accessRules";
import { ApiError, requestJson } from "./http";
import { useMe } from "./auth";
import { queryKeys } from "./queryKeys";

/** The longest title the broker accepts. */
export const maxVariantTitleLength = 100;

/** The longest description the broker accepts. */
export const maxVariantDescriptionLength = 4000;

/** The site-wide roles. A person without one has `null`. */
export type ManageRole = "admin" | "manager";

/** An API key as `GET /api/manage/keys` lists it. */
export interface AdminKey {
    readonly name: string;
    readonly rateLimitPerMinute: number | null;
    readonly allVariants: boolean;
    readonly canActForUsers: boolean;

    /** The variants the key is granted one by one. */
    readonly grants: readonly string[];
    readonly createdAt: string;
    readonly revokedAt: string | null;
}

/** A variant as `GET /api/manage/variants` lists it, which includes ones the site does not show. */
export interface AdminVariant {
    readonly name: string;
    readonly title: string | null;
    readonly aliases: readonly string[];
    readonly description: string | null;
    readonly available: boolean;
    readonly public: boolean;
    readonly instanceCount: number;
}

/** A person who has a role or a grant, as `GET /api/manage/users` lists them. */
export interface AdminUser {
    readonly uid: number;
    readonly role: ManageRole | null;
    readonly grants: readonly string[];
}

/** What creating a key answers with. The raw key is shown once and cannot be fetched again. */
export interface CreatedKey {
    readonly key: AdminKey;
    readonly rawKey: string;
}

/** What to send to create a key. */
export interface NewKey {
    readonly name: string;
    readonly rateLimitPerMinute: number | null;
    readonly allVariants: boolean;
    readonly canActForUsers: boolean;
    readonly grants: readonly string[];
}

/** What to change about a key. A field that is left out stays as it is; a `null` limit means unlimited. */
export interface KeyChanges {
    rateLimitPerMinute?: number | null;
    allVariants?: boolean;
    canActForUsers?: boolean;
}

/** A person's role, as `GET /api/manage/user-roles` answers. */
export interface UserRole {
    readonly uid: number;
    readonly role: ManageRole | null;
}

/** The server answers at most this many uids per request. */
const maxUidsPerRequest = 100;

/** Splits the uids into the requests the server accepts. */
function chunkUids(uids: readonly number[]): number[][] {
    const unique = [...new Set(uids)];
    const chunks: number[][] = [];

    for (let i = 0; i < unique.length; i += maxUidsPerRequest) {
        chunks.push(unique.slice(i, i + maxUidsPerRequest));
    }

    return chunks;
}

/** Asks for the roles of people. */
async function fetchUserRoles(uids: readonly number[]): Promise<UserRole[]> {
    const answers = await Promise.all(
        chunkUids(uids).map((chunk) =>
            requestJson<UserRole[]>("GET", `/api/manage/user-roles?uids=${chunk.join(",")}`),
        ),
    );

    return answers.flat();
}

/** The uids granted a variant. Admins and the variant's managers only; the broker refuses others. */
export function useGrants(variant: string): UseQueryResult<number[], ApiError> {
    return useQuery({
        queryKey: queryKeys.manageGrants(variant),
        queryFn: () =>
            requestJson<number[]>(
                "GET",
                `/api/manage/variants/${encodeURIComponent(variant)}/grants`,
            ),
    });
}

/** The usernames of people, by uid. A uid the server does not know is absent. */
export function useUsernames(
    uids: readonly number[],
): UseQueryResult<Map<number, string>, ApiError> {
    const key = [...new Set(uids)].sort((a, b) => a - b).join(",");

    return useQuery({
        queryKey: queryKeys.manageUsernames(key),
        enabled: uids.length > 0,
        queryFn: async () => {
            const usernames = new Map<number, string>();
            const answers = await Promise.all(
                chunkUids(uids).map((chunk) =>
                    requestJson<Record<string, unknown>>(
                        "GET",
                        `/api/manage/usernames?uids=${chunk.join(",")}`,
                    ),
                ),
            );

            for (const answer of answers) {
                for (const [uid, username] of Object.entries(answer)) {
                    if (typeof username === "string") {
                        usernames.set(Number(uid), username);
                    }
                }
            }

            return usernames;
        },
    });
}

/** The roles of people, by uid. Admins and managers only. A person without a role has `null`. */
export function useUserRoles(
    uids: readonly number[],
): UseQueryResult<Map<number, ManageRole | null>, ApiError> {
    const key = [...new Set(uids)].sort((a, b) => a - b).join(",");

    return useQuery({
        queryKey: queryKeys.manageUserRoles(key),
        enabled: uids.length > 0,
        queryFn: async () =>
            new Map((await fetchUserRoles(uids)).map(({ uid, role }) => [uid, role] as const)),
    });
}

/** Every API key. Admins only. */
export function useAdminKeys({
    isEnabled,
}: {
    isEnabled: boolean;
}): UseQueryResult<AdminKey[], ApiError> {
    return useQuery({
        queryKey: queryKeys.manageKeys(),
        enabled: isEnabled,
        queryFn: () => requestJson<AdminKey[]>("GET", "/api/manage/keys"),
    });
}

/** Every variant, including `droid-live` and the osu! variants. Admins only. */
export function useAdminVariants({
    isEnabled = true,
}: { isEnabled?: boolean } = {}): UseQueryResult<AdminVariant[], ApiError> {
    return useQuery({
        queryKey: queryKeys.manageVariants(),
        enabled: isEnabled,
        queryFn: () => requestJson<AdminVariant[]>("GET", "/api/manage/variants"),
    });
}

/** Everyone who has a role or a grant. Admins only. */
export function useAdminUsers({ isEnabled = true }: { isEnabled?: boolean } = {}): UseQueryResult<
    AdminUser[],
    ApiError
> {
    return useQuery({
        queryKey: queryKeys.manageUsers(),
        enabled: isEnabled,
        queryFn: () => requestJson<AdminUser[]>("GET", "/api/manage/users"),
    });
}

/** What to change about a variant. A field that is left out stays as it is; `null` clears a title or description. */
export interface VariantChanges {
    title?: string | null;
    description?: string | null;

    /** Admins only. */
    public?: boolean;
}

/** Makes the site's variant list and the grants load again. */
function useRefreshVariants(): () => Promise<void> {
    const queryClient = useQueryClient();

    return async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.variants() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.manageVariants() }),
        ]);
    };
}

/** Changes a variant's title, description or visibility. */
export function useUpdateVariant(
    variant: string,
): UseMutationResult<unknown, ApiError, VariantChanges> {
    const refresh = useRefreshVariants();

    return useMutation({
        mutationFn: (changes: VariantChanges) =>
            requestJson("PATCH", `/api/manage/variants/${encodeURIComponent(variant)}`, changes),
        onSuccess: refresh,
    });
}

/** Points an alias at the variant, taking it from the variant it pointed to. */
export function useSetAlias(variant: string): UseMutationResult<void, ApiError, string> {
    const refresh = useRefreshVariants();

    return useMutation({
        mutationFn: async (alias: string) => {
            try {
                await requestJson<void>("PUT", `/api/manage/aliases/${encodeURIComponent(alias)}`, {
                    variant,
                });
            } catch (error) {
                // The broker checks both ends of a move: the variant getting the alias and the one losing it.
                if (error instanceof ApiError && error.status === 403) {
                    throw new ApiError(403, "That alias belongs to a rework you don't manage.");
                }

                throw error;
            }
        },
        onSettled: refresh,
    });
}

/** Removes an alias. */
export function useRemoveAlias(): UseMutationResult<void, ApiError, string> {
    const refresh = useRefreshVariants();

    return useMutation({
        mutationFn: (alias: string) =>
            requestJson<void>("DELETE", `/api/manage/aliases/${encodeURIComponent(alias)}`),
        onSettled: refresh,
    });
}

/**
 * Grants a person a variant. A manager may only grant to people without a role: the person's role is looked up
 * first so that a refusal reads as one, and the broker still enforces the rule.
 */
export function useGrantUser(variant: string): UseMutationResult<void, ApiError, number> {
    const queryClient = useQueryClient();
    const { data: me = null } = useMe();

    return useMutation({
        mutationFn: async (uid: number) => {
            if (me?.role !== "admin") {
                const [target] = await fetchUserRoles([uid]);

                if (!me || !canGrantTo(me, target?.role ?? null)) {
                    throw new ApiError(
                        403,
                        "Managers can only give access to people who have no role.",
                    );
                }
            }

            await requestJson<void>(
                "PUT",
                `/api/manage/variants/${encodeURIComponent(variant)}/grants/${uid}`,
            );
        },
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.manageGrants(variant) }),
    });
}

/** Removes a person's grant of a variant. */
export function useUngrantUser(variant: string): UseMutationResult<void, ApiError, number> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (uid: number) =>
            requestJson<void>(
                "DELETE",
                `/api/manage/variants/${encodeURIComponent(variant)}/grants/${uid}`,
            ),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.manageGrants(variant) }),
    });
}

/** Grants or removes an API key's grant of a variant. Admins only. */
export function useChangeKeyGrant(
    variant: string,
): UseMutationResult<void, ApiError, { key: string; isGranted: boolean }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, isGranted }: { key: string; isGranted: boolean }) =>
            requestJson<void>(
                isGranted ? "PUT" : "DELETE",
                `/api/manage/keys/${encodeURIComponent(key)}/grants/${encodeURIComponent(variant)}`,
            ),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.manageKeys() }),
    });
}

/** Creates an API key. The answer holds the raw key, which the caller must show once and then drop. */
export function useCreateKey(): UseMutationResult<CreatedKey, ApiError, NewKey> {
    const queryClient = useQueryClient();

    return useMutation({
        // The answer holds the raw key, so it is not kept in the cache once nothing shows it.
        gcTime: 0,
        mutationFn: (key: NewKey) => requestJson<CreatedKey>("POST", "/api/manage/keys", key),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.manageKeys() }),
    });
}

/** Changes an API key's rate limit, or what it may do. */
export function useUpdateKey(key: string): UseMutationResult<unknown, ApiError, KeyChanges> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (changes: KeyChanges) =>
            requestJson("PATCH", `/api/manage/keys/${encodeURIComponent(key)}`, changes),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.manageKeys() }),
    });
}

/** Grants an API key a variant, or takes it away. */
export function useChangeVariantGrantOfKey(
    key: string,
): UseMutationResult<void, ApiError, { variant: string; isGranted: boolean }> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ variant, isGranted }: { variant: string; isGranted: boolean }) =>
            requestJson<void>(
                isGranted ? "PUT" : "DELETE",
                `/api/manage/keys/${encodeURIComponent(key)}/grants/${encodeURIComponent(variant)}`,
            ),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.manageKeys() }),
    });
}

/** Revokes an API key for good. */
export function useRevokeKey(key: string): UseMutationResult<unknown, ApiError, void> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => requestJson("POST", `/api/manage/keys/${encodeURIComponent(key)}/revoke`),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.manageKeys() }),
    });
}

/** Sets a person's site-wide role, or removes it with `null`. Admins only. */
export function useSetRole(): UseMutationResult<
    void,
    ApiError,
    { uid: number; role: ManageRole | null }
> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ uid, role }: { uid: number; role: ManageRole | null }) =>
            requestJson<void>("PUT", `/api/manage/users/${uid}/role`, { role }),
        onSettled: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.manageUsers() }),
                // A role decides who a manager may remove, and the roles shown beside grants.
                queryClient.invalidateQueries({ queryKey: queryKeys.manageAllUserRoles() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.me() }),
            ]),
    });
}
