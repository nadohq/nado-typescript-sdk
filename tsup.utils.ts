import { createRequire } from 'node:module';
import { defineConfig, type Options } from 'tsup';

/** Config shape accepted from base config (options object or array, not function). */
type ResolvableConfig = Options | Options[];

/**
 * Merges the base tsup config with `external` set from the package's
 * peerDependencies so they are never bundled (consumers use their own versions).
 *
 * Pass `import.meta.url` from the calling tsup.config so package.json is
 * resolved relative to that package.
 *
 * @param configModuleUrl - `import.meta.url` from the calling tsup.config
 * @param baseOptions - Result of importing the base config (options or array)
 */
export function withPeerDepsExternal(
  configModuleUrl: string,
  baseOptions: ResolvableConfig | ReturnType<typeof defineConfig>,
): ReturnType<typeof defineConfig> {
  if (typeof baseOptions === 'function') {
    throw new Error('withPeerDepsExternal does not support function config');
  }

  const require = createRequire(configModuleUrl);
  const pkg = require('./package.json') as {
    peerDependencies?: Record<string, string>;
  };
  const peerDeps = Object.keys(pkg.peerDependencies ?? {});

  const configs = (
    Array.isArray(baseOptions) ? baseOptions : [baseOptions]
  ) as Options[];

  return defineConfig(
    configs.map((c) => {
      const existing = Array.isArray(c.external)
        ? (c.external as string[])
        : [];
      return { ...c, external: [...existing, ...peerDeps] };
    }),
  );
}
