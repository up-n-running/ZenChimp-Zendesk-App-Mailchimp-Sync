// Gulp.js configuration

//Import gulp and its plugins
const { watch, series, parallel } = require('gulp'); 
const gulp          = require('gulp'); 
const filter        = require('gulp-filter');
//const htmlclean     = require('gulp-htmlclean');
const zip           = require('gulp-zip');

//node.js modules not specifically gulp
const log           = require('fancy-log');

//local includes
const jsUtils       = require('./inc/jsutils');
const prefixUtils   = require('./inc/prefixutils');
const fsUtils       = require('./inc/fsutils');
const commonUtils   = require('./inc/commonutils');
const concatUtils   = require('./inc/concatutils');
const injectUtils   = require('./inc/injectutils');

const version = "v2_0_1";

const paths = {
    src   : '../src/',
    tmp   : '../tmp/',
    build : '../build/',
    dist  : '../dist/',
    denyDirName : 'temp',
    js    : {
        subPath        : 'assets/js/',
        glob_js_only   : '**/!(*.min).js',
        glob_min_js    : '**/!(*.temp).min.js',
        glob_both      : '**/!(*.temp.min).js'
    },
    html  : { 
        subPath    : 'assets/',
        glob       : '**/*.html',
        glob_index : '*iframe.html'
    },
    css  : { 
        subPath : 'assets/css/',
        glob    : '**/*.css'
    },
    copy_files : [
        '*.json',
        'translations/*.json',
        'assets/img/**/*.{png,gif,jpg,jpeg,svg}',
        'assets/templates/**/*.hdbs',
        'assets/logo*.png'
    ]
};

function refreshSrcInjectJs() {
    return injectUtils.task_InjectIntoHtml_FromSettings( 
                paths.src + paths.html.subPath + paths.html.glob_index,
                paths.src + paths.html.subPath,
                paths.src + paths.js.subPath,
                paths.src + paths.js.subPath + paths.js.glob_both,
                false,
                false,
                paths.denyDirName
           );
}

function refreshSrcInjectCss() {
    return injectUtils.task_InjectIntoHtml_FromSettings( 
                paths.src + paths.html.subPath + paths.html.glob_index,
                paths.src + paths.html.subPath,
                paths.src + paths.css.subPath,
                paths.src + paths.css.subPath + paths.css.glob,
                false,
                false,
                paths.denyDirName
           );
}

function concatenateSrcJsToTmp( )
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
    //Get normal default settings then convert them to:
    // - not do any file renaming and 
    // - use tmp as both the source and dest
    let minifyTmpSettings = jsUtils.getDefaultJsSettings( paths );
    minifyTmpSettings.src = paths.tmp  + paths.js.subPath + paths.js.glob_js_only;
    minifyTmpSettings.rename = { newExtension: minifyTmpSettings.rename.newExtension }; //remove other rename settings, thhey're not needed in tmp directory

    return jsUtils.minifyJs_FromSettings( minifyTmpSettings );
    //this leaves orig .js files alongside the new .min.js so is normally followed by a call to deleteJsOnlyFromTmp
}

function deleteJsOnlyFromTmp()
{
    return fsUtils.rm( paths.tmp + paths.js.subPath + paths.js.glob_js_only, false, true, false );
}

function minifySrcJsToTmp() {
    //Get normal default settings then convert them to:
    // - not minify any files or folders flagged for concatenation (these are handled already by concatenateSrcJsToTmp and it's following functions
    let minifyTmpSettings = jsUtils.getDefaultJsSettings( paths );
    minifyTmpSettings.filterFunction = concatUtils.filterFunction_NoConcatFiles; //dont process filed to be concatted
    
    return jsUtils.minifyJs_FromSettings( minifyTmpSettings );
}

function copySrcMinJsToTmp(cb) {
    //any files that are already minified in src need copying manually as they are not 
    //copied over by the minification and routines above
    gulp.src ( paths.src + paths.js.subPath + paths.js.glob_min_js )
    .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
    .pipe( gulp.dest( paths.tmp + paths.js.subPath ) )
    .on( 'end', function() { cb(); } );
}

function copySrcHtmlToTmp(cb) {
    //manually copy HTML files from src to tmp
    gulp.src(paths.src + paths.html.subPath + paths.html.glob)
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
        .pipe(gulp.dest(paths.tmp + paths.html.subPath))
        .on( 'end', function() { cb(); } );
}

function css(cb) {
    //manually copy CSS files from src to tmp
    gulp.src(paths.src + paths.css.subPath + paths.css.glob)
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
        .pipe(gulp.dest(paths.tmp + paths.css.subPath))
        .on( 'end', function() { cb(); } );
}

function copyStaticFiles(cb) {
    //copy all other files needed from src to tmp
    gulp.src( paths.copy_files.map( glob => paths.src + glob ), { base: paths.src } )
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false } ) )
        .pipe( gulp.dest( paths.tmp ) )
        .on( 'end', function() { cb(); } );
}

function injectTmpJs() {
    return injectUtils.task_InjectIntoHtml_FromSettings( 
                paths.tmp + paths.html.subPath + paths.html.glob_index,
                paths.tmp + paths.html.subPath,
                paths.tmp + paths.js.subPath,
                paths.tmp + paths.js.subPath + paths.js.glob_both,
                true,
                true,
                paths.denyDirName
           );
}

function injectTmpCss() {
    return injectUtils.task_InjectIntoHtml_FromSettings( 
                paths.tmp + paths.html.subPath + paths.html.glob_index,
                paths.tmp + paths.html.subPath,
                paths.tmp + paths.css.subPath,
                paths.tmp + paths.css.subPath + paths.css.glob,
                true,
                true,
                paths.denyDirName
           );
}

function cleanTmpHtmlAfterInjection(cb) {
    gulp.src(paths.tmp + paths.html.subPath + paths.html.glob)
        .pipe( filter( filterFunction_DeniedDir, {restore: false, passthrough: false} ) )
        .pipe( htmlclean() )
        .pipe(gulp.dest(paths.tmp + paths.html.subPath))
        .on( 'end', function() { cb(); } );
}

function removeTmpPrefixesJs()
{
    return prefixUtils.task_removePrefixes_FromSettings( paths.tmp + paths.js.subPath + paths.js.glob_both, paths.tmp + paths.js.subPath );
}

function removeTmpPrefixesCss()
{
    return prefixUtils.task_removePrefixes_FromSettings( paths.tmp + paths.css.subPath + paths.css.glob, paths.tmp + paths.css.subPath );
}

function removeTmpEmptyDirs()
{
    return fsUtils.removeEmptyDirectories( paths.tmp );
    
}

function zipSource()
{
    return gulp.src(paths.src+'**/*')
        .pipe(zip('ZenchimpApp_'+version+'-ForDebugging.zip'))
        .pipe(gulp.dest(paths.dist));
}

function zipTmp()
{
    return gulp.src(paths.tmp+'**/*')
        .pipe(zip('ZenchimpApp_'+version+'-Production.zip'))
        .pipe(gulp.dest(paths.dist));
}

function cleanTmp() {
  return fsUtils.rm( paths.tmp + '/**/*', false, true );
}

function cleanBuild() {
  //fsUtils.rm( paths.dist + '/**/*', false, true );
  return fsUtils.rm( paths.build + '/**/*', false, true );
}

function moveTmpToBuild () {
    return gulp.src(paths.tmp + '**/*')
        .pipe( gulp.dest( paths.build ) );
}

/* Common util functions */
function filterFunction_DeniedDir( vinylFile ) {
    return commonUtils.filterFunction_DenyDir_FromSettings( vinylFile, paths.denyDirName );
}

function TEST(cb) {
    //Simple Test Here
    cb();
}

/* combination tasks */
const refreshSrcHtmlInject = series( 
        refreshSrcInjectJs, 
        refreshSrcInjectCss 
      );

const srcJsToTmp = series( 
        concatenateSrcJsToTmp, 
        minifyTmpJs, 
        deleteJsOnlyFromTmp, 
        gulp.parallel( minifySrcJsToTmp, copySrcMinJsToTmp ) 
      );

const build = series( 
        cleanTmp, 
        srcJsToTmp,
        parallel( copySrcHtmlToTmp, css, copyStaticFiles), 
        injectTmpJs, 
        injectTmpCss, 
        parallel( removeTmpPrefixesJs, removeTmpPrefixesCss ), 
        removeTmpEmptyDirs, 
        parallel( cleanBuild, zipSource, zipTmp ), 
        moveTmpToBuild, 
        cleanTmp 
      );

gulp.task('watch', () => {
  watch( paths.src + paths.js.subPath + paths.js.glob_both, 
         { ignoreInitial: false }, 
         refreshSrcHtmlInject );
});

/* exports */

exports.TEST = TEST;
exports.srcJsToTmp = srcJsToTmp;
exports.refreshSrcHtmlInject = refreshSrcHtmlInject;
exports.build = build;

exports.default = build;





/* not used but might be useful in future */
function deleteTmpDeniedDirs() {
    return fsUtils.deleteDeniedDirs( paths.tmp, paths.denyDirName );
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