/* global Function, __app */

    /**
     *  * Constructor to create a new ZendeskOrganization
     * @param {Object} __app The Zendesk App That is being used to call this constructor 
     * @param {int} id The Zendesk ID of organization
     * @param {string} name The Zendesk name of organization
     * @param {string} customer_type (value of organization's default customer_type field to assign to this user's org)
     * @returns {ZendeskOrganization} Instantiated Object
     */
    function ZendeskOrganization( app, id, name, customer_type )
    {
        this.__app = app;
        this.id = id;        //probably could be minified but we keep in case we ever want to use a spoodef org object to speed up app
        this.name = name;    //cant be minified without we use it in main hdbs template
        this.__customer_type = customer_type;
        this.__extra_org_fields = [];

        for(var i = 0; i < app.__field_maps.__organisation.length; i++) 
        {
            this.__extra_org_fields[ i ] = { __field_def: app.__field_maps.__organisation[ i ], __value: null };
        }        
    }
    ZendeskOrganization.prototype.__populateExtraFieldsFromOrganizationAPIData = function( APIOrgData )
    {
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.group( "__populateExtraFieldsFromOrganizationAPIData(APIOrgData) called" );
            console.log( "ARG1: APIOrgData = %o", APIOrgData );
        }
        /* DebugOnlyCode - END */
        
        for(var i = 0; i < this.__extra_org_fields.length; i++) 
        {
            let valueFromAPI = APIOrgData.organization_fields[ this.__extra_org_fields[ i ].__field_def.zendesk_field ];
            if( typeof( valueFromAPI ) === 'undefined' )
            {
                throw new ReferenceError( "The Zendesk 'Organisation Field' with key '" + this.__extra_org_fields[ i ].__field_def.zendesk_field + '\' which you specified in your Field Mapping settings doesnt seem to exist in Zendesk yet.<br /><br />For help with your field mappings use our <a target="_blank" href="'+this.__app.__resources.__SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL+'">Zenchimp App Settings Generator</a> spreadsheet.' );
            }
            this.__extra_org_fields[ i ].__value = APIOrgData.organization_fields[ this.__extra_org_fields[ i ].__field_def.zendesk_field ];
        }
        
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished. this.__extra_org_fields = %o", this.__extra_org_fields );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    };
    ZendeskOrganization.prototype.__populateExtraFieldsFromFrameworkOrgObject = function( frameworkOrgObject )
    {
        for(var i = 0; i < this.__extra_org_fields.length; i++) 
        {
            this.__extra_org_fields[ i ].__value = frameworkOrgObject.customField( this.__extra_org_fields[ i ].__field_def.zendesk_field );
        }
    };
    /**
     * inline clone function for user object - deep clones by calling organization.__clone too
     * @returns {nm$_ZendeskObjects.ZendeskUser|ZendeskOrganization.prototype.__clone.clonedOrganization|nm$_ZendeskObjects.ZendeskOrganization.prototype.__clone.clonedOrganization}
     */
    ZendeskOrganization.prototype.__clone = function()
    {
        var clonedOrganization = new ZendeskOrganization( this.__app, this.id, this.name, this.__customer_type );
        //console.log( "cloning Org, this.name = '" + this.name + "', new ZendeskOrganization = ");
        //console.dir( clonedOrganization );
        for(var i = 0; i < this.__extra_org_fields.length; i++) 
        {
            clonedOrganization.__extra_org_fields[ i ] = { __field_def: this.__extra_org_fields[ i ].__field_def, __value: this.__extra_org_fields[ i ].__value };
        }
        //console.log( "finished cloning Org, clonedOrganization = ");
        //console.dir( clonedOrganization );
        return clonedOrganization;
    };
    ZendeskOrganization.prototype.__findExtraFieldByName = function( fieldName, zdNotMcField )
    {
        for(var i = 0; i < this.__extra_org_fields.length; i++) 
        {
            if( ( zdNotMcField && this.__extra_org_fields[i].__field_def.zendesk_field  === fieldName ) || ( !zdNotMcField && this.__extra_org_fields[i].__field_def.mailchimp_field === fieldName ) )
            {
                return this.__extra_org_fields[i];
            }
        }
        return null;
    };

    /**
     * Constructor to either create from scratch or clone a new ZendeskUser from: EITHER a Zendesk User API return data object OR an existing ZendeskUser object to clone
     * @param {Object} __app The Zendesk App That is being used to call this constructor 
     * @param {Object} userObjectFromDataAPI the Zendesk User API return data object OR 
     * @param {ZendeskUser} existing ZendeskUser object to clone (IF YOU ARE USING THIS ARGUMENT YOU MUST PASS IN null FOR userObjectFromDataAPI)
     * * @returns {ZendeskUser} Instantiated Object with field mappings set up but organization subobject remains null to be populated as and when needed
     */
    function ZendeskUser( app, userObjectFromDataAPI, userObjectToClone )
    {
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.group( "new ZendeskUser (app, userObjectFromDataAPI, userObjectToClone) constructor called" );
            console.log( "ARG1: app = %o", app );
            console.log( "ARG2: userObjectFromDataAPI = %o", userObjectFromDataAPI );
            console.log( "ARG3: userObjectToClone (of type '%s') = %o", typeof( userObjectToClone ), userObjectToClone );
        }
        /* DebugOnlyCode - END */ 
        
        if( userObjectFromDataAPI === null && userObjectToClone )
        {            
            /* DebugOnlyCode - START */ 
            if( debug_mode ) { console.log( "CLONING existing ZendeskUser"); }
            /* DebugOnlyCode - END */
            
            this.__app = app;
            this.id = userObjectToClone.id;       //Cant be minified as we sometimes use a spoofed user object with id property
            this.name = userObjectToClone.name;   //cant be minified without we use it in main hdbs template
            this.__name_parts = null;
            this.email = userObjectToClone.email; //TO DO: Can be minified
            this.__customer_type = userObjectToClone.__customer_type;  //cant be minified we use it in main hdbs template
            this.__organization_id = userObjectToClone.__organization_id;
            this.__orgObject = ( userObjectToClone.__orgObject === null) ? null : userObjectToClone.__orgObject.__clone();
            this.__extra_user_fields = [];
            
            for(var i = 0; i < userObjectToClone.__extra_user_fields.length; i++) 
            {
                this.__extra_user_fields[ i ] = { __field_def: userObjectToClone.__extra_user_fields[ i ].__field_def, __value: userObjectToClone.__extra_user_fields[ i ].__value };
            }
        }
        else
        {
            if( !userObjectFromDataAPI || !userObjectFromDataAPI.user )
            {
                throw new TypeError( "The Zendesk API used to get the user details returned no user information." );
            }

            if( typeof( userObjectFromDataAPI.user.user_fields.mailshot_customer_type ) === 'undefined' )
            {
                throw new ReferenceError( "The required Zendesk field with key mailshot_customer_type is missing. This should have been created during installation. Please reinstall or raise a bug using the link below" );
            }

            this.__app = app;
            this.id = userObjectFromDataAPI.user.id;
            this.name = userObjectFromDataAPI.user.name;
            this.__name_parts = null;
            this.email = userObjectFromDataAPI.user.email;
            this.__customer_type = userObjectFromDataAPI.user.user_fields.mailshot_customer_type;
            this.__organization_id = ( typeof( userObjectFromDataAPI.user.organization_id ) !== 'undefined' && userObjectFromDataAPI.user.organization_id !== null ) ? userObjectFromDataAPI.user.organization_id : null; //being careful as sometimes users can be set to link through to more than one org depending on admin settings
            this.__orgObject = null;  //this will only be instantiated when needed, not now, even if there is an organization id
            this.__extra_user_fields = [];
            this.__validationError = null;  //this being set flags to the rest of the plugin code not to continue as normal as there is a redirect to SwitchToErroMessage in place (or the user has just clicked a button on error screen to try and resolve issue but it hasnt been resolved yet )

            for(var i = 0; i < app.__field_maps.__user.length; i++) 
            {
                this.__extra_user_fields[ i ] = { __field_def: app.__field_maps.__user[ i ], __value: null };
            }

            /* DebugOnlyCode - START */ 
            if( debug_mode ) { console.log( "Completed part 1 of 2, basic user: this = %o", this); }
            /* DebugOnlyCode - END */ 

            //now set the optional extra user fields from returned API data
            this.__populateExtraFieldsFromUserAPIData( userObjectFromDataAPI.user );
            
            /* DebugOnlyCode - START */ 
            if( debug_mode ) {  
                console.log( "Completed part 2 of 2, after __populateExtraFieldsFromUserAPIData(...)");
                console.log( "Now final sanity check. If it's customer type is Organisation and someone has removed the org from the user in zendesk then throw a special error that can be caught");
            }
            /* DebugOnlyCode - END */
            
            //if creator fails to create object it throws an exception, and returns null object
            //if it creates it but there's something a bit wrong that we need to altert the user
            //to then it will return the object but with the __validationError flag set
            //this functions checks for these validation errors
            this.__refreshValidationErrorFlag();
        }
        
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished constructor. this = %o", this);
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    }
    
    ZendeskUser.prototype.__populateExtraFieldsFromUserAPIData = function( APIUserData )
    {
        for(var i = 0; i < this.__extra_user_fields.length; i++) 
        {
            let valueFromAPI = APIUserData.user_fields[ this.__extra_user_fields[ i ].__field_def.zendesk_field ];
            if( typeof( valueFromAPI ) === 'undefined' )
            {
                throw new ReferenceError( "The Zendesk 'User Field' with key '" + this.__extra_user_fields[ i ].__field_def.zendesk_field + '\' which you specified in your Field Mapping settings doesnt seem to exist in Zendesk yet.<br /><br />For help with your field mappings use our <a target="_blank" href="'+this.__app.__resources.__SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL+'">Zenchimp App Settings Generator</a> spreadsheet.' );
            }
            this.__extra_user_fields[ i ].__value = APIUserData.user_fields[ this.__extra_user_fields[ i ].__field_def.zendesk_field ];
        }
    };

    //if creator fails to create object it throws an exception, and returns null object
    //if it creates it but there's something a bit wrong that we need to altert the user
    //to then it will return the object but with the __validationError flag set
    //this functions checks for these validation errors
    ZendeskUser.prototype.__refreshValidationErrorFlag = function()
    {
        if( this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION && this.__organization_id === null )
        {
            /* DebugOnlyCode - START */ 
            if( debug_mode ) {  console.warn( "FAILED SANITY CHECK - ORGANISATION NO LONGER LINKED TO USER"); }
            /* DebugOnlyCode - END */
            this.__validationError = { __code: 'ORG_MISSING', __exception: new ReferenceError( this.name + " is set to sync his/her organisation fields, however they no longer belong to an organisation, do you want to switch customer type so that only thier user fields are synced?" ) };
        }
    };

    //get name part functions that convert to title case
    ZendeskUser.prototype.__getSalutation = function(){ this.__populateNamePartsIfNecessary(); return ( this.__name_parts.salutation === null ) ? "" : this.__name_parts.salutation.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); }; //makes not null title case value
    ZendeskUser.prototype.__getForeName   = function(){ this.__populateNamePartsIfNecessary(); return ( this.__name_parts.firstName === null ) ? "" : this.__name_parts.firstName.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); }; //makes not null title case value
    ZendeskUser.prototype.__getSurname    = function(){ this.__populateNamePartsIfNecessary(); return  ( this.__name_parts.lastName === null ) ? "" : this.__name_parts.lastName.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); }; //makes not null title case value
    ZendeskUser.prototype.__populateNamePartsIfNecessary = function() 
    { 
        if( this.__name_parts === null && this.name !== null  )
        {
            this.__name_parts = NameParse.parse( this.name.replace( "/", " " ).replace( ".", " " ).split(",").reverse().map(Function.prototype.call, String.prototype.trim).join(" ") );
        }
    };
    ZendeskUser.prototype.__populateExtraFieldsFromFrameworkUserObject = function( frameworkUserObject )
    {
        for(var i = 0; i < this.__extra_user_fields.length; i++) 
        {
            this.__extra_user_fields[ i ].__value = frameworkUserObject.customField( this.__extra_user_fields[ i ].__field_def.zendesk_field );
        }
    };
    
    /**
     * inline clone function for user object - deep clones by calling organization.__clone too
     * @returns {nm$_ZendeskUser.ZendeskUser.prototype.__clone.clonedUser|ZendeskUser.prototype.__clone.clonedUser|nm$_ZendeskUser.ZendeskUser}
     */  
    ZendeskUser.prototype.__clone = function()
    {
        return new ZendeskUser( this.__app, null, this );
    };

    ZendeskUser.prototype.__isNotset = function() { return this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_NOT_SET; };
    ZendeskUser.prototype.__isExcluded = function() { return this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_EXCLUDE; };
    ZendeskUser.prototype.__isIncluded = function() { return this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION || this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_DEFAULT; };
    ZendeskUser.prototype.__isOrganization = function() { return this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION; };
    ZendeskUser.prototype.__isDefault = function() { return this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_DEFAULT; };

    ZendeskUser.prototype.__belongsToOrganization = function() { return this.__organization_id !== null; };
    ZendeskUser.prototype.__orgObjectIsPopulated = function() { return this.__orgObject !== null; };
    ZendeskUser.prototype.__getMailshotCustomerType = function() 
    { 
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.groupCollapsed( "__getMailshotCustomerType() called" );
            console.log( "this.__customer_type = '%s'", this.__customer_type );
            console.log( "this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION = '%s'", this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION );
            console.log( "this = %o", this );
        }
        /* DebugOnlyCode - END */

        if( typeof( this.__customer_type ) === "undefined" || this.__customer_type === null )
        {
            console.warn( "ZendeskUser.__getMailshotCustomerType() called with invalid __customer_type, this = " );console.dir( this );
            return null;
        }
        
        let custTypeToReturn = this.__customer_type === this.__app.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION ? this.__orgObject.__customer_type : this.__app.__field_maps.__cust_type.default_value; 
        
        /* DebugOnlyCode - START */ 
        if( debug_mode ) 
        { 
            console.log( "Finished. custTypeToReturn = '%s'", custTypeToReturn );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return custTypeToReturn
    };

    ZendeskUser.prototype.__findExtraFieldByName = function( fieldName, zdNotMcField )
    {
        for(var i = 0; i < this.__extra_user_fields.length; i++) 
        {
            if( ( zdNotMcField && this.__extra_user_fields[i].__field_def.zendesk_field  === fieldName ) || ( !zdNotMcField && this.__extra_user_fields[i].__field_def.mailchimp_field === fieldName ) )
            {
                return this.__extra_user_fields[i];
            }
        }
        return null;
    };