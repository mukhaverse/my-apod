// scroll-based staggered animation
document.addEventListener("DOMContentLoaded", () => {


  const sections = document.querySelectorAll(".hero, .apod, .birthday, .footer");


  const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const items = entry.target.querySelectorAll(".animate-item");

        items.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add("show");
          }, index * 120); 
        });


        observer.unobserve(entry.target); 


      }

    });

  }, {
    threshold: 0.2
  });

  sections.forEach(section => {
    observer.observe(section);
    
  });

});