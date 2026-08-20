const path = require('path');
const ShebangPlugin = require('webpack-shebang-plugin');

module.exports = (env) => [
  {
    target: 'node0.10',
    mode: env.production ? 'production' : 'development',
    devtool: false,

    entry: {
      'service.js': './services/service.ts',
    },
    output: {
      path: path.resolve(__dirname, './dist/services/'),
      filename: '[name]',
    },
    externals: {
      'webos-service': 'commonjs2 webos-service',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /core-js/,
          use: 'babel-loader',
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
      ],
    },
    plugins: [
      new ShebangPlugin({
        chmod: 0o755,
      }),
    ],
  },
];
