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

/**
 * inline clone function for user object - deep clones by calling organization.clone too
 * @returns {nm$_ZendeskObjects.ZendeskUser|ZendeskOrganization.prototype.clone.clonedOrganization|nm$_ZendeskObjects.ZendeskOrganization.prototype.clone.clonedOrganization}
 */
ZendeskOrganization.prototype.clone =  function()
{
    var clonedOrganization = new ZendeskOrganization( this.app, this.id, this.name, this.customer_type );
    clonedOrganization.extra_org_fields = ( this.extra_org_fields === null) ? null : this.extra_org_fields.slice(0);
    return clonedOrganization;
};


/**
 * Constructor to create a new ZendeskUser
 * @param {Object} app The Zendesk App That is being used to call this constructor 
 * @param {int} id The Zendesk ID of user
 * @param {string} name The Zendesk name of user (full name in 1 field for some reason)
 * @param {string} email (primary email address of user)
 * @param {string} customer_type (value of user's customer_type field defined in requirements.json)
 * @returns {nm$_ZendeskUser.ZendeskUser.ZendeskUserAnonym$0} Instantiated Object
 */
function ZendeskUser(app, id, name, email, customer_type)
{
    console.log( "Started ZendeskUser constructor with id=" + id + ", name = " + name + ", email = " + email +  ", customer_type = " + customer_type + ", app = ...");
    console.dir( app );
    this.app = app;
    this.id = id;
    this.name = name;
    this.email = email;
    this.customer_type = customer_type;
    this.organization = null;
    this.extra_user_fields = [];

    for(var i = 0; i < app.user_field_mappings.length; i++) 
    {
        this.extra_user_fields[ i ] = { field_def: app.user_field_mappings[ i ], value: null };
    }
}

/**
 * inline clone function for user object - deep clones by calling organization.clone too
 * @returns {nm$_ZendeskUser.ZendeskUser.prototype.clone.clonedUser|ZendeskUser.prototype.clone.clonedUser|nm$_ZendeskUser.ZendeskUser}
 */
ZendeskUser.prototype.clone =  function()
{
    console.log( "Started ZendeskUser.prototype.clone with this=");
    console.dir( this );
    var clonedUser = new ZendeskUser( this.app, this.id, this.name, this.email, this.customer_type );
    clonedUser.organization = ( this.organization === null) ? null : this.organization.clone();
    clonedUser.extra_user_fields = ( this.extra_user_fields === null) ? null : this.extra_user_fields.slice(0);
    return clonedUser;
};
ZendeskUser.prototype.isNotset = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET; };
ZendeskUser.prototype.isExcluded = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE; };
ZendeskUser.prototype.isOrganization = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION; };
ZendeskUser.prototype.isDefault = function() { return this.customer_type === this.app.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT; };


module.exports.ZendeskUser = ZendeskUser;
module.exports.ZendeskOrganization = ZendeskOrganization;

