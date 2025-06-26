// Navigation
function showPage(page) {
    // First check if nav items exist before trying to modify them
    const navItems = document.querySelectorAll('.nav-item');
    const bottomNav = document.querySelector('.bottom-nav');
    const topBar = document.querySelector('.top-bar');

    if (page === 'chat') {
        // Hide bottom nav and top bar in chat page
        if (bottomNav) bottomNav.style.display = 'none';
        if (topBar) topBar.style.display = 'none';
        
        // Adjust main content margin when top bar is hidden
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginTop = '0';
        }
    } else {
        // Show bottom nav and top bar in other pages
        if (bottomNav) bottomNav.style.display = 'flex';
        if (topBar) topBar.style.display = 'flex';
        
        // Reset main content margin
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginTop = '60px';
        }
    }

    if (navItems) {
        // Remove active class from all nav items
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked nav item if it exists
        const clickedItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
    }
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    if (pages) {
        pages.forEach(p => {
            p.classList.remove('active');
        });
    }
    
    // Show selected page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    if (page === 'profile') {
        initializeSupabase(); // Load profile data when profile page is shown
    }
}