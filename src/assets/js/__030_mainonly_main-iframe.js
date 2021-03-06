var zenChimpPlugin = pluginFactory( thisV2Client );

thisV2Client.invoke('resize', { width: '100%', height: (debug_mode)?'171px':'150px' });

//NOTE: debug_mode, thisV2Client & modal_createChildFromParent() are declared in common-utils.js
if( typeof( thisV2ClientRegistered ) === 'undefined' )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.error( "MODAL IFRAME.JS: ERROR CONDITION: thisV2ClientRegistered is undefined. " );
    }
    /* DebugOnlyCode - END */ 
    
    thisV2Client.on('app.registered', init);
}
if( !thisV2ClientRegistered )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MAIN IFRAME.JS: ADDING EVENT HANDLER: thisV2Client.on('app.registered', init);" );
    }
    /* DebugOnlyCode - END */ 
    
    thisV2Client.on('app.registered', init);
}
else
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MAIN IFRAME.JS: calling init() directly" );
    }
    /* DebugOnlyCode - END */ 
    
    init();
}


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

