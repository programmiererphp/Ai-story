/* Story pane utilities: keep scrolled to bottom after updates */
(function () {
  function scrollBottom(){
    const pane = document.getElementById('story-pane');
    if (!pane) return;
    pane.scrollTop = pane.scrollHeight;
  }

  Bus.on('STORY/UPDATED', scrollBottom);
  Bus.on('XML/IMPORTED', scrollBottom);

  window.addEventListener('DOMContentLoaded', scrollBottom);
})();
