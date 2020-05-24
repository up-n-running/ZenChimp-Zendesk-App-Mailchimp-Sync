//Import gulp and its plugins
const gulp          = require('gulp'); 
const filter        = require('gulp-filter');
const stripcode     = require('gulp-strip-code');
const rename        = require('gulp-rename');
const babel         = require('gulp-babel');
const uglify        = require('gulp-uglify');
const gulpif        = require('gulp-if');

//node.js modules not specifically gulp
const log           = require('fancy-log');

//local includes
const commonUtils   = require('./commonutils');
const fsUtils   = require('./fsutils');

function getDefaultJsSettings( pathsSettings ) {
    return {
        src             : pathsSettings.src  + pathsSettings.js.subPath + pathsSettings.js.glob_js_only,
        dest            : pathsSettings.tmp  + pathsSettings.js.subPath,
        deniedDest      : pathsSettings.src  + pathsSettings.js.subPath,
        glob_not_denied : pathsSettings.js.glob_both,
        filterFunction  : null,                                 //optional
        rename          : {
            basenameFind            : '-4debugging',            //optional
            basenameReplace         : '',                       //optional
            newExtension            : '.min.js',                //optional
            denyDirName             : pathsSettings.denyDirName, //files in these dirs get minified then spat out back into srs as a .temp.min.js file
            denyNewExtension        : '.temp.min.js'            //optional
        },
        stripDebug      : {
            start : 'DebugOnlyCode - START',
            end   : 'DebugOnlyCode - END'
        },
        uglifyOptions   : {
            mangle: {
                properties: { regex: /^__/ }
            }
        }
    };
}

function minifyJs_FromSettings( settings ) {
    
    //sanity check arguments before begin
    sourceArray = Array.isArray(settings.src) ? settings.src : [settings.src];
    filterFunction = ( settings.filterFunction ) ? settings.filterFunction : function(vf) { return true; };

    //do the magic
    return gulp.src( sourceArray )
        .pipe( filter( filterFunction, {restore: false, passthrough: false} ) )
        .pipe( rename( function ( path ) {
            commonUtils.renameFunction_FromSettings( path, settings.rename ); 
        } ) )
        //.pipe( stripdebug() )
        .pipe( stripcode( {
          start_comment: settings.stripDebug.start,
          end_comment: settings.stripDebug.end
        } ) )
        .on( 'end', function() { log( 'Stripped Debug, now running babel to convert to ES5' ); } )
        .pipe( babel( { presets: ['@babel/env'] } ) )
        .on( 'error', commonUtils.handleError )
        .on( 'end', function() { log( 'Converted to ES5, now running uglify' ); } )
        .pipe( uglify( settings.uglifyOptions ) )
        .on( 'error', commonUtils.handleError )
        .on( 'end', function() { log( 'Uglified' ); } )
        //send .min.temp.js files back to src and all other files to dest!
        .pipe(gulpif(['**/*'+settings.rename.denyNewExtension],
          gulp.dest(settings.deniedDest)
        ) )
        .pipe(gulpif([settings.glob_not_denied], 
          gulp.dest(settings.dest)
        ) )
        .on( 'end', function(){ 
            log('Finished'); 
        } );
}

exports.getDefaultJsSettings = getDefaultJsSettings;
exports.minifyJs_FromSettings = minifyJs_FromSettings;
