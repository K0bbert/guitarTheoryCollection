// Navigation and burger menu functionality

// Show only Home on page load (after markdown is loaded)
window.addEventListener('load', () => {
  // Hide all content sections except Home
  document.querySelectorAll('.md-content').forEach(section => {
    const mdFile = section.getAttribute('data-md');
    if (mdFile === 'header.md') {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });

  // Set Home link as active
  const homeLink = document.querySelector('.burger-nav a[data-page="header.md"]');
  if (homeLink) {
    homeLink.classList.add('active');
  }
});

// Burger menu functionality
const burgerIcon = document.getElementById('burger-icon');
const burgerNav = document.getElementById('burger-nav');
const burgerOverlay = document.getElementById('burger-overlay');
const navLinks = document.querySelectorAll('.burger-nav a');

// Toggle menu
burgerIcon.addEventListener('click', () => {
  burgerIcon.classList.toggle('open');
  burgerNav.classList.toggle('open');
  burgerOverlay.classList.toggle('open');
});

// Close menu when clicking overlay
burgerOverlay.addEventListener('click', () => {
  burgerIcon.classList.remove('open');
  burgerNav.classList.remove('open');
  burgerOverlay.classList.remove('open');
});

// Handle page navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.getAttribute('data-page');

    // Close menu
    burgerIcon.classList.remove('open');
    burgerNav.classList.remove('open');
    burgerOverlay.classList.remove('open');

    // Remove active class from all links
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Hide all content sections
    document.querySelectorAll('.md-content').forEach(section => {
      section.style.display = 'none';
    });

    // Show the selected section
    const targetSection = document.querySelector(`[data-md="${page}"]`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
  });
});
