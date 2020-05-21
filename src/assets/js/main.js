//NOTE: debug_mode, thisV2Client, switchToHdbsFileTemplate() & modal_createChildFromParent() are declared in common-utils.js

var zenChimpPlugin = pluginFactory( thisV2Client );

thisV2Client.invoke('resize', { width: '100%', height: '200px' });
thisV2Client.on('app.registered', init);

function init() 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "MAIN.JS: init() called" );
        console.log( "init() called because of thisV2Client.on('app.registered', init);" );
    }
    /* DebugOnlyCode - END */ 
      
    zenChimpPlugin.switchToLoadingScreen( 'Loading App...' );

    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "Creating and Initialising plugin.js object:\nzenChimpPlugin.init();" ); } 
    /* DebugOnlyCode - END */

    zenChimpPlugin.init(); //no params means not in modal popul mode and init() must find the context (which page we're on) itself by querying thisV2Client

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished init" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
}

function syncButtonOnclick()
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "MAIN.JS: syncButtonOnclick() called" );
        console.log( "Triggering Modal:    thisV2Client.context().then(create_modal);" );
    }
    /* DebugOnlyCode - END */
    
    thisV2Client.context().then(modal_createChildFromParent, (err) => { console.error( err ); });
    
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished syncButtonOnclick, returning false;" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
    return false;
}

