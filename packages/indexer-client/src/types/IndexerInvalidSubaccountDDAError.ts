/** A successful Indexer DDA response contains a missing or malformed address. */
export class IndexerInvalidSubaccountDDAError extends Error {
  /** Original address field, retained without treating it as a validated wallet address. */
  readonly rawAddress: unknown;

  /** Creates a validation error for the address field of a successful DDA response. */
  constructor(rawAddress: unknown) {
    super('Indexer returned a missing or invalid direct deposit address.');
    this.name = 'IndexerInvalidSubaccountDDAError';
    this.rawAddress = rawAddress;
  }
}
