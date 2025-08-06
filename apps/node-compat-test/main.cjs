const { createClientContext } = require('@nadohq/client');

if (typeof createClientContext !== 'function') {
  throw new Error('unexpected import');
}

console.log('Successfully loaded @nadohq/client in CJS');
