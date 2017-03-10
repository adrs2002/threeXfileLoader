import nodeResolve  from 'rollup-plugin-node-resolve'
import cleanup from 'rollup-plugin-cleanup';
import babel from 'rollup-plugin-babel'
// import buble from 'rollup-plugin-buble'

export default {
  entry: 'src/threeXfileLoader.js',
  dest: 'XLoader.js',
  plugins: [
        nodeResolve({ jsnext: true }), // npmモジュールを`node_modules`から読み込む
          cleanup({
          comments: ['none']
          }),
        babel() // ES5に変換
  ]
}