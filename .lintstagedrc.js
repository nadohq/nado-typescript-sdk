import path from 'path';

/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  // Type check, Lint check and prettify
  '!(dist/**/*)**/*.(ts|tsx|js)': (filenames) => {
    const relativeFiles = filenames.map((f) =>
      path.relative(path.resolve('.'), f),
    );
    return [
      `bun typecheck`,
      `bun eslint --cache --fix ${relativeFiles.join(' ')}`,
      `bun depcruise ${relativeFiles.join(' ')}`,
      `bun prettier --write ${relativeFiles.join(' ')}`,
    ];
  },

  // Prettify
  '**/*.(json)': (filenames) => {
    const relativeFiles = filenames.map((f) =>
      path.relative(path.resolve('.'), f),
    );
    return [`bun prettier --write ${relativeFiles.join(' ')}`];
  },
};

export default config;
