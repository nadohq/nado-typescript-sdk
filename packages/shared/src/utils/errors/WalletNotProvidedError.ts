export class WalletNotProvidedError extends Error {
  constructor() {
    super('Wallet client not provided');
    this.name = 'WalletNotProvidedError';
  }
}
