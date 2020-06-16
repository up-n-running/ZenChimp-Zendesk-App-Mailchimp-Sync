var debug_mode = false;
/* DebugOnlyCode - START */
debug_mode = true;
/* DebugOnlyCode - END */ 

var __organization_field_maps = null;
var __organization_id = null;

var __thisV2Client = ZAFClient.init();
__thisV2Client.on('app.registered', ( data ) => { __init( data ); } );


//when the app is activated switch on the form field changed trigger event
__thisV2Client.on('app.activated', function(data) {
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "ORG-IFRAME.JS: TRIGGER: app.activated" );
        console.log( "ARG1: data = %o", data );
        console.log( "SWITCHING ON *.changed TRIGGER" );
    }
    /* DebugOnlyCode - END */ 
    
    //switching on  the trigger thant runs when any of the values change - should only be on while user has got org screen in front of htem (app active)
    __thisV2Client.on( '*.changed', __formFieldChanged );
    
    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished app.activated trigger" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
});

//when the app is deactivated switch off the form field changed trigger event
__thisV2Client.on('app.deactivated', function(data) {
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "ORG-IFRAME.JS: TRIGGER: app.deactivated" );
        console.log( "ARG1: data = %o", data );
        console.log( "SWITCHING OFF *.changed TRIGGER" );
    }
    /* DebugOnlyCode - END */ 
    
    //switching offthe trigger thant runs when any of the values change - should only be on while user has got org screen in front of htem (app active)
    __thisV2Client.off( '*.changed', __formFieldChanged );
    
    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished app.deactivated trigger" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
});


function __init( data ) 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "ORG-IFRAME.JS: init( data ) called" );
        console.log( "ARG1: data = %o", data );
    }
    /* DebugOnlyCode - END */ 
      

    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "CALLING __v2Client.metadata() PROMISE to populate this.__settings {} and this.__field_maps {}. this.__settings_fetched = %s", this.__settings_fetched ); }
    /* DebugOnlyCode - END */        

    //Now Get Settings from manifest.json into __organization_field_maps
    __thisV2Client.metadata().then( (metadata) =>  {
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.group( "PROMISE RETURNED: metadata().then" ); console.log( "PROMISE RETURNED: metadata().then( (metadata) => {...}       metadata = %o", metadata ); }
        /* DebugOnlyCode - END */

        //setup private field mappings object (gets minified)
        __organization_field_maps = JSON.parse( metadata.settings.mailchimp_organization_field_mappings );
        //add spoofed field mapping for the required field 'mailshot_customer_display_name' which is not is the field mapping settings as it's already in requirements.json
        __organization_field_maps.push( { zendesk_field: "mailshot_customer_display_name" } );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "parsed org field maps: __organization_field_maps = %o", __organization_field_maps );
            console.groupEnd(); 
        }
        /* DebugOnlyCode - END */
    }, ( error ) => { console.error( "Could not get your app settings, please check your internet connection and try again"); } );

    //Now Get Organization Id from Screen
    __thisV2Client.get('organization.id').then( (data) =>  {
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.group( "PROMISE RETURNED: __thisV2Client.get('organization.id').then" ); console.log( "ARG1: data = %o", data ); }
        /* DebugOnlyCode - END */

        //setup private field mappings object (gets minified)
        __organization_id = data['organization.id'];

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished: __organization_id = %o", __organization_id );
            console.groupEnd(); 
        }
        /* DebugOnlyCode - END */
    }, ( error ) => { console.error( "Could not get your app settings, please check your internet connection and try again"); } );

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "SWITCHING ON *.changed TRIGGER" );
    }
    /* DebugOnlyCode - END */ 
    
    //switching on  the trigger thant runs when any of the values change - should only be on while user has got org screen in front of htem (app active)
    __thisV2Client.on( '*.changed', __formFieldChanged );

    /* DebugOnlyCode - START */  
    if( debug_mode ) 
    { 
        console.log( "Finished init" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
}

function  __formFieldChanged( event )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "ORG-IFRAME.JS: __formFieldChanged( event ) called" );
        console.log( "ARG1: event = %o", event );
    }
    /* DebugOnlyCode - END */

    let matchedZDFieldName = null;
    let newValue = null;
    let fieldName = event.propertyName;

    for( let i=0; i < __organization_field_maps.length; i++)
    {
        if( fieldName === "organization."+__organization_field_maps[i].zendesk_field )
        {
            matchedZDFieldName = __organization_field_maps[i].zendesk_field;
            newValue = event.newValue;
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "MAPPED FIELD FOUND: matchedZDFieldName = '%s', newValue = '%s'", matchedZDFieldName, newValue ); }
            /* DebugOnlyCode - END */
            break;
        }
    }

    //if it's a dependant 'extra' field then broadcast trigger
    if( matchedZDFieldName!==null )
    {
        __triggerInstances( __thisV2Client, "zendeskOrganizationUpdated", { organizationId: __organization_id, fieldName: matchedZDFieldName, newValue: newValue } );
    }

    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
}

function __triggerInstances( client, eventName, comms )
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "ORG-IFRAME.JS: triggerInstances( eventName, comms ) called" );
        console.log( "ARG1: client._instanceGuid = %o", client._instanceGuid );
        console.log( "ARG2: eventName = %o", eventName );
        console.log( "ARG3: comms = %o", comms );
    }
    /* DebugOnlyCode - END */
    
    let callerInstanceGuid = client._instanceGuid;

    __thisV2Client.get('instances').then( function(instancesData) {
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.group( "PROMISE client.get('instances').then" ); console.log( "ARG1: instancesData = %o, callerInstanceGuid = %o", instancesData, callerInstanceGuid ); }
        /* DebugOnlyCode - END */

        var instances = instancesData.instances;
        for (var instanceGuid in instances) {
            if ( instanceGuid !== callerInstanceGuid && instances[instanceGuid].location !== 'organization_sidebar') {

                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "CALLING TRIGGER Instance, instanceGuid = %o, comms = %o, client.instance(instanceGuid) = %o", instanceGuid, comms, client.instance(instanceGuid) ); }
                /* DebugOnlyCode - END */
                client.instance(instanceGuid).trigger(eventName, comms );

            }
        }
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished client.get('instances').then" );
            console.groupEnd(); 
        }
        /* DebugOnlyCode - END */
    } );

    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished __triggerInstances" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
}