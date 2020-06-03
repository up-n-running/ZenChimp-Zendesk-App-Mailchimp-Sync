//NOTE: debug_mode, thisV2Client & modal_createChildFromParent() are declared in common-utils.js
if( typeof( thisV2ClientRegistered ) === 'undefined' )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.error( "MODAL IFRAME.JS: ERROR CONDITION: thisV2ClientRegistered is undefined. " );
    }
    thisV2Client.on('app.registered', init);
    /* DebugOnlyCode - END */ 
}
else if( !thisV2ClientRegistered )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MODAL IFRAME.JS: ADDING EVENT HANDLER: thisV2Client.on('app.registered', init);" );
    }
    thisV2Client.on('app.registered', init);
    /* DebugOnlyCode - END */ 
}
else
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MODAL IFRAME.JS: calling init() directly" );
    }
    init();
    /* DebugOnlyCode - END */ 
}

var parentClient = null;
var zenChimpPlugin = null;
var urlParams = null;

//thisV2Client = ZAFClient.init();
//thisV2Client.invoke('resize', { width: '100%', height: '400px' });
//thisV2Client.on('app.registered', init);

function init() 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "POPUP:: init() called" );
        console.log( "init called because of thisV2Client.on('app.registered', init);" );
        console.log( "Parsing URL Params to get context from patent plugin in sidebar;" );
    }
    /* DebugOnlyCode - END */ 

    urlParams = parseURLParams(window.location.hash);
     /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "urlParams = %o\n\nnow fetiching parent client instance with guid urlParams.parent_guid = %o", urlParams.parent_guid ); } 
    /* DebugOnlyCode - END */
    parentClient = getClientInstanceFromGuid(urlParams.parent_guid); //Hopefully this includes the parent_guid we want to send when creating modals

    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "Creating plugin instance from PARENT CLIENT: zenChimpPlugin = pluginFactory( parentClient );" ); } 
    /* DebugOnlyCode - END */
    zenChimpPlugin = pluginFactory( parentClient );

    zenChimpPlugin.switchToLoadingScreen( 'Loading App...' );

    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "Creating and Initialising plugin.js object:\nzenChimpPlugin.init();" ); } 
    /* DebugOnlyCode - END */

    zenChimpPlugin.init( true, { location: urlParams.parent_location, instanceGuid: urlParams.parent_guid } ); //here we're saying it's modal popup mode and pass in spoofed context object as we cant get it from parent client from modal annoyingly!

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished init2" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
}

thisV2Client.on('modal.close', () => { closeButtonOnClick(); });

function closeButtonOnClick() 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "POPUP:: closeButtonOnClick() called" );
        console.log( "zenChimpPlugin.syncButtonPressed = %o", thisV2Client.syncButtonPressed );
        console.log( "parentClient = %o", parentClient );
    }
    /* DebugOnlyCode - END */ 
    
    thisV2Client.invoke('destroy');
    if( typeof( zenChimpPlugin.syncButtonPressed ) !== 'undefined' && zenChimpPlugin.syncButtonPressed )
    {
        parentClient.trigger('modalClosedAfterSync');
    }

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished closeButtonOnClick, returning false;" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
    return false;
}