var debug_mode = true;
/* DebugOnlyCode - START */
debug_mode = true;
/* DebugOnlyCode - END */ 

var thisV2Client = ZAFClient.init();

function switchToHdbsFileTemplate(templateUrl, viewData){
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: switchToHdbsFileTemplate('%s', viewData) called", templateUrl );
        console.log( "ARG1: templateUrl = '%s'", templateUrl );
        console.log( "ARG1: viewData = '%o'", viewData );
    }
    /* DebugOnlyCode - END */ 
    
    let target = $("#page_content");
    $(target).empty().html('<div class="alert alert-info">Loading...</div><div class="text-center"><div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
    $.ajax(templateUrl).done(function(data){
        /* DebugOnlyCode - START */  
        if( debug_mode ) { console.groupCollapsed( "MAIN.JS: HANDLEBARS AJAX COMPLETE: %s", templateUrl ); }
        /* DebugOnlyCode - END */ 

        let template = Handlebars.compile(data);
        let html_data = template(viewData);

        /* DebugOnlyCode - START */
        if( debug_mode ) { console.log( "Sending HTML to target element %o:\n\n%o", target, html_data ); } 
        /* DebugOnlyCode - END */ 
        $(target).empty().html(html_data);
      
        /* DebugOnlyCode - START */
        if( debug_mode ) { console.groupEnd(); }
        /* DebugOnlyCode - END */ 
    });
    
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished, ive called ajax for template generation, ajax will complete later." );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
};

function switchToInlineTemplate(templateId, viewData){
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: switchToInlineTemplate('%s', viewData) called", templateId );
        console.log( "ARG1: templateUrl = '%s'", templateId );
        console.log( "ARG1: viewData = '%o'", viewData );
    }
    /* DebugOnlyCode - END */ 
    
    let source = $('#'+templateId).html();
    let template = Handlebars.compile(source);
    let html = template(viewData);
    let target = $("#page_content");
    /* DebugOnlyCode - START */
    if( debug_mode ) { console.log( "Sending HTML to target element %o:\n\n%o", target, html ); } 
    /* DebugOnlyCode - END */ 
    $(target).empty().html(html);
    
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished Template '%s' now showing", templateId );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */ 
};

function modal_createChildFromParent(context)
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: modal_createChildFromParent(context) called" );
        console.log( "ARG1: context = %o", context );
    }
    /* DebugOnlyCode - END */ 
    
    let options = {
        location: 'modal',
        size: {
            width: '700px',
            height: '450px'
        },
        url: 'assets/modal-iframe.html#parent_guid=' + encodeURIComponent( context.instanceGuid ) +
             '&parent_location=' + encodeURIComponent( context.location )
    };
    thisV2Client.invoke('instances.create', options).then( 
        (success)=>{ console.log("SUCCESS CREATING MODAL, success = %o", success ); },
        (error)=>{ console.error("FAILURE CREATING MODAL, success = %o", error ); }
    );
    
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished invoking child client with options %o", options );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */     
}

function getClientInstanceFromGuid(parent_guid) {  //Definitely redundant but w/e
    return thisV2Client.instance(parent_guid);
}

function parseURLParams(param_string){
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: parseURLParams(param_string) called" );
        console.log( "ARG1: param_string = %o", param_string );
    }
    /* DebugOnlyCode - END */     
    
    let paramArray = (param_string).replace('#','').split('&');
    if( debug_mode ) { console.log( "Split into individual strings: param_sub = %o", paramArray ); }
    
    let param_obj = {};
    for (let i = 0; i < paramArray.length; ++i) {
        let kv = paramArray[i].split('=');
        param_obj[kv[0]] = kv[1];
    }
    
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished parsing params, returning param_obj = %o", param_obj );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */       
    return param_obj;
};

function makeAjaxCall( promiseFunctionContext, ajaxSettings, successFunction, failFunction, useZendeskCORSProxy) 
{
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: makeAjaxCall(ajaxSettings, %s, %s) called", (successFunction)?successFunction.name:successFunction, (failFunction)?failFunction.name:failFunction );
        console.log( "ARG1: ajaxSettings = %o", ajaxSettings );
        console.log( "ARG2: successFunction = %o", successFunction );
        console.log( "ARG3: failFunction = %o", failFunction );
        console.log( "ARG4: useZendeskCORSProxy = %o", useZendeskCORSProxy );
    }
    /* DebugOnlyCode - END */

    if( typeof useZendeskCORSProxy !== 'undefined' && useZendeskCORSProxy )
    {
        ajaxSettings.cors = false;
    }

    thisV2Client.request(ajaxSettings).then(
        (data) => {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "AJAX SUCCESS: calling success function '%s(data)', data = %o", (successFunction)?successFunction.name:successFunction, data ); }
            /* DebugOnlyCode - END */
            
            if( typeof successFunction === 'undefined' || successFunction === null )
            {
                console.warn( "AJAX SUCCESS: and no successFunction was defined so no futher action can be taken to handle the response. returned data = %o", data );
            }
            else
            {
                successFunction.call( promiseFunctionContext, data);
            }
        },
        (response) => {
            /* DebugOnlyCode - START */
            if( debug_mode ) { console.log( "AJAX FAIL: calling failure function '%s(response)', response = %o", (failFunction)?failFunction.name:failFunction, response ); }
            /* DebugOnlyCode - END */
            
            if( typeof failFunction === 'undefined' || failFunction === null )
            {
                console.warn( "AJAX FAIL: and no failFunction was defined so no futher action can be taken to handle the error. error response = %o", response );
            }
            else
            {
                failFunction.call( promiseFunctionContext, response);
            }
        }
    );

    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.log( "Finished" );
        console.groupEnd();
    }
    /* DebugOnlyCode - END */
}