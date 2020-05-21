var pluginFactory = function( thisV2Client ) {

  return {

    private_v2Client: thisV2Client,

    //set on init
    private_context: null,

    private_resources: 
    {
        //a public version of private_resources called 'resources' will be created in init() so
        //that the public properties below can still be accessed outside this file. 
        //Anything beginning private_ will be mangled by the minifier but the rest 
        //(including the public 'resources' object created in init() ) won't be mangled
        private_APP_LOCATION_TICKET: "ticket_sidebar",
        private_APP_LOCATION_USER: "user_sidebar",

        private_TYPE_TEXT: "text", /* public copy taken in init() */
        private_TYPE_IMAGE: "image", /* public copy taken in init() */
        private_TYPE_CHECKBOX: "checkbox", /* public copy taken in init() */

        private_USER_FIELD_HANDLE_CUSTOMER_TYPE: "mailshot_customer_type",
        private_ORG_FIELD_HANDLE_CUSTOMER_TYPE: "mailshot_customer_display_name",
        
        private_CUSTOMER_TYPE_NOT_SET: null, /* public copy taken in init() */
        private_CUSTOMER_TYPE_EXCLUDE: "mailshot_exclude_from_mailshot", /* public copy taken in init() */
        private_CUSTOMER_TYPE_USE_DEFAULT: "mailshot_use_default_values", /* public copy taken in init() */
        private_CUSTOMER_TYPE_USE_ORGANIZATION: "mailshot_use_organisation_values", /* public copy taken in init() */

        private_TEMPLATE_NAME_MAIN: "./templates/main.hdbs",
        private_TEMPLATE_NAME_MAIN_MODAL_MODE: "./templates/sync-modal.hdbs",
        private_TEMPLATE_ID_LOADING: "loading-screen-template",
        private_TEMPLATE_NAME_SHOWERROR: "./templates/show_error.hdbs",
        
        private_SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL: "https://github.com/up-n-running/ZenChimp-Zendesk-App-Mailchimp-Sync/raw/master/extras/ZenchimpSettingsGenerator.xlsx"
    },
    

    private_events: 
    {
        'ticket.requester.id.changed'   : 'resetAppIfPageFullyLoaded',
        'user.email.changed'            : 'resetAppIfPageFullyLoaded',
        'user.id.changed'               : 'resetAppIfPageFullyLoaded',
        'user.name.changed'             : 'resetAppIfPageFullyLoaded',
        'user.organizations.changed'    : 'resetAppIfPageFullyLoaded',

        'private_createOrUpadateMailChimpListMember.done'	: 'private_createOrUpadateMailChimpListMember_Done',
        'private_createOrUpadateMailChimpListMember.fail'	: 'private_get_or_createOrUpadateMailChimpListMember_OnFail',   

        //main screen events
        'user.mailshot_customer_type.changed' : 'private_userScreenCustomerTypeFieldChanged',

        '*.changed': 'private_formFieldChanged'
    },

    // <editor-fold defaultstate="collapsed" desc="AJAX API SETTINGS GENERATORS">
    private_requests:
    {
        private_parentPlugin: null,  //set back to plugin (as in plugin.private_requests) during init();

        private_getZendeskUser: function( id )
        {
            let userApiCallSettings = 
            {       
                    url: 'https://upnrunning.zendesk.com/api/v2/users/'+encodeURIComponent(id)+'.json',
                    type:'GET',
                    dataType: 'json'
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "private_requests.private_getZendeskUser(%d), userApiCallSettings = %o", id, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        private_updateZendeskUser: function( userToSyncObject )
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
            if( debug_mode ) { console.log( "private_requests.private_updateZendeskUser(%o), userApiCallSettings = %o", userToSyncObject, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },

        private_getZendeskOrganizations: function(userId, organizationId)
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
            if( debug_mode ) { console.log( "private_requests.private_getZendeskOrganizations(%d, %d), userApiCallSettings = %o", userId, organizationId, userApiCallSettings );}
            /* DebugOnlyCode - END */ 
            return userApiCallSettings;
        },
/*
            //THIS IS FUNCTIONCAL CODE BUT IS NOT NEEDED IN THIS IMPLEMENTATION
            private_getMailChimpAllListMembers: function()
            {
                    let jsonCall =
                    {
                            url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.private_settings.private_mailchimp_datacentre_prefix ),
                            type: 'POST',
                            dataType: 'json',
                            contentType: 'application/json; charset=UTF-8',
                            data: JSON.stringify(
                            {
                                    "apikey": this.private_settings.private_mailchimp_api_key,
                                    "id": this.private_settings.private_mailchimp_list_id,
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
                    //console.log( "private_getMailChimpAllListMembers: API CAll DETAILS:" );console.dir( jsonCall );
                    return jsonCall;
            },
*/
        private_getMailChimpListMember: function( emailAddress )
        {
            if( typeof( emailAddress ) === "undefined" || emailAddress === null )
            {
                return console.error( "ERROR CONDITION: private_getMailChimpListMember called with null email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(emailAddress.toLowerCase());                

            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_list_id)+
                     '/members/'+encodeURIComponent(md5HashOfEmail),
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.private_parentPlugin.private_settings.private_mailchimp_api_key )
                }
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "private_requests.private_getMailChimpListMember('%s'), jsonCall = %o", emailAddress, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        private_createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
            {
                    return console.warn( "ERROR CONDITION: private_createOrUpadateMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of email address
            let md5HashOfEmail =md5(mailchimpSyncUser.email_address.toLowerCase());

            let mergeFields = {};
            mergeFields[ this.private_parentPlugin.private_settings.private_mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
            mergeFields[ this.private_parentPlugin.private_settings.private_mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
            mergeFields[ this.private_parentPlugin.private_settings.private_mailchimp_list_field_customer_type_name ] = mailchimpSyncUser.customer_type;
            for (let i=0; i < mailchimpSyncUser.extra_merge_fields.length; i++) 
            {
                mergeFields[ mailchimpSyncUser.extra_merge_fields[ i ].field_def.mailchimp_field ] = mailchimpSyncUser.extra_merge_fields[ i ].value;
            }

            let dataJSON = 				
            {
                "id": md5HashOfEmail,
                "email_address": mailchimpSyncUser.email_address,
                "email_type": "html",
                "status": mailchimpSyncUser.private_status,
                "status_if_new": "subscribed",
                "merge_fields": mergeFields,
                "vip": ( mailchimpSyncUser.customer_type === this.private_parentPlugin.private_resources.private_CUSTOMER_TYPE_USE_ORGANIZATION )
            };

            //2 x mailchimp mandatory merge fields + 1 mandatory customer_type field plus all extra ones from user object, org object and mc only fields


            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_list_id)+
                     '/members/'+encodeURIComponent(updateNotCreate ? md5HashOfEmail : ""),
                type: updateNotCreate ? 'PUT' : 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.private_parentPlugin.private_settings.private_mailchimp_api_key )
                },
                data: JSON.stringify( dataJSON )
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "private_requests.private_createOrUpadateMailChimpListMember( mailchimpSyncUser:'%o', updateNotCreate: '%o' ), dataJSON = %o, jsonCall = %o", mailchimpSyncUser, updateNotCreate, dataJSON, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        //NOT SURE THIS IS EVER CALLED OR NEEDED BUT IT'S FUNCTIONAL CODE
        private_deleteMailChimpListMember: function( mailchimpSyncUser )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
            {
                return console.error( "ERROR CONDITION: private_deleteMailChimpListMember called with either null user or user with no email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(mailchimpSyncUser.email_address.toLowerCase());

            let jsonCall =
            {
                url: "https://"+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_datacentre_prefix)+
                     ".api.mailchimp.com/3.0/lists/"+encodeURIComponent(this.private_parentPlugin.private_settings.private_mailchimp_list_id)+
                     "/members/"+encodeURIComponent(md5HashOfEmail),
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + this.private_parentPlugin.private_settings.private_mailchimp_api_key )
                }
            };
            
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "private_requests.private_deleteMailChimpListMember( mailchimpSyncUser:%o ), jsonCall = %o", jsonCall ); }
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
        let privateResourcesObjToCopy = this.private_resources;
        this.resources = {
            TYPE_TEXT: privateResourcesObjToCopy.private_TYPE_TEXT,
            TYPE_IMAGE: privateResourcesObjToCopy.private_TYPE_IMAGE,
            TYPE_CHECKBOX: privateResourcesObjToCopy.private_TYPE_CHECKBOX,
            CUSTOMER_TYPE_NOT_SET: privateResourcesObjToCopy.private_CUSTOMER_TYPE_NOT_SET,
            CUSTOMER_TYPE_EXCLUDE: privateResourcesObjToCopy.private_CUSTOMER_TYPE_EXCLUDE,
            CUSTOMER_TYPE_USE_DEFAULT: privateResourcesObjToCopy.private_CUSTOMER_TYPE_USE_DEFAULT,
            CUSTOMER_TYPE_USE_ORGANIZATION: privateResourcesObjToCopy.private_CUSTOMER_TYPE_USE_ORGANIZATION
        }
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Made public facing copy of private_resources: this.resources = %o", this.resources ); }
        /* DebugOnlyCode - END */
        
        //housekeeping (functions in this.private_requests cannot access parent plugin when they in turn reference 'this' so we have a pointer back - it's just a javascript function context thing)
        this.private_requests.private_parentPlugin = this;
        this.modalMode = ( typeof modalMode === 'undefined' || modalMode === null ) ? false : modalMode;
            
        //get Common JS Modules (not sure if we need this - it's a bit extra doing it this way
        this.zendeskObjectsModule = {ZendeskOrganization, ZendeskUser};
        this.parseNamesModule = NameParse;

        //delcare other instance variables
        this.private_mailshot_sync_user = null; 
        this.private_zendesk_user = null;

        //flag to keep track of when app is fully loaded
        this.private_isFullyInitialized = false;  //this will only be set to true in resetAppIfPageFullyLoaded once the above ones are set ()

        // ***** GET WHICH SCREEN WE'RE ON *******

        this.private_context = ( typeof existingContext === 'undefined' ) ? null : existingContext;
        //get location (which screen we're on). Unless a spoofed private_context value was passed into init() from outside then we dont need to call this promise cos we can use the spoofed one

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING this.private_v2Client.context() PROMISE IF CONNTEXT WASNT PASSED IN to populate this.private_context {}. this.private_context = %o", this.private_context ); }
        /* DebugOnlyCode - END */
            
        if( this.private_context === null ) 
        {
            this.private_v2Client.context().then( (context) => {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.group( "PROMISE RETURNED: context().then" ); console.log( "PROMISE RETURNED: this.private_v2Client.context().then( (private_context) => {...}       context = %o", context ); }
                /* DebugOnlyCode - END */
                
                this.private_context = context;
                
                //hide hidden customer type field if in user screen now we know the context
                this.private_hideFieldsIfInUserLocation();
                this.resetAppIfPageFullyLoaded(); //check if this was the last initionalisation step we were waiting for before we can continue
                
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.groupEnd(); }
                /* DebugOnlyCode - END */
            }, ( error ) => { this.switchToErrorMessage(error, "Could not get app private_context, please check your internet connection and try again");} );
        }

        // ***** GET SETTINGS *******
        this.private_settings_fetched = false; //flag to keep track of when proise below has returned
        
        //declare settings object - populated on promise (only private one needed)
        this.private_settings = {};
        //declare object for field mappings - populated on promise (a public one will be made available below)
        this.private_field_maps = {};
        
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CALLING this.private_v2Client.metadata() PROMISE to populate this.private_settings {} and this.private_field_maps {}. this.private_settings_fetched = %s", this.private_settings_fetched ); }
        /* DebugOnlyCode - END */        
        
        //Now Get Settings from manifest.json into private_settings and private_field_maps
        this.private_v2Client.metadata().then( (metadata) =>  {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.group( "PROMISE RETURNED: metadata().then" ); console.log( "PROMISE RETURNED: metadata().then( (metadata) => {...}       metadata = %o", metadata ); }
            /* DebugOnlyCode - END */
            
            //fetch settings from settings screen
            let returnedSettings = metadata.settings;
            this.private_settings.private_mailchimp_api_key = returnedSettings.mailchimp_api_key;
            this.private_settings.private_mailchimp_datacentre_prefix = returnedSettings.mailchimp_datacentre_prefix;
            this.private_settings.private_mailchimp_list_id = returnedSettings.mailchimp_list_id;
            this.private_settings.private_mailchimp_merge_field_forename = returnedSettings.mailchimp_merge_field_forename;
            this.private_settings.private_mailchimp_merge_field_surname = returnedSettings.mailchimp_merge_field_surname;
            this.private_settings.private_mailchimp_list_field_customer_type_name = returnedSettings.mailchimp_merge_field_customer_type;
            this.private_settings.private_mailchimp_list_field_customer_type_default_value = returnedSettings.mailchimp_merge_field_customer_type_default_val;
            this.private_settings.private_mailchimp_organisation_button_label = returnedSettings.mailchimp_organisation_button_label;
            this.private_settings.private_mailchimp_standard_button_label = returnedSettings.mailchimp_standard_button_label;
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "    populated private settings object: this.private_settings = %o", this.private_settings ); }
            /* DebugOnlyCode - END */


            //setup private field mappings object (gets minified)
            this.private_field_maps = {
                private_cust_type    : { zendesk_field: this.private_resources.private_ORG_FIELD_HANDLE_CUSTOMER_TYPE, mailchimp_field: this.private_settings.private_mailchimp_list_field_customer_type_name, type: this.private_resources.private_FIELD_TYPE_TEXT, default_value: this.private_settings.private_mailchimp_list_field_customer_type_default_value },
                private_organisation : this.private_validateFieldMappingsJSON( returnedSettings.mailchimp_organization_field_mappings, 'Organisation Field Mapping', false ),
                private_user         : this.private_validateFieldMappingsJSON( returnedSettings.mailchimp_user_field_mappings, 'User Field Mapping', false ),
                private_mc_only      : this.private_validateFieldMappingsJSON( returnedSettings.mailchimp_mailshot_only_field_mappings, 'Mailchimp Only Field Mapping', true )
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "populated private field maps object: this.private_field_maps = %o", this.private_field_maps ); }
            /* DebugOnlyCode - END */

            //copy values to a public object accessible outside this file (doesnt get minified) 
            this.field_maps = {
                cust_type    : this.private_field_maps.private_cust_type,
                organisation : this.private_field_maps.private_organisation,
                user         : this.private_field_maps.private_user,
                mc_only      : this.private_field_maps.private_mc_only
            };
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "populated public field maps object: this.field_maps = %o", this.field_maps ); }
            /* DebugOnlyCode - END */

            if ( this.private_field_maps.private_organisation !== null &&
                 this.private_field_maps.private_user !== null &&
                 this.private_field_maps.private_mc_only !== null 
            ) {
                this.private_settings_fetched = true;
                this.resetAppIfPageFullyLoaded(); //check if this was the last initionalisation step we were waiting for before we can continue
            }
            
            //if not - switchToErrorMessage has already been called inside private_validateFieldMappingsJSON() so no need to redirect user anywhere
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.groupEnd(); }
            /* DebugOnlyCode - END */
        }, ( error ) => {  this.switchToErrorMessage(error, "Could not get your app settings, please check your internet connection and try again"); } );
 
         /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "init() finished, BUT resetAppIfPageFullyLoaded() will complete initialisation once both promises complete asynchronously", this.private_isFullyInitialized );
            console.log( "this.private_settings_fetched = ", this.private_settings_fetched );
            console.log( "this.private_context = ", this.private_context );
            console.log( "this.private_isFullyInitialized = ", this.private_isFullyInitialized);
            
            this.private_context
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
            console.log( "this.private_isFullyInitialized = " + this.private_isFullyInitialized + " and this.private_resources.private_APP_LOCATION_TICKET = " + this.private_resources.private_APP_LOCATION_TICKET + " and this.private_context.location = %s", ( this.private_context === null ? '[this.private_context = null]' : this.private_context.location ) );
        }
        /* DebugOnlyCode - END */

        //has the private_context (ie which page are we on) loaded from init() function
        if( !this.private_isFullyInitialized && this.private_context === null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.private_context === null" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        }   
        //have the settings (ie on the app settings config screen) loaded from init() function
        if( !this.private_isFullyInitialized && !this.private_settings_fetched )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.private_settings_fetched = false" ); console.groupEnd(); }
            /* DebugOnlyCode - END */
            return;
        } 

        //dont continue if page not fuly loaded yet
        if( !this.private_isFullyInitialized && this.private_context.location === this.private_resources.private_APP_LOCATION_TICKET && this.private_zendesk_user === null )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.private_zendesk_user === null, running this.private_v2Client.get('ticket.requester')" ); console.groupEnd();}
            /* DebugOnlyCode - END */
            this.private_v2Client.get('ticket.requester').then( (ticketRequester) => {
                this.private_zendesk_user = ticketRequester['ticket.requester'];
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "SET this.private_zendesk_user = ticketRequester['ticket.requester'] EVEN THOUGH TICKETREQUESTER IS NOT A PROPER ZENDEDK USER OBJECT, ITS A ZENDESK API RETURN OBJECT BUT IT DOES STORE THE USERS ID AND WE'LL USE THIS VERY VERY SOON TO LOAD THE PROPER ZENDESKUSER OBJECT AND REPLACE IT WITH THAT SO NO HARM DONE: this.private_zendesk_user = %o", this.private_zendesk_user ); }
                /* DebugOnlyCode - END */
                this.resetAppIfPageFullyLoaded();
            }, ( error ) => { this.switchToErrorMessage(error, "Could not get the ticket info, please check your internet connection and try again");} );
            return;
        }
        if( !this.private_isFullyInitialized &&this.private_context.location === this.private_resources.private_APP_LOCATION_USER && ( this.user().id() === null || this.user().email() === null || this.user().name() === null ) )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "CHECK FAILED: this.user().id() = " + this.user().id() + " and this.user().email() = " + this.user().email() + " and this.user().name() = " + this.user().name() ); console.groupEnd();}
            /* DebugOnlyCode - END */
            return;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "CHECK PASSED this.private_context = %o, this.private_settings_fetched = %o, this.private_context.location = %s, this.private_zendesk_user = %o", this.private_context, this.private_settings_fetched, this.private_context.location, this.private_zendesk_user );}
        /* DebugOnlyCode - END */

        this.private_mailshot_sync_user = null;


        if(this.private_context.location === this.private_resources.private_APP_LOCATION_TICKET )
        {
            this.switchToLoadingScreen( "Loading Ticket Requester..." );
            makeAjaxCall(
                this,
                this.private_requests.private_getZendeskUser( this.private_zendesk_user.id ), 
                this.private_getZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }
        else if(this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
        {
            //CHECK HERE IF USER WAS UPDATED ELSEWHERE!
            this.switchToLoadingScreen( "Loading Zendesk User..." );
            this.getUserFromFrameworkInUserSidebarLocation();
        }
        this.private_isFullyInitialized = true;

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "this.private_isFullyInitialized = %o", this.private_isFullyInitialized );
            console.log( "********** APP INITIALISED ******* this = %o", this );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    // </editor-fold>

    //MAIN SCREEN UTILITY FUNCTIONS
    private_hideFieldsIfInUserLocation: function() 
    {
            if( this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
            {
                    _.each([this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE], function(f) 
                    {
                    var field = this.userFields(f);

                            if (field && field.isVisible()) 
                            {
                              field.hide();
                            }
                    }, this);
            }	
    },

    //---EXTERNAL FIELD SCREEN CHANGE EVENTS
    private_formFieldChanged: function( event )
    {
            let matchedZDFieldName = null;
            if(this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
            {
                    let fieldName = event.propertyName;
                    for( let i=0; i < this.private_field_maps.private_user.length; i++)
                    {
                            if( fieldName === "user."+this.private_field_maps.private_user[i].zendesk_field )
                            {
                                    matchedZDFieldName = this.private_field_maps.private_user[i].zendesk_field;
                                    break;
                            }
                    }
            }

            //if it's a dependant 'extra' field
            if( matchedZDFieldName!==null && typeof( this.private_zendesk_user ) !== "undefined" && this.private_zendesk_user !== null )
            {
                    this.private_zendesk_user.findExtraFieldByName( matchedZDFieldName, true ).value = event.newValue;
                    this.switchToMainTemplate();
            }
    },	

    private_userScreenCustomerTypeFieldChanged: function(evt)
    {
            //fetch new value from field and old value from user
            let oldCustomerType = this.private_zendesk_user.customer_type;
            let newCustomerTypeSelected = this.user().customField( this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE );
            this.private_changeCustomerType( oldCustomerType, newCustomerTypeSelected );
    },

    //---APP FIELD ONCLICK EVENT FUNCTIONS
    // <editor-fold defaultstate="collapsed" desc="OnClick Functions">
    syncButtonFromModalOnClick: function() 
    {
        this.private_syncExistingUserToMailchimp( this.private_zendesk_user, true );
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
        
        for( let i=0; i < this.private_mailshot_sync_user.extra_merge_fields.length; i++)
        {
            tempField = this.private_mailshot_sync_user.extra_merge_fields[ i ];
            if( typeof( tempField.field_def.zendesk_field ) === "undefined" && ( "MC_ONLY_" + tempField.field_def.mailchimp_field ) === event.target.id )
            {
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Found it! tempField = %o,\nvalue beofre update: '%s'", tempField, tempField.value); }
                /* DebugOnlyCode - END */ 
                
                if( tempField.field_def.type === this.private_resources.private_TYPE_CHECKBOX )
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
            this.private_requests.private_createOrUpadateMailChimpListMember( this.private_mailshot_sync_user, true ), 
            this.private_createOrUpadateMailChimpListMember_Done,  
            this.private_get_or_createOrUpadateMailChimpListMember_OnFail
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
            console.log( "Checking if we're in user screen: answer = %o)", ( this.private_context.location === this.private_resources.private_APP_LOCATION_USER ) );
        }
        /* DebugOnlyCode - END */ 

        if( this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
        {
            this.switchToLoadingScreen( "Updating Zendesk User" );
            this.user().customField( this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE, this.private_resources.private_CUSTOMER_TYPE_EXCLUDE );
            //this triggers private_userScreenCustomerTypeFieldChanged
        }
        else 
        {
            //update via zendesk apis
            let updatedUserToSave = this.private_zendesk_user.clone();
            updatedUserToSave.customer_type = this.private_resources.private_CUSTOMER_TYPE_EXCLUDE;
            this.switchToLoadingScreen( "Updating Zendesk User..." );
            makeAjaxCall(
                this,
                this.private_requests.private_updateZendeskUser( updatedUserToSave ), 
                this.private_updateZendeskUser_Done,
                this.switchToErrorMessage 
            );
        }

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
            console.log( "Checking if we're in user screen: answer = %o)", ( this.private_context.location === this.private_resources.private_APP_LOCATION_USER ) );
        }
        /* DebugOnlyCode - END */ 

        if(this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
        {
            this.switchToLoadingScreen( "Updating Zendesk User" );
            this.user().customField( this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE, this.private_resources.private_CUSTOMER_TYPE_USE_ORGANIZATION );
            //this triggers private_userScreenCustomerTypeFieldChanged
        }
        else 
        {
            //update via apis
            let updatedUserToSave = this.private_zendesk_user.clone();
            updatedUserToSave.customer_type = this.private_resources.private_CUSTOMER_TYPE_USE_ORGANIZATION;
            this.switchToLoadingScreen( "Updating Zendesk User..." );
            makeAjaxCall(
                this,
                this.private_requests.private_updateZendeskUser( updatedUserToSave ), 
                this.private_updateZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }

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
            console.log( "Checking if we're on user screen. this.private_context.location = '%s' and this.private_resources.private_APP_LOCATION_USER = '%s'", this.private_context.location, this.private_resources.private_APP_LOCATION_USER );
        }
        /* DebugOnlyCode - END */
        
        if(this.private_context.location === this.private_resources.private_APP_LOCATION_USER )
        {
            this.switchToLoadingScreen( "Updating Zendesk User..." );
            this.user().customField( this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE, this.private_resources.private_CUSTOMER_TYPE_USE_DEFAULT );
            //this triggers private_userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
        }
        else 
        {
            let updatedUserToSave = this.private_zendesk_user.clone();
            updatedUserToSave.customer_type = this.private_resources.private_CUSTOMER_TYPE_USE_DEFAULT;
            
            /* DebugOnlyCode - START */ 
            if( debug_mode ) { console.log( "We're on ticket screen so i've cloned user and updated it's customer_type now going to call private_updateZendeskUser ajax (which in turn will trigger private_changeCustomerType().\n\nthis.private_zendesk_user = %o\n\ncloned updatedUserToSave = %o", this.private_zendesk_user, updatedUserToSave); }
            /* DebugOnlyCode - END */ 

            this.switchToLoadingScreen( "Updating Zendesk User..." );
            makeAjaxCall(
                this,
                this.private_requests.private_updateZendeskUser( updatedUserToSave ), 
                this.private_updateZendeskUser_Done,  
                this.switchToErrorMessage 
            );
        }
        
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
    private_getZendeskUser_Done: function( userObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_getZendeskUser_Done (ajaxSettings) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */

        this.private_zendesk_user = this.private_createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Converted userObjectFromDataAPI to user object: this.private_zendesk_user = %o", this.private_zendesk_user );
            console.log( "Checking if we have to load organisation (answer: %o), this.private_zendesk_user.isOrganization() = %o, this.private_zendesk_user.belongsToOrganization() = %o", this.private_zendesk_user.isOrganization() && this.private_zendesk_user.belongsToOrganization(), this.private_zendesk_user.isOrganization(),  this.private_zendesk_user.belongsToOrganization() ); 
        }
        /* DebugOnlyCode - END */

        //now populate the users organization object through another API call but only if we need it (user type = organization )
        if( this.private_zendesk_user.isOrganization() && this.private_zendesk_user.belongsToOrganization() )
        {
            this.switchToLoadingScreen( "Loading Organization..." );
            makeAjaxCall(
                this,
                this.private_requests.private_getZendeskOrganizations( this.private_zendesk_user.id, this.private_zendesk_user.organization_id ), 
                this.private_getZendeskOrganizations_Done,  
                this.switchToErrorMessage 
            );
        }
        //otherwise we've finished getting the user object
        else
        {
            this.fetchMailchimpObjectIfNecessary();
        }

        this.private_zendesk_user = this.private_createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.private_zendesk_user = %o", this.private_zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    private_createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
    {
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.group( "private_createZendeskUserFromAPIReturnData (userObjectFromDataAPI) called" );
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
        else console.error( "private_createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished, zendeskUserObjectToReturn = %o", this.private_zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */ 
        
        return zendeskUserObjectToReturn;
    },

    private_updateZendeskUser_Done: function( userObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode )
        { 
            console.group( "private_updateZendeskUser_Done(userObjectFromDataAPI) called" );
            console.log( "ARG1: userObjectFromDataAPI = %o", userObjectFromDataAPI );
            console.log( "Creating Zendesk User from API Return data, copying old orgObject onto it (as org remains unchanged), updating customer type and keeping track of old type", userObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */
        
        let returnedUser = this.private_createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
        returnedUser.orgObject = this.private_zendesk_user.orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
        let oldCustomerType = this.private_zendesk_user.customer_type;
        this.private_zendesk_user = returnedUser;

       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Done oldCustomerType = '%s' and the newly updated this.private_zendesk_user is now: %o", oldCustomerType, this.private_zendesk_user );
            console.log( "If we just switched to Organisation customer type then this.private_zendesk_user.orgObject MAY need populating. Checking..." );
            console.log( "    Are we syncing as an 'organisation' user? (this.private_zendesk_user.isOrganization()) = %o", this.private_zendesk_user.isOrganization());
            console.log( "    Does the user belong to an organisation? (this.private_zendesk_user.belongsToOrganization()) = %o", this.private_zendesk_user.belongsToOrganization() );
            console.log( "    Is the org object already populated on the user? (this.private_zendesk_user.orgObjectIsPopulated()) = %o", this.private_zendesk_user.orgObjectIsPopulated() );
        }
        /* DebugOnlyCode - END */

        //now populate the users arganization object through another API call but only if we need it (user type = organization )
        if( this.private_zendesk_user.isOrganization() && this.private_zendesk_user.belongsToOrganization() && !this.private_zendesk_user.orgObjectIsPopulated())
        {
            this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = ( oldCustomerType === null ) ? 'NOTSET' : oldCustomerType;
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do need to populate org object. But we also need to call private_changeCustomerType(old, new) after it's populated, so setting this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = '%s' temporarily then calling private_getZendeskOrganizations", this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); }
            /* DebugOnlyCode - END */
            this.switchToLoadingScreen( "Loading Organization..." );
            makeAjaxCall(
                this,
                this.private_requests.private_getZendeskOrganizations( this.private_zendesk_user.id, this.private_zendesk_user.organization_id ), 
                this.private_getZendeskOrganizations_Done,  
                this.switchToErrorMessage 
            );
        }
        else
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "We do NOT need to populate org object. Object fully loaded (or not needed) so nothing left to do but to call this.private_changeCustomerType( oldCustomerType, this.private_zendesk_user.customer_type )" ); }
            /* DebugOnlyCode - END */
            this.private_changeCustomerType( oldCustomerType, this.private_zendesk_user.customer_type );
        }
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    private_getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_getZendeskOrganizations_Done (organizationObjectFromDataAPI) called" );
            console.log( "ARG1: organizationObjectFromDataAPI = %o", organizationObjectFromDataAPI );
        }
        /* DebugOnlyCode - END */

        this.private_zendesk_user.orgObject = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking was this load as a result of agent pressing the 'organization' button?  \nthis.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = %o", this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ); }
        /* DebugOnlyCode - END */

        //was this load as a result of pressing the "organization" button?
        if( typeof( this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs ) !== "undefined" && this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs !== null )
        {
            let oldType = ( this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs === 'NOTSET' ) ? null : this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs;
            this.private_zendesk_user.callChangeCustomerTypeAfterFullyLoaded_OldCustTypeIs = null;
            this.private_changeCustomerType( oldType, this.private_zendesk_user.customer_type );
        }
        else
        {
            //we now have full populated user object to save complete with org object and no more changes so continue to load form
            this.fetchMailchimpObjectIfNecessary();
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, this.private_zendesk_user = %o", this.private_zendesk_user );
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
            if( debug_mode ) { console.log( "Check Passed, building base object and adding extra fields.    this.private_field_maps.private_cust_type.zendesk_field = %s", this.private_field_maps.private_cust_type.zendesk_field ); }
            /* DebugOnlyCode - END */
            organizationObjectToReturn = new this.zendeskObjectsModule.ZendeskOrganization(
                    this,
                    organizationObjectFromDataAPI.organization.id,
                    organizationObjectFromDataAPI.organization.name,
                    organizationObjectFromDataAPI.organization.organization_fields[ this.private_field_maps.private_cust_type.zendesk_field ]
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
    
    getUserFromFrameworkInUserSidebarLocation: function()
    {
            //console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );

            //fetch first organization object if there is one, null if not
            let usersOrgObject = ( typeof( this.user().organizations()[0] ) !== 'undefined' && this.user().organizations()[0] !== null ) ? this.user().organizations()[0] : null;

            //initialize user object
            this.private_zendesk_user = new this.zendeskObjectsModule.ZendeskUser(
                    this,
                    this.user().id(),
                    this.user().name(),
                    this.user().email(),
                    this.user().customField( this.private_resources.private_USER_FIELD_HANDLE_CUSTOMER_TYPE ),
                    ( usersOrgObject === null ) ? null : usersOrgObject.id()
            );

            //now set the optional extra user fields from the framework object
            this.private_zendesk_user.populateExtraFieldsFromFrameworkUserObject( this.user() );

            //popupate org object if one is set on user record
            if( usersOrgObject !== null )
            {
                    this.private_zendesk_user.orgObject = new this.zendeskObjectsModule.ZendeskOrganization( this, usersOrgObject.id(), usersOrgObject.name(), usersOrgObject.customField( this.private_field_maps.private_cust_type.zendesk_field ) );
                    this.private_zendesk_user.orgObject.populateExtraFieldsFromFrameworkOrgObject( usersOrgObject );
            }

            //console.log( "Finished getUserFromFrameworkInUserSidebarLocation, this.private_zendesk_user = " );console.dir( this.private_zendesk_user );
            this.fetchMailchimpObjectIfNecessary();
    },    
    
    fetchMailchimpObjectIfNecessary: function()
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "fetchMailchimpObjectIfNecessary() called" );
            console.log( "If included, Check if private_mailshot_sync_user already loaded? \nthis.private_zendesk_user.isIncluded() = %o \nthis.private_mailshot_sync_user = %o",  this.private_zendesk_user.isIncluded(), this.private_mailshot_sync_user );
        }
        /* DebugOnlyCode - END */

        //if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
        if( this.private_zendesk_user.isIncluded() && this.private_mailshot_sync_user === null )
        {
            this.switchToLoadingScreen( "Loading user from Mailchimp..." );
            makeAjaxCall(
                this,
                this.private_requests.private_getMailChimpListMember( this.private_zendesk_user.email, this ), 
                this.retrievedMailchimpSubscriber,  
                this.private_get_or_createOrUpadateMailChimpListMember_OnFail 
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

    private_changeCustomerType: function( oldType, newType ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_changeCustomerType( oldType, newType )  called" );
            console.log( "ARG1: oldType = '%s'", oldType );
            console.log( "ARG2: newType = '%s'", newType );
            console.log( "Updating this.private_zendesk_user.customer_type = '%s';", newType);
            console.log( "Checking which button was just pressed (ie checking newType: '%s';", newType);
        }
        /* DebugOnlyCode - END */

        //update user object so it doesnt get out of sync
        this.private_zendesk_user.customer_type = newType;

        //if NOT SET or EXCLUDE was selected 
        if( newType === this.private_resources.private_CUSTOMER_TYPE_NOT_SET || newType === this.private_resources.private_CUSTOMER_TYPE_EXCLUDE  )
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "It is now set to either NOT_SET or EXCLUDE. Now checking whether it used to be in mailchimp (ie ORGANIZATION or STANDARD). oldType = '%s'", oldType ); }
            /* DebugOnlyCode - END */
                
            if( oldType === this.private_resources.private_CUSTOMER_TYPE_USE_DEFAULT || oldType === this.private_resources.private_CUSTOMER_TYPE_USE_ORGANIZATION )
            {
                //if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
                /* DebugOnlyCode - START */
                if( debug_mode ) { console.log( "Either NOT SET or EXCLUDE was selected AND it was previously in mailchimp (STANDARD or ORGANIZATION), so let's DELETE IT FROM MAILCHIMP" ); }
                /* DebugOnlyCode - END */
                //so delete from mailchimp
                this.deleteExistingUserFromMailchimp( this.private_mailshot_sync_user );
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
            if( newType === this.private_resources.private_CUSTOMER_TYPE_USE_ORGANIZATION || newType === this.private_resources.private_CUSTOMER_TYPE_USE_DEFAULT  )
            {
                    //if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
                    if( oldType === this.private_resources.private_CUSTOMER_TYPE_EXCLUDE || oldType === this.private_resources.private_CUSTOMER_TYPE_NOT_SET )
                    {
                            this.syncNewUserToMailchimp( this.private_zendesk_user );
                    }
                    //if ORGANIZATION or STANDARD were selected AND it was previously set to the other one
                    else if( oldType !== newType )
                    {
                            this.private_syncExistingUserToMailchimp( this.private_zendesk_user, true );
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
    retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
    {
            //console.log( "started retrievedMailchimpSubscriber, returnedMailchimpUser = returnedMailchimpUser" );console.dir( returnedMailchimpUser ); ////console.log( "" );

            this.private_mailshot_sync_user = 
            {
                email_address: returnedMailchimpUser.email_address,
                status: "subscribed",
                forename: returnedMailchimpUser.merge_fields[ this.private_settings.private_mailchimp_merge_field_forename ],
                surname: returnedMailchimpUser.merge_fields[ this.private_settings.private_mailchimp_merge_field_surname  ],
                customer_type: returnedMailchimpUser.merge_fields[ this.private_field_maps.private_cust_type.mailchimp_field ],
                extra_merge_fields: []
            };

            let arrayIndex = 0;
            for (let i=0; i < this.private_field_maps.private_user.length; i++) 
            {
                this.private_mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.private_field_maps.private_user[ i ], value: returnedMailchimpUser.merge_fields[ this.private_field_maps.private_user[ i ].mailchimp_field ]};
                arrayIndex++;
            }
            for(let i=0; i < this.private_field_maps.private_organisation.length; i++) 
            {
                this.private_mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.private_field_maps.private_organisation[ i ], value: returnedMailchimpUser.merge_fields[ this.private_field_maps.private_organisation[ i ].mailchimp_field ] };
                arrayIndex++;
            }
            for (let i=0; i < this.private_field_maps.private_mc_only.length; i++) 
            {
                this.private_mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.private_field_maps.private_mc_only[ i ], value: returnedMailchimpUser.merge_fields[ this.private_field_maps.private_mc_only[ i ].mailchimp_field ] };
                arrayIndex++;
            }		

            //console.log( "Finished retrievedMailchimpSubscriber, this.private_mailshot_sync_user = " );console.dir( this.private_mailshot_sync_user );
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
            this.private_requests.private_createOrUpadateMailChimpListMember( newMailChimpUserToSave, false ), 
            this.private_createOrUpadateMailChimpListMember_Done,  
            this.private_get_or_createOrUpadateMailChimpListMember_OnFail 
        );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    private_syncExistingUserToMailchimp: function( zendeskUser, tryToPreserveMCOnlyFields ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_syncExistingUserToMailchimp (zendeskUser, tryToPreserveMCOnlyFields) called" );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
            console.log( "ARG2 (optional): tryToPreserveMCOnlyFields = %o", tryToPreserveMCOnlyFields );
        }
        /* DebugOnlyCode - END */

        let newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Checking if we need to copy across extra merge fields to mailchimp object too? (answer = %o)  \n tryToPreserveMCOnlyFields = %o, this.private_mailshot_sync_user = %o, zendeskUser.email = %o, this.private_mailshot_sync_user.email_address = %o", ( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.private_mailshot_sync_user !== null && zendeskUser.email === this.private_mailshot_sync_user.email_address ), tryToPreserveMCOnlyFields, this.private_mailshot_sync_user, zendeskUser.email, this.private_mailshot_sync_user.email_address ); }
        /* DebugOnlyCode - END */
        //if switching between Standard and Org mode try to preserve the value of the Mailchimp only checkbox fields
        if( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.private_mailshot_sync_user !== null && zendeskUser.email === this.private_mailshot_sync_user.email_address )
        {
            for( let i=0; i < this.private_mailshot_sync_user.extra_merge_fields.length; i++)
            {
                if( typeof( this.private_mailshot_sync_user.extra_merge_fields[ i ].field_def.zendesk_field ) === "undefined" ) 
                {
                        newMailChimpUserToSave.extra_merge_fields[ i ].value = this.private_mailshot_sync_user.extra_merge_fields[ i ].value;
                }
            }
        }

        this.switchToLoadingScreen( "Updating Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.private_requests.private_createOrUpadateMailChimpListMember( newMailChimpUserToSave, true ), 
            this.private_createOrUpadateMailChimpListMember_Done,  
            this.private_get_or_createOrUpadateMailChimpListMember_OnFail
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
        
        //OLD CODE - no Pass or fail functojns were configured in events!!!!
        //this.switchToLoadingScreen( "Deleting Mailchimp Member" );
        //this.ajax( "private_deleteMailChimpListMember", mailchimpUser );
            
        this.switchToLoadingScreen( "Deleting Mailchimp Member..." );
        makeAjaxCall(
            this,
            this.private_requests.private_deleteMailChimpListMember( mailchimpUser ), 
            null,  
            null, //this shoudl call private_get_or_createOrUpadateMailChimpListMember_OnFail ONLY 404 MESSAGE SHOUD BE DIFFERENT FOR DELETES!
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

    private_get_or_createOrUpadateMailChimpListMember_OnFail: function( errorResponse ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_get_or_createOrUpadateMailChimpListMember_OnFail(errorResponse) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
        }
        /* DebugOnlyCode - END */
        
        //check to see if we were in create only mode but the users email address was already found.
        let redirectedToBespokeErrorPage = false;
        try
        {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "PEEKING AT ERROR MESSAGE: running: let responseTextJSON = JSON.parse( errorResponse.responseText );"); }
            /* DebugOnlyCode - END */
            let responseTextJSON = JSON.parse( errorResponse.responseText );
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "now responseTextJSON = %o", responseTextJSON ); }
            /* DebugOnlyCode - END */
            
                        if( errorResponse.status === 400 && responseTextJSON.title === "Member Exists" )
            {
                this.switchToErrorMessage( errorResponse, this.private_zendesk_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp", "private_createOrUpadateMailChimpListMember_Override_OnClick()" );
                redirectedToBespokeErrorPage = true;
            }
            if( errorResponse.status === 404 /* && responseTextJSON.title === "Resource Not Found" */ ) //the old code commetned out stopped working when zendesk helpfully started overriding the 404 page with its own data thereby losing the returned error information!!!
            { //need to alter this if this is ever called on delete as 404 should be handled differently on delete
                this.switchToErrorMessage( errorResponse, this.private_zendesk_user.email + " doesn't exist in mailchimp.<br /><br/>Do you want to create a new record for him/her?", "Create New", "error_create_new_mailchimp", "private_createOrUpadateMailChimpListMember_Add_New_OnClick()" );
                redirectedToBespokeErrorPage = true;
            }    
        }
        catch(e)
        {
            console.warn( "Could not JSON Parse errorResponse.responseText from get_or_private_createOrUpadateMailChimpListMember. errorResponse = %o\n\nparse exception: %o", errorResponse, e );
        }

        if( !redirectedToBespokeErrorPage )
        {
                this.switchToErrorMessage( errorResponse );
        }
    
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, redirectedToBespokeErrorPage = %o", redirectedToBespokeErrorPage );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    private_createOrUpadateMailChimpListMember_Override_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_createOrUpadateMailChimpListMember_Override_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.private_syncExistingUserToMailchimp( this.private_zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.private_zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    private_createOrUpadateMailChimpListMember_Add_New_OnClick: function() 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_createOrUpadateMailChimpListMember_Add_New_OnClick() called" );
        }
        /* DebugOnlyCode - END */

        this.syncNewUserToMailchimp( this.private_zendesk_user );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning false;", this.private_zendesk_user );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return false;
    },

    private_createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
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
            private_status: "subscribed",
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
        for (let i=0; i < this.private_field_maps.private_organisation.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.private_field_maps.private_organisation[ i ], value: useDefaultOrgValues ? this.private_field_maps.private_organisation[ i ].default_value : zendeskSyncUserObject.orgObject.extra_org_fields[ i ].value };
                arrayIndex++;
        }
        for (let i=0; i < this.private_field_maps.private_mc_only.length; i++) 
        {
                mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.private_field_maps.private_mc_only[ i ], value: this.private_field_maps.private_mc_only[ i ].default_value };
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
        switchToInlineTemplate( this.private_resources.private_TEMPLATE_ID_LOADING, { optional_message: optionalMessage } );
    },

    switchToMainTemplate: function() 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "switchToMainTemplate() called" );
        }
        /* DebugOnlyCode - END */

        let syncFields = this.private_zendesk_user.getFieldSyncInfo( this.private_mailshot_sync_user );
        let isInSync = this.private_zendesk_user.isInSync( syncFields );
        let defaultButtonColourClassInsert = ' ' + ( isInSync || this.private_zendesk_user.isExcluded() ? 'btn-primary' : 'btn-danger' );

        let formData = 
        {
            'zendesk_user'      : this.private_zendesk_user,
            'mailchimp_user'    : this.private_mailshot_sync_user,
            'sync_fields'       : syncFields,
            'monkey_URL'        : this.private_zendesk_user.isExcluded() ? "./img/exclude_monkey.png" : ( isInSync ? "./img/insync_monkey.png" :  "./img/outofsync_monkey.png" ),
            'buttons': 
            {
                'exclude'       : { 
                    'show'              : true, 
                    'classNameInsert'   : this.private_zendesk_user.isExcluded() ? " active" : "", 
                    'label'             : "Exclude", 
                    'onclick'           : 'excludeButtonOnClick()' 
                },
                'organization'  : { 
                    'show'              : ( this.private_zendesk_user.belongsToOrganization() ), 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.private_zendesk_user.isOrganization() ? " active" : "" ), 
                    'label'             : this.private_settings.private_mailchimp_organisation_button_label, 
                    'onclick'           : 'organizationButtonOnClick()' 
                },
                'standard'      : { 
                    'show': true, 
                    'classNameInsert'   : defaultButtonColourClassInsert + ( this.private_zendesk_user.isDefault() ? " active" : "" ), 
                    'label'             : this.private_settings.private_mailchimp_standard_button_label, 
                    'onclick'           : 'standardButtonOnClick()'
                }
            },
            'display_params':
            {
                'customer_type_not_set'     : this.private_zendesk_user.isNotset(),
                'customer_type_exclude'     : this.private_zendesk_user.isExcluded(),
                'customer_type_included'    : this.private_zendesk_user.isIncluded(),
                'customer_type_organization': this.private_zendesk_user.isOrganization(),
                'customer_type_standard'    : this.private_zendesk_user.isDefault(),
                'user_in_sync'              : isInSync,
                'DEBUG'                     : debug_mode
            }
        };

        thisV2Client.main_template_form_data = formData;

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Switching to template '%s' with form data: %o ", ( this.modalMode ? this.private_resources.private_TEMPLATE_NAME_MAIN_MODAL_MODE : this.private_resources.private_TEMPLATE_NAME_MAIN ), formData); }
        /* DebugOnlyCode - END */
        switchToHdbsFileTemplate( ( this.modalMode ? this.private_resources.private_TEMPLATE_NAME_MAIN_MODAL_MODE : this.private_resources.private_TEMPLATE_NAME_MAIN ), formData );

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished");
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },

    switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle, additionalButtonOnclick ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "switchToErrorMessage ( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle ) called" );
            console.log( "ARG1: errorResponse = %o", errorResponse );
            console.log( "ARG2: overrideMessage = %o", overrideMessage );
            console.log( "ARG3: additionalButtonText = %o", additionalButtonText );
            console.log( "ARG4: additionalButtonHandle = %o", additionalButtonHandle );
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
          'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
          'additionalButtonHandle' 	: ( typeof( additionalButtonHandle ) === "undefined" ) ? null : additionalButtonHandle,
          'additionalButtonOnclick' 	: ( typeof( additionalButtonOnclick ) === "undefined" ) ? null : additionalButtonOnclick
        };

        switchToHdbsFileTemplate( this.private_resources.private_TEMPLATE_NAME_SHOWERROR, formData );

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

    private_validateFieldMappingsJSON: function( fieldMappingsJSONText, settingsName, mailchimpOnlyFields ) 
    {
       /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "private_validateFieldMappingsJSON( fieldMappingsJSONText, settingsName ) called" );
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
                           'For help with these settings fields use our <a target="_blank" href="'+this.private_resources.private_SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL+'">Zenchimp App Settings Generator</a> in Microsoft Excel';
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
       
        this.switchToErrorMessage( errorObject, errorMessage );
       
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
