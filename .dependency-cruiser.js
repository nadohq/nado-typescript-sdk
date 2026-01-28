// generated: dependency-cruiser@16.10.1 on 2025-05-02T06:23:02.166Z
/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. To fix this: (1) Extract shared code into a separate module ' +
        'that both modules can import, (2) Use dependency inversion by creating interfaces/abstractions, ' +
        '(3) Consider using events/callbacks instead of direct imports, or (4) Use lazy loading with dynamic imports. ' +
        'Fixing circular dependencies improves maintainability and prevents unexpected behaviors.',
      from: {},
      to: {
        circular: true
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "This creates 'phantom dependencies' - packages that your code relies on but aren't explicitly declared. " +
        "This is problematic because: (1) the package won't be available at run-time if installed directly, " +
        "(2) you might unknowingly use different versions across environments, or (3) the dependency " +
        "could disappear if another package that happens to include it changes. Fix by adding the package " +
        "to the dependencies in your package.json.",
      from: {},
      to: {
        dependencyTypes: [
          'npm-no-pkg',
          'npm-unknown',
        ],
      }
    },
    {
      name: 'no-duplicate-dep-types',
      comment:
        "This module depends on an npm package that appears in multiple sections of your package.json " +
        "(such as both in 'dependencies' and 'devDependencies'). This causes potential issues: " +
        "(1) version conflicts during installation, (2) bloated production builds if dev dependencies " +
        "are included, and (3) confusion about the package's intended use. " +
        "To fix: decide whether the package should be a regular or dev dependency and remove it from the other section.",
      severity: 'warn',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        // as it's pretty common to have a type import be a type only import 
        // _and_ (e.g.) a devDependency - don't consider type-only dependency
        // types for this rule
        // additionally: in a library, it is fine to have a dependency set as
        // both a devDependency (for build/test) and a peerDependency (for consumers)
        dependencyTypesNot: ["type-only", "npm-peer"]
      }
    },
  ],
  options: {

    /* Which modules not to follow further when encountered */
    doNotFollow: {
      /* path: an array of regular expressions in strings to match against */
      path: ['node_modules', 'dist', '.test.ts']
    },

    /* options to pass on to enhanced-resolve, the package dependency-cruiser
       uses to resolve module references to disk. The values below should be
       suitable for most situations

       If you use webpack: you can also set these in webpack.conf.js. The set
       there will override the ones specified here.
     */
    enhancedResolveOptions: {
      /* What to consider as an 'exports' field in package.jsons */
      exportsFields: ["exports"],
      /* List of conditions to check for in the exports field.
         Only works when the 'exportsFields' array is non-empty.
      */
      conditionNames: ["import", "require", "node", "default", "types"],
      /* The extensions, by default are the same as the ones dependency-cruiser
         can access (run `npx depcruise --info` to see which ones that are in
         _your_ environment). If that list is larger than you need you can pass
         the extensions you actually use (e.g. [".js", ".jsx"]). This can speed
         up module resolution, which is the most expensive step.
       */
      // extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
      /* What to consider a 'main' field in package.json */

      // if you migrate to ESM (or are in an ESM environment already) you will want to
      // have "module" in the list of mainFields, like so:
      // mainFields: ["module", "main", "types", "typings"],
      mainFields: ["main", "types", "typings"],
      /* A list of alias fields in package.jsons
        
         See [this specification](https://github.com/defunctzombie/package-browser-field-spec) and
         the webpack [resolve.alias](https://webpack.js.org/configuration/resolve/#resolvealiasfields)
         documentation.
         
         Defaults to an empty array (= don't use alias fields).
       */
      // aliasFields: ["browser"],
    },

    /* skipAnalysisNotInRules will make dependency-cruiser execute 
       analysis strictly necessary for checking the rule set only. 

       See https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md#skipanalysisnotinrules
       for details
     */
    skipAnalysisNotInRules: true,

    reporterOptions: {
      dot: {
        /* pattern of modules that can be consolidated in the detailed
           graphical dependency graph. The default pattern in this configuration
           collapses everything in node_modules to one folder deep so you see
           the external modules, but their innards.
         */
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',

        /* Options to tweak the appearance of your graph.See
           https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md#reporteroptions
           for details and some examples. If you don't specify a theme
           dependency-cruiser falls back to a built-in one.
        */
        // theme: {
        //   graph: {
        //     /* splines: "ortho" gives straight lines, but is slow on big graphs
        //        splines: "true" gives bezier curves (fast, not as nice as ortho)
        //    */
        //     splines: "true"
        //   },
        // }
      },
      archi: {
        /* pattern of modules that can be consolidated in the high level
           graphical dependency graph. If you use the high level graphical
           dependency graph reporter (`archi`) you probably want to tweak
           this collapsePattern to your situation.
        */
        collapsePattern: '^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)',

        /* Options to tweak the appearance of your graph. If you don't specify a
           theme for 'archi' dependency-cruiser will use the one specified in the
           dot section above and otherwise use the default one.
         */
        // theme: { },
      },
      "text": {
        "highlightFocused": true
      },
    }
  }
};
// generated: dependency-cruiser@16.10.1 on 2025-05-02T06:23:02.166Z

export default config;