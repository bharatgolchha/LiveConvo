const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config().parsed || {};

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      'background/service-worker': './src/background/service-worker.ts',
      'popup/popup': './src/popup/popup.tsx',
      'sidebar/sidebar': './src/sidebar/sidebar.tsx',
      'content/inject': './src/content/inject.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '../dist/manifest.json' },
          { from: 'public', to: '../dist/public' },
          { from: 'src/welcome.html', to: '../dist/welcome.html' },
        ],
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup/popup'],
      }),
      new HtmlWebpackPlugin({
        template: './src/sidebar/index.html',
        filename: 'sidebar/index.html',
        chunks: ['sidebar/sidebar'],
      }),
      ...(isProduction ? [new MiniCssExtractPlugin()] : []),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(env)
      }),
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      splitChunks: {
        chunks(chunk) {
          return chunk.name !== 'background/service-worker';
        },
      },
    },
  };
};