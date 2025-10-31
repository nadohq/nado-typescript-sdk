const path = require('path');

/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').ConfigT}
 */
const config = {
  projectRoot: path.resolve(__dirname, '../../'),
  resetCache: true,
  transformer: {
    // need to disable minification so Babel doesn't break with ESM ts-mixer
    minifierConfig: {
      compress: false,
      mangle: false,
    },
  },
  resolver: {
    unstable_enablePackageExports: false,
    extraNodeModules: {
      'metro-runtime': path.resolve(__dirname, 'node_modules/metro-runtime'),
      '@nadohq/client': '../../packages/client',
      '@nadohq/engine-client': '../../packages/engine-client',
      '@nadohq/indexer-client': '../../packages/indexer-client',
      '@nadohq/trigger-client': '../../packages/trigger-client',
      '@nadohq/shared': '../../packages/shared'
    }
  },
};

module.exports = config;