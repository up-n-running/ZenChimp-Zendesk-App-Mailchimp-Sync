/* global Function, app */

/**
 *  * Constructor to create a new ZendeskUser
 * @param {Object} app The Zendesk App That is being used to call this constructor 
 * @param {int} id The Zendesk ID of organization
 * @param {string} name The Zendesk name of organization
 * @param {string} customer_type (value of organization's default customer_type field to assign to this user's org)
 * @returns {nm$_ZendeskUser.createZendeskOrganizationObject.zendeskOrgToReturn}
 */
    function ZendeskOrganization( app, id, name, customer_type )
    {
        this.app = app;
        this.id = id;
        this.name = name;
        this.customer_type = customer_type;
        this.extra_org_fields = [];

        for(var i = 0; i < app.organization_field_mappings.length; i++) 
        {
            this.extra_org_fields[ i ] = { field_def: app.organization_field_mappings[ i ], value: null };
        }        
    }
    ZendeskOrganization.prototype.populateExtraFieldsFromOrganizationAPIData = function( APIOrgData )
    {
        for(var i = 0; i < this.extra_org_fields.length; i++) 
        {
            this.extra_org_fields[ i ].value = APIOrgData.organization_fields[ this.extra_org_fields[ i ].field_def.zendesk_field ];
        }
    };
    ZendeskOrganization.prototype.populateExtraFieldsFromFrameworkOrgObject = function( frameworkOrgObject )
    {
        for(var i = 0; i < this.extra_org_fields.length; i++) 
        {
            this.extra_org_fields[ i ].value = frameworkOrgObject.customField( this.extra_org_fields[ i ].field_def.zendesk_field );
        }
    };
    /**
     * inline clone function for user object - deep clones by calling organization.clone too
     * @returns {nm$_ZendeskObjects.ZendeskUser|ZendeskOrganization.prototype.clone.clonedOrganization|nm$_ZendeskObjects.ZendeskOrganization.prototype.clone.clonedOrganization}
     */
    ZendeskOrganization.prototype.clone = function()
    {
        var clonedOrganization = new ZendeskOrganization( this.app, this.id, this.name, this.customer_type );
        //console.log( "cloning Org, this.name = '" + this.name + "', new ZendeskOrganization = ");
        //console.dir( clonedOrganization );
        for(var i = 0; i < this.extra_org_fields.length; i++) 
        {
            clonedOrganization.extra_org_fields[ i ] = { field_def: this.extra_org_fields[ i ].field_def, value: this.extra_org_fields[ i ].value };
        }
        //console.log( "finished cloning Org, clonedOrganization = ");
        //console.dir( clonedOrganization );
        return clonedOrganization;
    };


/**
 * Constructor to create a new ZendeskUser
 * @param {Object} app The Zendesk App That is being used to call this constructor 
 * @param {int} id The Zendesk ID of user
 * @param {string} name The Zendesk name of user (full name in 1 field for some reason)
 * @param {string} email (primary email address of user)
 * @param {string} customer_type (value of user's customer_type field defined in requirements.json)
 * @param {int} organization_id for this users primary organization
 * @returns {nm$_ZendeskUser.ZendeskUser.ZendeskUserAnonym$0} Instantiated Object but organization subobject remains null
 */
    function ZendeskUser(app, id, name, email, customer_type, organization_id)
    {
        ////console.log( "Started ZendeskUser constructor with id=" + id + ", name = " + name + ", email = " + email +  ", customer_type = " + customer_type + ", app = ...");
        ////console.dir( app );
        this.app = app;
        this.id = id;
        this.name = name;
        this.name_parts = null;
        this.email = email;
        this.customer_type = customer_type;
        this.organization_id = ( typeof( organization_id ) === "undefined" ) ? null : organization_id; //this is underd to store the org id even though this info if available inside the attached org object.
        this.orgObject = null;  //this will only be instantiated when needed, not now, even if there is an organization id
        this.extra_user_fields = [];

        for(var i = 0; i < app.user_field_mappings.length; i++) 
        {
            this.extra_user_fields[ i ] = { field_def: app.user_field_mappings[ i ], value: null };
        }
    }
    ZendeskUser.prototype.getSalutation = function(){ this.populateNamePartsIfNecessary(); return this.name_parts.salutation; };
    ZendeskUser.prototype.getForeName   = function(){ this.populateNamePartsIfNecessary(); return this.name_parts.firstName; };
    ZendeskUser.prototype.getSurname    = function(){ this.populateNamePartsIfNecessary(); return this.name_parts.lastName; };
    ZendeskUser.prototype.populateNamePartsIfNecessary = function() 
    { 
        if( this.name_parts === null && this.name !== null  )
        {
            this.name_parts = this.app.parseNamesModule.parse( this.name.replace( "/", " " ).split(",").reverse().map(Function.prototype.call, String.prototype.trim).join(" ") );
        }
    };
    ZendeskUser.prototype.populateExtraFieldsFromUserAPIData = function( APIUserData )
    {
        for(var i = 0; i < this.extra_user_fields.length; i++) 
        {
            this.extra_user_fields[ i ].value = APIUserData.user_fields[ this.extra_user_fields[ i ].field_def.zendesk_field ];
        }
    };
    ZendeskUser.prototype.populateExtraFieldsFromFrameworkUserObject = function( frameworkUserObject )
    {
        for(var i = 0; i < this.extra_user_fields.length; i++) 
        {
            this.extra_user_fields[ i ].value = frameworkUserObject.customField( this.extra_user_fields[ i ].field_def.zendesk_field );
        }
    };
    
    /**
     * inline clone function for user object - deep clones by calling organization.clone too
     * @returns {nm$_ZendeskUser.ZendeskUser.prototype.clone.clonedUser|ZendeskUser.prototype.clone.clonedUser|nm$_ZendeskUser.ZendeskUser}
     */  
    ZendeskUser.prototype.clone = function()
    {
        //console.log( "Started ZendeskUser.prototype.clone with this=");
        //console.dir( this );
        //console.log( "and this.orgObject = ");
        //console.dir( this.orgObject );
        //var clonedUser = new this.app.ZendeskObjects.ZendeskUser( this.app, this.id, this.name, this.email, this.customer_type, this.organization_id );
        var clonedUser = new ZendeskUser( this.app, this.id, this.name, this.email, this.customer_type, this.organization_id );
        clonedUser.orgObject = ( this.orgObject === null) ? null : this.orgObject.clone();
        for(var i = 0; i < this.extra_user_fields.length; i++) 
        {
            clonedUser.extra_user_fields[ i ] = { field_def: this.extra_user_fields[ i ].field_def, value: this.extra_user_fields[ i ].value };
        }
        //console.log( "Finished ZendeskUser.prototype.clone, returning:");
        return clonedUser;
    };

    ZendeskUser.prototype.isNotset = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET; };
    ZendeskUser.prototype.isExcluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE; };
    ZendeskUser.prototype.isIncluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };
    ZendeskUser.prototype.isOrganization = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION; };
    ZendeskUser.prototype.isDefault = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };

    ZendeskUser.prototype.belongsToOrganization = function() { return this.organization_id !== null; };
    ZendeskUser.prototype.orgObjectIsPopulated = function() { return this.orgObject !== null; };
    ZendeskUser.prototype.getMailchimpCustomerType = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION ? this.orgObject.customer_type : this.app.customer_type_field_mapping.default_value; };

    ZendeskUser.prototype.findExtraFieldByName = function( fieldName, zdNotMcField )
    {
        for(var i = 0; i < this.extra_user_fields.length; i++) 
        {
            if( ( zdNotMcField && this.extra_user_fields[i].field_def.zendesk_field  === fieldName ) || ( !zdNotMcField && this.extra_user_fields[i].field_def.mailshot_field === fieldName ) )
            {
                return this.extra_user_fields[i];
            }
        }
    };

    ZendeskUser.prototype.getFieldSyncInfo = function( mailChimpUser )
    {
        //console.log( "starting getFieldSyncInfo with the following 2 user objects" );
        //console.dir( this ); //console.log( "" );
        //console.dir( mailChimpUser ); //console.log( "" ); 
        if( typeof( mailChimpUser ) === "undefined" || mailChimpUser === null )
        {
            return null;
        }
        if( this.customer_type === null || this.isNotset() )
        {
            return null;
        }

        var sync_fields = [
            { label: "Email", mc_only: false, is_image: false, zd_value: this.email, mc_value: mailChimpUser.email_address, in_sync: ( this.email === mailChimpUser.email_address ) },
            { label: "Name", mc_only: false, is_image: false, zd_value: this.name, mc_value: mailChimpUser.forename + " " + mailChimpUser.surname, in_sync: ( mailChimpUser.forename === this.getForeName() && mailChimpUser.surname === this.getSurname() ) },
            { label: "Customer Type", mc_only:false, is_image: false, zd_value: this.getMailchimpCustomerType(), mc_value: mailChimpUser.customer_type, in_sync: ( this.getMailchimpCustomerType() === mailChimpUser.customer_type ) } 
        ];

        var tempZdValue = null;
        var tempMcValue = null;
        var arrayIndex = 0;
        //console.log( "about to start user fields, JSON:" );
        //console.dir( sync_fields ); //console.log( "" );  
        for( var i = 0; i < this.extra_user_fields.length; i++ )
        {
            tempZdValue = this.extra_user_fields[ i ].value;
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            sync_fields[ arrayIndex+3 ] = 
            {
                label: this.extra_user_fields[ i ].field_def.field_label,
                mc_only: false,
                is_image: this.extra_user_fields[ i ].field_def.type === this.app.resources.FIELD_TYPE_IMAGE,
                zd_value: tempZdValue,
                mc_value: tempMcValue,
                in_sync: tempZdValue === tempMcValue
            };
            arrayIndex++;
        }
        //console.log( "done user fields JSON:" );
        //console.dir( sync_fields ); //console.log( "" );  
        for( i = 0; i < this.app.organization_field_mappings.length; i++ )
        {
            tempZdValue = this.isDefault() ? this.app.organization_field_mappings[ i ].default_value : ( this.isOrganization() ? this.orgObject.extra_org_fields[ i ].value : null );
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            sync_fields[ arrayIndex+3 ] = 
            {
                label: this.app.organization_field_mappings[ i ].field_label,
                mc_only: false,
                is_image: this.app.organization_field_mappings[ i ].type === this.app.resources.FIELD_TYPE_IMAGE,
                zd_value: tempZdValue,
                mc_value: tempMcValue,
                in_sync: tempZdValue === tempMcValue
            };
            arrayIndex++;
        }
        //console.log( "done org fields JSON:" );
        //console.dir( sync_fields ); //console.log( "" );  
        for( i = 0; i < this.app.mailshot_only_field_mappings.length; i++ )
        {
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex ].value;
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            sync_fields[ arrayIndex+3 ] = 
            {
                label: this.app.mailshot_only_field_mappings[ i ].field_label,
                mc_only: true,
                is_image: this.app.mailshot_only_field_mappings[ i ].type === this.app.resources.FIELD_TYPE_IMAGE,
                zd_value: null,
                mc_value: tempMcValue,
                in_sync: true
            };
            arrayIndex++;
        }   

        return sync_fields;
    };

    ZendeskUser.prototype.isInSync = function( syncFields, mailChimpUser )
    {
        if( typeof( syncFields ) === "undefined" || syncFields === null )
        {
           syncFields = this.getFieldSyncInfo( mailChimpUser );
        }

        if( syncFields === null )
        {
            return false;
        }

        for(var i=0; i < syncFields.length; i++ )
        {
            if( !syncFields[ i ].in_sync )
            {
                return false;
            }
        }
        return true;
    };

module.exports.ZendeskUser = ZendeskUser;
module.exports.ZendeskOrganization = ZendeskOrganization;