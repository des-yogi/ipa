(function(){
  const hero = new Swiper('.hero__slider', {
    speed: 400,
    spaceBetween: 24,
    loop: true,
    // autoplay: {
    //   delay: 5000,
    // },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: ".swiper-pagination",
      type: "progressbar",
    },
    a11y: {
      prevSlideMessage: 'Попередній слайд',
      nextSlideMessage: 'Наступний слайд',
    },
    keyboard: {
      enabled: true,
      onlyInViewport: false,
    },
  });
}());
