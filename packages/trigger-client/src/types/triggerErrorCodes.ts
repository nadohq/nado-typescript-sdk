import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the trigger service API. Codes shared across all Nado backend
 * services (see {@link NADO_ERROR_CODES}) are inlined via spread; trigger-specific codes belong
 * in the trigger's own range and should be added here as the backend enumerates them.
 *
 * The trigger failure envelope is returned for both `/query` and `/execute` routes — see
 * {@link TriggerServerQueryFailureResponse} and `EngineServerExecuteFailureResult` (the trigger
 * service reuses the engine's execute failure shape).
 */
export const TRIGGER_ERROR_CODES = {
  ...NADO_ERROR_CODES,
  // Trigger-specific codes (3xxx range). Populate as the backend's error enum is finalized.
} as const;

/**
 * Union of all known trigger service API error codes.
 */
export type TriggerErrorCode =
  (typeof TRIGGER_ERROR_CODES)[keyof typeof TRIGGER_ERROR_CODES];
