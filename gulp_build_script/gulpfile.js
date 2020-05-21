// Gulp.js configuration

//Import gulp and its plugins
const { watch, series } = require('gulp'); 
gulp          = require('gulp'); 
stripdebug    = require('gulp-strip-debug');
stripcode     = require('gulp-strip-code');
rename        = require('gulp-rename');
babel         = require('gulp-babel');
uglify        = require('gulp-uglify');
log           = require('fancy-log');
gulpif        = require('gulp-if');
using         = require('gulp-using');


const paths = {
    src   : '../src/',
    dest  : '../build/',
    js    : 'assets/js/'
};

const minifyJsSettings = {
    src             : paths.src  + paths.js + '**/!(*.min).js',
    dest            : paths.dest + paths.js,
    deniedDest      : paths.src  + paths.js,
    rename          : {
        basenameFind            : '-4debugging',      //optional
        basenameReplace         : '',                 //optional
        newExtension               : '.min.js',       //optional
        denyDirName             : 'temp',             //optional
        denyNewExtension        : '.min.temp.js'      //optional
    },
    srtipDebug      : {
        start : 'DebugOnlyCode - START',
        end   : 'DebugOnlyCode - END'
    },
    uglifyOptions   : {
        mangle: {
            properties: { regex: /^private_/ }
        }
    }
};

function minifyJs( settings ) {
  //build up the source array allowing the user to pass in a non-array
  aourceArray = Array.isArray(settings.src) ? settings.src : [settings.src];

  //do the magic
  return gulp.src( aourceArray )
    .pipe( rename( function ( path ) { renameFn( path, settings.rename ); } ) )
    //.pipe( stripdebug() )
    .pipe( stripcode( {
      start_comment: settings.srtipDebug.start,
      end_comment: settings.srtipDebug.end
    } ) )
    .on( 'end', function() { log( 'Stripped Debug, now running babel to convert to ES5' ); } )
    .pipe( babel( { presets: ['@babel/env'] } ) )
    .on( 'error', handleError )
    .on( 'end', function() { log( 'Converted to ES5, now running uglify' ); } )
    .pipe( uglify( settings.uglifyOptions ) )
    .on( 'error', handleError )
    .on( 'end', function() { log( 'Uglified' ); } )
    //send .min.temp.js files back to src and all other fiels to dest
    .pipe(gulpif(['**/*', '!**/*'+settings.rename.newExtension],
      gulp.dest(settings.deniedDest)
    ) )
    .pipe(gulpif('**/*'+settings.rename.newExtension, 
      gulp.dest(settings.dest)
    ) )
    .on( 'end', function(){ log('Finished'); } );
}


// JavaScript processing
gulp.task('minifyJs', () => {
  return minifyJs( minifyJsSettings );
});


exports.default = function() {
  // You can use a single task
  watch(minifyJsSettings.src, { ignoreInitial: false }, gulp.series('minifyJs') );
};





/* Util Functions */
function renameFn( path, settings ) {
  //do a search and replace on basename and change file extension if the file path contains a 'denied' directory like ..../temp/....
  oldFileName = path.dirname+'/'+path.basename+path.extname;
  if( settings.basenameFind && settings.basenameReplace ) {
    path.basename = path.basename.replace( settings.basenameFind, settings.basenameReplace );
  }
  if( settings.newExtension ) {
    path.extname = settings.newExtension;
  }
  if( settings.denyDirName && settings.denyNewExtension && ( '/'+path.dirname+'/' ).includes( '/'+settings.denyDirName+'/' ) )  {
    path.extname = settings.denyNewExtension;
  }
  log( 'Renaming: '+oldFileName+' --> '+path.dirname+'/'+path.basename+path.extname );
}

function handleError(error) {
    console.log(error.toString());
    this.emit('end');
}



/*
  // Gulp and plugins
  gulp          = require('gulp'),
  gutil         = require('gulp-util'),
  newer         = require('gulp-newer'),
  imagemin      = require('gulp-imagemin'),
  sass          = require('gulp-sass'),
  postcss       = require('gulp-postcss'),
  deporder      = require('gulp-deporder'),
  concat        = require('gulp-concat'),
  stripdebug    = require('gulp-strip-debug'),
  uglify        = require('gulp-uglify')
;

// Browser-sync
var browsersync = false;


// PHP settings
const php = {
  src           : dir.src + 'template/** [SLASH] *.php',
  build         : dir.build
};

// copy PHP files
gulp.task('php', () => {
  return gulp.src(php.src)
    .pipe(newer(php.build))
    .pipe(gulp.dest(php.build));
});
*/