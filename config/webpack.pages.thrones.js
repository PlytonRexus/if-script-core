const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const outputPath = path.resolve(__dirname, '../dist')

module.exports = {
  mode: 'production',
  entry: {
    main: path.resolve(__dirname, '../test/harness/web/thrones-pages.mjs')
  },
  output: {
    path: outputPath,
    filename: '[name].bundle.js',
    publicPath: './'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'Thrones | IF-Script',
      template: path.resolve(__dirname, '../test/harness/web/thrones-pages.html'),
      filename: 'index.html',
      chunks: ['main']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../src/runtime/themes/literary-default.css'),
          to: path.resolve(outputPath, 'src/runtime/themes/literary-default.css')
        },
        {
          from: path.resolve(__dirname, '../src/runtime/themes/cinematic.css'),
          to: path.resolve(outputPath, 'src/runtime/themes/cinematic.css')
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.json'],
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false
    }
  }
}
