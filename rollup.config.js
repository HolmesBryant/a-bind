import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

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
    resolve(),
  ]
};
