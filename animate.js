// lighten navigation on scroll 
$(window).scroll(function(){
    if($(window).scrollTop()){
        $("nav").addClass("light");
    }
    else{
        $("nav").removeClass("light");
    }
});

// JavaScript for label effects only
$(window).load(function(){
    $(".border-animation input").val("");
    
    $(".input-effect input").focusout(function(){
      if($(this).val() != ""){
        $(this).addClass("has-content");
      }else{
        $(this).removeClass("has-content");
      }
    })
  });
