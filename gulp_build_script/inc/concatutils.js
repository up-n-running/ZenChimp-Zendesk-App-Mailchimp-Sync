//gulp modules not specifically gulp
const gulp          = require('gulp');
const filter        = require('gulp-filter');
const naturalSort   = require('gulp-natural-sort');
const debug         = require('gulp-debug');
const concat        = require('gulp-concat');
const mergeStream   = require('merge-stream');

//node.js modules not specifically gulp
const path          = require('path');
const log           = require('fancy-log');

//local includes
const commonUtils   = require('./commonutils');
const prefixUtils   = require('./prefixutils');
const fsUtils       = require('./fsutils');

function task_concatenateJS( srcDir, destDir, concatDirSrcGlob, individualDirSrcGlob, deniedDirName )
{
    let concatFilesAndDirs = fsUtils.dirWalkAndSearch( srcDir, false, isAConcatDirOrFile, false, deniedDirName );

    let concatDirs = [];
    let individualDirs = [];
    let streamArray = [];
    for (let fileOrDir of concatFilesAndDirs) {
        if( ( fileOrDir.isDir && concatDirs.includes( fileOrDir.nameAndPath ) === false ) ) {
            concatDirs.push( fileOrDir.nameAndPath );
            streamArray.push( subtask_concatAConcatDir( 
                srcDir, 
                destDir, 
                concatDirSrcGlob, 
                fileOrDir.nameAndPath,
                deniedDirName
            ) );
        } else if( !fileOrDir.isDir && ( individualDirs.includes( path.dirname(fileOrDir.nameAndPath) ) === false ) ) {
            let filesDirPath = path.dirname( fileOrDir.nameAndPath);
            individualDirs.push( filesDirPath );
            streamArray.push( subtask_concatAnIndividualDir( 
                srcDir, 
                destDir, 
                individualDirSrcGlob, 
                filesDirPath
            ) );
        }
    }
    
    //log( concatDirs );
    //log( individualDirs );
    
   return mergeStream( streamArray );
}
/* NOTE TO FUTURE SELF: If mergestream doesnt work consistently i could try inject & stream-series
    var series = require('stream-series');
    var theseComeFirst = gulp.src(["somepath/first*.js", {read: false}).pipe(naturalSort());
    var theseComeSecond = gulp.src("somepath/second*.js", {read: false}).pipe(naturalSort());
    return gulp
        .src("*.html")
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.inject(series(theseComeFirst, theseComeSecond), {relative: true}))
        .pipe(gulp.dest('client/'));
*/


function subtask_concatAConcatDir( srcDir, destDir, srcGlob, folder, deniedDirName )
{
    //log( 'subtask_concatAConcatDir( srcDir, destDir, srcGlob, folder ) called' );
    //log( 'srcDir = ' + srcDir );
    //log( 'destDir = ' + destDir );
    //log( 'srcGlob = ' + srcGlob );
    //log( 'folder = ' + folder );    
    let tmpDestFileNameAndPath = destDir + path.relative(srcDir, folder) + '.js';

    log( "STARTING DIRECTORY CONCAT DIR: " + folder);
    return gulp.src( commonUtils.addSlashIfMissing( folder, false, true ) + srcGlob )
        .pipe( filter( function( vinylFile ) {
                return commonUtils.filterFunction_DenyDir_FromSettings( vinylFile, deniedDirName );
            }, {restore: false, passthrough: false} 
        ) ) //watch out for temp directories inside a concat directory (who would do that!!! but still - lets be thorough)
        .pipe( naturalSort() )
        .pipe( debug() )
        .pipe( concat( path.basename( tmpDestFileNameAndPath ) ) )
        .pipe( gulp.dest( path.dirname( tmpDestFileNameAndPath ) ) )
        .on('end', function() {
            log( "CREATED DIRECTORY CONCAT FILE: " + tmpDestFileNameAndPath);
        });
}

function subtask_concatAnIndividualDir( srcDir, destDir, srcGlob, folder )
{
    //log( 'concatAnIndividualDir( srcDir, destDir, srcGlob, folder ) called' );
    //log( 'srcDir = ' + srcDir );
    //log( 'destDir = ' + destDir );
    //log( 'srcGlob = ' + srcGlob );
    //log( 'folder = ' + folder );
    
    let tmpDestFolder = path.join( destDir+ path.relative(srcDir, folder) );
    //now instead of putting in parent dir like we do with concat dirs we actually put
    //in the matched folder with filename folder_name.js (ie .../foldername/foldername.js)
    let tmpFileName = path.basename( tmpDestFolder+'.js', '.js' ) + '.js'; //get last part of path and add a js on the end
    let tmpDestFileNameAndPath = path.join( tmpDestFolder, tmpFileName );
    
    log( "STARTING INDIVIDUALS CONCAT FOR: " + folder);
    return gulp.src( commonUtils.addSlashIfMissing( folder, false, true ) + srcGlob )
        //here the reason we filter is because this is not a concat dir, so only files flagged to 
        //concat should be concatted
        .pipe( filter( filterFunction_OnlyConcatFiles, {restore: false, passthrough: false} ) )
        .pipe( naturalSort() )
        .pipe( debug() )
        .pipe( concat( path.basename( tmpDestFileNameAndPath ) ) )
        .pipe( gulp.dest( path.dirname( tmpDestFileNameAndPath ) ) )
        .on('end', function() {
            log( "CREATED INDIVIDUALS CONCAT FILE: " + tmpDestFileNameAndPath);
        });
}

function filterFunction_OnlyConcatFiles( vinylFile ) {
    return isAConcatDirOrFile( vinylFile.relative, false );
}

function filterFunction_NoConcatFiles( vinylFile ) {
    return !isAConcatDirOrFile( vinylFile.relative, false );
}

function isAConcatDirOrFile( dirOrFilePath, isDir )
{
    let result = prefixUtils.parsePathPrefixes( dirOrFilePath, isDir );
    if( result.firstConcatDirInstance !== null ) {
        return true;
    }
    else if( !isDir && result.fileInstance !== null && prefixUtils.utils.isConcat( result.fileInstance ) ) {
        return true;
    }
    return false;
}

exports.task_concatenateJS = task_concatenateJS;
//exports.subtask_concatAConcatDir = subtask_concatAConcatDir;
//exports.subtask_concatAnIndividualDir = subtask_concatAnIndividualDir;
exports.isAConcatDirOrFile = isAConcatDirOrFile;
exports.filterFunction_OnlyConcatFiles = filterFunction_OnlyConcatFiles;
exports.filterFunction_NoConcatFiles = filterFunction_NoConcatFiles;