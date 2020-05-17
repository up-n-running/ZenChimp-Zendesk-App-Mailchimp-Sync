/* global helpers */

(function() {

  return {

	defaultState: 'loading_screen',

	resources: 
	{
		APP_LOCATION_TICKET: "ticket_sidebar",
		APP_LOCATION_USER: "user_sidebar",

		FIELD_TYPE_TEXT: "text",
		FIELD_TYPE_IMAGE: "image",
		FIELD_TYPE_CHECKBOX: "checkbox",

		USER_FIELD_NAME_CUSTOMER_TYPE: "mailshot_customer_type",
		USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET: null,
		USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE: "mailshot_exclude_from_mailshot",
		USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT: "mailshot_use_default_values",
		USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION: "mailshot_use_organisation_values",

		TEMPLATE_NAME_MAIN: "main",
		TEMPLATE_NAME_LOADING: "loading_screen",
		
		DEBUG: false
	},

	events: 
	{
		//init events
		'app.activated'                  : 'init',
		'ticket.requester.id.changed'    : 'resetAppIfPageFullyLoaded',
		'user.email.changed'		 : 'resetAppIfPageFullyLoaded',
                'user.id.changed'		 : 'resetAppIfPageFullyLoaded',
                'user.name.changed'		 : 'resetAppIfPageFullyLoaded',
                'user.organizations.changed'	 : 'resetAppIfPageFullyLoaded',
                


		// Zendesk API Requests
		'getZendeskUser.done'		: 'getZendeskUser_Done',
		'getZendeskUser.fail'		: 'switchToErrorMessage',
		'updateZendeskUser.done'	: 'updateZendeskUser_Done',
		'updateZendeskUser.fail'	: 'switchToErrorMessage',
		'getZendeskOrganizations.done'  : 'getZendeskOrganizations_Done',
		'getZendeskOrganizations.fail'  : 'switchToErrorMessage',

		'getMailChimpAllListMembers.done'	: 'retrievedMailchimpAllListSubscribers',
		'getMailChimpAllListMembers.fail'	: 'switchToErrorMessage',	

		//mailchimp v3 api requests
		'getMailChimpListMember.done'			: 'retrievedMailchimpSubscriber',
		'getMailChimpListMember.fail'			: 'get_or_createOrUpadateMailChimpListMember_OnFail',
		'createOrUpadateMailChimpListMember.done'	: 'createOrUpadateMailChimpListMember_Done',
		'createOrUpadateMailChimpListMember.fail'	: 'get_or_createOrUpadateMailChimpListMember_OnFail',   

		//buttons on main form
		'click .exclude'			: 'excludeButtonOnClick',
		'click .organization'	   : 'organizationButtonOnClick',
		'click .standard'		   : 'standardButtonOnClick',
	   
		//buttons on modal form
		'click .sync'			   : 'syncButtonFromModalOnClick',

		//buttons on error form
		'click .error_go_back'			: 'resetAppIfPageFullyLoaded',
		'click .error_override_mailchimp' : 'createOrUpadateMailChimpListMember_Override_OnClick',
		'click .error_create_new_mailchimp' : 'createOrUpadateMailChimpListMember_Add_New_OnClick',
		
		//mailchimp only fields when in sync
		'click .mc_only_field' : 'mailchimpOnlyField_OnClick', 
			
		//modal sync screen events  //show shown hide hidden
		//'hidden #sync_modal'	: 'afterHidden',

		//main screen events
		'user.mailshot_customer_type.changed' : 'userScreenCustomerTypeFieldChanged',

		'*.changed': 'formFieldChanged',
		
		//debug button
		'click #debugtest': 'debugButtonOnClick'
	},

	requests: 
	{
		getZendeskUser: function(id)
		{
			var userApiCallSettings = 
			{
				url: helpers.fmt('/api/v2/users/%@.json', id),
				type:'GET',
				dataType: 'json'
			};
			//console.log( "getZendeskUser: API CAll DETAILS:" );console.dir( userApiCallSettings );
			return userApiCallSettings;
		},

		updateZendeskUser: function( userToSyncObject )
		{
			var userApiCallSettings = 
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
			//console.log( "updateZendeskUser: API CAll DETAILS:" );console.dir( userApiCallSettings );
			return userApiCallSettings;
		},

		getZendeskOrganizations: function(userId, organizationId)
		{
			var userApiCallSettings = 
			{
				url: ( typeof( organizationId ) !== "undefined" && organizationId !== null ) ? helpers.fmt('/api/v2/organizations/%@.json', organizationId) : helpers.fmt('/api/v2/users/%@/organizations.json', userId),
				type:'GET',
				dataType: 'json'
			};
			//console.log( "getZendeskOrganizations: API CAll DETAILS:" );console.dir( userApiCallSettings );
			return userApiCallSettings;
		},

		getMailChimpAllListMembers: function()
		{
			var jsonCall =
			{
				url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.mailchimp_datacentre_prefix ),
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				data: JSON.stringify(
				{
					"apikey": this.mailchimp_api_key,
					"id": this.mailchimp_list_id,
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
			//console.log( "getMailChimpAllListMembers: API CAll DETAILS:" );console.dir( jsonCall );
			return jsonCall;
		},

		getMailChimpListMember: function( emailAddress )
		{

			if( typeof( emailAddress ) === "undefined" || emailAddress === null )
			{
				return console.warn( "ERROR CONDITION: getMailChimpListMember called with null email address" );
			}

			//require md5 library utils js to create md5 hash of email address
			this.md5JSModule = this.md5JSModule === null ? require('md5') : this.md5JSModule;
			var md5HashOfEmail = this.md5JSModule(emailAddress.toLowerCase());
			var jsonCall =
			{
				url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
				type: 'GET',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				headers: 
				{
					"Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
				}
			};
			//console.log( "getMailChimpListMember: API CAll DETAILS:" );console.dir( jsonCall );
			return jsonCall;
		},

		createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
		{

			if( mailchimpSyncUser === null || mailchimpSyncUser.email_address == null )
			{
				return console.warn( "ERROR CONDITION: createOrUpadateMailChimpListMember called with either null user or user with no email address" );
			}

			//require md5 library utils js to create md5 hash of email address
			this.md5JSModule = this.md5JSModule === null ? require('md5') : this.md5JSModule;
			var md5HashOfEmail = this.md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

			var dataJSON = 				
			{
				"id": md5HashOfEmail,
				"email_address": mailchimpSyncUser.email_address,
				"email_type": "html",
				"status": mailchimpSyncUser.status,
				"status_if_new": "subscribed",
				"merge_fields":
				{  //these will be populated below
				},
				"vip": ( mailchimpSyncUser.customer_type === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
			};

			//3 x mandatory merge fields plus extra ones from user object
			dataJSON.merge_fields[ this.mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
			dataJSON.merge_fields[ this.mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
			dataJSON.merge_fields[ this.mailchimp_list_field_customer_type_name ] = mailchimpSyncUser.customer_type;
			for (var i=0; i < mailchimpSyncUser.extra_merge_fields.length; i++) 
			{
				dataJSON.merge_fields[ mailchimpSyncUser.extra_merge_fields[ i ].field_def.mailshot_field ] = mailchimpSyncUser.extra_merge_fields[ i ].value;
			}

			var jsonCall =
			{
				url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, (updateNotCreate) ? md5HashOfEmail : "" ),
				type: updateNotCreate ? 'PUT' : 'POST',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				headers: 
				{
					"Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
				},
				data: JSON.stringify( dataJSON )
			};
			//console.log( "createOrUpadateMailChimpListMember: API CAll DETAILS:" );console.dir( jsonCall );
			return jsonCall;
		},

		deleteMailChimpListMember: function( mailchimpSyncUser )
		{

			if( mailchimpSyncUser === null || mailchimpSyncUser.email_address === null )
			{
				return console.warn( "ERROR CONDITION: deleteMailChimpListMember called with either null user or user with no email address" );
			}

			//require md5 library utils js to create md5 hash of email address
			this.md5JSModule = this.md5JSModule === null ? require('md5') : this.md5JSModule;
			var md5HashOfEmail = this.md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

			var jsonCall =
			{
				url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
				type: 'DELETE',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				headers: 
				{
						"Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
				}
			};
			//console.log( "deleteMailChimpListMember: API CAll DETAILS:" );console.dir( jsonCall );
			return jsonCall;
		}
	},		

	syncButtonFromModalOnClick: function() 
	{
		this.syncExistingUserToMailchimp( this.zendesk_user, true );
	},
	
	// --- INITIALISATION FUCNTIONS
	init: function() 
	{
		//console.log( "Starting app init()");
		
		//hide hidden dustomer type field if in user screen
		this.hideFieldsIfInUserLocation();
		
		//get CommonJS Modules
		this.zendeskObjectsModule = require('ZendeskObjects');
		this.parseNamesModule = require('parse-names');
		this.md5JSModule = null; //will be set when needed for 1st time
		
		//Get Settings from manifest.js
		this.mailchimp_api_key = this.setting('mailchimp_api_key');
		this.mailchimp_datacentre_prefix = this.setting('mailchimp_datacentre_prefix');
		this.mailchimp_list_id = this.setting('mailchimp_list_id');
		this.mailchimp_merge_field_forename = this.setting('mailchimp_merge_field_forename');
		this.mailchimp_merge_field_surname = this.setting('mailchimp_merge_field_surname');
		this.mailchimp_list_field_customer_type_name = this.setting('mailchimp_merge_field_customer_type');
		this.mailchimp_list_field_customer_type_default_value = this.setting('mailchimp_merge_field_customer_type_default_val');
                this.mailchimp_organisation_button_label = this.setting('mailchimp_organisation_button_label');
                this.mailchimp_standard_button_label = this.setting('mailchimp_standard_button_label');

		//setup field mappings
		this.customer_type_field_mapping = { zendesk_field: 'mailshot_customer_display_name', mailshot_field: this.mailchimp_list_field_customer_type_name, type: this.resources.FIELD_TYPE_TEXT, default_value: this.mailchimp_list_field_customer_type_default_value };
		this.organization_field_mappings = JSON.parse( this.setting('mailchimp_organization_field_mappings') );
		this.user_field_mappings = JSON.parse( this.setting('mailchimp_user_field_mappings') );
		this.mailshot_only_field_mappings = JSON.parse( this.setting('mailchimp_mailshot_only_field_mappings') );

		//delcare other instance variables
		this.mailshot_sync_user = null;
		this.zendesk_user = null;

		this.isFullyInitialized = false;
		this.resetAppIfPageFullyLoaded();
	},
//events: { 'app.activated': 'welcomeIfDataReady', 'ticket.subject.changed': 'welcomeIfDataReady', 'ticket.requester.email.changed': 'welcomeIfDataReady' },


	resetAppIfPageFullyLoaded: function() 
	{
		if( this.resources.DEBUG ) { console.log( "resetAppIfPageFullyLoaded called. this.isFullyInitialized = " + this.isFullyInitialized + " and this.resources.APP_LOCATION_TICKET = " + this.resources.APP_LOCATION_TICKET ); }
		//dont continue if page not fuly loaded yet
		if( !this.isFullyInitialized && this.currentLocation() === this.resources.APP_LOCATION_TICKET && ( typeof( this.ticket().requester().id() ) === "undefined" || this.ticket().requester().id() === null ) )
		{
			if( this.resources.DEBUG ) { console.log( "resetAppIfPageFullyLoaded, check failed: typeof( this.ticket().requester().id() ) = " + typeof( this.ticket().requester().id() ) + " and this.ticket().requester().id() = " + this.ticket().requester().id() ); }
			return;
		}
        if( !this.isFullyInitialized && this.currentLocation() === this.resources.APP_LOCATION_USER && ( this.user().id() === null || this.user().email() === null || this.user().name() === null ) )
		{
			if( this.resources.DEBUG ) { console.log( "resetAppIfPageFullyLoaded, check failed: this.user().id() = " + this.user().id() + " and this.user().email() = " + this.user().email() + " and this.user().name() = " + this.user().name() ); }
			return;
		}
                
		this.mailshot_sync_user = null;
		this.zendesk_user = null;
		
		if( this.currentLocation() === this.resources.APP_LOCATION_TICKET )
		{
			this.switchToLoadingScreen( "Loading Zendesk User" );
			this.ajax( 'getZendeskUser', this.ticket().requester().id() ); //this jumps to getZendeskUser_Done
		}
		else if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			//CHECK HERE IF USER WAS UPDATED ELSEWHERE!
			this.switchToLoadingScreen( "Loading Zendesk User" );
			this.getUserFromFrameworkInUserSidebarLocation();
		}
		this.isFullyInitialized = true;
	},
	
	//MAIN SCREEN UTILITY FUNCTIONS
	hideFieldsIfInUserLocation: function() 
	{
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			_.each([this.resources.USER_FIELD_NAME_CUSTOMER_TYPE], function(f) 
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
	formFieldChanged: function( event )
	{
		var matchedZDFieldName = null;
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			var fieldName = event.propertyName;
			for( var i=0; i < this.user_field_mappings.length; i++)
			{
				if( fieldName === "user."+this.user_field_mappings[i].zendesk_field )
				{
					matchedZDFieldName = this.user_field_mappings[i].zendesk_field;
					break;
				}
			}
		}
		
		//if it's a dependant 'extra' field
		if( matchedZDFieldName!==null && typeof( this.zendesk_user ) !== "undefined" && this.zendesk_user !== null )
		{
			this.zendesk_user.findExtraFieldByName( matchedZDFieldName, true ).value = event.newValue;
			this.switchToMainTemplate();
		}
	},	
	
	userScreenCustomerTypeFieldChanged: function(evt)
	{
		//fetch new value from field and old value from user
		var oldCustomerType = this.zendesk_user.customer_type;
		var newCustomerTypeSelected = this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE );
		this.changeCustomerType( oldCustomerType, newCustomerTypeSelected );
	},
	
	//---APP FIELD ONCLICK EVENT
	mailchimpOnlyField_OnClick: function( event ) 
	{
		var tempField = null;
		console.warn( "NEED TO CLONE MAILCHIMP USER IDEALLY AT THIS POINT");
		for( var i=0; i < this.mailshot_sync_user.extra_merge_fields.length; i++)
		{
			tempField = this.mailshot_sync_user.extra_merge_fields[ i ];
			if( typeof( tempField.field_def.zendesk_field ) === "undefined" && ( "MC_ONLY_" + tempField.field_def.mailshot_field ) === event.target.id )
			{
				if( tempField.field_def.type === this.resources.FIELD_TYPE_CHECKBOX )
				{
					tempField.value = ( tempField.value === "0" || tempField.value === 0 || tempField.value === false ) ? "1" : "0";
				}
				else
				{
					console.warn( "Unsupported field type: " + tempField.type );
				}
			}
		}
		
		//now save the updated user in mailchimp
		this.switchToLoadingScreen( "Updating Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", this.mailshot_sync_user, true );
	},	
	
	//EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
	excludeButtonOnClick: function()
	{
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			this.switchToLoadingScreen( "Updating Zendesk User" );
			this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE );
			//this triggers userScreenCustomerTypeFieldChanged
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE;
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
	},

	organizationButtonOnClick: function()
	{
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			this.switchToLoadingScreen( "Updating Zendesk User" );
			this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION );
			//this triggers userScreenCustomerTypeFieldChanged
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION;
			this.switchToLoadingScreen( "Updating Zendesk User" );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
	},

	standardButtonOnClick: function()
	{
		if( this.currentLocation() === this.resources.APP_LOCATION_USER )
		{
			this.switchToLoadingScreen( "Updating Zendesk User" );
			this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT );
			//this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			var updatedUserToSave = this.zendesk_user.clone();
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;
			this.switchToLoadingScreen( "Updating Zendesk User" );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
	},	
	
   //ZENDESK USER AND ORGANIZATION DATA API WRAPPER FUNCTIONS
	getZendeskUser_Done: function( userObjectFromDataAPI )
	{
		this.zendesk_user = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
	   
		//now populate the users organization object through another API call but only if we need it (user type = organization )
		if( this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() )
		{
			this.switchToLoadingScreen( "Loading Organization" );
			this.ajax( 'getZendeskOrganizations', this.zendesk_user.id, this.zendesk_user.organization_id );
		}
		//otherwise we've finished getting the user object
		else
		{
			this.fetchMailchimpObjectIfNecessary();
		}
	},
	
	createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
	{
		//console.log( 'Starting createZendeskUserFromAPIReturnData, userObjectFromDataAPI = ' );console.dir( userObjectFromDataAPI );

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
			//now set the optional extra user fields from returned API data
			zendeskUserObjectToReturn.populateExtraFieldsFromUserAPIData( userObjectFromDataAPI.user );
			//we've kept a record of the org id if there is one but now leave org object as null as this info is not available on this API return data
		}
		else console.warn( "createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

		//console.log( 'Finished createZendeskUserFromAPIReturnData, zendeskUserObjectToReturn = ' );console.dir( zendeskUserObjectToReturn );
		return zendeskUserObjectToReturn;
	},
	
	getUserFromFrameworkInUserSidebarLocation: function()
	{
		//console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );

		//fetch first organization object if there is one, null if not
		var usersOrgObject = ( typeof( this.user().organizations()[0] ) !== 'undefined' && this.user().organizations()[0] !== null ) ? this.user().organizations()[0] : null;
		
		//initialize user object
		this.zendesk_user = new this.zendeskObjectsModule.ZendeskUser(
			this,
			this.user().id(),
			this.user().name(),
			this.user().email(),
			this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE ),
			( usersOrgObject === null ) ? null : usersOrgObject.id()
		);
		
		//now set the optional extra user fields from the framework object
		this.zendesk_user.populateExtraFieldsFromFrameworkUserObject( this.user() );

		//popupate org object if one is set on user record
		if( usersOrgObject !== null )
		{
			this.zendesk_user.orgObject = new this.zendeskObjectsModule.ZendeskOrganization( this, usersOrgObject.id(), usersOrgObject.name(), usersOrgObject.customField( this.customer_type_field_mapping.zendesk_field ) );
			this.zendesk_user.orgObject.populateExtraFieldsFromFrameworkOrgObject( usersOrgObject );
		}
		
		//console.log( "Finished getUserFromFrameworkInUserSidebarLocation, this.zendesk_user = " );console.dir( this.zendesk_user );
		this.fetchMailchimpObjectIfNecessary();
	},

	updateZendeskUser_Done: function( userObjectFromDataAPI )
	{
		var returnedUser = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
		returnedUser.orgObject = this.zendesk_user.orgObject;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
		var oldCustomerType = this.zendesk_user.customer_type;
		this.zendesk_user = returnedUser;
		
		//now populate the users arganization object through another API call but only if we need it (user type = organization )
		if( this.zendesk_user.isOrganization() && this.zendesk_user.belongsToOrganization() && !this.zendesk_user.orgObjectIsPopulated())
		{
			//cant call changeCustomerType as yet because we still need to load organization object so register the change necessary on user object temporarily
			this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType= ( oldCustomerType === null ) ? 'NOTSET' : oldCustomerType;
			this.switchToLoadingScreen( "Loading Organization" );
			this.ajax( 'getZendeskOrganizations', this.zendesk_user.id, this.zendesk_user.organization_id );
		}
		else
		{
			//nothing left to do - so register the new customer type in order to delete mailchimp member if necessary
			this.changeCustomerType( oldCustomerType, this.zendesk_user.customer_type );
		}	 
	},

	getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
	{
		//console.log( 'Starting getZendeskOrganizations_Done, organizationObjectFromDataAPI = ' );console.dir( organizationObjectFromDataAPI );

		this.zendesk_user.orgObject = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );
		
		//was this load as a result of pressing the "organization" button?
		if( typeof( this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType ) !== "undefined" && this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType !== null )
		{
			var oldType = ( this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType === 'NOTSET' ) ? null : this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType;
			this.zendesk_user.callChangeCustomerTypeAfterFullyLoadedWithOldType = null;
			this.changeCustomerType( oldType, this.zendesk_user.customer_type );
		}
		else
		{
			//we now have full populated user object to save complete with org object and no more changes so continue to load form
			this.fetchMailchimpObjectIfNecessary();
		}
	},

	createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
	{
		//console.log( 'Starting createZendeskOrganizationFromAPIReturnData, organizationObjectFromDataAPI = ' );console.dir( organizationObjectFromDataAPI );

		var organizationObjectToReturn = null;
		if( typeof( organizationObjectFromDataAPI ) !== "undefined" && organizationObjectFromDataAPI !== null && typeof( organizationObjectFromDataAPI.organization ) !== "undefined" )
		{
			if( organizationObjectFromDataAPI.organization !== null )
			{
				organizationObjectToReturn = new this.zendeskObjectsModule.ZendeskOrganization(
					this,
					organizationObjectFromDataAPI.organization.id,
					organizationObjectFromDataAPI.organization.name,
					organizationObjectFromDataAPI.organization.organization_fields[ this.customer_type_field_mapping.zendesk_field ]
				);
				organizationObjectToReturn.populateExtraFieldsFromOrganizationAPIData( organizationObjectFromDataAPI.organization );
			}
		}
		else console.warn( "createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");

		//console.log( 'Finished createZendeskOrganizationFromAPIReturnData, organizationObjectToReturn = ' );console.dir( organizationObjectToReturn.clone() );
		return organizationObjectToReturn;
	},
	
	fetchMailchimpObjectIfNecessary: function()
	{
		//if it's included in the mailchimp sync and we dont already have the mailchimp user then get it
		if( this.zendesk_user.isIncluded() && this.mailshot_sync_user === null )
		{
			this.switchToLoadingScreen( "Loading Mailchimp User" );
			this.ajax( 'getMailChimpListMember', this.zendesk_user.email );
		}
		else
		{
			this.switchToMainTemplate();
		}
	},
	
	changeCustomerType: function( oldType, newType ) 
	{
		//console.log( "changeCustomerType called, oldType: " + oldType + "newType: " + newType );

		//update user object so it doesnt get out of sync
		this.zendesk_user.customer_type = newType;

		//if NOT SET or EXCLUDE were selected 
		if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE  )
		{
			//if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
			if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
			{
				this.deleteExistingUserFromMailchimp( this.mailshot_sync_user );
			}
			//if NOT SET or EXCLUDE were selected AND it was previously set to the other one
			if( oldType !== newType )
			{
				//reload the app template with new updated user object - no need to call mailchimp API
				this.switchToMainTemplate();
			}
			else
			{
				//value hasnt actually changed so just go back to form
				this.switchToMainTemplate();
			}
		}

		//if ORGANIZATION or STANDARD was selected
		if( newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || newType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT  )
		{
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
			if( oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE || oldType === this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
			{
				this.syncNewUserToMailchimp( this.zendesk_user );
			}
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to the other one
			else if( oldType !== newType )
			{
				this.syncExistingUserToMailchimp( this.zendesk_user, true );
			}
			else
			{
				//value hasnt actually changed so just go back to form
				this.switchToMainTemplate();
			}
		}
	},


	//MAILCHIMP SYNCING WRAPPER FUNCTIONS
	retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
	{
		//console.log( "started retrievedMailchimpSubscriber, returnedMailchimpUser = returnedMailchimpUser" );console.dir( returnedMailchimpUser ); ////console.log( "" );

		this.mailshot_sync_user = 
		{
			email_address: returnedMailchimpUser.email_address,
			status: "subscribed",
			forename: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_forename ],
			surname: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_surname  ],
			customer_type: returnedMailchimpUser.merge_fields[ this.customer_type_field_mapping.mailshot_field ],
			extra_merge_fields: []
		};

		var arrayIndex = 0;
		for (var i=0; i < this.user_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.user_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.user_field_mappings[ i ].mailshot_field ]};
			arrayIndex++;
		}
		for(i=0; i < this.organization_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.organization_field_mappings[ i ].mailshot_field ] };
			arrayIndex++;
		}
		for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.mailshot_only_field_mappings[ i ].mailshot_field ] };
			arrayIndex++;
		}		

		//console.log( "Finished retrievedMailchimpSubscriber, this.mailshot_sync_user = " );console.dir( this.mailshot_sync_user );
		this.switchToMainTemplate();
	},	

	syncNewUserToMailchimp: function( zendeskUser ) 
	{
		//console.log( "Starting syncNewUserToMailchimp, zendeskUser =");console.dir( zendeskUser );
		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );
		//console.log( "Finished syncNewUserToMailchimp, newMailChimpUserToSave =");console.dir( newMailChimpUserToSave );
		this.switchToLoadingScreen( "Adding Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, false );
	},

	syncExistingUserToMailchimp: function( zendeskUser, tryToPreserveMCOnlyFields ) 
	{
		//console.log( "Starting syncExistingUserToMailchimp, zendeskUser =");console.dir( zendeskUser );
		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );
		
		//if switching between Standard and Org mode try to preserve the value of the Mailchimp only checkbox fields
		if( typeof( tryToPreserveMCOnlyFields ) !== "undefined" && tryToPreserveMCOnlyFields === true && this.mailshot_sync_user !== null && zendeskUser.email === this.mailshot_sync_user.email_address )
		{
			for( var i=0; i < this.mailshot_sync_user.extra_merge_fields.length; i++)
			{
				if( typeof( this.mailshot_sync_user.extra_merge_fields[ i ].field_def.zendesk_field ) === "undefined" ) 
				{
					newMailChimpUserToSave.extra_merge_fields[ i ].value = this.mailshot_sync_user.extra_merge_fields[ i ].value;
				}
			}
		}

		//console.log( "Finished syncExistingUserToMailchimp, newMailChimpUserToSave =");console.dir( newMailChimpUserToSave );
		this.switchToLoadingScreen( "Updating Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, true );
	},

	deleteExistingUserFromMailchimp: function( mailchimpUser ) 
	{
		this.switchToLoadingScreen( "Deleting Mailchimp Member" );
		this.ajax( "deleteMailChimpListMember", mailchimpUser );
	},

	get_or_createOrUpadateMailChimpListMember_OnFail: function( errorResponse ) 
	{
		//console.log( "Started get_or_createOrUpadateMailChimpListMember_OnFail, errorResponse = " );console.dir( errorResponse );

		//check to see if we were in create only mode but the users email address was already found.
		try
		{
			var responseTextJSON = JSON.parse( errorResponse.responseText );
			if( errorResponse.status === 400 && responseTextJSON.title === "Member Exists" )
			{
					return this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp" );
			}
			if( errorResponse.status === 404 && responseTextJSON.title === "Resource Not Found" )
			{
					return this.switchToErrorMessage( errorResponse, this.zendesk_user.email + " doesn't exist in mailchimp.<br /><br/>Do you want to create a new record for him/her?", "Create New", "error_create_new_mailchimp" );
			}
		}
		catch(e){}
		
		this.switchToErrorMessage( errorResponse );
	},

	createOrUpadateMailChimpListMember_Override_OnClick: function() 
	{
		this.syncExistingUserToMailchimp( this.zendesk_user );
	},
	
	createOrUpadateMailChimpListMember_Add_New_OnClick: function() 
	{
		this.syncNewUserToMailchimp( this.zendesk_user );
	},

	createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
	{
		this.retrievedMailchimpSubscriber( returnedMailchimpUser );
	},

	createNewMailchimpSyncUserObject: function( zendeskSyncUserObject )
	{
		//console.log( "Started createNewMailchimpSyncUserObject, zendeskSyncUserObject = " ); console.dir( zendeskSyncUserObject );

		var useDefaultOrgValues = zendeskSyncUserObject.isDefault();		

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
			status: "subscribed",
			forename: zendeskSyncUserObject.getForeName(),
			surname: zendeskSyncUserObject.getSurname(),
			customer_type: zendeskSyncUserObject.getMailchimpCustomerType(),
			extra_merge_fields: [],
		};

		//extra merge fields for organisation fields
		var arrayIndex = 0;
		for (var i=0; i < zendeskSyncUserObject.extra_user_fields.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: zendeskSyncUserObject.extra_user_fields[ i ].field_def, value: ( zendeskSyncUserObject.extra_user_fields[ i ].value === null ) ? "" : zendeskSyncUserObject.extra_user_fields[ i ].value };
			arrayIndex++;
		}
		for (i=0; i < this.organization_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: useDefaultOrgValues ? this.organization_field_mappings[ i ].default_value : zendeskSyncUserObject.orgObject.extra_org_fields[ i ].value };
			arrayIndex++;
		}
		for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: this.mailshot_only_field_mappings[ i ].default_value };
			arrayIndex++;
		}

		//console.log( "Finished createNewMailchimpSyncUserObject, mailchimpUserToReturn = " ); console.dir( mailchimpUserToReturn );
		return mailchimpUserToReturn;
	},

	//SWITCH TO HTML TEMPLATE FUNCTIONS
	switchToLoadingScreen: function( optionalMessage ) 
	{
		this.switchTo( this.resources.TEMPLATE_NAME_LOADING, { optional_message: optionalMessage } );
	},

	switchToMainTemplate: function() 
	{
		//console.log( "Started switchToMainTemplate" );
		var syncFields = this.zendesk_user.getFieldSyncInfo( this.mailshot_sync_user );
		var isInSync = this.zendesk_user.isInSync( syncFields );
		
		var formData = 
		{
			'zendesk_user': this.zendesk_user,
			'mailchimp_user': this.mailshot_sync_user,
			'sync_fields': syncFields,
			'monkey_URL': this.zendesk_user.isNotset() ? null : ( this.zendesk_user.isExcluded() ? this.assetURL( "exclude_monkey.png" ) : ( isInSync ? this.assetURL( "insync_monkey.png" ) : this.assetURL( "outofsync_monkey.png" ) ) ),
			'buttons': 
			{
				'exclude': { 'show': true, 'classNameInsert': this.zendesk_user.isExcluded() ? " active" : "", 'label' : "Exclude" },
				'organization': { 'show': ( this.zendesk_user.belongsToOrganization() ), 'classNameInsert': this.zendesk_user.isOrganization() ? " active" : "", 'label' : this.mailchimp_organisation_button_label },
				'standard': { 'show': true, 'classNameInsert': this.zendesk_user.isDefault() ? " active" : "", 'label' : this.mailchimp_standard_button_label }
			},
			'display_params':
			{
				'customer_type_not_set'	 : this.zendesk_user.isNotset(),
				'customer_type_exclude'	 : this.zendesk_user.isExcluded(),
				'customer_type_included'	: this.zendesk_user.isIncluded(),
				'customer_type_organization': this.zendesk_user.isOrganization(),
				'customer_type_standard'	: this.zendesk_user.isDefault(),
				'user_in_sync'			  : isInSync,
				'DEBUG'					: this.resources.DEBUG
			}
		};

		//console.log( "Finished switchToMainTemplate, formData = " );console.dir( formData );
		this.switchTo( this.resources.TEMPLATE_NAME_MAIN, formData );
	},

	switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle ) 
	{
		//check for catchall error conditions
		try
		{
			if( errorResponse.status === 0 && typeof( overrideMessage ) === "undefined" || overrideMessage === null || overrideMessage === "error" )
			{
				overrideMessage = "Could not connect to API, Please check your internet connection";
			}
		}
		catch(e) { }

		var formData = 
		{
		  'errorResponse'			: errorResponse,
		  'overrideMessage' 		: ( typeof( overrideMessage ) === "undefined" || overrideMessage === "error") ? null:  overrideMessage, /* sometimes just the string error is passed as the 2nd param!) */
		  'additionalButtonText' 	: ( typeof( additionalButtonText ) === "undefined" ) ? null : additionalButtonText,
		  'additionalButtonHandle' 	: ( typeof( additionalButtonHandle ) === "undefined" ) ? null : additionalButtonHandle
		};

		this.switchTo( 'show_error', formData );
	}
	
	,debugButtonOnClick: function()
	{
		console.log( 'Starting debugButtonOnClick' );
		console.dir( this );
	}
	
  };

}());
