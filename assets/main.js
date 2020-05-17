$(function() {
    var zafClient = ZAFClient.init();
    zafClient.invoke('resize', { width: '100%', height: '200px' });
  
    var myApp = appFactory( zafClient );
   
    zafClient.on('app.registered', function( zafClient ) {
      var viewData = { optional_message: 'Loading App...' };
      var templateUrl = "./templates/loading_screen.hdbs";
      switchTo(templateUrl, viewData);
      myApp.init();
    });  
  
});




function switchTo(templateUrl, viewData){
  var target = $("#content");
  $(target).empty().html('<div class="alert alert-info">Loading...</div><div class="text-center"><div class="spinner-grow text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
  $.ajax(templateUrl).done(function(data){
    var template = Handlebars.compile(data);
    var html_data = template(viewData);
    console.log(html_data);
    console.log('Target element for html is: %o', target);
    $(target).empty().html(html_data);
  });
};

