// HireSky Landing Page Interactions

document.addEventListener("DOMContentLoaded", () => {
  // 1. Mouse-move tracking for premium glass reflection effects
  const cards = document.querySelectorAll(".glass");

  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x coordinate inside the card
      const y = e.clientY - rect.top;  // y coordinate inside the card

      // Update CSS variables on the card element
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });

  // 2. Smooth scrolling navigation links
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100, // Offset for fixed navbar
          behavior: "smooth"
        });
      }
    });
  });

  // 3. Simulated checkout/CTA interaction
  const purchaseButtons = document.querySelectorAll(".pricing-section button");
  purchaseButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tierName = e.target.parentElement.querySelector(".tier-name").innerText;
      alert(`Thank you for choosing HireSky! Starting checkout flow for: ${tierName}...`);
    });
  });
});
