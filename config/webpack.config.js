const path = require('path')
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
  plugins: [],
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
    }
  }
}
