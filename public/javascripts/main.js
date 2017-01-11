$(document).ready(function() {

  function reload() {
    $('.hidden').fadeOut();
    $('displayOutput').empty();
    $.get( '/words', function(data) {
      console.log("showing", data);

      var rendered = "<ul>";
      data.forEach(function(item) {
      console.log(JSON.stringify(item.word, null, 2));
        rendered += "<li title="+item._id+">The word <b>" + item.word + "</b> is defined as <b>" + item.definition + "</b></li>";
      });
      rendered = rendered + "</ul>";

      $('#displayOutput').html(rendered);
    });
    $('.hidden').fadeIn();
  }

  $('#add-word').submit(function(e) {
    e.preventDefault();

    $.ajax({
      url: '/words',
      type: 'PUT',
      data: $(this).serialize(),
      success: function(data) {
        reload();
      }
    });
  });

  // load data on start
  reload();

});
