var debug_mode = false;
/* DebugOnlyCode - START */
debug_mode = true;
/* DebugOnlyCode - END */ 

var thisV2Client = ZAFClient.init();

function switchTo(templateUrl, viewData){
    /* DebugOnlyCode - START */
    if( debug_mode ) 
    { 
        console.groupCollapsed( "COMMON-UTILS.JS: switchTo('%s', viewData) called", templateUrl );
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
            height: '600px'
        },
        url: 'assets/modal-popup.html#parent_guid=' + encodeURIComponent( context.instanceGuid ) +
             '&parent_location=' + encodeURIComponent( context.location )
    };
    thisV2Client.invoke('instances.create', options);
    
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
        kv = paramArray[i].split('=');
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

