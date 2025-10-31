/**
 * React Native-style entry point for Metro bundler test
 * This simulates how our SDK would be used in a React Native app
 */

const { createClientContext } = require('@nadohq/client');

// Test various SDK imports that Metro bundler needs to handle
const testSDKImports = () => {
  console.log('Testing @nadohq/client import with Metro bundler...');

  try {
    // Test basic import
    if (typeof createClientContext !== 'function') {
      throw new Error('createClientContext is not a function');
    }
    console.log('Successfully loaded @nadohq/client in Metro+CJS');
  } catch (error) {
    console.error('Metro bundler test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testSDKImports();
