//gulp modules not specifically gulp
const gulp          = require('gulp');
const rename        = require('gulp-rename');
const debug         = require('gulp-debug');

//node.js modules not specifically gulp
const log           = require('fancy-log');
const del           = require('del');
const vinylPaths    = require('vinyl-paths');

//local includes
const commonUtils   = require('./commonutils');
const fsUtils       = require('./fsutils');

const orderingPrefixRegex = /\/(__([0-9]{3})([^_]*)?_([^_]*)_)([^\/]+)/g;
/*
 * lets assume the we're matching: /__123concat_noinject_myawesomeprogram.js
 * 
 * match[0] matches the whole thing: eg /__123concat_noinject_myawesomeprogram.js
 * match[1] matches first '(' until its matching ')' = fill file prefix. eg __123flagtext_head_
 * match[2] matches 2nd '(' until its matching ')' = the digits. eg 123
 * match[3] matches 3rd '(' until its matching ')' = the stuff after 3 digits until the next underscore. these are  the flags like 'concat' eg flagtext
 * match[4] matches 4th '(' until its matching ')' = the stuff between the last 2 underscores of the prefix. this is the instructions we pass into the injector: eg noinject
 * match[5] matches 5th '(' until its matching ')' = the filename without the prefix. eg myawesomeprogram.js
 **/

const utils = {
    isConcat: function( instance ) { return instance.prefix.flags.includes( 'concat' ); },
}
/**
 * 
 * @param {string} fileNameAndPath
 * @param {boolean} isDir
 * @param {RegEx} OPTIONAL prefixPatternRegex, best to leave out and let it use the default one!
 * @returns {nm$_prefixutils.parsePathPrefixes.results}
 */
function parsePathPrefixes( fileNameAndPath, isDir, prefixPatternRegex )
{
    //log( 'PARSEPATHPREFIXES: ' + (isDir?'DIR:  ':'FILE: ') + fileNameAndPath );
    
    prefixPatternRegex = ( prefixPatternRegex ) ? prefixPatternRegex : orderingPrefixRegex;
    let regexMatches = ( '/'+fileNameAndPath ).matchAll( prefixPatternRegex );
    let results = {
        FULL_PATH_LENGTH: fileNameAndPath.length,
        firstInstance: null,
        noOfInstances: 0,
        firstConcatDirInstance: null,
        lastInjectModeDirOrFileInstance: null,
        fileInstance: null,
        instances: [],
    };
    for (const match of regexMatches) {
        let instance = {
            prefix: {
                full: match[1],
                digits: match[2],
                flags: ( typeof( match[3] ) === 'undefined' ? '' : match[3] ).toLowerCase(),
                injectMode: typeof( match[4] ) === 'undefined' ? '' : match[4]
            },
            remainder: match[5],
            isRoot: match.index <= 1,
            isDir: isDir || ( ( match.index + match[0].length - 1 ) < fileNameAndPath.length ),
            start: match.index,
            end: match.index + match[0].length - 2
        };
        
        //log( instance );
        results.instances.push( instance );
        results.noOfInstances++;
        if( results.firstInstance === null )
        {
           results.firstInstance = instance;
        }
        if( instance.isDir && results.firstConcatDirInstance === null && utils.isConcat( instance ) )
        {
                results.firstConcatDirInstance = instance;
        }
        if( instance.prefix.injectMode !== '' )
        {
            results.lastInjectModeDirOrFileInstance = instance;
        }
        if( !instance.isDir )
        {
            results.fileInstance = instance;
        }
    }
    //log( 'parsePathForOrderingPrefixes: returning: results = ' + results );
    return results;
}

function removePrefixesFromPath( pathWithPrefixes )
{
    let newPath = '';
    results = parsePathPrefixes( pathWithPrefixes );
    currentCharIndex = 0;
    for( let instance of results.instances ) {
        newPath += pathWithPrefixes.substring( currentCharIndex, instance.start ) + instance.remainder;
        currentCharIndex = instance.end + 1;
    }
    if( currentCharIndex < pathWithPrefixes.length )
        newPath += pathWithPrefixes.substring( currentCharIndex, pathWithPrefixes.length );
    return newPath;
}


function renameFunction_RemovePrefixes( path ) 
{
    //do a search and replace on basename and change file extension if the file path contains a 'denied' directory like ..../temp/....
    oldFileName = commonUtils.addSlashIfMissing( path.dirname, false, true) + path.basename + path.extname;
    //log( 'OLD path.dirname = ' + path.dirname );
    //log( 'OLD path.basename = ' + path.basename );
    path.dirname = removePrefixesFromPath( path.dirname );
    path.basename = removePrefixesFromPath( path.basename );
    log( 'Removing Prefixes: '+oldFileName+' --> '+path.dirname+'/'+path.basename+path.extname );
}

 
/**
 * 
 * @param {Glob} srcDirAndGlob
 * @param {String} destDir
 * @returns {Stream}
 * 
 */
function task_removePrefixes_FromSettings( srcDirAndGlob, destDir )
{
    //sanity check arguments before begin
    let sourceArray = Array.isArray(srcDirAndGlob) ? srcDirAndGlob : [srcDirAndGlob];
    
    /* log( 'task_removePrefixes_FromSettings( srcDirAndGlob, destDir ) called' );
    log( 'ARG1: srcDirAndGlob = ' );
    log( srcDirAndGlob );
    log( 'ARG2: destDir = ' );
    log( destDir ); */
    
    fsUtils.sanityCheckBeforeDelete(sourceArray, false);
    
    //do the magic
    return gulp.src( sourceArray )
        //.pipe( debug() )
        .pipe( vinylPaths(paths => del(paths, { force: true })) ) //DELETE THE ORIGINALS!!!
        .pipe( rename( renameFunction_RemovePrefixes ) )
        //.pipe( debug() )
        .pipe( gulp.dest(destDir) )
        .on( 'end', function(){ 
            log('Finished Removing Prefixes'); 
        } );
}

exports.utils = utils;
exports.orderingPrefixRegex = orderingPrefixRegex;
exports.parsePathPrefixes = parsePathPrefixes;
exports.removePrefixesFromPath = removePrefixesFromPath;
exports.renameFunction_RemovePrefixes = renameFunction_RemovePrefixes;
exports.task_removePrefixes_FromSettings = task_removePrefixes_FromSettings;
