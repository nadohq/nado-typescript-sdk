import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

/**
 * Runs a snippet in a fresh Node process, resolving bare specifiers from this
 * app's `node_modules`.
 *
 * The point is to leave the test runner's loader behind: these assertions must
 * pass in plain Node against the published `dist` output, the way a consumer
 * without a bundler would load the package.
 *
 * @param source - Snippet to evaluate.
 * @param moduleSystem - Whether to evaluate it as ESM or CommonJS.
 * @returns Everything the process wrote to stdout.
 */
function runInNode(source: string, moduleSystem: 'esm' | 'cjs'): string {
  const args =
    moduleSystem === 'esm'
      ? ['--input-type=module', '-e', source]
      : ['--input-type=commonjs', '-e', source];

  return execFileSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const packageJson = JSON.parse(
  readFileSync(
    new URL('../../../../packages/nuanze-client/package.json', import.meta.url),
    'utf8',
  ),
) as Record<string, unknown>;

void describe(
  '[nuanze-client]: bundler-less Node loading',
  { timeout: 60_000 },
  () => {
    void test('loads and runs through the ESM entrypoint', () => {
      const stdout = runInNode(
        `
      const nuanze = await import('@nadohq/nuanze-client');
      const barrel = await import('@nadohq/client');

      const client = new nuanze.NuanzeClient();
      if (client.baseUrl !== nuanze.NUANZE_API_BASE_URL) {
        throw new Error('unexpected base URL: ' + client.baseUrl);
      }
      if (barrel.NuanzeClient !== nuanze.NuanzeClient) {
        throw new Error('@nadohq/client re-exported a duplicate NuanzeClient');
      }
      if (typeof client.listMarkets !== 'function') {
        throw new Error('listMarkets is missing');
      }
      console.log('esm ok');
      `,
        'esm',
      );

      assert.match(stdout, /esm ok/);
    });

    void test('loads and runs through the CommonJS entrypoint', () => {
      const stdout = runInNode(
        `
      const nuanze = require('@nadohq/nuanze-client');
      const barrel = require('@nadohq/client');

      const client = new nuanze.NuanzeClient();
      if (client.baseUrl !== nuanze.NUANZE_API_BASE_URL) {
        throw new Error('unexpected base URL: ' + client.baseUrl);
      }
      if (barrel.NuanzeClient !== nuanze.NuanzeClient) {
        throw new Error('@nadohq/client re-exported a duplicate NuanzeClient');
      }
      if (typeof client.listMarkets !== 'function') {
        throw new Error('listMarkets is missing');
      }
      console.log('cjs ok');
      `,
        'cjs',
      );

      assert.match(stdout, /cjs ok/);
    });

    void test('constructing a client performs no network call', () => {
      const stdout = runInNode(
        `
      const nuanze = require('@nadohq/nuanze-client');
      const http = require('node:http');
      const https = require('node:https');

      for (const module of [http, https]) {
        module.request = () => {
          throw new Error('the constructor must not open a connection');
        };
      }

      new nuanze.NuanzeClient();
      console.log('no request ok');
      `,
        'cjs',
      );

      assert.match(stdout, /no request ok/);
    });

    void test('declares the metadata bundlers need to tree-shake it', () => {
      assert.equal(packageJson.sideEffects, false);
      assert.equal(packageJson.type, 'module');
      assert.equal(packageJson.main, './dist/index.cjs');
      assert.equal(packageJson.module, './dist/index.js');
      assert.equal(packageJson.types, './dist/index.d.ts');

      const exported = packageJson.exports as Record<
        string,
        Record<string, unknown>
      >;
      assert.deepEqual(exported['.'].import, {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      });
      assert.deepEqual(exported['.'].require, {
        types: './dist/index.d.cts',
        default: './dist/index.cjs',
      });
    });

    void test('publishes type declarations for both module systems', () => {
      const stdout = runInNode(
        `
      const { existsSync } = require('node:fs');
      const { dirname, join } = require('node:path');

      const entry = require.resolve('@nadohq/nuanze-client');
      const dist = dirname(entry);
      for (const file of ['index.d.ts', 'index.d.cts', 'index.js', 'index.cjs']) {
        if (!existsSync(join(dist, file))) throw new Error('missing dist/' + file);
      }
      console.log('declarations ok');
      `,
        'cjs',
      );

      assert.match(stdout, /declarations ok/);
    });
  },
);
