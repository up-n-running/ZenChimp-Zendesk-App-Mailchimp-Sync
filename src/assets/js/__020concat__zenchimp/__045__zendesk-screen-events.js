const __screen_events = {
    
    __hideFieldsIfInUserLocation: function( plugin ) 
    {
        //a lot of work just to hide the 'mailshot customer type' drop down from the user sidebar 
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __hideFieldsIfInUserLocation( plugin ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "plugin.__context.location = " + plugin.__context.location + " and plugin.__resources.__APP_LOCATION_USER = " + plugin.__resources.__APP_LOCATION_USER );
        }
        /* DebugOnlyCode - END */

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING plugin.__v2Client.get( 'userFields:" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + ".isVisible' ) PROMISE to hide field if it is" ); }
        /* DebugOnlyCode - END */   

        if( plugin.__context.location === plugin.__resources.__APP_LOCATION_USER )
        {
            plugin.__v2Client.get( 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.isVisible' ).then( (isVisibleResult) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) 
                { 
                    console.group( "PROMISE RETURNED: get( 'userFields:...' )().then" ); 
                    console.log( "PROMISE RETURNED: plugin.__v2Client.get( 'userFields:...' ).then( (isVisibleResult) => {...}       isVisibleResult = %o", isVisibleResult );
                    console.log( "Checking if user type field is visible and therefore needs hiding: isVisibleResult[ 'userFields:%s.isVisible' ] = %o", plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE , isVisibleResult[ 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.isVisible' ] );
                }
                /* DebugOnlyCode - END */
                
                if( isVisibleResult[ 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.isVisible' ] )
                {
                    /* DebugOnlyCode - START */
                    if( debug_mode ) {  console.log( "HIDING USER FIELD: Calling client.invoke( 'userFields:" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + ".hide' );" ); }
                    /* DebugOnlyCode - END */
                    plugin.__v2Client.invoke( 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.hide' );
                }
                
                /* DebugOnlyCode - START */
                if( debug_mode ) 
                { 
                    console.log( 'Finished Promise Success Function' );
                    console.groupEnd(); 
                }
                /* DebugOnlyCode - END */
            }, ( error ) => { plugin.__switchToErrorMessage(error, "Could not access a Zendesk User Field with a Field Key of '" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + "' Please check your internet connection or reinstall the app. If this issue persists please raise a bug report below");} );
        }
       
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    
    __formFieldChanged: function( plugin, event )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __formFieldChanged( plugin, event ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: event = %o", event );
            console.log( "Checking if in user location: %o", plugin.__context.location === plugin.__resources.__APP_LOCATION_USER )
        }
        /* DebugOnlyCode - END */
        
        let matchedZDFieldName = null;
        if(plugin.__context.location === plugin.__resources.__APP_LOCATION_USER )
        {
            let fieldName = event.propertyName;

            //first check if its the 'big' field: user.mailshot_customer_type
            if( fieldName === "user."+plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "SPECIAL FIELD FOUND: CUSTOMER TYPE. Calling __userScreenCustomerTypeFieldChanged( '%s' );", event.newValue ); }
                /* DebugOnlyCode - END */
                this.__userScreenCustomerTypeFieldChanged( plugin, event.newValue );
            }
            //first check if its the second 'biggest' field: user.organizations
            else if( fieldName === "user.organizations" )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "SPECIAL FIELD FOUND: ORGANIZATIONS. Calling __userScreenOrganizationFieldChanged( '%s' );", event.newValue ); }
                /* DebugOnlyCode - END */
                this.__userScreenOrganizationFieldChanged( plugin, event.newValue );
            }
            //check for user's email address changing
            else if( fieldName === "user.name" )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "IN BUILT FIELD FOUND: name. new value = %o", event.newValue ); }
                /* DebugOnlyCode - END */
                if( plugin.__zendesk_user ) 
                {
                    //whenever you update the name clear the name parts object so it gets refreshed when next queried
                    plugin.__zendesk_user.name = event.newValue;
                    plugin.__zendesk_user.__name_parts = null;
                }
                plugin.switchToMainTemplate();
            }
            //check for user's email address changing
            else if( fieldName === "user.email" )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "IN BUILT FIELD FOUND: email. new value = ;", event.newValue ); }
                /* DebugOnlyCode - END */
                if( plugin.__zendesk_user ) 
                {
                    plugin.__zendesk_user.email = event.newValue;
                }
                plugin.switchToMainTemplate();
            }
            //finally check for any of the mapped user fields changing
            else
            {
                for( let i=0; i < plugin.__field_maps.__user.length; i++)
                {
                    if( fieldName === "user."+plugin.__field_maps.__user[i].zendesk_field )
                    {
                        matchedZDFieldName = plugin.__field_maps.__user[i].zendesk_field;
                        /* DebugOnlyCode - START */
                        if( debug_mode ) { console.log( "MAPPED FIELD FOUND: matchedZDFieldName = '%s'", matchedZDFieldName ); }
                        /* DebugOnlyCode - END */
                        break;
                    }
                }
            }
        }

        //if it's a dependant 'extra' field
        if( matchedZDFieldName!==null && plugin.__zendesk_user )
        {
                plugin.__zendesk_user.findExtraFieldByName( matchedZDFieldName, true ).value = event.newValue;
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Updated correcponding value in plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                plugin.switchToMainTemplate();
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },	
    
    __userScreenOrganizationFieldChanged: function( plugin, newValue )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __userScreenOrganizationFieldChanged( plugin, newValue ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: newValue = %o", newValue );
        }
        /* DebugOnlyCode - END */
        
        //newValue is an array of org objects (if more than one we assume the first is the main one
        if( newValue.length === 0 )
        {
            plugin.__zendesk_user.__organization_id = null;
            plugin.__zendesk_user.__orgObject = null;
            plugin.__zendesk_user.__refreshValidationErrorFlag();
            if( plugin.__enforceUserIsValidAndShowErrorIfNot() )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "mailchimp user hasnt changed, we've taken care of updates to zendesk user, so nothing left to do but switch to main template.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                plugin.switchToMainTemplate();
            }
            /* DebugOnlyCode - START */
            else
            {
                if( debug_mode ) { console.log( "USER HAS JUST REMOVED THE ORG FROM A USER SYNCED IN ORG MODE. SWITCHTOERRORMESSAGE SHOULD HAVE BEEN CALLED SO NO REDIRECTING HERE JUST FINISH CLEANLY HERE." ); }
            }
            /* DebugOnlyCode - END */
        }
        else
        {
            plugin.__zendesk_user.__organization_id = newValue[0].id;
            plugin.__zendesk_user.__orgObject = null;
            
            if( plugin.__zendesk_user.isOrganization() )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Re Added an org id to user butthat is synced in org mode loading new org all over again from APIs.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                plugin.switchToLoadingScreen( "Loading Organization..." );
                makeAjaxCall(
                    this,
                    plugin.__requests.__getZendeskOrganizations( plugin.__zendesk_user.id, plugin.__zendesk_user.__organization_id ), 
                    plugin.__getZendeskOrganizations_Done,
                    plugin.__switchToErrorMessage 
                );
            }
            else
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Added org id to user but as we're not synced in org mode we dont need to load full org object yet, so nothing left to do but switch to main template.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                plugin.switchToMainTemplate();
            }
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __userScreenCustomerTypeFieldChanged: function( plugin, newValue )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __userScreenCustomerTypeFieldChanged( plugin, newValue ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: newValue = %o", newValue );
        }
        /* DebugOnlyCode - END */
        
        let oldCustomerType = plugin.__zendesk_user.customer_type;
        plugin.__zendesk_user.customer_type = newValue;
        plugin.__changeCustomerType( oldCustomerType, newValue );
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
};