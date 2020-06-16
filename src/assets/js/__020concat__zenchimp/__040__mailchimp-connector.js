const connector = {
    
    __resources: 
    {
        //Anything beginning __ will be mangled by the minifier and wont be accessible outside of zenchimp.min.js
        __LOGIN_LINK_HTML: "<a target=\"_blank\" href=\"https://login.mailchimp.com/\">Login to Mailchimp?</a>"
    },    
    
    // <editor-fold defaultstate="collapsed" desc="AJAX API SETTINGS GENERATORS">
    __requests:
    {
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
        __getMailChimpListMember: function( plugin, emailAddress )
        {
            if( typeof( emailAddress ) === "undefined" || emailAddress === null )
            {
                return console.error( "ERROR CONDITION: __getMailChimpListMember called with null email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(emailAddress.toLowerCase());                

            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(plugin.__settings.__mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(plugin.__settings.__mailchimp_list_id)+
                     '/members/'+encodeURIComponent(md5HashOfEmail),
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + plugin.__settings.__mailchimp_api_key )
                }
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__getMailChimpListMember('%s'), jsonCall = %o", emailAddress, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        __createOrUpadateMailChimpListMember: function( plugin, mailchimpSyncUser, updateNotCreate )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.__email_address === null )
            {
                    return console.warn( "ERROR CONDITION: __createOrUpadateMailChimpListMember called with either null user or user with no email address" );
            }

            //require md5 library utils js to create md5 hash of email address
            let md5HashOfEmail =md5(mailchimpSyncUser.__email_address.toLowerCase());

            let mergeFields = {};
            mergeFields[ plugin.__settings.__mailchimp_merge_field_forename ] = mailchimpSyncUser.__forename;
            mergeFields[ plugin.__settings.__mailchimp_merge_field_surname ] = mailchimpSyncUser.__surname;
            mergeFields[ plugin.__settings.__mailchimp_list_field_customer_type_name ] = mailchimpSyncUser.__customer_type;
            let tempFieldDef = null;
            let tempValue = null;
            for (let i=0; i < mailchimpSyncUser.__extra_merge_fields.length; i++) 
            {
                //zendesk returns null for any field that's blank so while we may store them as null behind the scenes we need to convert this to empty string as mailchimp treats null as 'ignore this value'
                tempFieldDef = mailchimpSyncUser.__extra_merge_fields[ i ].__field_def;
                tempValue = mailchimpSyncUser.__extra_merge_fields[ i ].__value;
                tempValue = ( tempValue === null && tempFieldDef.type === plugin.__resources.__TYPE_TEXT ) ? "" : tempValue;
                mergeFields[ tempFieldDef.mailchimp_field ] = tempValue;
            }

            let dataJSON = 				
            {
                "id": md5HashOfEmail,
                "email_address": mailchimpSyncUser.__email_address,
                "email_type": "html",
                "status": mailchimpSyncUser.__status,
                "status_if_new": "subscribed",
                "merge_fields": mergeFields,
                "vip": ( mailchimpSyncUser.__customer_type === plugin.__resources.__CUSTOMER_TYPE_USE_ORGANIZATION )
            };

            //2 x mailchimp mandatory merge fields + 1 mandatory __customer_type field plus all extra ones from user object, org object and mc only fields


            let jsonCall =
            {
                url: 'https://'+encodeURIComponent(plugin.__settings.__mailchimp_datacentre_prefix)+
                     '.api.mailchimp.com/3.0/lists/'+encodeURIComponent(plugin.__settings.__mailchimp_list_id)+
                     '/members/'+encodeURIComponent(updateNotCreate ? md5HashOfEmail : ""),
                type: updateNotCreate ? 'PUT' : 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + plugin.__settings.__mailchimp_api_key )
                },
                data: JSON.stringify( dataJSON )
            };

            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__createOrUpadateMailChimpListMember( mailchimpSyncUser:'%o', updateNotCreate: '%o' ), dataJSON = %o, jsonCall = %o", mailchimpSyncUser, updateNotCreate, dataJSON, jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        },

        //NOT SURE THIS IS EVER CALLED OR NEEDED BUT IT'S FUNCTIONAL CODE
        __deleteMailChimpListMember: function( plugin, mailchimpSyncUser )
        {
            if( mailchimpSyncUser === null || mailchimpSyncUser.__email_address === null )
            {
                return console.error( "ERROR CONDITION: __deleteMailChimpListMember called with either null user or user with no email address" );
            }

            //requires md5.js utils js to create md5 hash of email address
            let md5HashOfEmail = md5(mailchimpSyncUser.__email_address.toLowerCase());

            let jsonCall =
            {
                url: "https://"+encodeURIComponent( plugin.__settings.__mailchimp_datacentre_prefix)+
                     ".api.mailchimp.com/3.0/lists/"+encodeURIComponent( plugin.__settings.__mailchimp_list_id)+
                     "/members/"+encodeURIComponent(md5HashOfEmail),
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                headers: 
                {
                    "Authorization": "Basic " + btoa( "api:" + plugin.__settings.__mailchimp_api_key )
                }
            };
            
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "__requests.__deleteMailChimpListMember( mailchimpSyncUser:%o ), jsonCall = %o", jsonCall ); }
            /* DebugOnlyCode - END */ 
            return jsonCall;
        }
    },
    // </editor-fold>    
    
    
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
            if( errorResponse.status === 400 && (
                    responseTextJSON.title === "Invalid Resource" ||
                    responseTextJSON.title === "Member In Compliance State"
              ) )
            {
                let friendlyErrorMessage = null;
                if(responseTextJSON.title === "Invalid Resource" )
                {
                   friendlyErrorMessage =  "<p><b>On no, Mailchimp rejected one of your values</b></p><p>This is often a broken link or URL, an incorrect data type, or no value for a required field in Mailchimp. Here's what Mailchimp is saying...</p>";
                }
                else if(responseTextJSON.title === "Member In Compliance State" )
                {
                   friendlyErrorMessage =  "<p><b>I'm sorry, Mailchimp wont include this user</b></p><p>This is normally because the user has manually unsubscribed from one of your emails. Here's what Mailchimp is saying...</p>";
                }
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
    
    __createNewMailshotSyncUserObject: function( plugin, zendeskSyncUserObject )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "CONNECTOR: __createNewMailshotSyncUserObject(zendeskSyncUserObject) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG2: zendeskSyncUserObject = %o", zendeskSyncUserObject );
        }
        /* DebugOnlyCode - END */
            
        let useDefaultOrgValues = zendeskSyncUserObject.__isDefault();		

        //Sanity checks
        if(zendeskSyncUserObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with null zendeskSyncUserObject");
                return null;
        }
        if(!useDefaultOrgValues && zendeskSyncUserObject.__orgObject === null )
        {
                console.warn("createNewMailchimpSyncUserObject called with customer type " + zendeskSyncUserObject.__customer_type + " and  null zendeskSyncUserObject.__orgObject");
                return null;
        }

        //base object without extra merge fields
        var mailchimpUserToReturn =
        {
            __email_address: zendeskSyncUserObject.email,
            __status: "subscribed",
            __forename: zendeskSyncUserObject.__getForeName(),
            __surname: zendeskSyncUserObject.__getSurname(),
            __customer_type: zendeskSyncUserObject.__getMailshotCustomerType(),
            __extra_merge_fields: []
        };
        
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Copied base user object (without 'additional fields') over to mailchimpUserToReturn. mailchimpUserToReturn = %o", mailchimpUserToReturn ); }
        /* DebugOnlyCode - END */

        //extra merge fields for organisation fields
        let arrayIndex = 0;
        for (let i=0; i < zendeskSyncUserObject.__extra_user_fields.length; i++) 
        {
                mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { __field_def: zendeskSyncUserObject.__extra_user_fields[ i ].__field_def, __value: ( zendeskSyncUserObject.__extra_user_fields[ i ].__value === null ) ? "" : zendeskSyncUserObject.__extra_user_fields[ i ].__value };
                arrayIndex++;
        }
        for (let i=0; i < plugin.__field_maps.__organisation.length; i++) 
        {
                mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { __field_def: plugin.__field_maps.__organisation[ i ], __value: useDefaultOrgValues ? plugin.__field_maps.__organisation[ i ].default_value : zendeskSyncUserObject.__orgObject.__extra_org_fields[ i ].__value };
                arrayIndex++;
        }
        for (let i=0; i < plugin.__field_maps.__mc_only.length; i++) 
        {
                mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { __field_def: plugin.__field_maps.__mc_only[ i ], __value: plugin.__field_maps.__mc_only[ i ].default_value };
                arrayIndex++;
        }

        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Now added user fields, organisation fields and mailchimp only fields over to mailchimpUserToReturn.__extra_merge_fields. mailchimpUserToReturn = %o", mailchimpUserToReturn );
            console.log( "Finished, returning mailchimpUserToReturn" );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        
        return mailchimpUserToReturn;
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
            __email_address: returnedMailchimpUserFromAPI.email_address,
            __status: returnedMailchimpUserFromAPI.status,
            __forename: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__settings.__mailchimp_merge_field_forename ),
            __surname: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__settings.__mailchimp_merge_field_surname ), 
            __customer_type: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__cust_type.mailchimp_field ),
            __extra_merge_fields: [],
            __isSubscribed: function() { return this.__status === 'subscribed' || this.__status === 'pending'; },
            __hasUnSubscribed: function() { return this.__status === 'unsubscribed'; },
            __isDeleted: function() { return this.__status !== 'cleaned'; }
        };

        let arrayIndex = 0;
        for (let i=0; i < plugin.__field_maps.__user.length; i++) 
        {
            mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { 
                __field_def: plugin.__field_maps.__user[ i ], 
                __value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__user[ i ].mailchimp_field )
            };
            arrayIndex++;
        }
        for(let i=0; i < plugin.__field_maps.__organisation.length; i++) 
        {
            mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { 
                __field_def: plugin.__field_maps.__organisation[ i ], 
                __value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__organisation[ i ].mailchimp_field )
            };
            arrayIndex++;
        }
        for (let i=0; i < plugin.__field_maps.__mc_only.length; i++) 
        {
            mailchimpUserToReturn.__extra_merge_fields[ arrayIndex ] = { 
                __field_def: plugin.__field_maps.__mc_only[ i ], 
                __value: this.__getMergeFieldValueFromAPIResultsObject( plugin, returnedMailchimpUserFromAPI, plugin.__field_maps.__mc_only[ i ].mailchimp_field )
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
    
    
    __enforceValidityOfZendeskAndMailshotStatuses: function( plugin, zendeskUser, mailchimpUser )
    {
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.group( "CONNECTOR: __enforceValidityOfZendeskAndMailshotStatuses ( plugin, zendeskUser, mailchimpUser ) called" );
            console.log( "ARG1: plugin = %o", plugin );
            console.log( "ARG1: zendeskUser = %o", zendeskUser );
            console.log( "ARG1: mailchimpUser = %o", mailchimpUser );
        }
        /* DebugOnlyCode - END */

        let passedValidityCheck = true;

        if( mailchimpUser.__status === "archived" && zendeskUser.__isIncluded() )
        {
            plugin.__switchToErrorMessage( 
                {}, 
                "Sorry but the mailchimp member is archived, which means they have been deactivated in Mailchimp. Would you like to try to Reactivate or would you like to mark this user as excluded?", 
                "Attempt Reactivation", 
                "btn-warning", 
                zendeskUser.__isOrganization() ? "organizationButtonOnClick()"  : "standardButtonOnClick()",
                "Exclude",
                "excludeButtonOnClick()"
            ); 
            passedValidityCheck = false;
            zendeskUser.__customer_type = plugin.__resources.__CUSTOMER_TYPE_EXCLUDE;
        }
        
        
        /* DebugOnlyCode - START */
        if( debug_mode ) 
        { 
            console.log( "Finished, returning %o;" , passedValidityCheck );
            console.groupEnd();
        }
        /* DebugOnlyCode - END */
        return passedValidityCheck;
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
        if( typeof( zendeskUser.__customer_type ) === "undefined" || zendeskUser.__customer_type === null || zendeskUser.__isNotset() /*customer type not set */ )
        {
            console.warn( "__getFieldSyncInfo.getFieldSyncInfo() called with invalid __customer_type, zendeskUser = %o", zendeskUser );
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
              mc_value: mailChimpUser.__email_address, 
              in_sync: ( zendeskUser.email.toLowerCase() === mailChimpUser.__email_address.toLowerCase() ) 
            },
            { label: "Name", 
              mc_only: false, 
              is_image: false, 
              zd_field_location: "user", 
              zd_field_key: null,
              zd_value: zendeskUser.name, 
              mc_field_key: plugin.__settings.__mailchimp_merge_field_forename + "|* and *|" + plugin.__settings.__mailchimp_merge_field_surname, 
              mc_value: "[" + mailChimpUser.__forename + "] [" + mailChimpUser.__surname + "]", 
              in_sync: ( mailChimpUser.__forename.toLowerCase() === zendeskUser.__getForeName().toLowerCase() && mailChimpUser.__surname.toLowerCase() === zendeskUser.__getSurname().toLowerCase() ) 
            },
            { label: "Customer Type", 
              mc_only:false, 
              is_image: false, 
              zd_field_location: zendeskUser.__isOrganization() ? "organisation": "user", 
              zd_field_key: zendeskUser.__isOrganization() ? plugin.__resources.__ORG_FIELD_HANDLE_CUSTOMER_TYPE : plugin.__resources.__USER_FIELD_HANDLE_CUSTOMER_TYPE,
              zd_value: zendeskUser.__getMailshotCustomerType(), 
              mc_field_key: plugin.__settings.__mailchimp_list_field_customer_type_name, 
              mc_value: mailChimpUser.__customer_type, 
              in_sync: ( zendeskUser.__getMailshotCustomerType() === mailChimpUser.__customer_type ) 
            } 
        ];

        let tempZdValue = null;
        let tempMcValue = null;
        let tempFieldMapping = null;
        let arrayIndex = 3;

        for( var i = 0; i < zendeskUser.__extra_user_fields.length; i++ )
        {
            tempZdValue = zendeskUser.__extra_user_fields[ i ].__value;
            tempMcValue = mailChimpUser.__extra_merge_fields[ arrayIndex-3 ].__value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue.toString(); 
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue.toString(); 
            sync_fields[ arrayIndex ] = 
            {
                label: zendeskUser.__extra_user_fields[ i ].__field_def.field_label,
                mc_only: false, 
                is_image: zendeskUser.__extra_user_fields[ i ].__field_def.type === zendeskUser.__app.__resources.__TYPE_IMAGE,
                zd_field_location: "user",
                zd_field_key: zendeskUser.__extra_user_fields[ i ].__field_def.zendesk_field,
                zd_value: tempZdValue,
                mc_field_key: zendeskUser.__extra_user_fields[ i ].__field_def.mailchimp_field,
                mc_value: tempMcValue,
                in_sync: tempZdValue === tempMcValue //add extra conversion here to cast tempMcValue to a string if necessary
            };
            arrayIndex++;
        }
        //console.log( "done user fields JSON:" );
        //console.dir( sync_fields ); //console.log( "" );  
        for( i = 0; i < zendeskUser.__app.__field_maps.__organisation.length; i++ )
        {
            tempZdValue = zendeskUser.__isDefault() ? zendeskUser.__app.__field_maps.__organisation[ i ].default_value : ( zendeskUser.__isOrganization() ? zendeskUser.__orgObject.__extra_org_fields[ i ].__value : null );
            tempMcValue = mailChimpUser.__extra_merge_fields[ arrayIndex-3 ].__value;
            tempZdValue = ( tempZdValue === null ) ? "" : tempZdValue.toString();
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue.toString();
            tempFieldMapping = zendeskUser.__app.__field_maps.__organisation[ i ];
            //add extra conversion here to cast tempMcValue to a string if necessary
            sync_fields[ arrayIndex ] = 
            {
                label: tempFieldMapping.field_label,
                mc_only: false, 
                is_image: tempFieldMapping.type === zendeskUser.__app.__resources.__TYPE_IMAGE,
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
            tempMcValue = mailChimpUser.__extra_merge_fields[ arrayIndex-3 ].__value;
            tempMcValue = ( tempMcValue === null ) ? "" : tempMcValue.toString();
            tempFieldMapping = zendeskUser.__app.__field_maps.__mc_only[ i ];
            //add extra conversion here to cast tempMcValue to a string if necessary
            sync_fields[ arrayIndex ] = 
            {
                label: tempFieldMapping.field_label,
                mc_only: true, 
                is_image: tempFieldMapping.type === zendeskUser.__app.__resources.__TYPE_IMAGE,
                is_checkbox: tempFieldMapping.type === zendeskUser.__app.__resources.__TYPE_CHECKBOX,
                is_checkbox_ticked: tempFieldMapping.type !== zendeskUser.__app.__resources.__TYPE_CHECKBOX ? null : 
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
        if( tempField.__field_def.type === plugin.__resources.__TYPE_CHECKBOX )
        {
            tempField.__value = ( tempField.__value !== null &&
                                tempField.__value.toString() === tempField.__field_def.value_if_ticked
                              ) ? tempField.__field_def.value_if_unticked : tempField.__field_def.value_if_ticked;
        }
        else
        {
            console.error( "Unsupported field type '%s' (only 'checkbox' supported) on mailchimp extra merge field: %o" + tempField.type, tempField );
        }
    }
};


