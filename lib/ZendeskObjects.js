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
        console.log( "cloning Org, this.name = '" + this.name + "', new ZendeskOrganization = ");
        console.dir( clonedOrganization );
        for(var i = 0; i < this.extra_org_fields.length; i++) 
        {
            clonedOrganization.extra_org_fields[ i ] = { field_def: this.extra_org_fields[ i ].field_def, value: this.extra_org_fields[ i ].value };
        }
        console.log( "finished cloning Org, clonedOrganization = ");
        console.dir( clonedOrganization );
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
        //console.log( "Started ZendeskUser constructor with id=" + id + ", name = " + name + ", email = " + email +  ", customer_type = " + customer_type + ", app = ...");
        //console.dir( app );
        this.app = app;
        this.id = id;
        this.name = name;
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
        console.log( "Started ZendeskUser.prototype.clone with this=");
        console.dir( this );
        console.log( "and this.orgObject = ");
        console.dir( this.orgObject );
        var clonedUser = new ZendeskUser( this.app, this.id, this.name, this.email, this.customer_type, this.organization_id );
        clonedUser.orgObject = ( this.orgObject === null) ? null : this.orgObject.clone();
        for(var i = 0; i < this.extra_user_fields.length; i++) 
        {
            clonedUser.extra_user_fields[ i ] = { field_def: this.extra_user_fields[ i ].field_def, value: this.extra_user_fields[ i ].value };
        }
        console.log( "Finished ZendeskUser.prototype.clone, returning:");
        return clonedUser;
    };

ZendeskUser.prototype.isNotset = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET; };
ZendeskUser.prototype.isExcluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE; };
ZendeskUser.prototype.isIncluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };
ZendeskUser.prototype.isOrganization = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION; };
ZendeskUser.prototype.isDefault = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };

ZendeskUser.prototype.belongsToOrganization = function() { return this.organization_id !== null; };
ZendeskUser.prototype.orgObjectIsPopulated = function() { return this.orgObject !== null; };



module.exports.ZendeskUser = ZendeskUser;
module.exports.ZendeskOrganization = ZendeskOrganization;