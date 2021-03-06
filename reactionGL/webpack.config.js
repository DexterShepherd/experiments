module.exports = {
  entry: './sketch.js',
  output: {
    filename: 'bundle.js'
  },

  devServer: {
    inline: true,
    port: 3333
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',

        query: {
          presets: ['es2015'],
          plugins: ['glslify']
        }
      },
      { test: /\.(glsl|frag|vert)$/, loader: 'raw' },
      { test: /\.(glsl|frag|vert)$/, loader: 'glslify'}
    ] 
  }
}
