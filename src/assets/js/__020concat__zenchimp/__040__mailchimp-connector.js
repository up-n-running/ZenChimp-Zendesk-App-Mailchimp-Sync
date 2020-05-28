function __3rdParty_get_or_createOrUpadate3rdPartyMember_OnFail( plugin, errorResponse ) 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.group( "__3rdParty_get_or_createOrUpadate3rdPartyMember_OnFail_parseErrorResponse(plugin, errorResponse) called" );
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
}


