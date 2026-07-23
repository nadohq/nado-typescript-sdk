import { ENGINE_ERROR_CODES } from '@nadohq/engine-client';

/**
 * Numeric error codes returned by the trigger service API.
 *
 * The trigger service shares the same `ResponseError` enum as the engine (see
 * `nado-utils/src/error.rs`), so the 2xxx query/execute codes are identical. This map re-exports
 * {@link ENGINE_ERROR_CODES} for ergonomic access from `@nadohq/trigger-client` consumers —
 * e.g. `TRIGGER_ERROR_CODES.TRIGGER_ORDER_NOT_FOUND` instead of importing from the engine
 * package.
 *
 * The trigger failure envelope is returned for both `/query` and `/execute` routes — see
 * {@link TriggerServerQueryFailureResponse} and `EngineServerExecuteFailureResult` (the trigger
 * service reuses the engine's execute failure shape).
 */
export const TRIGGER_ERROR_CODES = {
  ...ENGINE_ERROR_CODES,
} as const;

/**
 * Union of all known trigger service API error codes.
 */
export type TriggerErrorCode =
  (typeof TRIGGER_ERROR_CODES)[keyof typeof TRIGGER_ERROR_CODES];
