const connector = {
    __get_or_createOrUpadate3rdPartyMember_OnFail: function ( plugin, errorResponse ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "CONNECTOR: __get_or_createOrUpadate3rdPartyMember_OnFail_parseErrorResponse(plugin, errorResponse) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: errorResponse = %o", errorResponse );
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
                plugin.__switchToErrorMessage( errorResponse, plugin.__zendesk_user.email + " already exists in mailchimp.<br /><br/>Do you want to override his/her details?", "Override", "error_override_mailchimp", "__createOrUpadateMailChimpListMember_Override_OnClick()" );
                redirectedToBespokeErrorPage = true;
            }
            if( errorResponse.status === 400 && responseTextJSON.title === "Invalid Resource" )
            {
                let friendlyErrorMessage = "<p><b>On no, Mailchimp rejected one of your values</b></p><p>This is often a broken link or URL, an incorrect data type, or no value for a required field in Mailchimp. Here's what Mailchimp is saying...</p>";
                if( typeof( responseTextJSON.title ) !== 'undefined' )
                {
                    friendlyErrorMessage += "<p><b>"+responseTextJSON.title+"</b>"
                    if( typeof( responseTextJSON.detail ) !== 'undefined' )
                    {
                        friendlyErrorMessage += ": "+responseTextJSON.detail;
                    }
                    friendlyErrorMessage += "</p>";
                }

                let errors = responseTextJSON.errors;
                if( typeof( errors ) !== 'undefined' && errors.length > 0 )
                {
                    friendlyErrorMessage += "<p>The following fields had issues:<ul>";
                    console.log( errors.lenth );
                    let i = 0;
                    let error = errors[i];
                    while( typeof( error ) !== 'undefined' )
                    {
                        console.log( 'here' );
                        friendlyErrorMessage += "<li><b> Field: " + error.field + "</b> - " + error.message + "</li>";
                        i++;
                        error = errors[i];
                    }
                    friendlyErrorMessage += "</ul></p>";
                }

                plugin.__switchToErrorMessage( 
                    errorResponse, 
                   friendlyErrorMessage, 
                );
                redirectedToBespokeErrorPage = true;
            }
            if( errorResponse.status === 404 /* && responseTextJSON.title === "Resource Not Found" */ ) //the old code commetned out stopped working when zendesk helpfully started overriding the 404 page with its own data thereby losing the returned error information!!!
            { //need to alter this if this is ever called on delete as 404 should be handled differently on delete
                plugin.__switchToErrorMessage( 
                    errorResponse, 
                    plugin.__zendesk_user.email + " doesn't exist in mailchimp.<br /><br/>Do you want to create a new record for him/her?", 
                    "Create New", 
                    "error_create_new_mailchimp", 
                    "__createOrUpadateMailChimpListMember_Add_New_OnClick()" 
                );
                redirectedToBespokeErrorPage = true;
            }


    /*
    HERES AN EXAMPLE 405 ERROR FROM CONSOLE.LOG WHEN I TRIED TO DELETE A MAILCHIMP MEMBER THAT SHOULDNT BE DELETED:

    AJAX FAIL: calling failure function 'null(response)', response = 
    {readyState: 4, responseJSON: {…}, responseText: "{"type":"http://developer.mailchimp.com/documentat…instance":"9bbc42cf-84b1-4f03-ba89-ae01e89304ad"}", status: 405, statusText: "error"}
    readyState: 4
    responseJSON:
    detail: "This list member cannot be removed.  Please contact support."
    instance: "9bbc42cf-84b1-4f03-ba89-ae01e89304ad"
    status: 405
    title: "Method Not Allowed"
    type: "http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary/"
    __proto__: Object
    responseText: "{"type":"http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary/","title":"Method Not Allowed","status":405,"detail":"This list member cannot be removed.  Please contact support.","instance":"9bbc42cf-84b1-4f03-ba89-ae01e89304ad"}"
    status: 405
    statusText: "error"
    __proto__: Object                         
    */


        }
        catch(e)
        {
            console.warn( "Could not JSON Parse errorResponse.responseText from get_or___createOrUpadateMailChimpListMember. errorResponse = %o\n\nparse exception: %o", errorResponse, e );
        }

        if( !redirectedToBespokeErrorPage )
        {
                plugin.__switchToErrorMessage( errorResponse );
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, __3rdParty_get_or_createOrUpadate3rdPartyMember_OnFail. Using bespoke error screen? = %o", redirectedToBespokeErrorPage );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
    },
    
    __getMailchimpSubscriberFromAPIResults: function( plugin, returnedMailchimpUserFromAPI ) 
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "CONNECTOR: __getMailchimpSubscriberFromAPIResults(plugin, returnedMailchimpUserFromAPI) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: returnedMailchimpUserFromAPI = %o", returnedMailchimpUserFromAPI );
        }
        /* DebugOnlyCode - END */

        let mailchimpUserToReturn =
        {
            email_address: returnedMailchimpUserFromAPI.email_address,
            status: returnedMailchimpUserFromAPI.status,
            forename: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__settings.__mailchimp_merge_field_forename ),
            surname: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__settings.__mailchimp_merge_field_surname ), 
            customer_type: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__cust_type.mailchimp_field ),
            extra_merge_fields: [],
            isSubscribed: function() { return this.status === 'subscribed' || this.status === 'pending'; },
            isUnSubscribed: function() { return this.status === 'unsubscribed' },
            isDeleted: function() { return this.status !== 'cleaned'; }
        };

        let arrayIndex = 0;
        for (let i=0; i < plugin.__field_maps.__user.length; i++) 
        {
            mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { 
                field_def: plugin.__field_maps.__user[ i ], 
                value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__user[ i ].mailchimp_field )
            };
            arrayIndex++;
        }
        for(let i=0; i < plugin.__field_maps.__organisation.length; i++) 
        {
            mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { 
                field_def: plugin.__field_maps.__organisation[ i ], 
                value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__organisation[ i ].mailchimp_field )
            };
            arrayIndex++;
        }
        for (let i=0; i < plugin.__field_maps.__mc_only.length; i++) 
        {
            mailchimpUserToReturn.extra_merge_fields[ arrayIndex ] = { 
                field_def: plugin.__field_maps.__mc_only[ i ], 
                value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__mc_only[ i ].mailchimp_field )
            };
            arrayIndex++;
        }		

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning mailchimpUserToReturn = %o",  mailchimpUserToReturn );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return mailchimpUserToReturn;
    },
    
    __getMergeFieldValueFromAPIResultsObject: function( plugin, returnedMailchimpUserFromAPI, mergeFieldName )
    {
        let theValue  = returnedMailchimpUserFromAPI.merge_fields[ mergeFieldName ];
        if( typeof( theValue) === 'undefined' )
        {
            throw new ReferenceError( "The Mailchimp Merge tag '*|" + mergeFieldName + "|*' which you specified in your Field Mapping settings doesnt seem to exist in Mailchimp yet.<br /><br />Please create the field in Mailchimp or for help with your field mappings use our <a target=\"_blank\" href=\"" + plugin.__resources.__SETTINGS_HELPER_SPREADSHEET_DOWNLOAD_URL +  "\"Zenchimp App Settings Generator</a> spreadsheet." );
        }
        return theValue;
    },
     
    __getFieldSyncInfo: function( plugin, zendeskUser, mailChimpUser )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "CONNECTOR: __getFieldSyncInfo(plugin, zendeskUser, mailChimpUser) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: zendeskUser = %o", zendeskUser );
            console.log( "ARG3: mailChimpUser = %o", mailChimpUser );
        }
        /* DebugOnlyCode - END */
        
        if( typeof( mailChimpUser ) === "undefined" || mailChimpUser === null )
        {
            return null;
        }
        if( typeof( zendeskUser.customer_type ) === "undefined" || zendeskUser.customer_type === null || zendeskUser.isNotset() /*customer type not set */ )
        {
            console.warn( "__getFieldSyncInfo.getFieldSyncInfo() called with invalid customer_type, zendeskUser = %o", zendeskUser );
            return null;
        }

        //generate the mandatory fields that are non-negotiable
        var sync_fields = [
            { label: "Email", 
              mc_only: false, 
              is_image: false, 
              zd_field_location: "user", 
              zd_field_key: null,
              zd_value: zendeskUser.email, 
              mc_field_key: "EMAIL", 
              mc_value: mailChimpUser.email_address, 
              in_sync: ( zendeskUser.email.toLowerCase() === mailChimpUser.email_address.toLowerCase() ) 
            },
            { label: "Name", 
              mc_only: false, 
              is_image: false, 
              zd_field_location: "user", 
              zd_field_key: null,
              zd_value: zendeskUser.name, 
              mc_field_key: plugin.__settings.__mailchimp_merge_field_forename + "|* and *|" + plugin.__settings.__mailchimp_merge_field_surname, 
              mc_value: "[" + mailChimpUser.forename + "] [" + mailChimpUser.surname + "]", 
              in_sync: ( mailChimpUser.forename.toLowerCase() === zendeskUser.getForeName().toLowerCase() && mailChimpUser.surname.toLowerCase() === zendeskUser.getSurname().toLowerCase() ) 
            },
            { label: "Customer Type", 
              mc_only:false, 
              is_image: false, 
              zd_field_location: zendeskUser.isOrganization() ? "organisation": "user", 
              zd_field_key: zendeskUser.isOrganization() ? plugin.__resources.__ORG_FIELD_HANDLE_CUSTOMER_TYPE : plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE,
              zd_value: zendeskUser.getMailchimpCustomerType(), 
              mc_field_key: plugin.__settings.__mailchimp_list_field_customer_type_name, 
              mc_value: mailChimpUser.customer_type, 
              in_sync: ( zendeskUser.getMailchimpCustomerType() === mailChimpUser.customer_type ) 
            } 
        ];

        let tempZdValue = null;
        let tempMcValue = null;
        let tempFieldMapping = null;
        let arrayIndex = 3;

        for( var i = 0; i < zendeskUser.__extra_user_fields.length; i++ )
        {
            tempZdValue = zendeskUser.__extra_user_fields[ i ].value;
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex-3 ].value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; 
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            sync_fields[ arrayIndex ] = 
            {
                label: zendeskUser.__extra_user_fields[ i ].field_def.field_label,
                mc_only: false, 
                is_image: zendeskUser.__extra_user_fields[ i ].field_def.type === zendeskUser.__app.resources.TYPE_IMAGE,
                zd_field_location: "user",
                zd_field_key: zendeskUser.__extra_user_fields[ i ].field_def.zendesk_field,
                zd_value: tempZdValue,
                mc_field_key: zendeskUser.__extra_user_fields[ i ].field_def.mailchimp_field,
                mc_value: tempMcValue,
                in_sync: tempZdValue === tempMcValue //add extra conversion here to cast tempMcValue to a string if necessary
            };
            arrayIndex++;
        }
        //console.log( "done user fields JSON:" );
        //console.dir( sync_fields ); //console.log( "" );  
        for( i = 0; i < zendeskUser.__app.__field_maps.__organisation.length; i++ )
        {
            tempZdValue = zendeskUser.isDefault() ? zendeskUser.__app.__field_maps.__organisation[ i ].default_value : ( zendeskUser.isOrganization() ? zendeskUser.__orgObject.__extra_org_fields[ i ].__value : null );
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex-3 ].value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue; 
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            tempFieldMapping = zendeskUser.__app.__field_maps.__organisation[ i ];
            //add extra conversion here to cast tempMcValue to a string if necessary
            sync_fields[ arrayIndex ] = 
            {
                label: tempFieldMapping.field_label,
                mc_only: false, 
                is_image: tempFieldMapping.type === zendeskUser.__app.resources.TYPE_IMAGE,
                zd_field_location: "organisation",
                zd_field_key: tempFieldMapping.zendesk_field,
                zd_value: tempZdValue,
                mc_field_key: tempFieldMapping.mailchimp_field,
                mc_value: tempMcValue,
                in_sync: tempZdValue === tempMcValue //add extra conversion here to cast tempMcValue to a string if necessary
            };
            arrayIndex++;
        }
        //console.log( "done org fields JSON:" );
        //console.dir( sync_fields ); //console.log( "" );
        
        for( i = 0; i < zendeskUser.__app.__field_maps.__mc_only.length; i++ )
        {
            tempMcValue = mailChimpUser.extra_merge_fields[ arrayIndex-3 ].value;
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue;
            tempFieldMapping = zendeskUser.__app.__field_maps.__mc_only[ i ];
            //add extra conversion here to cast tempMcValue to a string if necessary
            sync_fields[ arrayIndex ] = 
            {
                label: tempFieldMapping.field_label,
                mc_only: true, 
                is_image: tempFieldMapping.type === zendeskUser.__app.resources.TYPE_IMAGE,
                is_checkbox: tempFieldMapping.type === zendeskUser.__app.resources.TYPE_CHECKBOX,
                is_checkbox_ticked: tempFieldMapping.type !== zendeskUser.__app.resources.TYPE_CHECKBOX ? null : 
                    (tempMcValue.toString() === tempFieldMapping.value_if_ticked) ? true : false,
                checkbox_html_id: "MC_ONLY_"+tempFieldMapping.mailchimp_field,
                zd_field_location: null,
                zd_field_key: null,
                zd_value: null,
                mc_field_key: tempFieldMapping.mailchimp_field,
                mc_value: tempMcValue,
                in_sync: true
            };
            arrayIndex++;
        }   

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, sync_fields = %o",  sync_fields );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */

        return sync_fields;
    },

    __isInSync: function( plugin, syncFields, mailChimpUser )
    {
        if( typeof( syncFields ) === "undefined" || syncFields === null )
        {
           syncFields = this.__getFieldSyncInfo( plugin, mailChimpUser );
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
    },
    
    __toggle3rdPartyOnlyCheckboxField: function( plugin, tempField )
    {
        if( tempField.field_def.type === plugin.__resources.__TYPE_CHECKBOX )
        {
            tempField.value = ( tempField.value !== null &&
                                tempField.value.toString() === tempField.field_def.value_if_ticked
                              ) ? tempField.field_def.value_if_unticked : tempField.field_def.value_if_ticked;
        }
        else
        {
            console.error( "Unsupported field type '%s' (only 'checkbox' supported) on mailchimp extra merge field: %o" + tempField.type, tempField );
        }
    }
};


