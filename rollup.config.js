import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    // Modern ES Module (Bundlers, <script type="module">)
    {
      file: 'dist/abind.js',
      format: 'es',
      sourcemap: true
    },
    // Minified Browser Bundle (CDN, Old school <script>)
    {
      file: 'dist/abind.min.js',
      format: 'iife',
      name: 'abind',   // Global variable name (window.abind)
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    terser({
      output: {
        comments: false
      },
      compress: {
        keep_infinity: true,
        reduce_funcs: true,
        join_vars: true,
        keep_fnames: false
      },
        mangle: {
          keep_classnames: true
        }
    }),
  ]
};
