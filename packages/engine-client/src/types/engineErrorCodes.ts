import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the engine service API. Codes shared across all Nado backend
 * services (see {@link NADO_ERROR_CODES}) are inlined via spread; engine-specific codes belong
 * in the engine's own range and should be added here as the backend enumerates them.
 *
 * The engine failure envelope is returned for both `/query` and `/execute` routes — see
 * {@link EngineServerQueryFailureResponse} and {@link EngineServerExecuteFailureResult}.
 */
export const ENGINE_ERROR_CODES = {
  ...NADO_ERROR_CODES,
  // Engine-specific codes (1xxx-2xxx range). Populate as the backend's error enum is finalized.
} as const;

/**
 * Union of all known engine service API error codes.
 */
export type EngineErrorCode =
  (typeof ENGINE_ERROR_CODES)[keyof typeof ENGINE_ERROR_CODES];
