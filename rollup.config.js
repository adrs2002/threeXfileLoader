import nodeResolve  from 'rollup-plugin-node-resolve'

import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/threeXfileLoader.js',
  dest: 'XfileLoader.js',
  plugins: [
        nodeResolve({ jsnext: true }), // npmモジュールを`node_modules`から読み込む
        babel() // ES5に変換
  ]
}