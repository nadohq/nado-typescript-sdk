/**
 * Common failure-envelope shape shared by every Nado backend service (engine, indexer, trigger,
 * mobile). Each service declares its own concrete envelope type with a service-specific
 * `request_type` tag (see `EngineServerExecuteFailureResult`, `IndexerServerFailureResponse`,
 * `MobileServerFailureResponse`, etc.); those are all structurally compatible with this base.
 *
 * `request_type` is optional because the engine and trigger `/query` failure envelopes do not echo
 * a request type — only `/execute` failures do (see {@link BaseServerFailureError.requestType}).
 */
export interface BaseServerFailureResponse {
  status: 'failure';
  error: string;
  error_code: number;
  request_type?: string;
}

/**
 * Abstract base for the per-service `*ServerFailureError` classes (engine, indexer, trigger,
 * mobile). It is `abstract` to signal that it is a base class only and is never instantiated
 * directly — each service throws its own concrete subclass.
 *
 * The base centralizes the boilerplate shared by all four service error classes: the
 * `${error_code}: ${error}` message, the {@link errorCode} and {@link requestType} accessors, and
 * the {@link responseData} envelope. Subclasses re-declare {@link responseData} (and, where
 * applicable, {@link requestType}) with their service-specific narrow types.
 */
export abstract class BaseServerFailureError extends Error {
  /**
   * Numeric backend error code. Compare against the service's `*_ERROR_CODES` map (e.g.
   * {@link ENGINE_ERROR_CODES}, `MOBILE_ERROR_CODES`); shared cross-service codes live in
   * {@link NADO_ERROR_CODES}.
   */
  readonly errorCode: number;
  /**
   * The request type that failed, e.g. `execute_place_order`, when echoed on the failure
   * envelope; `undefined` when the envelope does not carry a `request_type` (the engine and
   * trigger `/query` failure envelopes omit it — see {@link BaseServerFailureResponse}).
   */
  readonly requestType: string | undefined;

  protected constructor(
    readonly responseData: BaseServerFailureResponse,
    name: string,
  ) {
    super(`${responseData.error_code}: ${responseData.error}`);
    this.name = name;
    this.errorCode = responseData.error_code;
    this.requestType =
      'request_type' in responseData ? responseData.request_type : undefined;
  }
}
