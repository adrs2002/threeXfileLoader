module.exports = {
    entry: [
        'babel-polyfill', './src/threeXfileLoader.js'
    ],  
    output: {
        path: __dirname + '/build',
        filename: '[name].js',
        publicPath: '.' 
    },
    /* ソースマップを出力させる場合は以下を追加 */
    devtool: "source-map",
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader" /*,
                query: {
                    presets: ['react', 'es2015']
                }*/
            }
        ]
    }

};