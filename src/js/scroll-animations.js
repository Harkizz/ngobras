// Initialize scroll animations
export function initializeScrollAnimations() {
    document.addEventListener('DOMContentLoaded', () => {
        // Get all elements with scroll reveal classes
        const scrollElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right');

        // Create the Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Add 'active' class when element is in view
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Once animation is done, stop observing the element
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1, // Trigger when at least 10% of the element is visible
            rootMargin: '0px 0px -50px 0px' // Slight offset to trigger before element is fully in view
        });

        // Start observing each element
        scrollElements.forEach(el => observer.observe(el));

        // Optional: Add initial animation for elements above the fold
        setTimeout(() => {
            const heroElements = document.querySelectorAll('.hero-section .scroll-reveal, .hero-section .scroll-reveal-left, .hero-section .scroll-reveal-right');
            heroElements.forEach(el => el.classList.add('active'));
        }, 100);
    });
}
