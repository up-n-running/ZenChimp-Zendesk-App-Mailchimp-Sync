var parentClient = null;
var zenChimpPlugin = null;
var urlParams = null;

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
else if( !thisV2ClientRegistered )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MODAL IFRAME.JS: ADDING EVENT HANDLER: thisV2Client.on('app.registered', init);" );
    }
    /* DebugOnlyCode - END */ 
    thisV2Client.on('app.registered', init);
}
else
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "MODAL IFRAME.JS: calling init() directly" );
    }
    /* DebugOnlyCode - END */ 
    init();
}

//thisV2Client.invoke('resize', { width: '800px, height: 450px' }); // this is now set in common-utils.js

function init() 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "POPUP:: init() called" );
        console.log( "thisV2ClientRegistered = %o", thisV2ClientRegistered );
        console.log( "Parsing URL Params to get context from patent plugin in sidebar;" );
    }
    /* DebugOnlyCode - END */ 

    urlParams = parseURLParams(window.location.hash);
     /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "urlParams = %o\n\nnow fetiching parent client instance with guid urlParams.parent_guid = %o", urlParams.parent_guid ); } 
    /* DebugOnlyCode - END */
    parentClient = getClientInstanceFromGuid(urlParams.parent_guid); //Hopefully this includes the parent_guid we want to send when creating modals

    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Fetched parent plugin: parentClient = %o", parentClient ); 
        console.log( "Creating plugin instance from PARENT CLIENT: zenChimpPlugin = pluginFactory( parentClient );" ); 
    } 
    /* DebugOnlyCode - END */
    //zenChimpPlugin = pluginFactory( parentClient );
    zenChimpPlugin = pluginFactory( thisV2Client );
    
    zenChimpPlugin.switchToLoadingScreen( 'Loading App...' );

    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "Creating and Initialising plugin.js object:\nzenChimpPlugin.init();" ); } 
    /* DebugOnlyCode - END */

    zenChimpPlugin.init( true, { location: urlParams.parent_location, instanceGuid: urlParams.parent_guid }, { id: parseInt( urlParams.user_id ), email: urlParams.user_email } ); //here we're saying it's modal popup mode and pass in spoofed context object as we cant get it from parent client from modal annoyingly!, we're also passing in a spoofed user with just userid and user email which will get replaced by proper sendesk after init()

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished init2" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
}

function closeButtonOnClick() 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "POPUP:: closeButtonOnClick() called" );
        console.log( "parentClient = %o", parentClient );
    }
    /* DebugOnlyCode - END */ 
    
    thisV2Client.invoke('destroy');

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished closeButtonOnClick, returning false;" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
    return false;
}

function modalSyncToMailchimpButtonOnClick( modalClient ) 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "POPUP:: modalSyncToMailchimpButtonOnClick( modalClient ) called" );
        console.log( "ARG1: modalClient = %o", modalClient );
        console.log( "zenChimpPlugin = %o", zenChimpPlugin );
    }
    /* DebugOnlyCode - END */ 
    
    zenChimpPlugin.syncButtonFromModalOnClick( modalClient );

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished modalSyncToMailchimpButtonOnClick, returning false;" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
    return false;
}