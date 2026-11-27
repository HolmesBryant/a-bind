/* @version 2.0 */

import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * Rollup plugin to intercept .css imports
 * and inline them as Constructable Stylesheets.
 */
function importableStylesheet() {
  return {
    name: 'importable-stylesheet',
    transform(code, id) {
      if (id.endsWith('.css')) {
        const minifiedCss = code.replace(/\r?\n|\r/g, '').replace(/\s{2,}/g, ' ');
        const jsCode = `
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(${JSON.stringify(minifiedCss)});
          export default sheet;
        `;

        return {
          code: jsCode,
          map: null
        };
      }
    }
  };
}

/**
 * Rollup plugin to intercept .html imports
 * and inline them as HTMLTemplateElement instances.
 */
function importableTemplate() {
  return {
    name: 'importable-template',
    transform(code, id) {
      if (id.endsWith('.html')) {
        // Strip unnecessary whitespaces and line breaks
        const minifiedHtml = code.replace(/\r?\n|\r/g, '').replace(/\s{2,}/g, ' ');

        const jsCode = `
          const template = document.createElement('template');
          template.innerHTML = ${JSON.stringify(minifiedHtml)};
          export default template;
        `;

        return {
          code: jsCode,
          map: null
        };
      }
    }
  };
}

export default {
  input: 'src/index.js',
  output: [
    // Standard ES Module (unminified)
    {
      file: 'dist/a-bind.js',
      format: 'es',
      sourcemap: false,
      inlineDynamicImports: true
    },
    // Minified ES Module
    {
      file: 'dist/a-bind.min.js',
      format: 'es',
      plugins: [terser({
        output: { comments: false },
        compress: {
          keep_infinity: true,
          reduce_funcs: true,
          join_vars: true
        },
        mangle: { keep_classnames: true }
      })],
      sourcemap: true,
      inlineDynamicImports: true
    }
  ],
  plugins: [
    importableStylesheet(),
    importableTemplate(),
    resolve(),
  ]
};
