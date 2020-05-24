//gulp modules not specifically gulp
const gulp          = require('gulp');
const filter        = require('gulp-filter');
const naturalSort   = require('gulp-natural-sort');
const debug         = require('gulp-debug');
const concat        = require('gulp-concat');

//node.js modules not specifically gulp
const path          = require('path');
const log           = require('fancy-log');

//local includes
const prefixUtils   = require('./prefixutils');
const fsUtils   = require('./fsutils');

//this is not pretty but the elegant way to do it involves merging the pipes
//but gulp does not maintain the concat order when you do this so
//im triggering each pipe in turn in two concurrent series by hand manually to guarantee
//ordering is maintained

//after init() and files and dirs have been added 
//(files' paths added to individualDirs and straight dirs added to concatDirs)
//then go() starts 2 concurrent(ish) processes and calls cb() when both have comepleted
//again we should use merge function here but that messes the ordering up in the pipes
//and files are concatted in wrong order so i do it by hand which is naughty
//but so is the merge function because it shouldnt mess the order up :(
var globalConcatProgress = {
    init: function( cb, srcDir, destDir, concatDirGlob, individualDirGlob, concatOnIncrement, individualOnIncrement ) {
        this.srcDir = srcDir;
        this.destDir = destDir;
        this.concatDirGlob = concatDirGlob;
        this.concatDirs = [];
        this.concatPointer = 0;
        this.concatOnIncrement = concatOnIncrement;
        this.concatCallback = function() {globalConcatProgress.concatIncrement();};
        this.individualDirGlob = individualDirGlob;
        this.individualDirs = [];
        this.individualPointer = 0;
        this.individualOnIncrement = individualOnIncrement;
        this.individualCallback = function() {globalConcatProgress.individualIncrement();};
        this.finishedCallBack = cb;
        log( 'init' );
        log( this );
    },
    addDir: function ( fileOrDir ) {
        if( fileOrDir.isDir && this.concatDirs.includes( fileOrDir.nameAndPath ) === false ) {
            this.concatDirs.push( fileOrDir.nameAndPath );
        } else if( !fileOrDir.isDir && this.individualDirs.includes( path.dirname(fileOrDir.nameAndPath) ) === false ) {
            this.individualDirs.push( path.dirname(fileOrDir.nameAndPath) );
        }
    },
    go: function() {
        log( 'go' );
        log( this );
        this.concatOnIncrement( this.concatCallback, this.srcDir, this.destDir, this.concatDirGlob, this.concatDirs[ this.concatPointer ] );
        this.individualOnIncrement( this.individualCallback, this.srcDir, this.destDir, this.individualDirGlob, this.individualDirs[ this.individualPointer ] );
    },
    concatIncrement: function() {
        log( 'concatIncrement' );
        log( this );
        this.concatPointer++;
        if( this.concatIsComplete() ) { this.tryStop(); } 
        else { this.concatOnIncrement( this.concatCallback, this.srcDir, this.destDir, this.concatDirGlob, this.concatDirs[ this.concatPointer ] ); }
    },
    individualIncrement: function() {
        log( 'individualIncrement' );
        log( this );
        this.individualPointer++;
        if( this.individualIsComplete() ) { this.tryStop(); } 
        else { this.individualOnIncrement( this.individualCallback, this.srcDir, this.destDir, this.individualDirGlob, this.individualDirs[ this.individualPointer ] ); }
    },    
    concatIsComplete: function() { log( 'individualIncrement' ); log( this ); return this.concatPointer >= this.concatDirs.length; },
    individualIsComplete: function() { log( 'individualIsComplete' ); log( this ); return this.individualPointer >= this.individualDirs.length; },
    tryStop: function() { if( this.concatIsComplete() && this.individualIsComplete()) { this.finishedCallBack(); } }
};

function isAConcatDirOrFile( dirOrFilePath, isDir )
{
    let result = prefixUtils.parsePathPrefixes( dirOrFilePath, isDir );
    if( result.firstConcatDirInstance !== null ) {
        return true;
    }
    else if( !isDir && result.fileInstance !== null && result.fileInstance.isConcat ) {
        return true;
    }
    return false;
}

exports.init = globalConcatProgress.init;
exports.addDir = globalConcatProgress.addDir;
exports.go = globalConcatProgress.go;
exports.concatAConcatDir = concatAConcatDir;
exports.concatAnIndividualDir = concatAnIndividualDir;
exports.isAConcatDirOrFile = isAConcatDirOrFile;

function concatAConcatDir( cb, srcDir, destDir, srcGlob, folder )
{
            log( 'concatAConcatDir' );
        log( this );
    let tmpDirNameAndPath = destDir + path.relative(srcDir, folder) + '.js';

    log( "STARTING DIRECTORY CONCAT DIR: " + folder);
    gulp.src( fsUtils.addSlashIfMissing( folder, false, true ) + srcGlob )
        .pipe( naturalSort() )
        .pipe( debug() )
        .pipe( concat( path.basename( tmpDirNameAndPath ) ) )
        .pipe( gulp.dest( path.dirname( tmpDirNameAndPath ) ) )
        .on('end', function() {
            log( "CREATED DIRECTORY CONCAT FILE: " + tmpDirNameAndPath);
            cb.call( this );
        });
}

function concatAnIndividualDir( cb, srcDir, destDir, srcGlob, folder )
{
            log( 'concatAnIndividualDir' );
        log( this );
    let tmpDirNameAndPath = destDir+ path.relative(srcDir, folder) + '.js';
    
    log( "STARTING INDIVIDUALS CONCAT FOR: " + folder);
    gulp.src( fsUtils.addSlashIfMissing( folder, false, true ) + srcGlob )
        //here we need to filter because this is not a concat dir, only filed flagged to 
        //concat should be concatted
        .pipe( filter( filterFunction_OnlyConcatFiles, {restore: false, passthrough: false} ) )
        .pipe( naturalSort() )
        .pipe( debug() )
        .pipe( concat( path.basename( tmpDirNameAndPath ) ) )
        .pipe( gulp.dest( path.dirname( tmpDirNameAndPath ) ) )
        .on('end', function() {
            log( "CREATED INDIVIDUALS CONCAT FILE: " + tmpDirNameAndPath);
            cb.call( this );
        });
}

function filterFunction_OnlyConcatFiles( vinylFile ) {
    return isAConcatDirOrFile( vinylFile.relative, false );
}

function filterFunction_NoConcatFiles( vinylFile ) {
    log( 'filterFunction_NoConcatFiles, returning !isAConcatDirOrFile( "'+vinylFile.relative+'" , false ); = ' + !isAConcatDirOrFile( vinylFile.relative, false ) );
    return !isAConcatDirOrFile( vinylFile.relative, false );
}