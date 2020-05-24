const orderingPrefixRegex = /\/(__[0-9]{3}_(concat)?_)([^\/]+)/g;

function parsePathPrefixes( fileNameAndPath, isDir, prefixPatternRegex )
{
    prefixPatternRegex = ( prefixPatternRegex ) ? prefixPatternRegex : orderingPrefixRegex;
    let regexMatches = ( '/'+fileNameAndPath ).matchAll( prefixPatternRegex );
    let results = {
        FULL_PATH_LENGTH: fileNameAndPath.length,
        firstInstance: null,
        noOfInstances: 0,
        firstConcatDirInstance: null,
        noOfConcatDirInstances: 0,
        fileInstance: null,
        instances: [],
    };
    for (const match of regexMatches) {
        let instance = {
            prefix: match[1],
            remainder: match[3],
            isConcat: typeof match[2] !== 'undefined',
            isRoot: match.index <= 1,
            isDir: isDir || ( ( match.index + match[0].length - 1 ) < fileNameAndPath.length ),
            start: match.index,
            end: match.index + match[0].length - 2
        };
        results.instances.push( instance );
        results.noOfInstances++;
        if( results.firstInstance === null )
        {
           results.firstInstance = instance;
        }
        if( instance.isConcat && instance.isDir )
        {
            results.noOfConcatDirInstances++;
            if( results.firstConcatDirInstance === null )
            {
                results.firstConcatDirInstance = instance;
            }
        }
        if( !instance.isDir )
        {
            results.fileInstance = instance;
        }
    }
    //log( 'parsePathForOrderingPrefixes: returning: results.noOfConcatDirInstances = ' + results.noOfConcatDirInstances );
    return results;
}

exports.orderingPrefixRegex = orderingPrefixRegex;
exports.parsePathPrefixes = parsePathPrefixes;


