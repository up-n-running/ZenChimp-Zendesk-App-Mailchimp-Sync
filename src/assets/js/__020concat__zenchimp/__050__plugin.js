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
    

    __events: 
    {
        'user.id.changed'               : 'resetAppIfPageFullyLoaded', //dont think this is a real one!

        //main screen events
        'user.mailshot_customer_type.changed' : '__userScreenCustomerTypeFieldChanged',

        '*.changed': '__formFieldChanged'
    },

    // <editor-fold defaultstate="collapsed" desc="AJAX API SETTINGS GENERATORS">
    __requests:
    {
        __parentPlugin: null,  //set back to plugin (as in plugin.__requests) during init();

        __getZendeskUser: function( id )
        {
            let userApiCallSettings = 
            {       
                    url: 'https://upnrunning.zendesk.com/api/v2/users/'+encodeURIComponent(id)+'.json',
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
                            'mailshot_customer_type': userToSyncObject.customer_type
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
        },
/*
            //THIS IS FUNCTIONCAL CODE BUT IS NOT NEEDED IN THIS IMPLEMENTATION
            __getMailChimpAllListMembers: function()
            {
                    let jsonCall =
                    {
                            url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.__settings.__mailchimp_datacentre_prefix ),
                            type: 'POST',
                            dataType: 'json',
                            contentType: 'application/json; charset=UTF-8',
                            data: JSON.stringify(
                            {
                                    "apikey": this.__settings.__mailchimp_api_key,
                                    "id": this.__settings.__mailchimp_list_id,
                                    "status": "subscribed",
                                    "opts": 
                                    {
                                            "start": 0,
                                            "limit": 100,
                                            "sort_field": "email",
                                            "sort_dir": "ASC"
                                    }
                            })
                    };
                    //console.log( "__getMailChimpAllListMembers: API CAll DETAILS:" );console.dir( jsonCall );
                    return jsonCall;
            },
*/
        __getMailChimpListMember: function( emailAddress )
        {
            if( typeof( emailAddress ) === "undefined" || emailAddress === null )
            {
                return console.error( "ERROR CONDITION: __getMailChimpListMember called with null email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(emailAddress.toLowerCase());                

            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_list_id)+
                     '/members/'+encodeURIComponent(md5HashOfEmail),
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.__parentPlugin.__settings.__mailchimp_api_key )
                }
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__getMailChimpListMember('%s'), jsonCall = %o", emailAddress, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        __createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
            {
                    return console.warn( "ERROR CONDITION: __createOrUpadateMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of email address
            let md5HashOfEmail =md5(mailchimpSyncUser.email_address.toLowerCase());

            let mergeFields = {};
            mergeFields[ this.__parentPlugin.__settings.__mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
            mergeFields[ this.__parentPlugin.__settings.__mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
            mergeFields[ this.__parentPlugin.__settings.__mailchimp_list_field_customer_type_name ] = mailchimpSyncUser.customer_type;
            for (let i=0; i < mailchimpSyncUser.extra_merge_fields.length; i++) 
            {
                mergeFields[ mailchimpSyncUser.extra_merge_fields[ i ].field_def.mailchimp_field ] = mailchimpSyncUser.extra_merge_fields[ i ].value;
            }

            let dataJSON = 				
            {
                "id": md5HashOfEmail,
                "email_address": mailchimpSyncUser.email_address,
                "email_type": "html",
                "status": mailchimpSyncUser.__status,
                "status_if_new": "subscribed",
                "merge_fields": mergeFields,
                "vip": ( mailchimpSyncUser.customer_type === this.__parentPlugin.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION )
            };

            //2 x mailchimp mandatory merge fields + 1 mandatory customer_type field plus all extra ones from user object, org object and mc only fields


            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_list_id)+
                     '/members/'+encodeURIComponent(updateNotCreate ? md5HashOfEmail : ""),
                type: updateNotCreate ? 'PUT' : 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.__parentPlugin.__settings.__mailchimp_api_key )
                },
                data: JSON.stringify( dataJSON )
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__createOrUpadateMailChimpListMember( mailchimpSyncUser:'%o', updateNotCreate: '%o' ), dataJSON = %o, jsonCall = %o", mailchimpSyncUser, updateNotCreate, dataJSON, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        //NOT SURE THIS IS EVER CALLED OR NEEDED BUT IT'S FUNCTIONAL CODE
        __deleteMailChimpListMember: function( mailchimpSyncUser )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
            {
                return console.error( "ERROR CONDITION: __deleteMailChimpListMember called with either null user or user with no email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(mailchimpSyncUser.email_address.toLowerCase());

            let jsonCall =
            {
                url: "https://"+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_datacentre_prefix)+
                     ".api.mailchimp.com/3.0/lists/"+encodeURIComponent(this.__parentPlugin.__settings.__mailchimp_list_id)+
                     "/members/"+encodeURIComponent(md5HashOfEmail),
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.__parentPlugin.__settings.__mailchimp_api_key )
                }
            };
            
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__deleteMailChimpListMember( mailchimpSyncUser:%o ), jsonCall = %o", jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        }
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="Initialisation Functions">
    init: function( modalMode, existingContext ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "init( modalMode, existingContext ) called" );
            console.log( "ARG1: modalMode = %o", modalMode );
            console.log( "ARG1: existingContext = %o", existingContext );
        }
        /* DebugOnlyCode - END */
        
        //copy values to a public object that's accessible outside this file (doesnt get minified)
        let privateResourcesObjToCopy = this.__resources;
        this.resources = {
            TYPE_TEXT: privateResourcesObjToCopy.__TYPE_TEXT,
            TYPE_IMAGE: privateResourcesObjToCopy.__TYPE_IMAGE,
            TYPE_CHECKBOX: privateResourcesObjToCopy.__TYPE_CHECKBOX,
            CUSTOMER_TYPE_NOT_SET: privateResourcesObjToCopy.__CUSTOMER_TYPE_NOT_SET,
            CUSTOMER_TYPE_EXCLUDE: privateResourcesObjToCopy.__CUSTOMER_TYPE_EXCLUDE,
            CUSTOMER_TYPE_USE_DEFAULT: privateResourcesObjToCopy.__CUSTOMER_TYPE_USE_DEFAULT,
            CUSTOMER_TYPE_USE_ORGANIZATION: privateResourcesObjToCopy.__CUSTOMER_TYPE_USE_ORGANIZATION
        }
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Made public facing copy of __resources: this.resources = %o", this.resources ); }
        /* DebugOnlyCode - END */
        
        //wire up event listeners
        thisV2Client.on('ticket.requester.id.changed'   , () => { this.resetAppIfPageFullyLoaded(); } );
        thisV2Client.on('user.email.changed'            , () => { this.resetAppIfPageFullyLoaded(); } );
        thisV2Client.on('user.name.changed'             , () => { this.resetAppIfPageFullyLoaded(); } );
        thisV2Client.on('user.organizations.changed'    , () => { this.resetAppIfPageFullyLoaded(); } );
        thisV2Client.on('*.changed'              , ( event ) => { this.__formFieldChanged( event ); } );
        
        
        //housekeeping (functions in this.__requests cannot access parent plugin when they in turn reference 'this' so we have a pointer back - it's just a javascript function context thing)
        this.__requests.__parentPlugin = this;
        this.__modalMode = ( typeof modalMode === 'undefined' || modalMode === null ) ? false : modalMode;
            
        //get Common JS Modules (not sure if we need this - it's a bit extra doing it this way
        this.zendeskObjectsModule = {ZendeskOrganization, ZendeskUser};
        this.parseNamesModule = NameParse;

        //delcare other instance variables
        this.__mailshot_sync_user = null; 
        this.__zendesk_user = null;

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
                __cust_type    : { zendesk_field: this.__resources.__ORG_FIELD_HANDLE_CUSTOMER_TYPE, mailchimp_field: this.__settings.__mailchimp_list_field_customer_type_name, type: this.__resources.__FIELD_TYPE_TEXT, default_value: this.__settings.__mailchimp_list_field_customer_type_default_value },
                __organisation : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_organization_field_mappings, 'Organisation Field Mapping', false ),
                __user         : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_user_field_mappings, 'User Field Mapping', false ),
                __mc_only      : this.__validateFieldMappingsJSON( returnedSettings.mailchimp_mailshot_only_field_mappings, 'Mailchimp Only Field Mapping', true )
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "populated private field maps object: this.__field_maps = %o", this.__field_maps ); }
            /* DebugOnlyCode - END */

            //copy values to a public object accessible outside this file (doesnt get minified) 
            this.field_maps = {
                cust_type    : this.__field_maps.__cust_type,
                organisation : this.__field_maps.__organisation,
                user         : this.__field_maps.__user,
                mc_only      : this.__field_maps.__mc_only
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "populated public field maps object: this.field_maps = %o", this.field_maps ); }
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
            
            this.__context
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

        //dont continue if we havent fetched the user id from the ticket sidebar OR user sidebar yet
        if( !this.__isFullyInitialized && this.__zendesk_user === null )
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
            console.warn( "MAYBE NEED TO REPLACE THIS CODE WITH A CALL TO this.getUserFromFrameworkInUserSidebarLocation(); IN WHICH WE MIGHT BE ABLE TO CREATE THE ZENDESK USER OJBECT FROM THE EXISTING TEMP ZENDESK USER OBJECT (this.__zendesk_user) RETURNED FROM ResetAppIfNotFullyLoaded()" );
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
        if( debug_mode ) 
        { 
            console.group( "__hideFieldsIfInUserLocation() called" );
            console.log( "this.__context.location = " + this.__context.location + " and this.__resources.__APP_LOCATION_USER = " + this.__resources.__APP_LOCATION_USER );
        }
        /* DebugOnlyCode - END */

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING this.__v2Client.get( 'userFields:" + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + ".isVisible' ) PROMISE to hide field if it is" ); }
        /* DebugOnlyCode - END */   

        if( this.__context.location === this.__resources.__APP_LOCATION_USER )
        {
            this.__v2Client.get( 'userFields:' + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.isVisible' ).then( (isVisibleResult) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.group( "PROMISE RETURNED: get( 'userFields:...' )().then" ); console.log( "PROMISE RETURNED: this.__v2Client.get( 'userFields:...' ).then( (isVisibleResult) => {...}       isVisibleResult = %o", isVisibleResult ); }
                /* DebugOnlyCode - END */
                
                if( isVisibleResult[ 'userFields:' + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.isVisible' ] )
                {
                    /* DebugOnlyCode - START */
                    if( debug_mode ) {  console.log( "HIDING USER FIELD: Calling client.invoke( 'userFields:" + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + ".hide' );" ); }
                    /* DebugOnlyCode - END */
                    this.__v2Client.invoke( 'userFields:' + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + '.hide' );
                }
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.groupEnd(); }
                /* DebugOnlyCode - END */
            }, ( error ) => { this.__switchToErrorMessage(error, "Could access a Zendesk User Field with a Field Key of '" + this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE + "' Please check your internet connection or reinstall the app if this issue persists;");} );
        }
       
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    //---EXTERNAL FIELD SCREEN CHANGE EVENTS
    __formFieldChanged: function( event )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__formFieldChanged( event ) called" );
            console.log( "ARG1: event = %o", event );
            console.log( "Checking if in user location: %o" + this.__context.location === this.__resources.__APP_LOCATION_USER )
        }
        /* DebugOnlyCode - END */
        
        let matchedZDFieldName = null;
        if(this.__context.location === this.__resources.__APP_LOCATION_USER )
        {
            let fieldName = event.propertyName;

            //first check if its the big field: user.mailshot_customer_type
            if( fieldName === "user."+this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "MAPPED FIELD FOUND: CUSTOMER TYPE. Calling __userScreenCustomerTypeFieldChanged( '%s' );", event.newValue ); }
                /* DebugOnlyCode - END */
                this.__userScreenCustomerTypeFieldChanged( event.newValue );
            }
            else
            {
                for( let i=0; i < this.__field_maps.__user.length; i++)
                {
                    if( fieldName === "user."+this.__field_maps.__user[i].zendesk_field )
                    {
                        matchedZDFieldName = this.__field_maps.__user[i].zendesk_field;
                        /* DebugOnlyCode - START */
                        if( debug_mode ) { console.log( "MAPPED FIELD FOUND: matchedZDFieldName = '%s'", matchedZDFieldName ); }
                        /* DebugOnlyCode - END */
                        break;
                    }
                }
            }
        }

        //if it's a dependant 'extra' field
        if( matchedZDFieldName!==null && typeof( this.__zendesk_user ) !== "undefined" && this.__zendesk_user !== null )
        {
                this.__zendesk_user.findExtraFieldByName( matchedZDFieldName, true ).value = event.newValue;
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Updated correcponding value in this.__zendesk_user = %o", this.__zendesk_user ); }
                /* DebugOnlyCode - END */
                this.switchToMainTemplate();
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },	

    __userScreenCustomerTypeFieldChanged: function( newValue )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__userScreenCustomerTypeFieldChanged( newValue ) called" );
            console.log( "ARG1: newValue = %o", newValue );
        }
        /* DebugOnlyCode - END */
        
        let oldCustomerType = this.__zendesk_user.customer_type;
        this.__zendesk_user.customer_type = newValue;
        this.__changeCustomerType( oldCustomerType, newValue );
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    // </editor-fold>

    // <editor-fold defaultstate="collapsed" desc="OnClick Functions">
    syncButtonFromModalOnClick: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncButtonFromModalOnClick() called" );
        }
        /* DebugOnlyCode - END */
        
        this.syncButtonPressed = true; //We use this when we close modal window so we know to remind parent instance to refresh
        this.__syncExistingUserToMailchimp( this.__zendesk_user, true );
           
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },    
    
    mailchimpOnlyField_OnClick: function( event ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "mailchimpOnlyField_OnClick(event) called" );
            console.log( "ARG1 event = %o)", event );
            console.log( "Searching through mailchimp user's extra_merge_fields looking for the one with no field_def.zendesk_field that links to event.target.id ('%s')", event.target.id );
        }
        console.warn( "SHOULD CLONE MAILCHIMP USER IDEALLY AT THIS POINT AS WE'RE UPDATING FIELD AS IF CHECKBOX UPDATE HAS WORKED BEFORE ACTUALLY UPDATING IT IF UPDATE FAILS COULD END UP OUT OF SYNC BUT ONLY UNTIL NEXT APP REFRESH - UPDATE ACTUALLY IM NOT SURE THATS TRUE BECUASE IF THE MC UPDATE FAILS IT TAKES USER TO AN ERROR MESSAGE WHICH THEN FORCES APP REFRESH SO I THINK THIS IS THE BEST WAY - IN FACT IF WE WORK ON A CLONE THEN WERE GOING TO HAVE TO UPDATE USER OBJECT AFTER APP REFRESH WHICH COULD BE TIME CONSUMING");
        /* DebugOnlyCode - END */ 
        
        let tempField = null;
        
        for( let i=0; i < this.__mailshot_sync_user.extra_merge_fields.length; i++)
        {
            tempField = this.__mailshot_sync_user.extra_merge_fields[ i ];
            if( typeof( tempField.field_def.zendesk_field ) === "undefined" && ( "MC_ONLY_" + tempField.field_def.mailchimp_field ) === event.target.id )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Found it! tempField = %o,\nvalue beofre update: '%s'", tempField, tempField.value); }
                /* DebugOnlyCode - END */ 
                
                if( tempField.field_def.type === this.__resources.__TYPE_CHECKBOX )
                {
                    tempField.value = ( /* NEEDS MORE WORK BECAUSE  tempField.value COULD BE STRING OR NUMBER WHEREAS value-if-ticked IS ALWAYS A STRING SO HAVE TO CAST BEFORE CHECKING :(
                 *                         WE ALSO HAVE TO DO THE SAME WORK IN getFieldSyncInfo so maybe split out into seperate function
                                        tempField.value !== tempField.field_def.value-if-ticked && (
                                            tempField.value === tempField.field_def.value-if-unticked || */
                                            tempField.value === null ||    //this one and ones below guess at value as it's neither the specified ticked or unticked value
                                            tempField.value === false ||
                                            tempField.value === "0" ||
                                            tempField.value === 0 ||
                                            tempField.value === "" ||
                                            tempField.value.toString().toUpperCase() === "NO" ||
                                            tempField.value.toString().toUpperCase() === "FALSE" /* ) */
                                       ) ? "1" : "0";  /* ) ? tempField.field_def.value-if-ticked : tempField.field_def.value-if-unticked; */
                }
                else
                {
                    console.error( "Unsupported field type '%s' (only 'checkbox' supported) on mailchimp extra merge field: %o" + tempField.type, tempField );
                }
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Value after update: '%s'", tempField.value); }
                console.warn( 'Should implement proper value-if-ticked and value-if-unticked on settings object here rather than just 1 and 0' );
                /* DebugOnlyCode - END */ 
            }
        }

        //now save the updated user in mailchimp
        this.switchToLoadingScreen( "Updating Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.__requests.__createOrUpadateMailChimpListMember( this.__mailshot_sync_user, true ), 
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

    //EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
    excludeButtonOnClick: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "excludeButtonOnClick() called" );
            console.log( "Cloning this.__zendesk_user, setting .customer_type to '"+this.__resources.__CUSTOMER_TYPE_EXCLUDE+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 

        //update via zendesk apis
        let updatedUserToSave = this.__zendesk_user.clone();
        updatedUserToSave.customer_type = this.__resources.__CUSTOMER_TYPE_EXCLUDE;
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
            console.log( "Cloning this.__zendesk_user, setting .customer_type to '"+this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 

        //update via apis
        let updatedUserToSave = this.__zendesk_user.clone();
        updatedUserToSave.customer_type = this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION;
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
            console.log( "Cloning this.__zendesk_user, setting .customer_type to '"+this.__resources.__CUSTOMER_TYPE_USE_DEFAULT+"' then making __updateZendeskUser AJAX Call");
        }
        /* DebugOnlyCode - END */ 
        
        let updatedUserToSave = this.__zendesk_user.clone();
        updatedUserToSave.customer_type = this.__resources.__CUSTOMER_TYPE_USE_DEFAULT;

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

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Converted userObjectFromDataAPI to user object: this.__zendesk_user = %o", this.__zendesk_user );
            console.log( "Checking if we have to load organisation (answer: %o), this.__zendesk_user.isOrganization() = %o, this.__zendesk_user.belongsToOrganization() = %o", this.__zendesk_user.isOrganization() && this.__zendesk_user.belongsToOrganization(), this.__zendesk_user.isOrganization(),  this.__zendesk_user.belongsToOrganization() ); 
        }
        /* DebugOnlyCode - END */

        //now populate the users organization object through another API call but only if we need it (user type = organization )
        if( this.__zendesk_user.isOrganization() && this.__zendesk_user.belongsToOrganization() )
        {
            this.switchToLoadingScreen( "Loading Organization..." );
            makeAjaxCall(
                this,
                this.__requests.__getZendeskOrganizations( this.__zendesk_user.id, this.__zendesk_user.organization_id ), 
                this.__getZendeskOrganizations_Done,  
                this.__switchToErrorMessage 
            );
        }
        //otherwise we've finished getting the user object
        else
        {
            this.__fetchMailchimpObjectIfNecessary();
        }

        this.__zendesk_user = this.__createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

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
            console.group( "__createZendeskUserFromAPIReturnData (userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */ 

        var zendeskUserObjectToReturn = null;
        if( userObjectFromDataAPI !== null )
        {
            zendeskUserObjectToReturn = new this.zendeskObjectsModule.ZendeskUser(
                this, 
                userObjectFromDataAPI.user.id,
                userObjectFromDataAPI.user.name,
                userObjectFromDataAPI.user.email,
                userObjectFromDataAPI.user.user_fields.mailshot_customer_type,
                ( typeof( userObjectFromDataAPI.user.organization_id ) !== 'undefined' && userObjectFromDataAPI.user.organization_id !== null ) ? userObjectFromDataAPI.user.organization_id : null //being careful as sometimes users can be set to link through to more than one org depending on admin settings
            );
            /* DebugOnlyCode - START */ 
            if( debug_mode ) { console.log( "Completed part 1 of 2, basic user: zendeskUserObjectToReturn = %o", zendeskUserObjectToReturn); }
            /* DebugOnlyCode - END */ 
            
            //now set the optional extra user fields from returned API data
            zendeskUserObjectToReturn.populateExtraFieldsFromUserAPIData( userObjectFromDataAPI.user );
            /* DebugOnlyCode - START */ 
            if( debug_mode ) { console.log( "Completed part 2 of 2, populateExtraFieldsFromUserAPIData: zendeskUserObjectToReturn = %o", zendeskUserObjectToReturn); }
            /* DebugOnlyCode - END */
            
            //we've kept a record of the org id if there is one but now leave org object as null as this info is not available on this API return data
        }
        else console.error( "__createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished, zendeskUserObjectToReturn = %o", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */ 
        
        return zendeskUserObjectToReturn;
    },

    __updateZendeskUser_Done: function( userObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "__updateZendeskUser_Done(userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
            console.log( "Creating Zendesk User from API Return data, copying old orgObject onto it (as org remains unchanged), updating customer type and keeping track of old type", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */
        
        let returnedUser = this.__createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
        returnedUser.orgObject = this.__zendesk_user.orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
        let oldCustomerType = this.__zendesk_user.customer_type;
        this.__zendesk_user = returnedUser;

       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Done oldCustomerType = '%s' and the newly updated this.__zendesk_user is now: %o", oldCustomerType, this.__zendesk_user );
            console.log( "If we just switched to Organisation customer type then this.__zendesk_user.orgObject MAY need populating. Checking..." );
            console.log( "    Are we syncing as an 'organisation' user? (this.__zendesk_user.isOrganization()) = %o", this.__zendesk_user.isOrganization());
            console.log( "    Does the user belong to an organisation? (this.__zendesk_user.belongsToOrganization()) = %o", this.__zendesk_user.belongsToOrganization() );
            console.log( "    Is the org object already populated on the user? (this.__zendesk_user.orgObjectIsPopulated()) = %o", this.__zendesk_user.orgObjectIsPopulated() );
        }
        /* DebugOnlyCode - END */

        //now populate the users arganization object through another API call but only if we need it (user type = organization )
        if( this.__zendesk_user.isOrganization() && this.__zendesk_user.belongsToOrganization() && !this.__zendesk_user.orgObjectIsPopulated())
        {
            this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = ( oldCustomerType === null ) ? 'NOTSET' : oldCustomerType;
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do need to populate org object. But we also need to call __changeCustomerType(old, new) after it's populated, so setting this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = '%s' temporarily then calling __getZendeskOrganizations", this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); }
            /* DebugOnlyCode - END */
            this.switchToLoadingScreen( "Loading Organization..." );
            makeAjaxCall(
                this,
                this.__requests.__getZendeskOrganizations( this.__zendesk_user.id, this.__zendesk_user.organization_id ), 
                this.__getZendeskOrganizations_Done,  
                this.__switchToErrorMessage 
            );
        }
        else
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do NOT need to populate org object. Object fully loaded (or not needed) so nothing left to do but to call this.__changeCustomerType( oldCustomerType, this.__zendesk_user.customer_type )" ); }
            /* DebugOnlyCode - END */
            this.__changeCustomerType( oldCustomerType, this.__zendesk_user.customer_type );
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
        }
        /* DebugOnlyCode - END */

        this.__zendesk_user.orgObject = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking was this load as a result of agent pressing the 'organization' button?  \nthis.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = %o", this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); }
        /* DebugOnlyCode - END */

        //was this load as a result of pressing the "organization" button?
        if( typeof( this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ) !== "undefined" && this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs !== null )
        {
            let oldType = ( this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs === 'NOTSET' ) ? null : this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs;
            this.__zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = null;
            this.__changeCustomerType( oldType, this.__zendesk_user.customer_type );
        }
        else
        {
            //we now have full populated user object to save complete with org object and no more changes so continue to load form
            this.__fetchMailchimpObjectIfNecessary();
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.__zendesk_user = %o", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createZendeskOrganizationFromAPIReturnData(organizationObjectFromDataAPI) called" );
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
            organizationObjectToReturn = new this.zendeskObjectsModule.ZendeskOrganization(
                    this,
                    organizationObjectFromDataAPI.organization.id,
                    organizationObjectFromDataAPI.organization.name,
                    organizationObjectFromDataAPI.organization.organization_fields[ this.__field_maps.__cust_type.zendesk_field ]
            );
            organizationObjectToReturn.populateExtraFieldsFromOrganizationAPIData( organizationObjectFromDataAPI.organization );
        }
        else console.warn( "createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");

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
    
    //DEPRECATED FUNCTION _ NO LONGER USED
    __getUserFromFrameworkInUserSidebarLocation: function()
    {
            //console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );

            //fetch first organization object if there is one, null if not
            let usersOrgObject = ( typeof( this.user().organizations()[0] ) !== 'undefined' && this.user().organizations()[0] !== null ) ? this.user().organizations()[0] : null;

            //initialize user object
            this.__zendesk_user = new this.zendeskObjectsModule.ZendeskUser(
                    this,
                    this.user().id(),
                    this.user().name(),
                    this.user().email(),
                    this.user().customField( this.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE ),
                    ( usersOrgObject === null ) ? null : usersOrgObject.id()
            );

            //now set the optional extra user fields from the framework object
            this.__zendesk_user.populateExtraFieldsFromFrameworkUserObject( this.user() );

            //popupate org object if one is set on user record
            if( usersOrgObject !== null )
            {
                    this.__zendesk_user.orgObject = new this.zendeskObjectsModule.ZendeskOrganization( this, usersOrgObject.id(), usersOrgObject.name(), usersOrgObject.customField( this.__field_maps.__cust_type.zendesk_field ) );
                    this.__zendesk_user.orgObject.populateExtraFieldsFromFrameworkOrgObject( usersOrgObject );
            }

            //console.log( "Finished getUserFromFrameworkInUserSidebarLocation, this.__zendesk_user = " );console.dir( this.__zendesk_user );
            this.__fetchMailchimpObjectIfNecessary();
    },    
    
    __fetchMailchimpObjectIfNecessary: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "__fetchMailchimpObjectIfNecessary() called" );
            console.log( "If included, Check if __mailshot_sync_user already loaded? \nthis.__zendesk_user.isIncluded() = %o \nthis.__mailshot_sync_user = %o",  this.__zendesk_user.isIncluded(), this.__mailshot_sync_user );
        }
        /* DebugOnlyCode - END */

        //if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
        if( this.__zendesk_user.isIncluded() && this.__mailshot_sync_user === null )
        {
            this.switchToLoadingScreen( "Loading user from Mailchimp..." );
            makeAjaxCall(
                this,
                this.__requests.__getMailChimpListMember( this.__zendesk_user.email, this ), 
                this.retrievedMailchimpSubscriber,  
                this.__get_or_createOrUpadate3rdPartyMember_OnFail 
            );
        }
        else
        {
            this.switchToMainTemplate();
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
            console.log( "Updating this.__zendesk_user.customer_type = '%s';", newType);
            console.log( "Checking which button was just pressed (ie checking newType: '%s';", newType);
        }
        /* DebugOnlyCode - END */

        //update user object so it doesnt get out of sync
        this.__zendesk_user.customer_type = newType;

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
                this.deleteExistingUserFromMailchimp( this.__mailshot_sync_user );
            }

            if( oldType !== newType )
            {
                //if NOT SET or EXCLUDE were selected AND it was previously set to the other one out of NOT SET and EXCLUDE
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND it was previously NOT in mailchimp( ie it was previously the other one out of NOT SET and EXCLUDE), so NO ACTION REQUIRED - switching to main template" ); }
                /* DebugOnlyCode - END */
                //reload the app template with new updated user object - no need to call mailchimp API
                this.switchToMainTemplate();
            }
            else
            {
                //value hasnt actually changed so just go back to form
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND the value hasnt actually changed, so NO ACTION REQUIRED - switching to main template" ); }
                /* DebugOnlyCode - END */
                this.switchToMainTemplate();
            }
        }

        //if ORGANIZATION or STANDARD was selected
        //TO DO: PUT DEBUGGING INTO THIS SECTION
        if( newType === this.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION || newType === this.__resources.__CUSTOMER_TYPE_USE_DEFAULT  )
        {
                //if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
                if( oldType === this.__resources.__CUSTOMER_TYPE_EXCLUDE || oldType === this.__resources.__CUSTOMER_TYPE_NOT_SET )
                {
                        this.syncNewUserToMailchimp( this.__zendesk_user );
                }
                //if ORGANIZATION or STANDARD were selected AND it was previously set to the other one
                else if( oldType !== newType )
                {
                        this.__syncExistingUserToMailchimp( this.__zendesk_user, true );
                }
                else
                {
                        //value hasnt actually changed so just go back to form
                        this.switchToMainTemplate();
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
    retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
    {
            //console.log( "started retrievedMailchimpSubscriber, returnedMailchimpUser = returnedMailchimpUser" );console.dir( returnedMailchimpUser ); ////console.log( "" );

            this.__mailshot_sync_user = 
            {
                email_address: returnedMailchimpUser.email_address,
                status: "subscribed",
                forename: returnedMailchimpUser.merge_fields[ this.__settings.__mailchimp_merge_field_forename ],
                surname: returnedMailchimpUser.merge_fields[ this.__settings.__mailchimp_merge_field_surname  ],
                customer_type: returnedMailchimpUser.merge_fields[ this.__field_maps.__cust_type.mailchimp_field ],
                extra_merge_fields: []
            };

            let arrayIndex = 0;
            for (let i=0; i < this.__field_maps.__user.length; i++) 
            {
                this.__mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.__field_maps.__user[ i ], value: returnedMailchimpUser.merge_fields[ this.__field_maps.__user[ i ].mailchimp_field ]};
                arrayIndex++;
            }
            for(let i=0; i < this.__field_maps.__organisation.length; i++) 
            {
                this.__mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.__field_maps.__organisation[ i ], value: returnedMailchimpUser.merge_fields[ this.__field_maps.__organisation[ i ].mailchimp_field ] };
                arrayIndex++;
            }
            for (let i=0; i < this.__field_maps.__mc_only.length; i++) 
            {
                this.__mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.__field_maps.__mc_only[ i ], value: returnedMailchimpUser.merge_fields[ this.__field_maps.__mc_only[ i ].mailchimp_field ] };
                arrayIndex++;
            }		

            //console.log( "Finished retrievedMailchimpSubscriber, this.__mailshot_sync_user = " );console.dir( this.__mailshot_sync_user );
            this.switchToMainTemplate();
    },	

    syncNewUserToMailchimp: function( zendeskUser ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "syncNewUserToMailchimp (zendeskUser) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

        this.switchToLoadingScreen( "Adding Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.__requests.__createOrUpadateMailChimpListMember( newMailChimpUserToSave, false ), 
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

        let newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking if we need to copy across extra merge fields to mailchimp object too? (answer = %o)  \n tryToPreserveMCOnlyFields = %o, this.__mailshot_sync_user = %o, zendeskUser.email = %o, this.__mailshot_sync_user.email_address = %o", ( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.__mailshot_sync_user !== null && zendeskUser.email === this.__mailshot_sync_user.email_address ), tryToPreserveMCOnlyFields, this.__mailshot_sync_user, zendeskUser.email, this.__mailshot_sync_user.email_address ); }
        /* DebugOnlyCode - END */
        //if switching between Standard and Org mode try to preserve the value of the Mailchimp only checkbox fields
        if( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.__mailshot_sync_user !== null && zendeskUser.email === this.__mailshot_sync_user.email_address )
        {
            for( let i=0; i < this.__mailshot_sync_user.extra_merge_fields.length; i++)
            {
                if( typeof( this.__mailshot_sync_user.extra_merge_fields[ i ].field_def.zendesk_field ) === "undefined" ) 
                {
                        newMailChimpUserToSave.extra_merge_fields[ i ].value = this.__mailshot_sync_user.extra_merge_fields[ i ].value;
                }
            }
        }

        this.switchToLoadingScreen( "Updating Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.__requests.__createOrUpadateMailChimpListMember( newMailChimpUserToSave, true ), 
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

    deleteExistingUserFromMailchimp: function( mailchimpUser ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "deleteExistingUserFromMailchimp(mailchimpUser) called" );
            console.log( "ARG1: mailchimpUser = %o", mailchimpUser );
        }
        /* DebugOnlyCode - END */
            
        this.switchToLoadingScreen( "Deleting Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.__requests.__deleteMailChimpListMember( mailchimpUser ), 
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
        
        __3rdParty_get_or_createOrUpadate3rdPartyMember_OnFail( this, errorResponse );
    
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

        this.syncNewUserToMailchimp( this.__zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.__zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    __createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
    {
            this.retrievedMailchimpSubscriber( returnedMailchimpUser );
    },

    createNewMailchimpSyncUserObject: function( zendeskSyncUserObject )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "createNewMailchimpSyncUserObject(zendeskSyncUserObject) called" );
            console.log( "ARG1: zendeskSyncUserObject = %o", zendeskSyncUserObject );
        }
        /* DebugOnlyCode - END */
            
        let useDefaultOrgValues = zendeskSyncUserObject.isDefault();		

        //Sanity checks
        if(zendeskSyncUserObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with null zendeskSyncUserObject");
                return null;
        }
        if(!useDefaultOrgValues && zendeskSyncUserObject.orgObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with customer type " + zendeskSyncUserObject.customer_type + " and  null zendeskSyncUserObject.orgObject");
                return null;
        }

        //base object without extra merge fields
        var mailchimpUserToReturn =
        {
            email_address: zendeskSyncUserObject.email,
            __status: "subscribed",
            forename: zendeskSyncUserObject.getForeName(),
            surname: zendeskSyncUserObject.getSurname(),
            customer_type: zendeskSyncUserObject.getMailchimpCustomerType(),
            extra_merge_fields: []
        };
        
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Copied base user object (without 'additional fields') over to mailchimpUserToReturn. mailchimpUserToReturn = %o", mailchimpUserToReturn ); }
        /* DebugOnlyCode - END */

        //extra merge fields for organisation fields
        let arrayIndex = 0;
        for (let i=0; i < zendeskSyncUserObject.extra_user_fields.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: zendeskSyncUserObject.extra_user_fields[ i ].field_def, value: ( zendeskSyncUserObject.extra_user_fields[ i ].value === null ) ? "" : zendeskSyncUserObject.extra_user_fields[ i ].value };
                arrayIndex++;
        }
        for (let i=0; i < this.__field_maps.__organisation.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.__field_maps.__organisation[ i ], value: useDefaultOrgValues ? this.__field_maps.__organisation[ i ].default_value : zendeskSyncUserObject.orgObject.extra_org_fields[ i ].value };
                arrayIndex++;
        }
        for (let i=0; i < this.__field_maps.__mc_only.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.__field_maps.__mc_only[ i ], value: this.__field_maps.__mc_only[ i ].default_value };
                arrayIndex++;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Now added user fields, organisation fields and mailchimp only fields over to mailchimpUserToReturn.extra_merge_fields. mailchimpUserToReturn = %o", mailchimpUserToReturn );
            console.log( "Finished, returning mailchimpUserToReturn" );
            console.groupEnd();
        }
        
        /* DebugOnlyCode - END */
        return mailchimpUserToReturn;
    },

    //SWITCH TO HTML TEMPLATE FUNCTIONS
    switchToLoadingScreen: function( optionalMessage ) 
    {
        switchToInlineTemplate( this.__resources.__TEMPLATE_ID_LOADING, { optional_message: optionalMessage } );
    },

    switchToMainTemplate: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "switchToMainTemplate() called" );
        }
        /* DebugOnlyCode - END */

        let syncFields = this.__zendesk_user.getFieldSyncInfo( this.__mailshot_sync_user );
        let isInSync = this.__zendesk_user.isInSync( syncFields );
        let defaultButtonColourClassInsert = ' ' + ( isInSync || this.__zendesk_user.isExcluded() ? 'btn-primary' : 'btn-danger' );

        let formData = 
        {
            'zendesk_user'      : this.__zendesk_user,
            'mailchimp_user'    : this.__mailshot_sync_user,
            'sync_fields'       : syncFields,
            'monkey_URL'        : this.__zendesk_user.isExcluded() ? "./img/exclude_monkey.png" : ( isInSync ? "./img/insync_monkey.png" :  "./img/outofsync_monkey.png" ),
            'buttons': 
            {
                'exclude'       : { 
                    'show'              : true, 
                    'classNameInsert'   : this.__zendesk_user.isExcluded() ? " active" : "", 
                    'label'             : "Exclude", 
                    'onclick'           : 'excludeButtonOnClick()' 
                },
                'organization'  : { 
                    'show'              : ( this.__zendesk_user.belongsToOrganization() ), 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.__zendesk_user.isOrganization() ? " active" : "" ), 
                    'label'             : this.__settings.__mailchimp_organisation_button_label, 
                    'onclick'           : 'organizationButtonOnClick()' 
                },
                'standard'      : { 
                    'show': true, 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.__zendesk_user.isDefault() ? " active" : "" ), 
                    'label'             : this.__settings.__mailchimp_standard_button_label, 
                    'onclick'           : 'standardButtonOnClick()'
                }
            },
            'display_params':
            {
                'customer_type_not_set'     : this.__zendesk_user.isNotset(),
                'customer_type_exclude'     : this.__zendesk_user.isExcluded(),
                'customer_type_included'    : this.__zendesk_user.isIncluded(),
                'customer_type_organization': this.__zendesk_user.isOrganization(),
                'customer_type_standard'    : this.__zendesk_user.isDefault(),
                'user_in_sync'              : isInSync,
                'DEBUG'                     : debug_mode
            }
        };

        thisV2Client.main_template_form_data = formData;

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Switching to template '%s' with form data: %o ", ( this.__modalMode ? this.__resources.__TEMPLATE_NAME_MAIN_MODAL_MODE : this.__resources.__TEMPLATE_NAME_MAIN ), formData); }
        /* DebugOnlyCode - END */
        switchToHdbsFileTemplate( ( this.__modalMode ? this.__resources.__TEMPLATE_NAME_MAIN_MODAL_MODE : this.__resources.__TEMPLATE_NAME_MAIN ), formData );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    __switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonClass, additionalButtonOnclick ) 
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
          'mainButtonClass'      : ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? 'btn-danger' : 'btn-warning',
          'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
          'additionalButtonClass' 	: ( typeof( additionalButtonClass ) === "undefined" ) ? null : additionalButtonClass,
          'additionalButtonOnclick' 	: ( typeof( additionalButtonOnclick ) === "undefined" ) ? null : additionalButtonOnclick
        };

        switchToHdbsFileTemplate( this.__resources.__TEMPLATE_NAME_SHOWERROR, formData );

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
                           'For help with these settings fields use our <a target="_blank" href="'+this.__resources.__SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL+'">Zenchimp App Settings Generator</a> in Microsoft Excel';
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
                if( typeof fieldMap.default_value === 'undefined' || fieldMap.default_value === null ) { errorArray.push( 'Missing Field: default_value'); }
                //this field depends on if its a mailchimp only field
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
