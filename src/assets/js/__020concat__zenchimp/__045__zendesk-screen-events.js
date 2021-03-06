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
        if( debug_mode ) { console.log( "CALLING plugin.__v2Client.get( 'userFields:" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + " ) PROMISE to hide field if it is visible." ); }
        /* DebugOnlyCode - END */

        if( plugin.__context.location === plugin.__resources.__APP_LOCATION_USER )
        {
            plugin.__v2Client.get( 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE ).then( (isVisibleResult) => 
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) 
                { 
                    console.group( "PROMISE RETURNED: get( 'userFields:...' )().then" ); 
                    console.log( "PROMISE RETURNED: plugin.__v2Client.get( 'userFields:...' ).then( (isVisibleResult) => {...}       isVisibleResult = %o", isVisibleResult );
                    console.log( "Checking if user type field is visible and therefore needs hiding: isVisibleResult[ 'userFields:%s' ].isVisible = %o", plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE , isVisibleResult[ 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE ].isVisible );
                }
                /* DebugOnlyCode - END */
                try
                {
                    if( isVisibleResult[ 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE ].isVisible )
                    {
                        /* DebugOnlyCode - START */
                        if( debug_mode ) {  console.log( "HIDING USER FIELD: Calling client.invoke( 'userFields:" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + ".hide' );" ); }
                        /* DebugOnlyCode - END */
                        plugin.__v2Client.invoke( 'userFields:' + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.hide' );
                        setTimeout( () => { __screen_events.__hideFieldsIfInUserLocation( plugin ); }, 3000); //just to make sure the hide worked
                    }
                }
                catch(e)
                {
                    setTimeout( () => { __screen_events.__hideFieldsIfInUserLocation( plugin ); }, 1000);
                }

                /* DebugOnlyCode - START */
                if( debug_mode ) 
                { 
                    console.log( 'Finished Promise Success Function' );
                    console.groupEnd(); 
                }
                /* DebugOnlyCode - END */
            }, ( error ) => 
            { 
                plugin.__switchToErrorMessage(error, "Could not access a Zendesk User Field with a Field Key of '" + plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + "' Please check your internet connection or reinstall the app. If this issue persists please raise a bug report below");
                setTimeout( () => { __screen_events.__hideFieldsIfInUserLocation( plugin ); }, 1000);
            } );
        }
       
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    
    __userFormFieldChanged: function( plugin, event, triggeredFromAnotherInstance )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __userFormFieldChanged( plugin, event, triggeredFromAnotherInstance ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: event = %o", event );
            console.log( "ARG3: triggeredFromAnotherInstance = %o", triggeredFromAnotherInstance );
            console.log( "plugin.__currentScreen = %o ", plugin.__currentScreen );
            console.log( "Checking if in user location: %o", plugin.__context.location === plugin.__resources.__APP_LOCATION_USER )
        }
        /* DebugOnlyCode - END */
        
        let actionTaken = false;
        let matchedZDFieldName = null;
        let fieldName = event.propertyName;

        //first check if its the 'big' field: user.mailshot_customer_type
        if( fieldName === "user."+plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "SPECIAL FIELD FOUND: CUSTOMER TYPE. Calling __userScreenCustomerTypeFieldChanged( '%s' );", event.newValue ); }
            /* DebugOnlyCode - END */
            this.__userScreenCustomerTypeFieldChanged( plugin, event.newValue, triggeredFromAnotherInstance );
            actionTaken = true;
        }
        //first check if its the second 'biggest' field: user.organizations
        else if( fieldName === "user.organizations" )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "SPECIAL FIELD FOUND: ORGANIZATIONS. Calling __userScreenOrganizationFieldChanged( '%s' );", event.newValue ); }
            /* DebugOnlyCode - END */
            actionTaken = this.__userScreenOrganizationFieldChanged( plugin, event.newValue, triggeredFromAnotherInstance );
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

            plugin.__refreshMainTemplateOrEnqueueRefresh( plugin );
            actionTaken = true;
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

            if( triggeredFromAnotherInstance )
            {
                plugin.__reloadAppOrEnqueueReload();
            }
            else
            {
                plugin.__refreshMainTemplateOrEnqueueRefresh();
            }
            actionTaken = true;
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

        //if it's a dependant 'extra' field
        if( matchedZDFieldName!==null && plugin.__zendesk_user )
        {
            plugin.__zendesk_user.__findExtraFieldByName( matchedZDFieldName, true ).__value = event.newValue;

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "Updated correcponding value in plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
            /* DebugOnlyCode - END */

            plugin.__refreshMainTemplateOrEnqueueRefresh();
            actionTaken = true;
        }
        
        //if this was called by an actual screen update and not an external trigger and if something actually happened then call triggers so the same thing can happen on all necessary child instances
        if( !triggeredFromAnotherInstance && actionTaken )
        {
            plugin.__comms_triggerOtherInstances( plugin.__v2Client, "zendeskUserUpdated", { userId: plugin.__zendesk_user.id , event: event } );
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },	
    
    __userScreenOrganizationFieldChanged: function( plugin, newValue, triggeredFromAnotherInstance )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __userScreenOrganizationFieldChanged( plugin, newValue, triggeredFromAnotherInstance ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: newValue = %o", newValue );
            console.log( "ARG3: triggeredFromAnotherInstance = %o", triggeredFromAnotherInstance );
        }
        /* DebugOnlyCode - END */
        
        //was it actually changed or was a phantom event trigered (it does happen zendesk refreshes this field sometimes when you edit other stuff)
        if( ( newValue.length === 0 && plugin.__zendesk_user.__organization_id === null ) ||
            ( newValue.length > 0 && newValue[0].id === plugin.__zendesk_user.__organization_id ) )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.log( "Finished, returning false to signigy no change made" );
                console.groupEnd();
            }
            /* DebugOnlyCode - END */
            return false;
        }
        
        //newValue is an array of org objects (if more than one we assume the first is the main one
        if( newValue.length === 0 )
        {
            plugin.__zendesk_user.__organization_id = null;
            plugin.__zendesk_user.__orgObject = null;
            plugin.__zendesk_user.__refreshValidationErrorFlag();
            if( plugin.__enforceZendeskUserIsValidAndShowErrorIfNot() )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "mailchimp user hasnt changed, we've taken care of updates to zendesk user, so nothing left to do but switch to main template.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                
                plugin.__refreshMainTemplateOrEnqueueRefresh();
            }
            /* DebugOnlyCode - START */
            else
            {
                if( debug_mode ) { console.log( "USER HAS JUST REMOVED THE ORG FROM A USER SYNCED IN ORG MODE. SWITCHTOERRORMESSAGE SHOULD HAVE BEEN CALLED SO NO REDIRECTING HERE JUST FINISH CLEANLY HERE." ); }
                if( triggeredFromAnotherInstance )
                {
                    //is its a child app instance dont bother faffing with error messages just force reload as the parent app may have done all sorts of things from this point
                    plugin.__reloadAppOrEnqueueReload( true );
                }
            }
            /* DebugOnlyCode - END */
        }
        else
        {
            plugin.__zendesk_user.__organization_id = newValue[0].id;
            plugin.__zendesk_user.__orgObject = null;
            
            if( plugin.__zendesk_user.__isOrganization() )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Re Added an org id to user butthat is synced in org mode loading new org all over again from APIs.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                
                if( !triggeredFromAnotherInstance )
                {
                    plugin.switchToLoadingScreen( "Loading Organization..." );  //dont need to check if plugin.__currentScreen === 'main' as sometimes the error is caused by onvalid org and changing ord should refresh app to see if error has gone away
                    makeAjaxCall(
                        plugin,
                        plugin.__requests.__getZendeskOrganizations( plugin.__zendesk_user.id, plugin.__zendesk_user.__organization_id ), 
                        plugin.__getZendeskOrganizations_Done,
                        plugin.__switchToErrorMessage 
                    );
                }
                else
                {
                    plugin.__reloadAppOrEnqueueReload( true );
                }
            }
            else
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Added org id to user but as we're not synced in org mode we dont need to load full org object yet, so nothing left to do but switch to main template.  plugin.__zendesk_user = %o", plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                
                plugin.__refreshMainTemplateOrEnqueueRefresh();
            }
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning true to signify change has been made" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return true;
    },

    __userScreenCustomerTypeFieldChanged: function( plugin, newValue, triggeredFromAnotherInstance )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "SCREEN-EVENTS.JS: __userScreenCustomerTypeFieldChanged( plugin, newValue, triggeredFromAnotherInstance ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: newValue = %o", newValue );
            console.log( "ARG3: triggeredFromAnotherInstance = %o", triggeredFromAnotherInstance );
        }
        /* DebugOnlyCode - END */
        
        let oldCustomerType = plugin.__zendesk_user.__customer_type;
        plugin.__zendesk_user.__customer_type = newValue;
        plugin.__changeCustomerType( oldCustomerType, newValue );
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    }, 
    
    __triggers: 
    {
        __zendeskUserUpdated: function( plugin, comms )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.group( "SCREEN-EVENTS.JS: TRIGGER __zendeskUserUpdated( plugin, comms ) called" );
                console.log( "ARG1: plugin = %o", plugin );
                console.log( "ARG2: comms = %o", comms );
                console.log( "Time Called: %o", new Date() );
                console.log( plugin.toStringDebug());
            }
            /* DebugOnlyCode - END */

            let userId = comms.userId;
            if( !plugin.__modalMode && plugin.__zendesk_user && plugin.__zendesk_user.id === userId )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "FOUND CLIENT with user with user '%s', plugin.__zendesk_user = ", userId , plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                
                __screen_events.__userFormFieldChanged( plugin, comms.event, true );
            }
            
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.log( "Finished, NEW plugin.__zendesk_user = %o", plugin.__zendesk_user );
                console.groupEnd();
            }
            /* DebugOnlyCode - END */
        },
    
        __zendeskOrganizationUpdated: function( plugin, comms )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.group( "SCREEN-EVENTS.JS: TRIGGER __zendeskOrganisationUpdated( plugin, comms ) called" );
                console.log( "ARG1: plugin = %o", plugin );
                console.log( "ARG2: comms = %o", comms );
                console.log( "Time Called: %o", new Date() );
                console.log( plugin.toStringDebug());
            }
            /* DebugOnlyCode - END */

            let organizationId = comms.organizationId;
            if( !plugin.__modalMode && plugin.__zendesk_user && plugin.__zendesk_user.__orgObject && plugin.__zendesk_user.__orgObject.id === organizationId )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "FOUND CLIENT with user with organisation '%s', plugin.__zendesk_user = ", organizationId , plugin.__zendesk_user ); }
                /* DebugOnlyCode - END */
                
                if( comms.fieldName === plugin.__resources.__ORG_FIELD_HANDLE_CUSTOMER_TYPE )
                {
                    plugin.__zendesk_user.__orgObject.__customer_type = comms.newValue;
                }
                else
                {
                    plugin.__zendesk_user.__orgObject.__findExtraFieldByName( comms.fieldName, true ).__value = comms.newValue;
                }
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Updated correcponding value in plugin.__zendesk_user.__orgObject = %o", plugin.__zendesk_user.__orgObject ); }
                /* DebugOnlyCode - END */
                
                plugin.__refreshMainTemplateOrEnqueueRefresh( plugin );
            }
            
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.log( "Finished __zendeskOrganizationUpdated" );
                console.groupEnd();
            }
            /* DebugOnlyCode - END */
        }
    }
};