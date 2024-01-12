(function(){
  // lazy video

  // selector of all videos on the page
  const videos = document.querySelectorAll('.lazy-video');

  // generate video url
  let generateUrl = function(id) {
    let query = '?rel=0&showinfo=0&autoplay=1';

    return 'https://www.youtube.com/embed/' + id + query;
  };

  // creating iframe
  let createIframe = function(id,title) {
    let iframe = document.createElement('iframe');

    iframe.setAttribute('allowFullScreen', '');
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('title', title);
    iframe.setAttribute('src', generateUrl(id));

    return iframe;
  };

  const replaceTag = function (el) {
    const elementNew = document.createElement('div');
    elementNew.innerHTML = el.innerHTML;

    Array.prototype.forEach.call( el.attributes, function( attr ) {
        elementNew.setAttribute( attr.name, attr.value );
        elementNew.removeAttribute('href');
        elementNew.removeAttribute('title');
    });

    el.parentNode.insertBefore( elementNew, el );
    el.parentNode.removeChild( el );
    return elementNew;
  };

  // main code
  videos.forEach((el) => {
    let videoCode = el.getAttribute('data-video');

    el.addEventListener('click', (e) => {
      e.preventDefault();

      let title = el.title;
      //console.log(title);
      let iframe = createIframe(videoCode,title);
      el.querySelector('picture').remove();
      el.appendChild(iframe);
      if (el.querySelector('.ytb-btn')) {
        el.querySelector('.ytb-btn').remove();
      }
      replaceTag(el);
    });
  });

}());
