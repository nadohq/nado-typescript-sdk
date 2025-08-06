// this js file is treated as ESM since the package.json has "type": "module"
import { createClientContext } from '@nadohq/client';

if (typeof createClientContext !== 'function') {
  throw new Error('unexpected import');
}

console.log('Successfully loaded @nadohq/client in ESM');
