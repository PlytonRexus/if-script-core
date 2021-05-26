const path = require('path')
const paths = require('./paths')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  entry: {
    ifscript: path.resolve(__dirname, '../index.js')
  },
  output: {
    path: paths.build,
    filename: '[name].bundle.js',
    publicPath: '/'
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `
  IF-Script  v0.2.4
  ==============

  Built: ${new Date().toDateString()}

  Copyright (c) ${new Date().getUTCFullYear()} The IF-Script Contributors
  Author(s): Mihir Jichkar

  MIT Licensed
  https://github.com/PlytonRexus/if-script-core.git\n
     `
    }),
    new CleanWebpackPlugin()
  ],
  module: {
    rules: [
      // JavaScript
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      // CSS
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      // Images
      {
        test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
        type: 'asset/resource',
      },
      // Fonts and SVGs
      {
        test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
        type: 'asset/inline',
      }
    ],
  },
  resolve: {
    modules: [paths.src, 'node_modules'],
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': paths.src,
    },
  }
}
