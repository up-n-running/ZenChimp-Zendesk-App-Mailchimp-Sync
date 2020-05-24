//node.js modules not specifically gulp
const fs            = require('fs');
const path          = require('path');
const del           = require('del');
const log           = require('fancy-log');

//local includes
const commonUtils   = require('./commonutils');

/*
 * Scans a directory and returns the top-level folders within in it
 * @param {string} A sring representing the src path (relative to current working dir) of a directoy containing the source files that we want to traverse
 * @returns {Buffer[]} The directory names returned as buffer objects
 */
function getTopLevelSubFolders(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
      });
}

/**
 * Recursively traverse a directory structure starting at rootdir and look for matches and return an array of matched dirs (and/or files)
 * @param {string} rootDir - dir to start traversal from - will not check this dir for a match but will check everything inside it (except any potential exclusions applied in subsequent args)
 * @param {boolean} dirsOnly - only walk the directories and ignore the files (runs a quicker but matches will all be dirs, no file details at all)
 * @param {Function} matchIfFunction - (OPTIONAL) function that takes 2 params ( string path, boolean isDir ) and returns true it it should be returned in array of matches or false if not. If omitted then will list every dir (and file too if !dirsOnly) it touches
 * @param {boolean} traverseMatchedDirs - (OPTIONAL) if a dir match is found do we go on to return all matches inside the directory or not (quicker if not). ture if omitted
 * @param {string} deniedDirName (OPTIONAL) - a single dir name (eg 'temp') not a path which, if set, when the traversal sees a dir of this name it will skip past it and not return it as a match (even if match function likes it) nor will it check any of it's subdirectories or files
 * @param {string} logPrefix (OPTIONAL) - if you want to log the recurside dir traversal pass in empty string here, otherwise pass in null or omit completely} logPrefix
 * @returns {Array|nm$_fsutils.dirWalkAndSearch.results|dirWalkAndSearch.results}
 */
function dirWalkAndSearch(rootDir, dirsOnly, matchIfFunction, traverseMatchedDirs, deniedDirName, logPrefix) {
    
    //tidy input params
    rootDir = commonUtils.addSlashIfMissing( rootDir, false, true );
    dirsOnly = ( typeof dirsOnly === 'undefined' ) ? false : dirsOnly;
    matchIfFunction = (typeof matchIfFunction === 'undefined') ? null : matchIfFunction;
    traverseMatchedDirs = (typeof traverseMatchedDirs === 'undefined') ? true : traverseMatchedDirs;
    deniedDirName = (typeof deniedDirName === 'undefined') ? null : deniedDirName;
    logPrefix = ( typeof logPrefix === 'undefined' ) ? false : logPrefix;
    
    
    if( logPrefix!==false ) { log( logPrefix + 'walkDirsOnly( "'+ rootDir +'", dirsOnly='+dirsOnly+', '+ ((matchIfFunction === null)?'matchAllMode':matchIfFunction.name+'()') +', traverseMatchedDirs='+traverseMatchedDirs+', deniedDirName="'+deniedDirName+'", "'+ logPrefix + '") called'); }
    
    //get array to store the dir contents at this level (and sublevels)
    var results = [];
    
    //find all the (files and) dirs at this level
    var list = fs.readdirSync(rootDir).filter( function(file) {
        //ANONYMOUS INLINE FILTER FUNCTION
        if( deniedDirName !== null || dirsOnly )
        {
            let fullPath = path.join(rootDir, file);
            let isDir = fs.statSync(fullPath).isDirectory();
            if( deniedDirName === null || !isDir || !( '/'+fullPath+'/' ).includes( '/'+deniedDirName+'/' ) )
            {
                //its not a denied directory
                return !dirsOnly || isDir;
            }
            return false;
        }
        return true;
    });
    
    //loop through them all
    list.forEach(function(subdir) {
        
        //is it a file or a folder
        subDirOrFile = rootDir + subdir;
        let isDir = dirsOnly;
        if( !isDir )
        {
            let stat = fs.statSync(subDirOrFile);
            isDir = ( stat && stat.isDirectory() );
        }
        if( logPrefix!==false ) { log( logPrefix + 'Found: ' + ( isDir ? 'DIR ' : 'FILE' ) + ': ' + subDirOrFile ); }

        //is it a match and are we recursing further here from this point?
        let match = true;
        if( matchIfFunction !== null && !matchIfFunction( subDirOrFile, isDir ) )
        {
            match = false;
        }
        let traverseThisNode = isDir && ( !match || traverseMatchedDirs );
        if( logPrefix!==false ) { log( logPrefix + ' ' + ( match ? 'ITS A MATCH.' : 'not a match.' ) + ' will recurse: ' + traverseThisNode ); }
        
        if( match )
        {
            results.push( {
                nameAndPath: subDirOrFile,
                isDir: isDir,
                toString: function() { return this.nameAndPath; }
            });
            if( logPrefix!==false ) { log( logPrefix + ' File Pushed             : results: [' + results + ']' ); }
        }

        if ( traverseThisNode ) {
            /* Recurse into a subdirectory */
            if( logPrefix!==false ) { log( logPrefix + ' Going deeper: ' ); }
            results = results.concat( dirWalkAndSearch(subDirOrFile, dirsOnly, matchIfFunction, traverseMatchedDirs, deniedDirName, ( logPrefix!==false ? logPrefix+"   " : false ) ) );
            if( logPrefix!==false ) { log( logPrefix + ' Sub-Recursion concatted: results = [' + results + ']' ); }
        } 
    });
    
    if( logPrefix!==false ) { log( logPrefix + 'FINISHED, returning: [' + results + ']' ); }
    return results;
}

/**
 * Deletes all files matching an glob pattern, or an array of glob patterns.
 * @param {Glob} globOrGlobArray a glob string or an array of them, can be singular file flobs with no stars or a pattern matching glob
 * @param {boolean} dryRun doesnt actuallt run if set to true instead logs some stuff so you an make sure you're not going to do anything silly.
 * @param {boolean} force - allows you to rm files in the parent folder of the gulpscript (and it's other children (your siblimgs))
 * @param {boolean} megaForceUseWithCaution - allows you to delete anything, anywhere!!!!
 * @returns {Promise} returns a Promise to delete the files.
 * 
 */
function rm( globOrGlobArray, dryRun, force, megaForceUseWithCaution ) {
    //allowing the user to pass in a non-array
    globOrGlobArray = Array.isArray(globOrGlobArray) ? globOrGlobArray : [globOrGlobArray];
    
    //double check we're not going more than 1 dir down from root dir
    if( typeof megaForceUseWithCaution === 'undefined' || megaForceUseWithCaution !== true )
    {
        globOrGlobArray.forEach(function(glob) {
            if( commonUtils.countMatchesInString( '../..', glob ) > 0 )
            {
                return handleError( 'WONT DELETE AS THERE IS A "../.." IN THE PATH TO BE DELETED ('+globOrGlobArray+'). ONLY ONE LEVEL ABOVE ROOT DIR ALLOWED. USE megaForceUseWithCaution TO OVERRIDE');
            }
            if( commonUtils.countMatchesInString( '../src', glob ) > 0 )
            {
                return handleError( 'WONT DELETE AS THERE IS A "../src" IN THE PATH TO BE DELETED ('+globOrGlobArray+'). LOOKS SCARY TO ME. USE megaForceUseWithCaution TO OVERRIDE');
            }
        });
    }
    let options = {
        dryRun: ( typeof dryRun === 'undefined' || dryRun !== false ) ? true : false,
        force: ( typeof force === 'undefined' || force !== true ) ? false : true
    };
    
    if( options.dryRun )
    {
        log( 'Simulating Delete of following globs: ' + globOrGlobArray );
        log( 'With options: ' );
        log( options );
        log( 'Current working directory is: ' + process.cwd() );
    }
    
    return del( globOrGlobArray, options );
}

function deleteDeniedDirs( rmRootDir, denyDirNameOnlyNoPath ) {
    rmRootDir = commonUtils.stripSlashIfExists( rmRootDir, false, true );
    return fsutils.rm( rmRootDir + '/**/' + denyDirNameOnlyNoPath + '/**', false, true );
}

exports.getTopLevelSubFolders = getTopLevelSubFolders;
exports.rm = rm;
exports.deleteDeniedDirs = deleteDeniedDirs;
exports.dirWalkAndSearch = dirWalkAndSearch;

