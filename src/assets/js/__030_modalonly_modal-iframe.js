var parentClient = null;
var zenChimpPlugin = null;
var urlParams = 

//thisV2Client.invoke('resize', { width: '100%', height: '400px' });
thisV2Client.on('app.registered', init);

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

function closeButtonOnClick() {
    thisV2Client.invoke('destroy');
    return false;
}