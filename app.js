(function() {

console.log("Loading app.js");

  return {

    defaultState: 'loading_screen',

    resources: 
    {
      APP_LOCATION_TICKET: "ticket_sidebar",
      APP_LOCATION_USER: "user_sidebar",

      USER_FIELD_NAME_CUSTOMER_TYPE: "mailshot_customer_type",
      USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET: null,
      USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE: "mailshot_exclude_from_mailshot",
      USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT: "mailshot_use_default_values",
      USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION: "mailshot_use_organisation_values",

      MAILSHOT_FIELD_NAMES_CUSTOMER_TYPE: "CUSTOMER",
      MAILSHOT_FIELD_CUSTOMER_TYPE_DEFAULT_VALUE: "SMEs",

      TEMPLATE_NAME_MAIN: "main",
      TEMPLATE_NAME_LOADING: "loading_screen"

      //DATE_PATTERN : /^\d{4}-\d{2}-\d{2}$/
    },

    events: 
    {
      'app.activated'                : 'init',

      // Zendesk API Requests
      'getZendeskUser.done'			: 'getZendeskUser_Done',
      'getZendeskUser.fail'			: 'switchToErrorMessage',
      'updateZendeskUser.done'		: 'updateZendeskUser_Done',
      'updateZendeskUser.fail'		: 'switchToErrorMessage',
      'getZendeskOrganizations.done': 'getZendeskOrganizations_Done',
      'getZendeskOrganizations.fail': 'switchToErrorMessage',

      'getMailChimpAllListMembers.done'	: 'retrievedMailchimpAllListSubscribers',
      'getMailChimpAllListMembers.fail'	: 'switchToErrorMessage',    

		//mailchimp v3 api requests
      'getMailChimpListMember.done'				: 'retrievedMailchimpSubscriber',
      'getMailChimpListMember.fail'				: 'switchToErrorMessage',
      'createOrUpadateMailChimpListMember.done'	: 'createOrUpadateMailChimpListMember_Done',
      'createOrUpadateMailChimpListMember.fail'	: 'createOrUpadateMailChimpListMember_OnFail',   

      //buttons on main form
      'click .exclude' 				: 'excludeButtonOnClick',
      'click .organization' 		: 'organizationButtonOnClick',
      'click .standard' 			: 'standardButtonOnClick',

      //buttons on error form
      'click .error_go_back'			: 'resetAppAfterInitialization',
      'click .error_override_mailchimp' : 'createOrUpadateMailChimpListMember_Override_OnClick',

      //main screen events
      'user.mailshot_customer_type.changed' : 'userScreenCustomerTypeFieldChanged'
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
			console.log( "API CAll DETAILS FOR getZendeskUser;" );
			console.dir( userApiCallSettings ); console.log();
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
			console.log( "API CAll DETAILS FOR createOrUpdateZendeskUser;" );
			console.dir( userApiCallSettings ); console.log();
        	return userApiCallSettings;
		},

    	getZendeskOrganizations: function(userId, organizationId)
    	{
    		var userApiCallSettings = 
    		{
				url: ( typeof( organizationId ) != "undefined" && organizationId != null ) ? helpers.fmt('/api/v2/organizations/%@.json', organizationId) : helpers.fmt('/api/v2/users/%@/organizations.json', userId),
				type:'GET',
				dataType: 'json'
			};
			console.log( "API CAll DETAILS FOR getZendeskOrganizationsForUser;" );
			console.dir( userApiCallSettings ); console.log();
        	return userApiCallSettings;
		},

		getMailChimpAllListMembers: function()
		{
			var jsonCall =
			{
				//url: "https://us13.api.mailchimp.com/2.0/lists/members",
				url: helpers.fmt( "https://%@.api.mailchimp.com/2.0/lists/members.json", this.mailchimp_datacentre_prefix ),
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				data: JSON.stringify(
				{
					"apikey": this.mailchimp_api_key,
					"id": this.mailchimp_list_id,
					"status": "subscribed",
					"opts": {
					    "start": 0,
					    "limit": 100,
					    "sort_field": "email",
					    "sort_dir": "ASC"
					}
				})
			};
			console.log( "API CAll DETAILS FOR getMailChimpAllListMembers;" );
			console.dir( jsonCall ); console.log();
			return jsonCall;
		},

		getMailChimpListMember: function( emailAddress )
		{

			if( emailAddress == null )
			{
				return console.warn( "ERROR CONDITION: getMailChimpListMember called with null email address" );
			}

			//require md5 library utils js to create md5 hash of user then get md5 hash of email address
			var md5JSModule = require('md5');
			var md5HashOfEmail = md5JSModule(emailAddress.toLowerCase());
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
			console.log( "API CAll DETAILS FOR getMailChimpListMember;" );
			console.dir( jsonCall ); console.log();
			return jsonCall;
		},

		createOrUpadateMailChimpListMember: function( mailchimpSyncUser, updateNotCreate )
		{

			if( mailchimpSyncUser == null || mailchimpSyncUser.email_address == null )
			{
				return console.warn( "ERROR CONDITION: createOrUpadateMailChimpListMember called with either null user or user with no email address" );
			}

			//require md5 library utils js to create md5 hash of user then get md5 hash of email address
			var md5JSModule = require('md5');
			var md5HashOfEmail = md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

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
  					"vip": ( mailchimpSyncUser.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
			};

			//mandatory merge fields
			dataJSON.merge_fields[ this.mailchimp_merge_field_forename ] = mailchimpSyncUser.forename;
			dataJSON.merge_fields[ this.mailchimp_merge_field_surname ] = mailchimpSyncUser.surname;
			dataJSON.merge_fields[ this.resources.MAILSHOT_FIELD_NAMES_CUSTOMER_TYPE ] = mailchimpSyncUser.customer_type;

			//extra merge fields for organisation and mailchimp only fields
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
			console.log( "API CAll DETAILS FOR createOrUpadateMailChimpListMember;" );
			console.dir( jsonCall ); console.log();
			return jsonCall;
		},

		deleteMailChimpListMember: function( mailchimpSyncUser )
		{

			if( mailchimpSyncUser == null || mailchimpSyncUser.email_address == null )
			{
				return console.warn( "ERROR CONDITION: deleteMailChimpListMember called with either null user or user with no email address" );
			}

			//require md5 library utils js to create md5 hash of user then get md5 hash of email address
			var md5JSModule = require('md5');
			var md5HashOfEmail = md5JSModule(mailchimpSyncUser.email_address.toLowerCase());

			var jsonCall =
			{
				url: helpers.fmt( "https://%@.api.mailchimp.com/3.0/lists/%@/members/%@", this.mailchimp_datacentre_prefix, this.mailchimp_list_id, md5HashOfEmail ),
				type: 'DELETE',
				dataType: 'json',
				contentType: 'application/json; charset=UTF-8',
				headers: 
				{
					"Authorization": "Basic " + btoa( "api:" + this.mailchimp_api_key )
				},
			};
			console.log( "API CAll DETAILS FOR deleteMailChimpListMember:" );
			console.dir( jsonCall ); console.log();
			return jsonCall;
		}
	},		


    // --- INITIALISATION FUCNTIONS
    init: function() 
    {
    	console.log( "Starting init");
    	console.log( "Location Object:" );
    	console.dir( this.currentLocation() );
    	console.log( "This =" );
		console.dir( this );
        
        //Get Settings from manifest.js
		this.mailchimp_api_key = this.setting('mailchimp_api_key');
		this.mailchimp_datacentre_prefix = this.setting('mailchimp_datacentre_prefix');
		this.mailchimp_list_id = this.setting('mailchimp_list_id');
		this.mailchimp_merge_field_forename = this.setting('mailchimp_merge_field_forename');
		this.mailchimp_merge_field_surname = this.setting('mailchimp_merge_field_surname');

		//setup field mappings
		this.customer_type_field_mapping = { zendesk_field:'mailshot_customer_display_name', mailshot_field: 'CUSTOMER', default_value: 'SMEs' };
		this.organization_field_mappings = 
		[ 
			//this.customer_type_field_mapping,
			{ zendesk_field:'mailshot_success_email_address', mailshot_field: 'FROMEMAIL', default_value: 'successteam@greenlightpower.net' },
			{ zendesk_field:'mailshot_company_logo_url', mailshot_field: 'LOGO', default_value:'https://gallery.mailchimp.com/a0a70a7c775f05e19e19fa7aa/images/c7a2e081-f25d-4084-87c4-6eafe598200b.png' }
		];
		this.mailshot_only_field_mappings = 
		[ 
			//this.customer_type_field_mapping,
			{ field_label:'Maintenance Emails', mailshot_field: 'SEND_MAINT', default_value: '0' },
			{ field_label:'Announcement Emails', mailshot_field: 'SEND_ANNOU', default_value:'0' },
			{ field_label:'Monthly CSAT Scorecards', mailshot_field: 'SEND_CSAT', default_value:'0' }
		];

		//delcare other instance variables
		this.mailshot_sync_user = null;

		this.resetAppAfterInitialization();
    },

    resetAppAfterInitialization: function() 
    {
		//fetch current user object and use it to store gloabl user variables for use later
		this.zendesk_sync_user = null;
		if( this.currentLocation() == this.resources.APP_LOCATION_TICKET )
		{
			this.switchToLoadingScreen( "Loading Zendesk User" );
			this.ajax( 'getZendeskUser', this.ticket().requester().id() );
		}
		else if( this.currentLocation() == this.resources.APP_LOCATION_USER )
		{
//CHECK HERE IF USER WAS UPDATED ELSEWHERE!
			this.getUserFromFrameworkInUserSidebarLocation();
		}

		//kill mailshot sync user as we're starting again from scratch
		this.mailshot_sync_user = null;
    },

    getUserFromFrameworkInUserSidebarLocation: function()
    {
		console.log( 'Starting getUserFromFrameworkInUserSidebarLocation' );
		console.log( 'this.user() object from framework = ' );
		console.dir( this.user() );
		console.log( 'this.userFields() object from framework = ' );
		console.dir( this.userFields() );
		console.log( 'this.user().organizations() object from framework = ' );
		console.dir( this.user().organizations() );
		console.log( 'this.user().organizations()[0] object from framework = ' );
		console.dir( this.user().organizations()[0] );

		this.zendesk_sync_user = 
		{
			id: this.user().id(),
			name: this.user().name(),
			email: this.user().email(),
			organization: ( typeof( this.user().organizations()[0] ) == 'undefined' ) ? null : { id: this.user().organizations()[0].id(), name: this.user().organizations()[0].name() },
			customer_type: this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE ),
		};

		//nothing left to do
		this.switchToMainTemplate();
    },


    //ZENDESK USER AND ORGANIZATION DATA API WRAPPER FUNCTIONS
    getZendeskUser_Done: function( userObjectFromDataAPI )
	{
		this.zendesk_sync_user = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );

		//now get organization object to go with it
		this.switchToLoadingScreen( "Loading Organization" );
		this.ajax( 'getZendeskOrganizations', this.zendesk_sync_user.id, this.zendesk_sync_user.organization.id );

		//now we've got user go to main template
		//this.switchToMainTemplate();
	},

	updateZendeskUser_Done: function( userObjectFromDataAPI )
	{
		var returnedUser = this.createZendeskUserFromAPIReturnData( userObjectFromDataAPI );
		returnedUser.organization = this.zendesk_sync_user.organization;  //user object was updated but the org object wasn't so copy the proper org object from org API call on init for this basic one created by the above method
		this.zendesk_sync_user = returnedUser;

		//now we've got user go to main template
		this.switchToMainTemplate();
	},

	createZendeskUserFromAPIReturnData: function( userObjectFromDataAPI )
	{
		console.log( 'Starting createZendeskUserFromAPIReturnData, user object from API = ' );
		console.dir( userObjectFromDataAPI );

		var zendeskUserObjectToReturn = null

		if( userObjectFromDataAPI != null )
		{
			zendeskUserObjectToReturn = 
			{
				id: userObjectFromDataAPI.user.id,
				name: userObjectFromDataAPI.user.name,
				email: userObjectFromDataAPI.user.email,
				//ORG_ID: userObjectFromDataAPI.user.organization_id,
				organization: ( userObjectFromDataAPI.user.organization_id == null ) ? null : { id: userObjectFromDataAPI.user.organization_id, name: null },
				customer_type: userObjectFromDataAPI.user.user_fields.mailshot_customer_type,
			};
			
		}
		else console.warn( "createZendeskUserFromAPIReturnData called but userObjectFromDataAPI = null - this should never happen!");

		console.log( 'Finished createZendeskUserFromAPIReturnData, zendeskUserObjectToReturn = ' );
		console.dir( zendeskUserObjectToReturn );

		return zendeskUserObjectToReturn;
	},

    getZendeskOrganizations_Done: function( organizationObjectFromDataAPI )
	{
		console.log( 'Starting getZendeskOrganizations_Done' );
		console.log( 'organizationObjectFromDataAPI = ' );
		console.dir( organizationObjectFromDataAPI );

		this.zendesk_sync_user.organization = this.createZendeskOrganizationFromAPIReturnData( organizationObjectFromDataAPI );

		//now we've got user go to main template
		this.switchToMainTemplate();
	},

	createZendeskOrganizationFromAPIReturnData: function( organizationObjectFromDataAPI )
	{
		console.log( 'Starting createZendeskOrganizationFromAPIReturnData, organizationObjectFromDataAPI = ' );
		console.dir( organizationObjectFromDataAPI );

		var organizationObjectToReturn = null

		if( organizationObjectFromDataAPI != null && typeof( organizationObjectFromDataAPI.organization ) != "undefined" )
		{
			if( organizationObjectFromDataAPI.organization != null )
			organizationObjectToReturn = 
			{
				id: organizationObjectFromDataAPI.organization.id,
				name: organizationObjectFromDataAPI.organization.name,
				customer_type: organizationObjectFromDataAPI.organization.organization_fields[ this.customer_type_field_mapping.zendesk_field ],
				extra_fields: []
			};
			
			for(var i = 0; i < this.organization_field_mappings.length; i++) 
			{
				organizationObjectToReturn.extra_fields[ i ] = { field_def: this.organization_field_mappings[ i ], value: organizationObjectFromDataAPI.organization.organization_fields[ this.organization_field_mappings[ i ].zendesk_field ] };
			}
		}


		else console.warn( "createZendeskOrganizationFromAPIReturnData called but organizationObjectFromDataAPI = null or doesnt contain a organization property - this should never happen!");

		console.log( 'Finished createZendeskOrganizationFromAPIReturnData, organizationObjectToReturn = ' );
		console.dir( organizationObjectToReturn );

		return organizationObjectToReturn;
	},
/*
	userDataInitialized: function()
	{
		if( this.zendesk_sync_user != null )
		{
			console.log( 'user object = ' );
			console.dir( this.zendesk_sync_user );

			//user is definitely initialised so lets see if they are new and havent been configured for mailshot settings yet
			if( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
			{
				this.switchToMainTemplate();
			}
			else if( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE )
			{
				this.switchToMainTemplate();
			}
			else
			{
				this.switchToMainTemplate();
				//			this.ajax( 'getMailChimpListMember', this.zendesk_sync_user.external_subscriber_id );
			}
		}
		else console.warn( "userDataInitialized called but this.zendesk_sync_user = null - this should never happen!");
	},  
*/
	retrievedMailchimpAllListSubscribers: function( mailchimpSubscriberList ) 
	{

		console.log( "started retrievedMailchimpAllListSubscribers with the following object:" );
		console.dir( mailchimpSubscriberList ); console.log( "" );
		//this.switchToMainTemplate();
	},	

	changeCustomerType: function( oldType, newType ) 
	{
		console.log( "changeCustomerType called" );
		console.log( "oldType: " + oldType );
		console.log( "newType: " + newType );		
		//update user object to keep track of change
		this.zendesk_sync_user.customer_type = newType;

		//NOW TAKE APPROPRIATE ACTION DEPENDING ON OLD AND NEW VALUE

		//if NOT SET or EXCLUDE were selected 
		if( newType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET || newType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE  )
		{
			//if NOT SET or EXCLUDE were selected AND it was previously set to STANDARD or ORGANIZATION
			if( oldType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT || oldType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION )
			{
				this.deleteExistingUserFromMailchimp( this.mailshot_sync_user );
				//reload the app with new updated user object
				this.switchToLoadingScreen();
			}
			//if NOT SET or EXCLUDE were selected AND it was previously set to the other one
			if( oldType != newType )
			{
				//reload the app template with new updated user object - no need to call mailchimp API
				this.switchToMainTemplate();
			}
		}

		//if ORGANIZATION or STANDARD was selected
		if( newType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || newType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT  )
		{
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to EXCLUDE or NOT SET
			if( oldType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE || oldType == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET )
			{
				this.syncNewUserToMailchimp( this.zendesk_sync_user );
				//then probably remove the line of code below
				//reload the app with new updated user object
				//this.switchToMainTemplate();
			}
			//if ORGANIZATION or STANDARD  were selected AND it was previously set to the other one
			else if( oldType != newType )
			{
console.log ("INSERT CODE HERE TO ADD UPDATE USER IN MAILCHIMP VIA MAILCHIMP API - if id is not set then update if email match and add if not");
//then probably remove the line of code below
				this.switchToMainTemplate();
			}
		}
	},


	//MAILCHIMP SYNCING WRAPPER FUNCTIONS
	syncNewUserToMailchimp: function( zendeskUser ) 
	{
		console.log( "syncNewUserToMailchimp called with zendesk user =");
		console.dir( zendeskUser );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( zendeskUser );

		console.log( "created mailchimp user object to save =");
		console.dir( newMailChimpUserToSave );

		this.switchToLoadingScreen( "Adding Mailchimp Member" );
		this.ajax( "createOrUpadateMailChimpListMember", newMailChimpUserToSave, false );
	},

	syncExistingUserToMailchimp: function( mailchimpUser ) 
	{
		console.log( "syncExistingUserToMailchimp called with mailchimp user =");
		console.dir( mailchimpUser );

		this.switchToLoadingScreen( "Updating Mailchimp Member" );
    	this.ajax( "createOrUpadateMailChimpListMember", mailchimpUser, true );
    },

	deleteExistingUserFromMailchimp: function( mailchimpUser ) 
    {
    	console.log( "deleteExistingUserFromMailchimp called with mailchimp user =");
		console.dir( mailchimpUser );

		this.switchToLoadingScreen( "Deleting Mailchimp Member" );
    	this.ajax( "deleteMailChimpListMember", mailchimpUser );
    },

	createOrUpadateMailChimpListMember_OnFail: function( errorResponse ) 
	{
		console.log( "started createOrUpadateMailChimpListMember_OnFail with the following object:" );
		console.dir( errorResponse ); console.log( "" );

		//check to see if we were in create only mode but the users email address was already found.
	    try
	    {
	        var responseTextJSON = JSON.parse( errorResponse.responseText );

			if( errorResponse.status == 400 && responseTextJSON.title == "Member Exists" )
			{
				return this.switchToErrorMessage( errorResponse, this.zendesk_sync_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp" );
			}
	    }catch(e)
	    {
	    	
	    }
		this.switchToErrorMessage( errorResponse );
	},

	createOrUpadateMailChimpListMember_Override_OnClick: function() 
	{
		console.log( "started createOrUpadateMailChimpListMember_Override_OnClick" );

		var newMailChimpUserToSave = this.createNewMailchimpSyncUserObject( this.zendesk_sync_user );

    	console.log( "created mailchimp user object to save =");
		console.dir( newMailChimpUserToSave );
//newMailChimpUserToSave.id = 'd6acc35fdec6b59208c6e7e6440aeb84';
		this.syncExistingUserToMailchimp( newMailChimpUserToSave );
	},

	createOrUpadateMailChimpListMember_Done: function( returnedMailchimpUser ) 
	{
		console.log( "started createOrUpadateMailChimpListMember_Done with the following object:" );
		console.dir( returnedMailchimpUser ); console.log( "" );
		//if existing user is null or has null id then set id filed on zendesk user object

		this.retrievedMailchimpSubscriber( returnedMailchimpUser );
	},

	retrievedMailchimpSubscriber: function( returnedMailchimpUser ) 
	{

		console.log( "started retrievedMailchimpSubscriber with the following object:" );
		console.dir( returnedMailchimpUser ); console.log( "" );

		this.mailshot_sync_user = 
		{
			email_address: returnedMailchimpUser.email_address,
			status: "subscribed",
			forename: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_forename ],
			surname: returnedMailchimpUser.merge_fields[ this.mailchimp_merge_field_surname  ],
			//organization: this.cloneUserToSyncOrganisationObject( zendeskSyncUserObject.organization ),
			customer_type: returnedMailchimpUser.merge_fields[ this.customer_type_field_mapping.merge_field ],
			organization_fields: []
		};
		//fetch values for organisation fields
		for(var i = 0; i < this.organization_field_mappings.length; i++) 
		{
			this.mailshot_sync_user.organization_fields[ i ] = { field_def: this.organization_field_mappings[ i ], value: returnedMailchimpUser.merge_fields[ this.organization_field_mappings[ i ].mailshot_field ] };
		}

		console.log( "this.mailshot_sync_user has now been set to" );
		console.dir( this.mailshot_sync_user ); console.log( "" );

		this.switchToMainTemplate();
	},

    createNewMailchimpSyncUserObject: function( zendeskSyncUserObject )
    {
		console.log( "started createNewMailchimpSyncUserObject with the following zendesk user object:" );
		console.dir( zendeskSyncUserObject ); console.log( "" );

    	if(zendeskSyncUserObject == null )
    	{
    		return null;
    	}

    	//base object without extra merge fields
    	var useDefaultOrgValues = zendeskSyncUserObject.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;
		var mailchimpUserToReturn =
		{
			email_address: zendeskSyncUserObject.email,
			status: "subscribed",
			forename: zendeskSyncUserObject.name,
			surname: "SURNAME",
			//organization: this.cloneUserToSyncOrganisationObject( zendeskSyncUserObject.organization ),
			customer_type: useDefaultOrgValues ? this.resources.MAILSHOT_FIELD_CUSTOMER_TYPE_DEFAULT_VALUE : "TEST_ONLY",
			extra_merge_fields: []
		};

		//extra merge fields for organisation fields
		var arrayIndex = 0;
		for (var i=0; i < this.organization_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.organization_field_mappings[ i ], value: useDefaultOrgValues ? this.organization_field_mappings[ i ].default_value : "TEST_ONLY" };
			arrayIndex++;
		}
		for (i=0; i < this.mailshot_only_field_mappings.length; i++) 
		{
			mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { field_def: this.mailshot_only_field_mappings[ i ], value: this.mailshot_only_field_mappings[ i ].default_value };
			arrayIndex++;
		}

		console.log( "mailchimpUserToReturn at end point:" );
		console.dir( mailchimpUserToReturn ); console.log( "" );

		return mailchimpUserToReturn;
    },


    //UTIL FUNCTIONS
    cloneUserToSyncObject: function( origUser ) 
    {

		return (origUser == null ) ? null :
		{
			id: origUser.id,
			name: origUser.name,
			email: origUser.email,
			organization: this.cloneUserToSyncOrganisationObject( origUser.organization ),
			customer_type: origUser.customer_type,
		};
    },

    cloneUserToSyncOrganisationObject: function( origUserOrganisation ) 
    {

		return (origUserOrganisation == null ) ? null :
		{
			id: origUserOrganisation.id,
			name: origUserOrganisation.name,
		};
    },


    //MAIN SCREEN UTILITY FUNCTIONS
    hideFieldsIfInUserLocation: function() 
    {
      /* _.each([this.timeFieldLabel(), this.totalTimeFieldLabel()], function(f) {
        var field = this.ticketFields(f);

        if (field && field.isVisible()) {
          field.hide();
        }
      }, this); */
    },


	//EXCLUDE/ORGANISATION/STANDARD FIELD ONCLICK FUNCTIONS
	excludeButtonOnClick: function()
	{
		console.log( "started excludeButtonOnClick" );
		if( this.currentLocation() == this.resources.APP_LOCATION_USER )
		{
			console.dir(  this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE ) );
		    //thsi triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.cloneUserToSyncObject( this.zendesk_sync_user );
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},

	organizationButtonOnClick: function()
	{
		console.log( "started organizationButtonOnClick" );
		if( this.currentLocation() == this.resources.APP_LOCATION_USER )
		{
			console.dir(  this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION ) );
		    //this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.cloneUserToSyncObject( this.zendesk_sync_user );
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},

	standardButtonOnClick: function()
	{
		console.log( "started standardButtonOnClick" );
		if( this.currentLocation() == this.resources.APP_LOCATION_USER )
		{
			console.dir(  this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE, this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT ) );
		    //this triggers userScreenCustomerTypeFieldChanged to be changed so no need to make any further calls
		}
		else 
		{
			//update via apis
			var updatedUserToSave = this.cloneUserToSyncObject( this.zendesk_sync_user );
			updatedUserToSave.customer_type = this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT;
			console.log( "About to save user:");
			console.dir( updatedUserToSave );
			this.ajax( 'updateZendeskUser', updatedUserToSave );
		}
		console.log( "ended standardButtonOnClick" );
		this.switchToLoadingScreen( "Updating Zendesk User" );
	},


	//MAIN SCREEN EVENT FUNCTIONS
    userScreenCustomerTypeFieldChanged: function(evt)
    {
		console.log( "userScreenCustomerTypeFieldChanged called");
		console.log( "event:"); console.dir(evt);

		//fetch new value from field and old value from user
		var oldCustomerType = this.zendesk_sync_user.customer_type;
		var newCustomerTypeSelected = this.user().customField( this.resources.USER_FIELD_NAME_CUSTOMER_TYPE );
		this.changeCustomerType( oldCustomerType, newCustomerTypeSelected );
    },


    //SWITCH TO HTML TEMPLATE FUNCTIONS

	switchToLoadingScreen: function( optionalMessage ) 
	{
		console.log( "started switchToLoadingScreen" );
	    this.switchTo( this.resources.TEMPLATE_NAME_LOADING, { optional_message: optionalMessage } );
	},

	switchToMainTemplate: function() 
	{
		console.log( "started switchToMainTemplate with the following object:" );
		console.dir( this.zendesk_sync_user ); console.log( "" );

		var formData = 
		{
		  'zendesk_user': this.zendesk_sync_user,
		  'mailchimp_user': this.mailshot_sync_user,
		  'buttons': 
		  {
		  	'exclude': { 'show': true, 'classNameInsert': ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE ) ? " active" : "" },
		  	'organization': { 'show': ( this.zendesk_sync_user.organization != null ), 'classNameInsert': ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION ) ? " active" : "" },
		  	'standard': { 'show': true, 'classNameInsert': ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT ) ? " active" : "" }
		  },
		  'display_params':
		  {
		  	'customer_type_not_set'		: ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_NOT_SET ),
		  	'customer_type_exclude'		: ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_EXCLUDE ),
		  	'customer_type_included'	: ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION || this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT ),
		  	'customer_type_organization': ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_ORGANIZATION),
		  	'customer_type_stabdard'	: ( this.zendesk_sync_user.customer_type == this.resources.USER_FIELD_NAME_CUSTOMER_TYPE_VALUE_USE_DEFAULT )
		  }
		};

		console.log( "switching to form with object:" );
		console.dir( formData ); console.log( "" );

	    this.switchTo( this.resources.TEMPLATE_NAME_MAIN, formData );
	},

	switchToErrorMessage: function( errorResponse, overrideMessage, additionalButtonText, additionalButtonHandle ) 
	{
		console.log( "started switchToErrorMessage with the folloring object:" );
		console.dir( errorResponse ); console.log( "" );
		console.log( "additionalButtonHandle:" );
		console.dir( additionalButtonHandle ); console.log( "" );
		
		var formData = 
		{
		  'errorResponse'			: errorResponse,
		  'overrideMessage' 		: ( typeof( overrideMessage ) == "undefined" ) ? null:  overrideMessage,
		  'additionalButtonText' 	: ( typeof( additionalButtonText ) == "undefined" ) ? null : additionalButtonText,
		  'additionalButtonHandle' 	: ( typeof( additionalButtonHandle ) == "undefined" ) ? null : additionalButtonHandle
		};

		this.switchTo( 'show_error', formData );
	}

  };

}());









