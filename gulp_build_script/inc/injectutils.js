//gulp modules not specifically gulp
const gulp          = require('gulp');
const filter        = require('gulp-filter');
const naturalSort   = require('gulp-natural-sort');
const inject        = require('gulp-inject');
const debug         = require('gulp-debug');
const rename        = require('gulp-rename');

//node.js modules not specifically gulp
const log           = require('fancy-log');
const minimatch     = require("minimatch");

//local includes
const commonUtils   = require('./commonutils');
const prefixUtils   = require('./prefixutils');
const fsUtils       = require('./fsutils');

/**
 * 
 * @param {Glob} targetHtmlGlob
 * @param {String} destHtmlDir
 * @param {String} startingDir
 * @param {Glob} globToMatch
 * @param {boolean} removePrefixes Use this if it't the last time youre injecting and next step is to copy to build dir
 * @param {boolean} removeTags Use this if it't the last time youre injecting and next step is to copy to build dir
 * @param {string} deniedDirName
 * @returns {unresolved}
 */
function task_InjectIntoHtml_FromSettings( targetHtmlGlob, destHtmlDir, startingDir, globToMatch, removePrefixes, removeTags, deniedDirName )
{
    /* log( "task_InjectIntoHtml_FromSettings( targetHtmlGlob, destHtmlDir, startingDir, globToMatch, removePrefixes, removeTags, deniedDirName ) called" );
    log( "ARG1: targetHtmlGlob = " + targetHtmlGlob );
    log( "ARG2: destHtmlDir = " + destHtmlDir );
    log( "ARG3: startingDir = " + startingDir );
    log( "ARG4: globToMatch = " + globToMatch );
    log( "ARG5: removePrefixes = " + removePrefixes );
    log( "ARG6: removeTags = " + removeTags );
    log( "ARG7: deniedDirName = " + deniedDirName ); */
    
    //the isInjectableFile means it only returns files, no dirs, and only flies that arent flagged for 'noinject'
    let dirWalkMatchFunction = function ( path, isDir ) { return isInjectableFileMatchingGlob( path, isDir, globToMatch ); };
    //log( "dirWalkMatchFunction = " + dirWalkMatchFunction.toString()); 

    //walk filesystem to pick up array of files we need to inject, no noinject files will be returned and only files matchig globs will be returned and no tiles from a denied dir (eg temp) will be returned
    let injectableFiles = fsUtils.dirWalkAndSearch( startingDir, false, dirWalkMatchFunction, true, deniedDirName );

    //loop through all the matched files and separrate them into lists my inject mode 
    //(and catch all other injectable files with no mode in the injectFilesWithNoInjectMode array) 
    let foundInjectModes = [];
    let filesPerInjectMode = [];
    let injectFilesWithNoInjectMode = [];
    for (const file of injectableFiles) {
        let result = prefixUtils.parsePathPrefixes( file, false );
        if( result.lastInjectModeDirOrFileInstance === null ) {
            injectFilesWithNoInjectMode.push( file.nameAndPath );
        }
        else {
            let injectMode = result.lastInjectModeDirOrFileInstance.prefix.injectMode;
            if( foundInjectModes.includes( injectMode ) === false ) { 
                foundInjectModes.push( injectMode ); 
                filesPerInjectMode[ injectMode ] = [];
            }
            filesPerInjectMode[ injectMode ].push( file.nameAndPath );
        }
    }
    
    log( 'INJECT MODES: Files with no Inject Mode: ' + injectFilesWithNoInjectMode.length );
    for( const injectMode of foundInjectModes ) {
        log( 'INJECT MODES: Files with Inject Mode "' + injectMode + '": ' + filesPerInjectMode[ injectMode ].length );
    }
    
    let targetHtmlFileStream  = gulp.src( targetHtmlGlob );
    targetHtmlFileStream = subtask_injectByInjectMode( 
        targetHtmlFileStream, 
        destHtmlDir, 
        '', 
        injectFilesWithNoInjectMode, 
        startingDir, 
        removePrefixes,
        removeTags
    );
    for( const injectMode of foundInjectModes ) {
        targetHtmlFileStream = subtask_injectByInjectMode( 
            targetHtmlFileStream, 
            destHtmlDir, 
            injectMode, 
            filesPerInjectMode[ injectMode ], 
            startingDir, 
            removePrefixes,
            removeTags
        );
    }
   return targetHtmlFileStream.pipe( gulp.dest( destHtmlDir ) );
}



/**
 * Will append a new pipe to to the bottom of this targetHtmlFileStream then return it
 * @param {Stream} targetHtmlFileStream will append a new pipe to to the bottom of this stream then return it
 * @param {String} destHtmlDir dest for HTML files
 * @param {String} injectModeName
 * @param {Array} injectedFileNameArray
 * @param {String} injectedFileBaseDir 
 * @param {boolean} removePrefixes (if set to true all matching source files get renamed (on filesystem!) as well as being injected)
 * @returns {Stream} Stream of injected html files
 * 
 */
function subtask_injectByInjectMode( targetHtmlFileStream, destHtmlDir, injectModeName, injectedFileNameArray, injectedFileBaseDir, removePrefixes, removeTags ) {
    /* log( "injectHtml_FromSettings( targetHtmlGlob, destHtmlDir, jsToInjectGlob, cssToInjectGlob, deniedDirName ) called" );
    log( "ARG1: targetHtmlFileStream = " + targetHtmlFileStream );
    log( "ARG2: destHtmlDir = " + destHtmlDir );
    log( "ARG3: injectModeName = " + injectModeName );
    log( "ARG4: injectedFileNameArray = " + injectedFileNameArray );
    log( "ARG5: removePrefixes = " + removePrefixes );
    log( "ARG6: removeTags = " + removeTags ); */
    
    let injectTagOptions = { relative: true };
    if( injectModeName )
    {
        //injectTagOptions.starttag = '<!-- inject:'+injectModeName+':{{ext}} -->';
        injectTagOptions.name = injectModeName;
    }
    if( removeTags )
    {
        injectTagOptions.removeTags = removeTags;
    }

    let filesToInjectFileStream = null;
    if( removePrefixes )
    {
        //log( 'adding rename function to remove prefixes');
        filesToInjectFileStream  = gulp.src( injectedFileNameArray, {read: false, base: injectedFileBaseDir, cwdbase: true } )
                                           .pipe( naturalSort() )
                                           .pipe( rename( prefixUtils.renameFunction_RemovePrefixes ) )
                                           .pipe( debug() );
    }
    else
    {
        //log( ' NOT adding rename function to remove prefixes' );
        filesToInjectFileStream  = gulp.src( injectedFileNameArray, {read: false} )
                                       .pipe( naturalSort() )
                                       .pipe( debug() );
    }
    return targetHtmlFileStream
        .pipe( inject( filesToInjectFileStream, injectTagOptions ) );
}


function filterFunction_OnlyInjectFiles( vinylFile ) {
    return isInjectableFile( vinylFile.relative, false );
}

function filterFunction_OnlyNoInjectFiles( vinylFile ) {
    return !isInjectableFile( vinylFile.relative, false );
}

function isInjectableFileMatchingGlob( dirOrFilePath, isDir, glob )
{
    if(isDir) { return false; }
    let result = prefixUtils.parsePathPrefixes( dirOrFilePath, false );
    if( result.lastInjectModeDirOrFileInstance === null || result.lastInjectModeDirOrFileInstance.prefix.injectMode !== 'noinject' )
    {
        if( !glob ) {return true;}
        //log( 'checking if "'+dirOrFilePath+'" matches "'+glob+'": ' + minimatch( dirOrFilePath, glob ) );
        return minimatch( dirOrFilePath, glob );
    }
    return false;
}

exports.task_InjectIntoHtml_FromSettings = task_InjectIntoHtml_FromSettings;
exports.filterFunction_OnlyInjectFiles = filterFunction_OnlyInjectFiles;
exports.filterFunction_OnlyNoInjectFiles = filterFunction_OnlyNoInjectFiles;
exports.isInjectableFileMatchingGlob = isInjectableFileMatchingGlob;