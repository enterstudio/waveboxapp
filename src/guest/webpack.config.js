const path = require('path')
const fs = require('fs')
const ROOT_DIR = path.resolve(path.join(__dirname, '../../'))
const BIN_DIR = path.join(ROOT_DIR, 'bin')
const devRequire = (n) => require(path.join(ROOT_DIR, 'node_modules', n))

const webpack = devRequire('webpack')
const CleanWebpackPlugin = devRequire('clean-webpack-plugin')
const CopyWebpackPlugin = devRequire('copy-webpack-plugin')
const WebpackNotifierPlugin = devRequire('webpack-notifier')
const MinifyPlugin = devRequire('babel-minify-webpack-plugin')
const WebpackOnBuildPlugin = devRequire('on-build-webpack')

module.exports = function (env) {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    devtool: isProduction ? undefined : (process.env.WEBPACK_DEVTOOL || 'source-map'),
    entry: path.join(__dirname, 'src/index.js'),
    stats: process.env.VERBOSE_LOG === 'true' ? undefined : 'errors-only',
    target: 'electron-main',
    node: {
      __dirname: false,
      __filename: false
    },
    output: {
      path: BIN_DIR,
      filename: 'guest/guest.js'
    },
    externals: fs.readdirSync(path.join(__dirname, 'node_modules')).reduce((acc, m) => {
      if (!m.startsWith('.')) {
        acc[m] = 'commonjs ' + m
      }
      return acc
    }, {
      'nodehun': 'commonjs ../app/node_modules/nodehun' // special
    }),
    plugins: [
      !isProduction ? undefined : new webpack.DefinePlugin({
        __DEV__: false,
        'process.env.NODE_ENV': JSON.stringify('production')
      }),

      new CleanWebpackPlugin(['guest'], {
        root: BIN_DIR,
        verbose: process.env.VERBOSE_LOG === 'true',
        dry: false
      }),
      new CopyWebpackPlugin([
        { from: path.join(__dirname, 'node_modules'), to: 'guest/node_modules', force: true }
      ], {
        ignore: [ '.DS_Store' ]
      }),

      // Minify & optimization & devtools
      new webpack.optimize.ModuleConcatenationPlugin(),
      isProduction ? new MinifyPlugin({ simplify: false }, { sourceMap: false }) : undefined,
      isProduction ? undefined : new webpack.BannerPlugin({
        banner: 'require("source-map-support").install();',
        raw: true,
        entryOnly: false
      }),

      // Dev tools
      process.env.NOTIFICATIONS === 'true' ? new WebpackNotifierPlugin({ title: 'WB Guest', alwaysNotify: true }) : undefined,
      new WebpackOnBuildPlugin((stats) => { console.log('WB Guest') })
    ].filter((p) => !!p),
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        Adaptors: path.resolve(path.join(__dirname, 'src/Adaptors')),
        Browser: path.resolve(path.join(__dirname, 'src/Browser')),
        DispatchManager: path.resolve(path.join(__dirname, 'src/DispatchManager')),
        Extensions: path.resolve(path.join(__dirname, 'src/Extensions')),
        elconsole: path.resolve(path.join(__dirname, 'src/elconsole')),
        Runtime: path.resolve(path.join(__dirname, 'src/Runtime')),
        R: path.resolve(path.join(__dirname, 'src')),
        shared: path.resolve(path.join(__dirname, '../shared')),
        stores: path.resolve(path.join(__dirname, 'src/stores')),
        'package.json': path.resolve(path.join(__dirname, '../../package.json'))
      },
      modules: [
        'node_modules',
        path.join(__dirname, 'node_modules'),
        __dirname,
        path.resolve(path.join(__dirname, 'src'))
      ]
    },
    module: {
      rules: [
        {
          test: /(\.jsx|\.js)$/,
          loader: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                presets: [
                  [
                    'env', {
                      targets: { node: process.env.NODE_TARGET },
                      modules: false,
                      loose: true
                    }
                  ],
                  'stage-0'
                ],
                plugins: ['transform-class-properties']
              }
            }
          ],
          include: [
            __dirname,
            path.resolve(path.join(__dirname, '../shared'))
          ]
        }
      ]
    }
  }
}
