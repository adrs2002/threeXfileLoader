import nodeResolve from 'rollup-plugin-node-resolve';
import cleanup from 'rollup-plugin-cleanup';
import babel from 'rollup-plugin-babel';

export default {
  input: './src/XLoader.js',
  output: {
    file: './XLoader.js',
    format: 'umd',
    name: 'THREE.XLoader'
  },
  // sourceMap: true,
  
  plugins: [
        nodeResolve({ jsnext: true }), // npmモジュールを`node_modules`から読み込む
          cleanup({
          comments: ['none']
          }),
          babel()
  ]
}