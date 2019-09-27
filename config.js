const liveServer = require('rollup-plugin-live-server')
const { terser } = require('rollup-plugin-terser')
const alias = require('rollup-plugin-alias')
import babel from 'rollup-plugin-babel'
let builds = {
  // Runtime+compiler ES modules build (for bundlers)
  'max': {
    // alias: { he: './entity-decoder.js' },
    entry: 'src/platforms/gxml/entry-runtime-with-compiler.js',
    dest: 'dist/geg.js',
    format: 'es'
  },
  'min': {
    // alias: { he: './entity-decoder.js' },
    entry: 'src/platforms/gxml/entry-runtime-with-compiler.js',
    dest: 'dist/geg.min.js',
    format: 'umd'
  }
}
function genConfig (name) {
  const opts = builds[name]
  const config = {
    input: opts.entry,
    external: opts.external,
    plugins: [
      // flow(),
      liveServer({
        port: 8101,
        host: "0.0.0.0",
        root: "./",
        file: "index.html",
        mount: [['/dist', './dist'], ['/src', './src'], ['/node_modules', './node_modules']],
        open: false,
        wait: 500
      }),
      babel({
        include: 'src/**',
        exclude: 'node_modules/**',
      }),
      alias({
        resolve: ['.js'],
        entries:[
          {find:'he', replacement: './entity-decoder'}
        ]
      })
    ],
    output: {
      file: opts.dest,
      format: opts.format,
      name: opts.moduleName || 'Geg'
    },
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg)
      }
    }
  }
  if (name === 'min') {
    config.plugins.push(
      terser({
        toplevel: true,
        output: {
          ascii_only: true
        },
        compress: {
          pure_funcs: ['makeMap']
        }
      })
    )
  }
  return config
}
module.exports = genConfig(process.env.TARGET)