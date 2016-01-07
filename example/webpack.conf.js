
module.exports = {
  entry: './example/index.ts',
  output: {
    filename: './example/bundle.js'
  },
  resolve: {
    extensions: ['', '.ts', '.js']
  },
  bail: true,
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  }
}
