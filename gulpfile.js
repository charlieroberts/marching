var gulp = require('gulp')
var browserify = require('browserify')
var transform = require('vinyl-transform')
var source = require('vinyl-source-stream')
var watchify = require( 'watchify' )
var gutil = require( 'gulp-util' )

gulp.task('build', function () {
  
  var b = browserify({
    entries: './js/index.js',
    transform: ['glslify']
  }).bundle()

  b.pipe( source('index.js') ).pipe( gulp.dest( './dist/' ) )

})

watchify.args.entries = './js/index.js'
watchify.args.debug = true

var b = watchify( browserify( watchify.args ) )
b.on( 'update', bundle )
b.on( 'log', gutil.log )

gulp.task('default', bundle)

function bundle() {
  return b.bundle().pipe( source('index.js') ).pipe( gulp.dest( './dist/' ) )
}
