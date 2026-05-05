/**
 * Zod validators only at the package root — OpenAPI also emits TS types under `./generated/types`
 * with identical names; re-exporting both causes TS2308. Import inferred types via `z.infer<typeof …>`.
 */
export * from "./generated/api";
