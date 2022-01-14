import webpack from 'webpack';
import path from 'path';
import glob from 'glob';
import fs from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import { ESBuildMinifyPlugin } from 'esbuild-loader';

import { getAlias, getJsLoader, getStyleLoaders } from './shared';

// use a fake hash when running locally
const LOCAL_HASH = 'local';

const pages = glob
  .sync('./webapp/templates/!(standalone).html')
  .map((x) => path.basename(x));

const pagePlugins = pages.map(
  (name) =>
    new HtmlWebpackPlugin({
      filename: path.resolve(__dirname, `../../webapp/public/${name}`),
      template: path.resolve(__dirname, `../../webapp/templates/${name}`),
      inject: false,
      templateParameters: (compilation) => {
        // TODO:
        // ideally we should access via argv
        // https://webpack.js.org/configuration/mode/
        const hash =
          process.env.NODE_ENV === 'production'
            ? compilation.getStats().toJson().hash
            : LOCAL_HASH;

        return {
          extra_metadata: process.env.EXTRA_METADATA
            ? fs.readFileSync(process.env.EXTRA_METADATA)
            : '',
          mode: process.env.NODE_ENV,
          webpack: {
            hash,
          },
        };
      },
    })
);

export default {
  target: 'web',

  entry: {
    app: './webapp/javascript/index.jsx',
    styles: './webapp/sass/profile.scss',
  },

  output: {
    publicPath: '',
    path: path.resolve(__dirname, '../../webapp/public/assets'),

    // https://webpack.js.org/guides/build-performance/#avoid-production-specific-tooling
    filename:
      process.env.NODE_ENV === 'production'
        ? '[name].[hash].js'
        : `[name].${LOCAL_HASH}.js`,
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.es6', '.js', '.jsx', '.json', '.svg'],
    alias: getAlias(),
    modules: [
      'node_modules',
      path.resolve('webapp'),
      path.resolve('node_modules'),
    ],
  },

  stats: {
    children: false,
    warningsFilter: /export .* was not found in/,
    source: false,
  },

  watchOptions: {
    ignored: /node_modules/,
  },

  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2015',
        css: true,
      }),
    ],
  },

  module: {
    // Note: order is bottom-to-top and/or right-to-left
    rules: [
      ...getJsLoader(),
      ...getStyleLoaders(),
      {
        test: /\.(svg|ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/,
        loader: 'file-loader',

        // We output files to assets/static/img, where /assets comes from webpack's output dir
        // However, we still need to prefix the public URL with /assets/static/img
        options: {
          outputPath: 'static/img',
          // using relative path to make this work when pyroscope is deployed to a subpath (with BaseURL config option)
          publicPath: '../assets/static/img',
          name: '[name].[hash:8].[ext]',
        },
      },
    ],
  },

  plugins: [
    // uncomment if you want to see the webpack bundle analysis
    // new BundleAnalyzerPlugin(),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
    ...pagePlugins,
    new MiniCssExtractPlugin({
      filename:
        process.env.NODE_ENV === 'production'
          ? '[name].[hash].css'
          : `[name].${LOCAL_HASH}.css`,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'webapp/images',
          to: 'images',
        },
      ],
    }),
  ],
};