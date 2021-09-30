const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const paths = require('./paths')

module.exports = {
  entry: {
    main: path.resolve(__dirname, '../index.mjs')
  },
  output: {
    path: paths.build,
    filename: '[name].bundle.js',
    publicPath: '/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'IF | Web',
      template: path.resolve(__dirname, '../test/index.html'), // template file
      filename: 'index.html', // output file,
      chunks: ['main']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'test/**/*', to: path.resolve(paths.build, '')
        }
      ]
    }),
    new CleanWebpackPlugin()
  ],
  module: {
    rules: [
      // JavaScript
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      // Images
      {
        test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
        type: 'asset/resource'
      },
      // Fonts and SVGs
      {
        test: /\.(ttf|otf|svg|)$/,
        type: 'asset/inline'
      },
      {
        test: /\.(scss|css)$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  },
  resolve: {
    modules: [paths.src, 'node_modules'],
    extensions: ['.mjs', '.js', '.jsx', '.json'],
    alias: {
      '@': paths.src
    },
    fallback: {
      path: require.resolve("path-browserify"),
      fs: false
    },
  }

}
