import nodeResolve  from 'rollup-plugin-node-resolve'
import cleanup from 'rollup-plugin-cleanup';
// import buble from 'rollup-plugin-buble'

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
          })
        // babel() // ES5に変換
  ]
}