var pluginFactory = function( thisV2Client ) {

  return {

    __v2Client: thisV2Client,

    //set on init
    __context: null,

    __resources: 
    {
        //a public version of __resources called 'resources' will be created in init() so
        //that the public properties below can still be accessed outside this file. 
        //Anything beginning __ will be mangled by the minifier but the rest 
        //(including the public 'resources' object created in init() ) won't be mangled
        __APP_LOCATION_TICKET: "ticket_sidebar",
        __APP_LOCATION_USER: "user_sidebar",

        __TYPE_TEXT: "text", /* public copy taken in init() */
        __TYPE_IMAGE: "image", /* public copy taken in init() */
        __TYPE_CHECKBOX: "checkbox", /* public copy taken in init() */

        __USER_FIELD_HANDLE_CUSTOMER_TYPE: "mailshot_customer_type",
        __ORG_FIELD_HANDLE_CUSTOMER_TYPE: "mailshot_customer_display_name",
        
        __CUSTOMER_TYPE_NOT_SET: null, /* public copy taken in init() */
        __CUSTOMER_TYPE_EXCLUDE: "mailshot_exclude_from_mailshot", /* public copy taken in init() */
        __CUSTOMER_TYPE_USE_DEFAULT: "mailshot_use_default_values", /* public copy taken in init() */
        __CUSTOMER_TYPE_USE_ORGANIZATION: "mailshot_use_organisation_values", /* public copy taken in init() */

        __TEMPLATE_NAME_MAIN: "./templates/main.hdbs",
        __TEMPLATE_NAME_MAIN_MODAL_MODE: "./templates/sync-modal.hdbs",
        __TEMPLATE_ID_LOADING: "loading-screen-template",
        __TEMPLATE_NAME_SHOWERROR: "./templates/show_error.hdbs",
        
        __SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL: "https://github.com/up-n-running/ZenChimp-Zendesk-App-Mailchimp-Sync/raw/master/extras/ZenchimpSettingsGenerator.xlsx"
    },

    // <editor-fold defaultstate="collapsed" desc="AJAX API SETTINGS GENERATORS">
    __requests:
    {
        __parentPlugin: null,  //set back to plugin (as in plugin.__requests) during init();

        __getZendeskUser: function( id )
        {
            let userApiCallSettings = 
            {       
                    url: '/api/v2/users/'+encodeURIComponent(id)+'.json',
                    type:'GET',
                    dataType: 'json'
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__getZendeskUser(%d), userApiCallSettings = %o", id, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        __updateZendeskUser: function( userToSyncObject )
        {
            let userApiCallSettings = 
            {
                url: '/api/v2/users/create_or_update.json',
                type:'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify(
                {
                    'user': 
                    { 
                        'id': userToSyncObject.id, 
                        'email': userToSyncObject.email,
                        'user_fields':
                        {
                            'mailshot_customer_type': userToSyncObject.__customer_type
                        }
                    }
                })
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__updateZendeskUser(%o), userApiCallSettings = %o", userToSyncObject, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        __getZendeskOrganizations: function(userId, organizationId)
        {
            let userApiCallSettings = 
            {
                url:    typeof( organizationId ) !== "undefined" && organizationId !== null ? 
                        '/api/v2/organizations/'+encodeURIComponent(organizationId)+'.json' : 
                        '/api/v2/users/'+encodeURIComponent(userId)+'.organizations.json', 
                type:'GET',
                dataType: 'json'
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__getZendeskOrganizations(%d, %d), userApiCallSettings = %o", userId, organizationId, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        }
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="Initialisation Functions">
    init: function( modalMode, existingContext, existingUser ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "init( modalMode, existingContext, existingUser ) called" );
            console.log( "ARG1: modalMode = %o", modalMode );
            console.log( "ARG2 (optional): existingContext = %o", existingContext );
            console.log( "ARG3 (optional): existingUser = %o", existingUser );
        }
        /* DebugOnlyCode - END */
        
        //wire up event listeners
        thisV2Client.on( 'ticket.requester.id.changed'   , () => { this.resetAppIfPageFullyLoaded(); } );
        thisV2Client.on( '*.changed'                  , (data) => { this.__userFormFieldChanged(data); } );
        //triggers from other instances of app
        thisV2Client.on( 'zendeskOrganizationUpdated' , (data) => { this.__comms_zendeskOrganizationUpdated(data); } );
        thisV2Client.on( 'syncOccured' ,                (data) => { this.__comms_syncOccured(data); } );
        thisV2Client.on( 'modalSyncPerformed' ,         (data) => { this.__comms_modalSyncPerformed(data); } );
        //when the app is activated switch on the form field changed trigger event
        thisV2Client.on( 'app.activated'              , (data) => { this.__comms_appActivated(data); } );
        thisV2Client.on( 'app.deactivated'            , (data) => { this.__comms_appDeactivated(data); } );
        this.__comms_appActivated( null );
        
        //housekeeping (functions in this.__requests cannot access parent plugin when they in turn reference 'this' so we have a pointer back - it's just a javascript function context thing)
        this.__requests.__parentPlugin = this;
        this.__modalMode = ( typeof modalMode === 'undefined' || modalMode === null ) ? false : modalMode;

        //delcare other instance variables
        this.__mailshot_sync_user = null; 
        this.__zendesk_user = ( typeof existingUser === 'undefined' ) ? null : existingUser;         //if a spoofed zendesk user object was passed in then set the zendesk object to that - it will be replaced by the proper user object at the end of resetAppIfPageFullyLoaded()

        //flag to keep track of when app is fully loaded
        this.__isFullyInitialized = false;  //this will only be set to true in resetAppIfPageFullyLoaded once the above ones are set ()

        // ***** GET WHICH SCREEN WE'RE ON *******
        this.__context = ( typeof existingContext === 'undefined' ) ? null : existingContext;
        //get location (which screen we're on). Unless a spoofed __context value was passed into init() from outside then we dont need to call this promise cos we can use the spoofed one
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING this.__v2Client.context() PROMISE IF CONNTEXT WASNT PASSED IN to populate this.__context {}. this.__context = %o", this.__context ); }
        /* DebugOnlyCode - END */
        if( this.__context === null ) 
        {
            this.__v2Client.context().then( (context) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.group( "PROMISE RETURNED: context().then" ); console.log( "PROMISE RETURNED: this.__v2Client.context().then( (__context) => {...}       context = %o", context ); }
                /* DebugOnlyCode - END */
                
                this.__context = context;
                
                //hide hidden customer type field if in user screen now we know the context
                this.__hideFieldsIfInUserLocation();
                this.resetAppIfPageFullyLoaded(); //check if this was the last initionalisation step we were waiting for before we can continue
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.groupEnd(); }
                /* DebugOnlyCode - END */
            }, ( error ) => { this.__switchToErrorMessage(error, "Could not get app __context, please check your internet connection and try again");} );
        }

        // ***** GET SETTINGS *******
        this.__settings_fetched = false; //flag to keep track of when proise below has returned
        //declare settings object - populated on promise (only private one needed)
        this.__settings = {};
        //declare object for field mappings - populated on promise (a public one will be made available below)
        this.__field_maps = {};
        
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING this.__v2Client.metadata() PROMISE to populate this.__settings {} and this.__field_maps {}. this.__settings_fetched = %s", this.__settings_fetched ); }
        /* DebugOnlyCode - END */        
        
        //Now Get Settings from manifest.json into __settings and __field_maps
        this.__v2Client.metadata().then( (metadata) =>  {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.group( "PROMISE RETURNED: metadata().then" ); console.log( "PROMISE RETURNED: metadata().then( (metadata) => {...}       metadata = %o", metadata ); }
            /* DebugOnlyCode - END */
            
            //fetch settings from settings screen
            let returnedSettings = metadata.settings;
            this.__settings = {
                __mailchimp_api_key : returnedSettings.mailchimp_api_key,
                __mailchimp_datacentre_prefix : returnedSettings.mailchimp_datacentre_prefix,
                __mailchimp_list_id : returnedSettings.mailchimp_list_id,
                __mailchimp_merge_field_forename : returnedSettings.mailchimp_merge_field_forename,
                __mailchimp_merge_field_surname : returnedSettings.mailchimp_merge_field_surname,
                __mailchimp_list_field_customer_type_name : returnedSettings.mailchimp_merge_field_customer_type,
                __mailchimp_list_field_customer_type_default_value : returnedSettings.mailchimp_merge_field_customer_type_default_val,
                __mailchimp_organisation_button_label : returnedSettings.mailchimp_organisation_button_label,
                __mailchimp_standard_button_label : returnedSettings.mailchimp_standard_button_label
            } 
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "    populated private settings object: this.__settings = %o", this.__settings ); }
            /* DebugOnlyCode - END */

            //setup private field mappings object (gets minified)
            this.__field_maps = {
                __cust_type    : { zendesk_field: this.__resources.__ORG_FIELD_HANDLE_CUSTOMER_TYPE, mailchimp_field: this.__settings.__mailchimp_list_field_customer_type_name, type: this.__resources.__TYPE_TEXT, default_value: this.__settings.__mailchimp_list_field_customer_type_default_value },
                __organisation : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_organization_field_mappings, 'Organisation Field Mapping', false ),
                __user         : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_user_field_mappings, 'User Field Mapping', false ),
                __mc_only      : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_mailshot_only_field_mappings, 'Mailchimp Only Field Mapping', true )
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "populated private field maps object: this.__field_maps = %o", this.__field_maps ); }
            /* DebugOnlyCode - END */
           
            if ( this.__field_maps.__organisation !== null &&
                 this.__field_maps.__user !== null &&
                 this.__field_maps.__mc_only !== null 
            ) {
                this.__settings_fetched = true;
                this.resetAppIfPageFullyLoaded(); //check if this was the last initionalisation step we were waiting for before we can continue
            }
            
            //if not - __switchToErrorMessage has already been called inside __validateFieldMappingsJSON() so no need to redirect user anywhere
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.groupEnd(); }
            /* DebugOnlyCode - END */
        }, ( error ) => {  this.__switchToErrorMessage(error, "Could not get your app settings, please check your internet connection and try again"); } );
 
         /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "init() finished, BUT resetAppIfPageFullyLoaded() will complete initialisation once both promises complete asynchronously", this.__isFullyInitialized );
            console.log( "this.__settings_fetched = ", this.__settings_fetched );
            console.log( "this.__context = ", this.__context );
            console.log( "this.__isFullyInitialized = ", this.__isFullyInitialized);
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    resetAppIfPageFullyLoaded: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "resetAppIfPageFullyLoaded called" );
            console.dir( this );
            console.log( "this.__isFullyInitialized = " + this.__isFullyInitialized + " and this.__resources.__APP_LOCATION_TICKET = " + this.__resources.__APP_LOCATION_TICKET + " and this.__context.location = %s", ( this.__context === null ? '[this.__context = null]' : this.__context.location ) );
        }
        /* DebugOnlyCode - END */

        //has the __context (ie which page are we on) loaded from init() function
        if( !this.__isFullyInitialized && this.__context === null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.__context === null" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        }   
        //have the settings (ie on the app settings config screen) loaded from init() function
        if( !this.__isFullyInitialized && !this.__settings_fetched )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.__settings_fetched = false" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        } 

        //dont continue if we havent fetched the user id from the ticket sidebar OR user sidebar yet - or if the app is fully loaded already but the usr has been blanked out and the app has been reset
        if( this.__zendesk_user === null )
        {
            let clientUserPropertyToFetch = this.__context.location === this.__resources.__APP_LOCATION_TICKET ? 'ticket.requester' : 'user';
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.__zendesk_user === null, running this.__v2Client.get('" + clientUserPropertyToFetch + "')" ); console.groupEnd();}
            /* DebugOnlyCode - END */
            this.__v2Client.get( clientUserPropertyToFetch ).then( (onScreenUserOrTicketRequesterUser) => {
                let clientUserPropertyToFetch = this.__context.location === this.__resources.__APP_LOCATION_TICKET ? 'ticket.requester' : 'user';

                this.__zendesk_user = onScreenUserOrTicketRequesterUser[clientUserPropertyToFetch];
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "SET this.__zendesk_user = ticketRequester['" + clientUserPropertyToFetch + "'] EVEN THOUGH TICKETREQUESTER IS NOT A PROPER ZENDEDK USER OBJECT, ITS A ZENDESK API RETURN OBJECT BUT IT DOES STORE THE USERS ID AND WE'LL USE THIS VERY VERY SOON TO LOAD THE PROPER ZENDESKUSER OBJECT AND REPLACE IT WITH THAT SO NO HARM DONE: this.__zendesk_user = %o", this.__zendesk_user ); }
                /* DebugOnlyCode - END */
                this.resetAppIfPageFullyLoaded();
            }, ( error ) => { this.__switchToErrorMessage(error, "Could not get the ticket info, please check your internet connection and try again");} );
            return;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CHECK PASSED this.__context = %o, this.__settings_fetched = %o, this.__context.location = %s, this.__zendesk_user = %o", this.__context, this.__settings_fetched, this.__context.location, this.__zendesk_user );}
        /* DebugOnlyCode - END */

        this.__mailshot_sync_user = null;

        if(this.__context.location === this.__resources.__APP_LOCATION_TICKET )
        {
            this.switchToLoadingScreen( "Loading Ticket Requester..." );
        }
        else if(this.__context.location === this.__resources.__APP_LOCATION_USER )
        {
            //CHECK HERE IF USER WAS UPDATED ELSEWHERE!
            this.switchToLoadingScreen( "Loading Zendesk User..." );
        }

        makeAjaxCall(
            this,
            this.__requests.__getZendeskUser( this.__zendesk_user.id ), 
            this.__getZendeskUser_Done,  
            this.__switchToErrorMessage 
        );

        this.__isFullyInitialized = true;

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "this.__isFullyInitialized = %o", this.__isFullyInitialized );
            console.log( "********** APP INITIALISED ******* this = %o", this );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="User Screen Event Handlers">
    __hideFieldsIfInUserLocation: function() 
    {
        //a lot of work just to hide the 'mailshot customer type' drop down from the user sidebar 
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.group( "__hideFieldsIfInUserLocation() called" ); }
        /* DebugOnlyCode - END */
        __screen_events.__hideFieldsIfInUserLocation( this );
        /* DebugOnlyCode - START */
        if( debug_mode ) {   console.log( "Finished" ); console.groupEnd(); }
        /* DebugOnlyCode - END */
    },

    //---EXTERNAL FIELD SCREEN CHANGE EVENTS
    __userFormFieldChanged: function( event ) 
    {
        //a lot of work just to hide the 'mailshot customer type' drop down from the user sidebar 
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.group( "__formFieldChanged( event ) called" ); }
        /* DebugOnlyCode - END */
        __screen_events.__userFormFieldChanged( this, event, false );
        this.__comms_triggerOtherInstances( this.__v2Client, "zendeskUserUpdated", { userId: this.__zendesk_user.id , event: event } );
        /* DebugOnlyCode - START */
        if( debug_mode ) {   console.log( "Finished" ); console.groupEnd(); }
        /* DebugOnlyCode - END */
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="Inter-Instance Event Handlers">
    __comms_appActivated: function( data )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "TRIGGER: __comms_appActivated called" );
            console.log( "ARG1: data = %o", data );
            console.log( "this.__actionRequiredOnInstanceActivation = %o", this.__actionRequiredOnInstanceActivation );
        }
        /* DebugOnlyCode - END */ 

        this.__isActiveOnScreenNow = true;
        if( this.__actionRequiredOnInstanceActivation === 'reset' )
        {
            this.resetAppIfPageFullyLoaded();
        }
        else if( this.__actionRequiredOnInstanceActivation === 'refresh' && this.currentScreen === 'main' ) //dont refresh if its showing an error message or loading screen
        {
            this.__switchToMainTemplate();
        }
        this.__actionRequiredOnInstanceActivation = null;
    
        /* DebugOnlyCode - START */  
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__isActiveOnScreenNow = %o", this.__isActiveOnScreenNow );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __comms_appDeactivated: function( data )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "TRIGGER: __comms_appDeactivated called" );
            console.log( "ARG1: data = %o", data );
            console.log( "this.__isActiveOnScreenNow = %o", this.__isActiveOnScreenNow );
        }
        /* DebugOnlyCode - END */ 

        this.__isActiveOnScreenNow = false;
    
        /* DebugOnlyCode - START */  
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__isActiveOnScreenNow = %o", this.__isActiveOnScreenNow );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    
    __comms_modalSyncPerformed: function( data )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "TRIGGER: __comms_modalSyncPerformed called" );
            console.log( "ARG1: data = %o", data );
            console.log( "this.__isActiveOnScreenNow = %o", this.__isActiveOnScreenNow );
            console.log( "this.__actionRequiredOnInstanceActivation = %o", this.__actionRequiredOnInstanceActivation );
            console.log( "this.__v2Client._instanceGuid = %o", this.__v2Client._instanceGuid );
        }
        /* DebugOnlyCode - END */ 

        if( this.__isActiveOnScreenNow )
        {
            this.resetAppIfPageFullyLoaded();
        }
        else
        {
            this.__actionRequiredOnInstanceActivation = 'reset';
        }
        
        /* DebugOnlyCode - START */  
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__actionRequiredOnInstanceActivation = %o", this.__actionRequiredOnInstanceActivation );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __comms_zendeskOrganizationUpdated: function( comms )
    {
        __screen_events.__triggers.__zendeskOrganizationUpdated( this, comms );
    },
    
    __comms_triggerOtherInstances: function( client,  eventName, comms )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__comms_triggerOtherInstances( client, eventName, comms ) called" );
            console.log( "ARG1: client = %o", client );
            console.log( "ARG2: eventName = %o", eventName );
            console.log( "ARG3: comms = %o", comms );
        }
        /* DebugOnlyCode - END */
        
        let callerInstanceGuid = client._instanceGuid;

        client.get('instances').then( function(instancesData) {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.group( "PROMISE client.get('instances').then" ); console.log( "ARG1: instancesData = %o, callerInstanceGuid = %o", instancesData, callerInstanceGuid ); }
            /* DebugOnlyCode - END */

            var instances = instancesData.instances;
            for (var instanceGuid in instances) {
                if ( instanceGuid !== callerInstanceGuid && instances[instanceGuid].location !== 'organization_sidebar' && instances[instanceGuid].location !== 'modal' ) {

                    /* DebugOnlyCode - START */
                    if( debug_mode ) { console.log( "CALLING TRIGGER '%s' Instance, instanceGuid = %o, comms = %o, client.instance(instanceGuid) = %o", eventName ,instanceGuid, comms, client.instance(instanceGuid) ); }
                    /* DebugOnlyCode - END */
                    client.instance(instanceGuid).trigger( eventName, comms );

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
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="OnClick Functions">
    syncButtonFromMainOnclick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncButtonFromMainOnclick() called" );
            console.log( "Triggering Modal:    thisV2Client.context().then(modal_createChildFromParent);" );
        }
        /* DebugOnlyCode - END */

        if( this.__zendesk_user === null )
        {
            throw new ReferenceError( "syncButtonFromMainOnclick called with null this.__zendesk_user" );
        }

        thisV2Client.context().then( (context) => { modal_createChildFromParent( context, this.__zendesk_user ) }, (err) => { console.error( err ); });

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished syncButtonFromMainOnclick, returning false;" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */ 
        return false;
    }, 
    
    syncButtonFromModalOnClick: function( modalClient ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncButtonFromModalOnClick( modalClient ) called" );
            console.log( "ARG1: modalClient = %o", modalClient );
        }
        /* DebugOnlyCode - END */
        
        this.__syncExistingUserToMailchimp( this.__zendesk_user, true );
        this.__comms_triggerOtherInstances( modalClient, "modalSyncPerformed", {} );
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished,  returning false;" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },    
    
    mailchimpOnlyFieldOnClick: function( event ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "mailchimpOnlyFieldOnClick(event) called" );
            console.log( "ARG1 event = %o)", event );
            console.log( "Searching through mailchimp user's __extra_merge_fields looking for the one with no __field_def.zendesk_field that links to event.target.id ('%s')", event.target.id );
        }
        /* DebugOnlyCode - END */ 
        
        let tempField = null;
        
        for( let i=0; i < this.__mailshot_sync_user.__extra_merge_fields.length; i++)
        {
            tempField = this.__mailshot_sync_user.__extra_merge_fields[ i ];
            if( typeof( tempField.__field_def.zendesk_field ) === "undefined" && ( "MC_ONLY_" + tempField.__field_def.mailchimp_field ) === event.target.id )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Found it! tempField = %o,\nvalue before update: '%s'", tempField, tempField.value); }
                /* DebugOnlyCode - END */ 
                
                connector.__toggle3rdPartyOnlyCheckboxField( this, tempField );
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Value after update: '%s'", tempField.value); }
                /* DebugOnlyCode - END */ 
            }
        }

        //now save the updated user in mailchimp
        if( tempField !== null )
        {
            this.switchToLoadingScreen( "Updating Mailchimp Member..." );
            makeAjaxCall(
                this,
                connector.__requests.__createOrUpadateMailChimpListMember( this, this.__mailshot_sync_user, true ), 
                this.__createOrUpadateMailChimpListMember_Done,  
                this.__get_or_createOrUpadate3rdPartyMember_OnFail
            );
        }
        else
        {
            console.error( "Could not find merge tag on Mailchimp user whose merge field coresponds to the checkbox just clicked: '%s'. Mailchimp user this.__mailshot_sync_user = %o", event.target.id, this.__mailshot_sync_user );
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },	

    //EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
    excludeButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "excludeButtonOnClick() called" );
            console.log( "Cloning this.__zendesk_user, setting .__customer_type to '"+this.__resources.__CUSTOMER_TYPE_EXCLUDE+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 

        //update via zendesk apis
        let updatedUserToSave = this.__zendesk_user.__clone();
        updatedUserToSave.__customer_type = this.__resources.__CUSTOMER_TYPE_EXCLUDE;
        this.switchToLoadingScreen( "Updating Zendesk User..." );
        makeAjaxCall(
            this,
            this.__requests.__updateZendeskUser( updatedUserToSave ), 
            this.__updateZendeskUser_Done,
            this.__switchToErrorMessage 
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    organizationButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "organizationButtonOnClick() called" );
            console.log( "Cloning this.__zendesk_user, setting .__customer_type to '"+this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 

        //update via apis
        let updatedUserToSave = this.__zendesk_user.__clone();
        updatedUserToSave.__customer_type = this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION;
        this.switchToLoadingScreen( "Updating Zendesk User..." );
        makeAjaxCall(
            this,
            this.__requests.__updateZendeskUser( updatedUserToSave ), 
            this.__updateZendeskUser_Done,  
            this.__switchToErrorMessage 
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    standardButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "standardButtonOnClick() called" );
            console.log( "Cloning this.__zendesk_user, setting .__customer_type to '"+this.__resources.__CUSTOMER_TYPE_USE_DEFAULT+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 
        
        let updatedUserToSave = this.__zendesk_user.__clone();
        updatedUserToSave.__customer_type = this.__resources.__CUSTOMER_TYPE_USE_DEFAULT;

        this.switchToLoadingScreen( "Updating Zendesk User..." );
        makeAjaxCall(
            this,
            this.__requests.__updateZendeskUser( updatedUserToSave ), 
            this.__updateZendeskUser_Done,  
            this.__switchToErrorMessage 
        );
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },	
    // </editor-fold>

    //ZENDESK API AJAX CALLBACK FUNCTIONS
    // <editor-fold defaultstate="collapsed" desc="Zendesk API Callback Functions">
    __getZendeskUser_Done: function( userObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__getZendeskUser_Done (ajaxSettings) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */

        this.__zendesk_user = this.__createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        //if __createZendeskUserFromAPIReturnData faled then __switchToErrorMessage will have already been called so do not continue on as this would cause another switchTo... to be called 
        if( this.__enforceZendeskUserIsValidAndShowErrorIfNot() )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) 
            { 
                console.log( "Converted userObjectFromDataAPI to user object: this.__zendesk_user = %o", this.__zendesk_user );
                console.log( "Checking if we have to load organisation (answer: %o), this.__zendesk_user.__isOrganization() = %o, this.__zendesk_user.__belongsToOrganization() = %o", this.__zendesk_user.__isOrganization() && this.__zendesk_user.__belongsToOrganization(), this.__zendesk_user.__isOrganization(),  this.__zendesk_user.__belongsToOrganization() ); 
            }
            /* DebugOnlyCode - END */

            //now populate the users organization object through another API call but only if we need it (user type = organization )
            if( this.__zendesk_user.__isOrganization() && this.__zendesk_user.__belongsToOrganization() )
            {
                this.switchToLoadingScreen( "Loading Organization..." );
                makeAjaxCall(
                    this,
                    this.__requests.__getZendeskOrganizations( this.__zendesk_user.id, this.__zendesk_user.__organization_id ), 
                    this.__getZendeskOrganizations_Done,  
                    this.__switchToErrorMessage 
                );
            }
            //otherwise we've finished getting the user object
            else
            {
                this.__fetchMailchimpObjectIfNecessary();
            }
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__zendesk_user = %o", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.group( "__createZendeskUserFromAPIReturnData(userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */ 
        
        let zendeskUserObjectToReturn = null;
        try{
            zendeskUserObjectToReturn = new ZendeskUser( this, userObjectFromDataAPI );
        } catch( e ) {   
            console.warn( e );
            this.__switchToErrorMessage( e, e.message ); 
        }

        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished, zendeskUserObjectToReturn = %o", zendeskUserObjectToReturn );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */ 
        
        return zendeskUserObjectToReturn;
    },
    
    __enforceZendeskUserIsValidAndShowErrorIfNot: function()
    {
       /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "__switchToErrorMessageIfUserFailsValidation() called" );
            console.log( "this.__zendesk_user = %o", this.__zendesk_user );
            console.log( "this.__zendesk_user.__validationError = %o", ( this.__zendesk_user ) ? this.__zendesk_user.__validationError : 'undefined' );
        }
        /* DebugOnlyCode - END */
        
        let isValid = this.__zendesk_user !== null;
        if( this.__zendesk_user !== null && this.__zendesk_user.__validationError !== null && this.__zendesk_user.__validationError.__code === 'ORG_MISSING' )
        {
            this.__switchToErrorMessage ( 
                this.__zendesk_user.__validationError.__exception, 
                this.__zendesk_user.__validationError.__exception.message, 
                "Switch Sync Type", 
                "btn-warning", 
                "standardButtonOnClick()"
            ); 
            isValid = false; 
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, RETURNING isValid = %o", isValid );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return isValid;
    },

    __updateZendeskUser_Done: function( userObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "__updateZendeskUser_Done(userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
            console.log( "Creating Zendesk User from API Return data, copying old __orgObject onto it (as org remains unchanged), updating customer type and keeping track of old type", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */
        
        //create new user from update API call and copy across the org object onto it 
        //(which is unchanged by update user API Call) 
        //and also remember old customer type
        let returnedUser = null;
        try
        {
            returnedUser = new ZendeskUser( this, userObjectFromDataAPI );
        }
        catch( e )
        {   
            this.__switchToErrorMessage( e, e.message ); 
        }
        returnedUser.__orgObject = this.__zendesk_user.__orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
        let oldCustomerType = this.__zendesk_user.__customer_type;
        this.__zendesk_user = returnedUser;

       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Done oldCustomerType = '%s' and the newly updated this.__zendesk_user is now: %o", oldCustomerType, this.__zendesk_user );
            console.log( "If we just switched to Organisation customer type then this.__zendesk_user.__orgObject MAY need populating. Checking..." );
            console.log( "    Are we syncing as an 'organisation' user? (this.__zendesk_user.__isOrganization()) = %o", this.__zendesk_user.__isOrganization());
            console.log( "    Does the user belong to an organisation? (this.__zendesk_user.__belongsToOrganization()) = %o", this.__zendesk_user.__belongsToOrganization() );
            console.log( "    Is the org object already populated on the user? (this.__zendesk_user.__orgObjectIsPopulated()) = %o", this.__zendesk_user.__orgObjectIsPopulated() );
        }
        /* DebugOnlyCode - END */

        //now populate the users arganization object through another API call but only if we need it (user type = organization )
        if( this.__zendesk_user.__isOrganization() && this.__zendesk_user.__belongsToOrganization() && !this.__zendesk_user.__orgObjectIsPopulated())
        {
            this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = ( oldCustomerType === null ) ? 'NOTSET' : oldCustomerType;
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do need to populate org object. But we also need to call __changeCustomerType(old, new) after it's populated, so setting this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = '%s' temporarily then calling __getZendeskOrganizations", this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); }
            /* DebugOnlyCode - END */
            this.switchToLoadingScreen( "Loading Organization..." );
            makeAjaxCall(
                this,
                this.__requests.__getZendeskOrganizations( this.__zendesk_user.id, this.__zendesk_user.__organization_id ), 
                this.__getZendeskOrganizations_Done,  
                this.__switchToErrorMessage 
            );
        }
        else
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do NOT need to populate org object. Object fully loaded (or not needed) so nothing left to do but to call this.__changeCustomerType( oldCustomerType, this.__zendesk_user.__customer_type )" ); }
            /* DebugOnlyCode - END */
            this.__changeCustomerType( oldCustomerType, this.__zendesk_user.__customer_type );
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__getZendeskOrganizations_Done (organizationObjectFromDataAPI) called" );
            console.log( "ARG1: organizationObjectFromDataAPI = %o", organizationObjectFromDataAPI );
            console.log( "Function COntext: this = %o", this );
        }
        /* DebugOnlyCode - END */

        this.__zendesk_user.__orgObject = this.__createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "New Org Object: this.__zendesk_user.__orgObject = %o", this.__zendesk_user.__orgObject );
            console.log( "Checking was this load as a result of agent pressing the 'organization' button?  \nthis.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = %o", this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); 
        }
        /* DebugOnlyCode - END */

        //only continue if the org object was created successfully - if not then switchtoErrorMessage will have been called so we need go no further
        if( this.__zendesk_user.__orgObject != null )
        {
            //was this load as a result of pressing the "organization" button?
            if( typeof( this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ) !== "undefined" && this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs !== null )
            {
                let oldType = ( this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs === 'NOTSET' ) ? null : this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs;
                this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = null;
                this.__changeCustomerType( oldType, this.__zendesk_user.__customer_type );
            }
            else
            {
                //we now have full populated user object to save complete with org object and no more changes so continue to load form
                this.__fetchMailchimpObjectIfNecessary();
            }
        }
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__zendesk_user = %o", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__createZendeskOrganizationFromAPIReturnData(organizationObjectFromDataAPI) called" );
            console.log( "ARG1: organizationObjectFromDataAPI = %o", organizationObjectFromDataAPI );
            console.log( "Checking if We need to populate organisation, next comment will be check passed if we actually do");
        }
        /* DebugOnlyCode - END */
        
        let organizationObjectToReturn = null;
        if( typeof( organizationObjectFromDataAPI ) !== "undefined" && organizationObjectFromDataAPI !== null && typeof( organizationObjectFromDataAPI.organization ) !== "undefined" && organizationObjectFromDataAPI.organization !== null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "Check Passed, building base object and adding extra fields.    this.__field_maps.__cust_type.zendesk_field = %s", this.__field_maps.__cust_type.zendesk_field ); }
            /* DebugOnlyCode - END */
            
            try {
                organizationObjectToReturn = new ZendeskOrganization(
                        this,
                        organizationObjectFromDataAPI.organization.id,
                        organizationObjectFromDataAPI.organization.name,
                        organizationObjectFromDataAPI.organization.organization_fields[ this.__field_maps.__cust_type.zendesk_field ]
                );
                organizationObjectToReturn.__populateExtraFieldsFromOrganizationAPIData( organizationObjectFromDataAPI.organization );
            } catch( e ) {   
                organizationObjectToReturn = null; //dont pass back a half instantiated object
                console.warn( e );
                this.__switchToErrorMessage( e, e.message ); 
            }
        }
        else console.warn( "__createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, organizationObjectToReturn = %o", organizationObjectToReturn );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return organizationObjectToReturn;
    },
    // </editor-fold>  
    
    
    __fetchMailchimpObjectIfNecessary: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__fetchMailchimpObjectIfNecessary() called" );
            console.log( "If included, Check if __mailshot_sync_user already loaded? \nthis.__zendesk_user.__isIncluded() = %o \nthis.__mailshot_sync_user = %o",  this.__zendesk_user.__isIncluded(), this.__mailshot_sync_user );
        }
        /* DebugOnlyCode - END */

        //if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
        if( this.__zendesk_user.__isIncluded() && this.__mailshot_sync_user === null )
        {
            this.switchToLoadingScreen( "Loading user from Mailchimp..." );
            makeAjaxCall(
                this,
                connector.__requests.__getMailChimpListMember( this, this.__zendesk_user.email ), 
                this.__retrieved3rdPartyMailshotSubscriber,  
                this.__get_or_createOrUpadate3rdPartyMember_OnFail 
            );
        }
        else
        {
            this.__switchToMainTemplate();
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __changeCustomerType: function( oldType, newType ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__changeCustomerType( oldType, newType )  called" );
            console.log( "ARG1: oldType = '%s'", oldType );
            console.log( "ARG2: newType = '%s'", newType );
            console.log( "Updating this.__zendesk_user.__customer_type = '%s';", newType);
            console.log( "Checking which button was just pressed (ie checking newType: '%s';", newType);
        }
        /* DebugOnlyCode - END */

        //update user object so it doesnt get out of sync
        this.__zendesk_user.__customer_type = newType;

        //if NOT SET or EXCLUDE was selected 
        if( newType === this.__resources.__CUSTOMER_TYPE_NOT_SET || newType === this.__resources.__CUSTOMER_TYPE_EXCLUDE  )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "It is now set to either NOT_SET or EXCLUDE. Now checking whether it used to be in mailchimp (ie ORGANIZATION or STANDARD). oldType = '%s'", oldType ); }
            /* DebugOnlyCode - END */
                
            if( oldType === this.__resources.__CUSTOMER_TYPE_USE_DEFAULT || oldType === this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION )
            {
                //if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND it was previously in mailchimp (STANDARD or ORGANIZATION), so let's DELETE IT FROM MAILCHIMP" ); }
                /* DebugOnlyCode - END */
                //so delete from mailchimp
                this.__deleteExistingMailshotUserFrom3rdParty( this.__mailshot_sync_user );
            }

            if( oldType !== newType )
            {
                //if NOT SET or EXCLUDE were selected AND it was previously set to the other one out of NOT SET and EXCLUDE
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND it was previously NOT in mailchimp( ie it was previously the other one out of NOT SET and EXCLUDE), so NO ACTION REQUIRED - switching to main template" ); }
                /* DebugOnlyCode - END */
                //reload the app template with new updated user object - no need to call mailchimp API
                this.__switchToMainTemplate();
            }
            else
            {
                //value hasnt actually changed so just go back to form
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND the value hasnt actually changed, so NO ACTION REQUIRED - switching to main template" ); }
                /* DebugOnlyCode - END */
                this.__switchToMainTemplate();
            }
        }

        //if ORGANIZATION or STANDARD was selected
        //TO DO: PUT DEBUGGING INTO THIS SECTION
        if( newType === this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION || newType === this.__resources.__CUSTOMER_TYPE_USE_DEFAULT  )
        {
                //if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
                if( oldType === this.__resources.__CUSTOMER_TYPE_EXCLUDE || oldType === this.__resources.__CUSTOMER_TYPE_NOT_SET )
                {
                        this.__syncNewMailshotUserTo3rdParty( this.__zendesk_user );
                }
                //if ORGANIZATION or STANDARD were selected AND it was previously set to the other one
                else if( oldType !== newType )
                {
                        this.__syncExistingUserToMailchimp( this.__zendesk_user, true );
                }
                else
                {
                        //value hasnt actually changed so just go back to form
                        this.__switchToMainTemplate();
                }
        }
            
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },


    //MAILCHIMP SYNCING WRAPPER FUNCTIONS
    //TO DO: PUT DEBUGGING INTO THIS SECTION AND MOVE TO mailchimp-connector.js
    __retrieved3rdPartyMailshotSubscriber: function( returnedMailchimpUserFromAPI ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__retrieved3rdPartyMailshotSubscriber (returnedMailchimpUserFromAPI) called" );
            console.log( "ARG1: returnedMailchimpUserFromAPI = %o", returnedMailchimpUserFromAPI );
        }
        /* DebugOnlyCode - END */

        try{
            this.__mailshot_sync_user = connector.__getMailchimpSubscriberFromAPIResults( this, returnedMailchimpUserFromAPI );
            
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "this.__mailshot_sync_user assigned: %o", this.__mailshot_sync_user ); }
            /* DebugOnlyCode - END */

            //if above caused an error it will have already been caught and redirected to this.__switchToErrorMessage(), if not we continue to main screen as normal
            //before we finish, lets check the Zendesk User and the Mailchimp user for validity as the mailchimp member
            //may have been changed (unsubscribed or archived or unarchived) at the mailchimp end and so be out of sync status wise with the zendesk user
            //also if a Zenchimp update failed at the mailchimp end but succeeded at the Zendesk end then this can happen
            if( connector.__enforceValidityOfZendeskAndMailshotStatuses( this, this.__zendesk_user, this.__mailshot_sync_user ) )
            {
                this.__switchToMainTemplate();
            }
            
        } catch( e ) {   
            console.warn( e );
            this.__switchToErrorMessage( e, e.message ); 
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished __retrieved3rdPartyMailshotSubscriber, this.__mailshot_sync_user = %o", this.__mailshot_sync_user);
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },	

    __syncNewMailshotUserTo3rdParty: function( zendeskUser ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__syncNewMailshotUserTo3rdParty (zendeskUser) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = connector.__createNewMailshotSyncUserObject( this, zendeskUser );

        this.switchToLoadingScreen( "Adding Mailchimp Member..." );
        makeAjaxCall(
            this,
            connector.__requests.__createOrUpadateMailChimpListMember( this, newMailChimpUserToSave, false ), 
            this.__createOrUpadateMailChimpListMember_Done,  
            this.__get_or_createOrUpadate3rdPartyMember_OnFail 
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __syncExistingUserToMailchimp: function( zendeskUser, tryToPreserveMCOnlyFields ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__syncExistingUserToMailchimp (zendeskUser, tryToPreserveMCOnlyFields) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
            console.log( "ARG2 (optional): tryToPreserveMCOnlyFields = %o", tryToPreserveMCOnlyFields );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = connector.__createNewMailshotSyncUserObject( this, zendeskUser );

        /* DebugOnlyCode - START */
        if( debug_mode ) { 
            console.log( "Checking if we need to copy across extra merge fields to mailchimp object too? (answer = %o)  \n tryToPreserveMCOnlyFields = %o, this.__mailshot_sync_user = %o, zendeskUser.email = %o, this.__mailshot_sync_user.__email_address = %o", 
                ( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.__mailshot_sync_user !== null && zendeskUser.email === this.__mailshot_sync_user.__email_address ), 
                tryToPreserveMCOnlyFields, 
                this.__mailshot_sync_user, 
                zendeskUser.email, 
                this.__mailshot_sync_user === null ? 'undefined' : this.__mailshot_sync_user.__email_address ); 
        }
        /* DebugOnlyCode - END */
        
        //if switching between Standard and Org mode try to preserve the value of the Mailchimp only checkbox fields
        if( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.__mailshot_sync_user !== null && zendeskUser.email === this.__mailshot_sync_user.__email_address )
        {
            for( let i=0; i < this.__mailshot_sync_user.__extra_merge_fields.length; i++)
            {
                if( typeof( this.__mailshot_sync_user.__extra_merge_fields[ i ].__field_def.zendesk_field ) === "undefined" ) 
                {
                        newMailChimpUserToSave.__extra_merge_fields[ i ].__value = this.__mailshot_sync_user.__extra_merge_fields[ i ].__value;
                }
            }
        }

        this.switchToLoadingScreen( "Updating Mailchimp Member..." );
        makeAjaxCall(
            this,
            connector.__requests.__createOrUpadateMailChimpListMember( this, newMailChimpUserToSave, true ), 
            this.__createOrUpadateMailChimpListMember_Done,  
            this.__get_or_createOrUpadate3rdPartyMember_OnFail
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, newMailChimpUserToSave = %o", newMailChimpUserToSave );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __deleteExistingMailshotUserFrom3rdParty: function( mailchimpUser ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__deleteExistingMailshotUserFrom3rdParty(mailchimpUser) called" );
            console.log( "ARG1: mailchimpUser = %o", mailchimpUser );
        }
        /* DebugOnlyCode - END */
            
        this.switchToLoadingScreen( "Deleting Mailchimp Member..." );
        makeAjaxCall(
            this,
            connector.__requests.__deleteMailChimpListMember( this, mailchimpUser ), 
            null,  
            null, //this shoudl call __get_or_createOrUpadate3rdPartyMember_OnFail ONLY 404 MESSAGE SHOUD BE DIFFERENT FOR DELETES!
            true
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __get_or_createOrUpadate3rdPartyMember_OnFail: function( errorResponse ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__get_or_createOrUpadate3rdPartyMember_OnFail(errorResponse) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
        }
        /* DebugOnlyCode - END */
        
        connector.__get_or_createOrUpadate3rdPartyMember_OnFail( this, errorResponse );
    
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __createOrUpadateMailChimpListMember_Override_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__createOrUpadateMailChimpListMember_Override_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.__syncExistingUserToMailchimp( this.__zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    __createOrUpadateMailChimpListMember_Add_New_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__createOrUpadateMailChimpListMember_Add_New_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.__syncNewMailshotUserTo3rdParty( this.__zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    __createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUserFromAPI ) 
    {
            this.__retrieved3rdPartyMailshotSubscriber( returnedMailchimpUserFromAPI );
    },

    //SWITCH TO HTML TEMPLATE FUNCTIONS
    switchToLoadingScreen: function( optionalMessage ) 
    {
        switchToInlineTemplate( this.__resources.__TEMPLATE_ID_LOADING, { optional_message: optionalMessage } );
        this.currentScreen = 'loading';
    },

    __switchToMainTemplate: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__switchToMainTemplate() called" );
        }
        /* DebugOnlyCode - END */

        let syncFields = connector.__getFieldSyncInfo( this, this.__zendesk_user, this.__mailshot_sync_user );
        let isInSync = connector.__isInSync( this, syncFields );
        let isSubscribed = this.__mailshot_sync_user !== null && this.__mailshot_sync_user.__isSubscribed();
        let defaultButtonColourClassInsert = ' ' + ( isInSync || this.__zendesk_user.__isExcluded() ? 'btn-primary' : 'btn-danger' );

        let formData = 
        {
            'zendesk_user'      : this.__zendesk_user,
            'mailchimp_user'    : this.__mailshot_sync_user,
            'sync_fields'       : syncFields,
            'monkey_URL'        : ( !isSubscribed || this.__zendesk_user.__isExcluded() ) ? "./img/exclude_monkey.png" : ( isInSync ? "./img/insync_monkey.png" :  "./img/outofsync_monkey.png" ),
            'buttons': 
            {
                'exclude'       : { 
                    'show'              : true, 
                    'classNameInsert'   : this.__zendesk_user.__isExcluded() ? " active" : "", 
                    'label'             : "Exclude", 
                    'onclick'           : 'excludeButtonOnClick()' 
                },
                'organization'  : { 
                    'show'              : ( this.__zendesk_user.__belongsToOrganization() ), 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.__zendesk_user.__isOrganization() ? " active" : "" ), 
                    'label'             : this.__settings.__mailchimp_organisation_button_label, 
                    'onclick'           : 'organizationButtonOnClick()' 
                },
                'standard'      : { 
                    'show': true, 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.__zendesk_user.__isDefault() ? " active" : "" ), 
                    'label'             : this.__settings.__mailchimp_standard_button_label, 
                    'onclick'           : 'standardButtonOnClick()'
                }
            },
            'display_params':
            {
                'customer_type_not_set'     : this.__zendesk_user.__isNotset(),
                'customer_unsubscribed'     : this.__mailshot_sync_user !== null && this.__mailshot_sync_user.__hasUnSubscribed(),
                'customer_type_exclude'     : this.__zendesk_user.__isExcluded(),
                'customer_type_included'    : isSubscribed && this.__zendesk_user.__isIncluded(),
                'customer_type_organization': isSubscribed && this.__zendesk_user.__isOrganization(),
                'customer_type_standard'    : isSubscribed && this.__zendesk_user.__isDefault(),
                'user_in_sync'              : isInSync,
                'DEBUG'                     : debug_mode,
                'login_link_HTML'           : connector.__resources.__LOGIN_LINK_HTML
            }
        };

        thisV2Client.main_template_form_data = formData;

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Switching to template '%s' with form data: %o ", ( this.__modalMode ? this.__resources.__TEMPLATE_NAME_MAIN_MODAL_MODE : this.__resources.__TEMPLATE_NAME_MAIN ), formData); }
        /* DebugOnlyCode - END */
        switchToHdbsFileTemplate( ( this.__modalMode ? this.__resources.__TEMPLATE_NAME_MAIN_MODAL_MODE : this.__resources.__TEMPLATE_NAME_MAIN ), formData );
        this.currentScreen = 'main';

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonClass, additionalButtonOnclick, optionalMainButtonTextOverride, optionalMainButtonOnClickOverride ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__switchToErrorMessage ( errorResponse, overrideMessage, additionalButtonText, additionalButtonClass ) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
            console.log( "ARG2: overrideMessage = %o", overrideMessage );
            console.log( "ARG3: additionalButtonText = %o", additionalButtonText );
            console.log( "ARG4: additionalButtonClass = %o", additionalButtonClass );
            console.log( "ARG5: additionalButtonOnclick = %o", additionalButtonOnclick );
            console.log( "ARG6: optionalMainButtonTextOverride = %o", optionalMainButtonTextOverride );
            console.log( "ARG7: optionalMainButtonOnClickOverride = %o", optionalMainButtonOnClickOverride );

        }
        /* DebugOnlyCode - END */

        //check for catchall error conditions
        try
        {
            if( errorResponse.status === 0 && typeof( overrideMessage ) === "undefined" || overrideMessage === null || overrideMessage === "error" )
            {
                overrideMessage = "Could not connect to API, Please check your internet connection";
            }
        }
        catch(e2) { }

        let formData = 
        {
          'errorResponse'		: errorResponse,
          'overrideMessage' 		: ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? null:  overrideMessage, /* sometimes just the string error is passed as the 2nd param!) */
          'mainButtonText'       : ( typeof( optionalMainButtonTextOverride ) === 'undefined' ) ? "Go Back" : optionalMainButtonTextOverride,
          'mainButtonClass'      : ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? 'btn-danger' : 'btn-warning',
          'mainButtonOnClick'    : ( typeof( optionalMainButtonOnClickOverride ) === 'undefined' ) ? "resetAppIfPageFullyLoaded()" : optionalMainButtonOnClickOverride,
          'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
          'additionalButtonClass' 	: ( typeof( additionalButtonClass ) === "undefined" ) ? null : additionalButtonClass,
          'additionalButtonOnclick' 	: ( typeof( additionalButtonOnclick ) === "undefined" ) ? null : additionalButtonOnclick
        };

        switchToHdbsFileTemplate( this.__resources.__TEMPLATE_NAME_SHOWERROR, formData );
        this.currentScreen = 'error';

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    debugButtonOnClick: function()
    {
        console.log( 'Starting debugButtonOnClick' );
        console.dir( this );
        return false;
    },

    __validateFieldMappingsJSON: function( fieldMappingsJSONText, settingsName, mailchimpOnlyFields ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.groupCollapsed( "__validateFieldMappingsJSON( fieldMappingsJSONText, settingsName ) called" );
            console.log( "ARG1: fieldMappingsJSONText = %o", fieldMappingsJSONText );
            console.log( "ARG2: settingsName = %o", settingsName );
            console.log( "Attempting to parse..." );
        }
        /* DebugOnlyCode - END */

        //parse JSON but catch all error conditions
        let fieldMappingsJSON = null;
        let errorObject = null;
        let errorMessage = null;
        try
        {
            fieldMappingsJSON = JSON.parse( fieldMappingsJSONText );
        }
        catch(e)
        {
            let parseErrorMessage = 'unknown';       
            if (e instanceof SyntaxError) {
                parseErrorMessage = e.name + ' ' + e.message;
            } else {
                parseErrorMessage = e.message;
            }            
            
            console.error( "JSON Validation for settings '%s' Falied with exception e = %o ",settingsName, e );
            console.error( "JSON TEXT WAS: %o ", fieldMappingsJSONText );
            errorObject = e;
            errorMessage = 'The JSON Settings text you entered for the '+settingsName+' setting was formatted incorrectly, it must be valid JSON.<br /><br />'+
                           'The failure reason was: '+parseErrorMessage+'<br /><br />'+
                           'For help with these settings fields use our <a target="_blank" href="'+this.__resources.__SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL+'">Zenchimp App Settings Generator</a> spreadsheet';
        }

        if( fieldMappingsJSON !== null )
        {
            
            //More Validation, checking hte JSON for each field defintiion in turn
            let fieldMap = null;
            let validTypeArray = mailchimpOnlyFields ? ['checkbox'] : ['image', 'text', 'checkbox'];
            let errorArray = [];
            for( let i = 0; i < fieldMappingsJSON.length; i++ )
            {
                fieldMap = fieldMappingsJSON[i];
                //these values have to exist and be not empty
                if( !fieldMap.field_label ) { errorArray.push( 'Missing Field/Value: field_label' ); }
                if( !fieldMap.mailchimp_field ) { errorArray.push( 'Missing Field/Value: mailchimp_field' ); }
                if( !fieldMap.type ) { errorArray.push( 'Missing Field/Value: type' ); }
                else if ( !validTypeArray.includes(fieldMap.type)) { errorArray.push( "Invalid type: '"+fieldMap.type+"'. Valid types are: " + validTypeArray.toString() + " (all lower case)" ); }
                //these settings have to exist but dont necessarily have to have a value
                //these fields also depend on if its a mailchimp only field
                if( mailchimpOnlyFields )
                {
                    if( typeof fieldMap.value_if_ticked === 'undefined' || fieldMap.value_if_ticked === null ) { errorArray.push( 'Missing Field: value_if_ticked. This is required for fields of type \'checkbox\''); }
                    if( typeof fieldMap.value_if_unticked === 'undefined' || fieldMap.value_if_unticked === null ) { errorArray.push( 'Missing Field: value_if_unticked. This is required for fields of type \'checkbox\''); }
                }
                else
                {
                    if( typeof fieldMap.default_value === 'undefined' || fieldMap.default_value === null ) { errorArray.push( 'Missing Field: default_value'); }                    
                }
                //this field also depends on if its a mailchimp only field
                if( mailchimpOnlyFields && typeof fieldMap.zendesk_field !== 'undefined' ) { errorArray.push( 'Field: zendesk_field is not allowed on mailchimp-only field lists' ); }
                if( !mailchimpOnlyFields && !fieldMap.zendesk_field ) { errorArray.push( 'Missing Field/Value: zendesk_field' ); }
                
                if( errorArray.length > 0 )
                {
                    errorMessage = "Field Definition " + (i+1) + " for the '" + settingsName + 
                                   "' setting has errors:<br /><br />" + errorArray.join('<br />');
                    break;
                }
            }
            
            if( errorMessage === null )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) 
                { 
                    console.log( "Success, returning: %o", fieldMappingsJSON );
                    console.groupEnd();
                }
                /* DebugOnlyCode - END */
                return fieldMappingsJSON;
            }
        }
       
        this.__switchToErrorMessage( errorObject, errorMessage );
       
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Failed, returning null" );
            console.groupEnd();
        }
        return null;
        /* DebugOnlyCode - END */
    },

  };

};
