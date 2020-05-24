//node.js modules not specifically gulp
const log           = require('fancy-log');  

function filterFunction_DenyDir_FromSettings( vinylFile, deniedDirName ) {
    if( deniedDirName && ( '/'+vinylFile.relative+'/' ).includes( '/'+deniedDirName+'/' ) )
    {
        log( 'Filtered Out: ' + vinylFile.relative );
        return false;
    }
    return true;
}

/* Util Functions */
function renameFunction_FromSettings( path, settings ) {
    //do a search and replace on basename and change file extension if the file path contains a 'denied' directory like ..../temp/....
    oldFileName = addSlashIfMissing( path.dirname, false, true) + path.basename + path.extname;
    if( settings )
    {
        if( settings.basenameFind && settings.basenameReplace ) {
            path.basename = path.basename.replace( settings.basenameFind, settings.basenameReplace );
        }
        if( settings.newExtension ) {
            path.extname = settings.newExtension;
        }
        if( settings.denyDirName && settings.denyNewExtension && ( '/'+path.dirname+'/' ).includes( '/'+settings.denyDirName+'/' ) )  {
            path.extname = settings.denyNewExtension;
        }
    }
    log( 'Renaming: '+oldFileName+' --> '+path.dirname+'/'+path.basename+path.extname );
}

function countMatchesInString(needle, haystack) { 
     let pointer = haystack.indexOf(needle); 
     let count = 0; 
     while (pointer !== -1) { 
         count++; 
         pointer = haystack.indexOf(needle, pointer + 1); 
     }
     return count;
}

function handleError(error) {
    console.log(error.toString());
    console.error.bind(console);
    process.exit(-1);
    return this.emit('end');
}

function stripSlashIfExists( pathString, fromTheStart, fromTheEnd )
{
    pathString = ( fromTheStart && pathString.charAt(0) !== '/' ) ? pathString : pathString.substr(1);
    pathString = ( fromTheEnd   && pathString.charAt(pathString.length - 1) !== '/' ) ? pathString : pathString.substring(0, pathString.length - 1);
    return pathString;
}

function addSlashIfMissing( pathString, toTheStart, toTheEnd )
{
    pathString = ( ( toTheStart && pathString.charAt(0) !== '/' ) ? '/' : '' ) + pathString;
    pathString = pathString + ( ( toTheEnd && pathString.charAt(pathString.length - 1) !== '/' ) ? '/' : '' );
    return pathString;
}

exports.filterFunction_DenyDir_FromSettings = filterFunction_DenyDir_FromSettings;
exports.renameFunction_FromSettings = renameFunction_FromSettings;
exports.countMatchesInString = countMatchesInString;
exports.handleError = handleError;

exports.addSlashIfMissing = addSlashIfMissing;
exports.stripSlashIfExists = stripSlashIfExists;