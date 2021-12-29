const path = require('path')
const oryx = require('@spryker/oryx')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

async function getConfiguration(settings) {
  let mode = 'development'
  let devtool = 'inline-source-map'
  let postCssPlugins = []

  if (settings.options.isProduction) {
    mode = 'production'
    devtool = false

    postCssPlugins = [
      autoprefixer({
        browsers: ['last 4 versions'],
      }),
    ]
  }

  const entryPromise = oryx.find(settings.entry)
  const modulesPromise = oryx.find(settings.resolveModules, [])
  const [entryPaths, modulesPaths] = await Promise.all([
    entryPromise,
    modulesPromise,
  ])

  let config = {
    context: settings.paths.rootDir,
    mode,
    devtool,
    stats: settings.options.isVerbose ? 'verbose' : 'errors-only',
    watch: settings.options.isWatching,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 500,
      ignored: /(node_modules)/,
    },

    entry: entryPaths,

    output: {
      path: settings.paths.publicDir,
      filename: './js/[name].js',
    },

    resolve: {
      modules: [
        ...modulesPaths,
        'node_modules/@spryker/oryx-for-zed/node_modules',
        'node_modules',
        settings.paths.sourcePath,
        settings.paths.bundlesPath,
      ],
      extensions: ['.js', '.css', '.scss'],
      alias: {
        ZedGui: `${settings.paths.guiFolder}/assets/Zed/js/modules/commons`,
        ZedGuiEditorConfiguration: `${settings.paths.guiFolder}/assets/Zed/js/modules/editor`,
        ZedGuiModules: `${settings.paths.guiFolder}/assets/Zed/js/modules`,
      },
    },

    resolveLoader: {
      modules: [
        'node_modules/@spryker/oryx-for-zed/node_modules',
        'node_modules',
      ],
    },

    module: {
      rules: [
        {
          test: /datatables\.net.*/,
          use: 'imports-loader?define=>false',
        },
        {
          test: /(jquery-migrate)/,
          use: 'imports-loader?define=>false',
        },
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              presets: ['@babel/env'],
            },
          },
        },
        {
          test: /\.s?css/i,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: postCssPlugins,
              },
            },
            {
              loader: 'resolve-url-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.(ttf|woff2?|eot|svg|otf)\??(\d*\w*=?\.?)+$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'fonts/[name].[ext]',
                publicPath: settings.paths.publicPath,
              },
            },
          ],
        },
        {
          test: /\.(jpe?g|png|gif|svg)\??(\d*\w*=?\.?)+$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'img/[name].[ext]',
                publicPath: settings.paths.publicPath,
              },
            },
          ],
        },
      ],
    },

    optimization: {
      runtimeChunk: {
        name: 'spryker-zed-gui-commons',
      },
      concatenateModules: false,
      splitChunks: {
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'spryker-zed-gui-commons',
          },
        },
      },
    },

    plugins: [
      new webpack.DefinePlugin({
        DEV: !settings.options.isProduction,
        WATCH: settings.options.isWatching,
        'require.specified': 'require.resolve',
      }),

      new webpack.ProvidePlugin({
        // jquery global
        $: 'jquery',
        jQuery: 'jquery',

        // legacy provider
        SprykerAjax: `${settings.paths.guiFolder}/assets/Zed/js/modules/legacy/SprykerAjax`,
        SprykerAjaxCallbacks: `${settings.paths.guiFolder}/assets/Zed/js/modules/legacy/SprykerAjaxCallbacks`,
        SprykerAlert: `${settings.paths.guiFolder}/assets/Zed/js/modules/legacy/SprykerAlert`,
      }),

      new MiniCssExtractPlugin({
        filename: `./css/[name].css`,
      }),
    ],
  }

  if (settings.options.isProduction) {
    config.optimization = {
      ...config.optimization,

      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: false,
          extractComments: false,
          terserOptions: {
            ecma: 5,
            output: {
              comments: false,
              beautify: false,
            },
          },
        }),

        new CssMinimizerPlugin(),
      ],
    }
  }

  return config
}

module.exports = getConfiguration
