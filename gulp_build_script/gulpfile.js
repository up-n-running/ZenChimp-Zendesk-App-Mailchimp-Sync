// Gulp.js configuration

//Import gulp and its plugins
const { watch, series, parallel } = require('gulp'); 
const gulp          = require('gulp'); 
const filter        = require('gulp-filter');
const stripcode     = require('gulp-strip-code');
const rename        = require('gulp-rename');
const babel         = require('gulp-babel');
const uglify        = require('gulp-uglify');
const gulpif        = require('gulp-if');
const inject        = require('gulp-inject');
const debug         = require('gulp-debug');
const naturalSort   = require('gulp-natural-sort');
//const using         = require('gulp-using');
//const stripdebug    = require('gulp-strip-debug');
//const merge         = require('merge-stream');

//node.js modules not specifically gulp
const log           = require('fancy-log');

//local includes
const jsUtils       = require('./inc/jsutils');
const prefixUtils   = require('./inc/prefixutils');
const fsUtils       = require('./inc/fsutils');
const commonUtils   = require('./inc/commonutils');
const concatUtils   = require('./inc/concatutils');


const paths = {
    src   : '../src/assets/',
    tmp   : '../tmp/assets/',
    dest  : '../build/assets/',
    denyDirName : 'temp',
    js    : {
        subPath        : 'js/',
        glob_js_only   : '**/!(*.min).js',
        glob_min_js    : '**/!(*.temp).min.js',
        glob_both      : '**/!(*.temp.min).js'
    },
    html  : { 
        subPath    : '',
        glob       : '**/*.html',
        glob_index : '*iframe.html'
    },
    css  : { 
        subPath : 'css/',
        glob    : '**/*.css'
    },
    others : [
        '*.json',
        'translations/*.json',
        'assets/img/*.{png,gif,jpg,jpeg,svg}',
        'assets/templates/*.hdbs',
        'assets/templates/logo*.png',
    ]
};

function concatenateSrcJs( )
{
    return concatUtils.task_concatenateJS ( 
        paths.src + paths.js.subPath,
        paths.tmp + paths.js.subPath,
        paths.js.glob_both,
        paths.js.glob_both.substr(3),
        paths.denyDirName
    ).on( 'error', commonUtils.handleError );
}

function minifyTmpJs() {
    let minifyTmpSettings = jsUtils.getDefaultJsSettings( paths );
    
    //convers normal settings to not do any renaming and to also use tmp as the source and dest
    minifyTmpSettings.src = paths.tmp  + paths.js.subPath + paths.js.glob_js_only;
    minifyTmpSettings.rename = { newExtension: minifyTmpSettings.rename.newExtension }; //remove other rename settings, thhey're not needed in tmp directory
    minifyTmpSettings.deleteSrcFilesFromThisDirAfterProcessing_USE_WITH_CAUTION = paths.tmp + paths.js.subPath;
    //log( minifyTmpSettings );
    return jsUtils.minifyJs_FromSettings( minifyTmpSettings );
}

function deleteJsOnlyFromTmp()
{
    return fsUtils.rm( paths.tmp + paths.js.subPath + paths.js.glob_js_only, false, true, false );
}

function minifySrcJs() {
    let minifyTmpSettings = jsUtils.getDefaultJsSettings( paths );
    minifyTmpSettings.filterFunction = concatUtils.filterFunction_NoConcatFiles; //dont process filed to be concatted
    return jsUtils.minifyJs_FromSettings( minifyTmpSettings );
}

function copySrcMinJs(cb) {
    gulp.src ( paths.src + paths.js.subPath + paths.js.glob_min_js )
    .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
    .pipe( gulp.dest( paths.tmp + paths.js.subPath ) )
    .on( 'end', function() { cb(); } );
}

function html(cb) {
    gulp.src(paths.src + paths.html.subPath + paths.html.glob)
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
        .pipe(gulp.dest(paths.tmp + paths.html.subPath))
        .on('end', function() { cb(); });
}

function css(cb) {
    gulp.src(paths.src + paths.css.subPath + paths.css.glob)
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
        .pipe(gulp.dest(paths.tmp + paths.css.subPath))
        .on('end', function() { cb(); });
}

function injectHTML(cb) {
    var targetHtmlFiles = gulp.src( paths.tmp + paths.html.subPath + paths.html.glob_index );
    var cssFilesToInject = gulp.src( paths.tmp + paths.css.glob, {read: false} ).pipe( naturalSort() ); //dont need to see contents
    var jsFilesToInject  = gulp.src( paths.tmp + paths.js.glob_both, {read: false} ).pipe( naturalSort() );  //dont need to see contents

    return targetHtmlFiles
      .pipe( inject( cssFilesToInject, { relative:true } ) )
      .pipe( inject( jsFilesToInject, { relative:true } ) )
      .pipe( gulp.dest( paths.tmp ) )
      .on('end', function() { cb(); });
}


gulp.task('watch', () => {
  watch(minifyJsSettings.src, { ignoreInitial: false }, gulp.series('minifyJs') );
});

gulp.task('clean', function () {
  return fsUtils.rm( paths.tmp + '/**/*', false, true );
});

/* exports */
exports.concatenateSrcJs = concatenateSrcJs;
exports.minifyTmpJs = minifySrcJs;
exports.deleteJsOnlyFromTmp = deleteJsOnlyFromTmp;
exports.minifySrcJs = minifySrcJs;
exports.copySrcMinJs = copySrcMinJs;
exports.js = series( concatenateSrcJs, minifyTmpJs, deleteJsOnlyFromTmp, parallel( minifySrcJs, copySrcMinJs ) );
exports.testJs = series( 'clean', concatenateSrcJs, minifyTmpJs, deleteJsOnlyFromTmp, parallel( minifySrcJs, copySrcMinJs ) );


exports.html = html;
exports.css = css;
exports.injectHTML = injectHTML;
exports.build = series( 'clean', concatenateSrcJs, minifyTmpJs, deleteJsOnlyFromTmp, parallel( minifySrcJs, copySrcMinJs, html, css), injectHTML );
exports.default = function() {
  return gulp.series('build');
};


function deleteTmpDeniedDirs() {
    return fsUtils.deleteDeniedDirs( paths.tmp, denyDirNameOnlyNoPath );
}

function filterFunction_DeniedDir( vinylFile ) {
    return commonUtils.filterFunction_DenyDir_FromSettings( vinylFile, paths.denyDirName );
}





/*
  // Gulp and plugins
  gulp          = require('gulp'),
  gutil         = require('gulp-util'),
  newer         = require('gulp-newer'),
  imagemin      = require('gulp-imagemin'),
  sass          = require('gulp-sass'),
  postcss       = require('gulp-postcss'),
  deporder      = require('gulp-deporder'),  //LOOKS AMAZINs
  concat        = require('gulp-concat'),
  stripdebug    = require('gulp-strip-debug'),
  uglify        = require('gulp-uglify')
;

// copy PHP files
gulp.task('php', () => {
  return gulp.src(php.src)
    .pipe(newer(php.build))
    .pipe(gulp.dest(php.build));
});
*/