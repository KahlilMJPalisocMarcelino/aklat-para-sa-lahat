// Main JavaScript for Aklat Website

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Aklat website...');
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Update cart count (using function from cart.js)
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Load bestsellers on homepage
    if (document.querySelector('.bestsellers-section')) {
        console.log('Loading bestsellers...');
        loadBestsellers();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup add to cart listeners
    setupAddToCartListeners();
});

// Enhanced Mobile Menu Functionality
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (!mobileMenuToggle || !navMenu) return;
    
    console.log('Initializing mobile menu...');
    
    // Create overlay for mobile menu
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
        console.log('Created mobile menu overlay');
    }
    
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Mobile menu toggle clicked');
        toggleMobileMenu();
    });
    
    // Close menu when clicking overlay
    overlay.addEventListener('click', function() {
        console.log('Overlay clicked, closing menu');
        closeMobileMenu();
    });
    
    // Close menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            console.log('Nav link clicked, closing menu');
            closeMobileMenu();
        });
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            console.log('Escape key pressed, closing menu');
            closeMobileMenu();
        }
    });
    
    // Toggle mobile menu function
    function toggleMobileMenu() {
        const isActive = navMenu.classList.contains('active');
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Change icon
        const icon = mobileMenuToggle.querySelector('i');
        if (!isActive) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            document.body.style.overflow = 'hidden';
            console.log('Mobile menu opened');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = '';
            console.log('Mobile menu closed');
        }
    }
    
    // Close mobile menu function
    function closeMobileMenu() {
        navMenu.classList.remove('active');
        overlay.classList.remove('active');
        
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        document.body.style.overflow = '';
        console.log('Mobile menu closed via function');
    }
}

// Note: updateCartCount is now provided by cart.js

// Load bestsellers with error handling
function loadBestsellers() {
    const bestsellersContainer = document.getElementById('bestsellers-container');
    if (!bestsellersContainer) {
        console.error('Bestsellers container not found!');
        return;
    }
    
    console.log('Loading bestsellers into container...');
    
    const bestsellersData = [
        { 
            id: 1, 
            title: "Trick Mirror", 
            price: "AED 35.55", 
            rating: 3,
            image: "Images/Books/Trick Mirror.png"
        },
        { 
            id: 2, 
            title: "America Is Not The Heart", 
            price: "AED 40.25", 
            rating: 4,
            image: "Images/Books/America Is Not Heart.png"
        },
        { 
            id: 3, 
            title: "Bibliolepsy", 
            price: "AED 30.00", 
            rating: 3,
            image: "Images/Books/Bibliolepsy.png"
        },
        { 
            id: 4, 
            title: "How To Read Now", 
            price: "AED 55.55", 
            rating: 4,
            image: "Images/Books/How To Read Now.png"
        },
        { 
            id: 5, 
            title: "The End Of All Skies", 
            price: "AED 45.50", 
            rating: 5,
            image: "Images/Books/The End of All Skies.png"
        },
        { 
            id: 6, 
            title: "Maramihan", 
            price: "AED 25.00", 
            rating: 4,
            image: "Images/Books/Maramihan.png"
        }
    ];
    
    bestsellersContainer.innerHTML = '';
    
    bestsellersData.forEach(book => {
        const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
        
        const bookCard = document.createElement('div');
        bookCard.className = 'product-card';
        bookCard.innerHTML = `
            <img src="${book.image}" alt="${book.title}" class="book-image" onerror="this.src='Images/placeholder.jpg'; this.alt='Book Image'">
            <h3>${book.title}</h3>
            <p class="price">${book.price}</p>
            <div class="stars">${stars}</div>
            <button class="btn add-to-cart" 
                    data-id="${book.id}" 
                    data-title="${book.title}" 
                    data-price="${book.price}" 
                    data-image="${book.image}">
                Add to Cart
            </button>
        `;
        
        bestsellersContainer.appendChild(bookCard);
    });
    
    console.log(`Loaded ${bestsellersData.length} bestsellers`);
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Become a Member button
    const discountBtn = document.querySelector('.discount-btn');
    if (discountBtn) {
        discountBtn.addEventListener('click', function() {
            showNotification('Thank you for your interest in becoming a member! We will send you membership details via email.');
        });
    }
    
    // Learn More button (Community section)
    const learnMoreBtn = document.getElementById('learn-more-btn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            showNotification('Thank you for your interest in becoming a community leader! We will contact you soon.');
        });
    }
    
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showNotification('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
    
    // View Collection button (from bestsellers section)
    const viewMoreBtn = document.querySelector('.view-more-btn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', function(e) {
            // This is just a link, no need for extra handling
            console.log('View collection clicked');
        });
    }
}

// Setup add to cart listeners
function setupAddToCartListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-to-cart')) {
            e.preventDefault();
            
            const id = parseInt(e.target.getAttribute('data-id'));
            const title = e.target.getAttribute('data-title');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');
            
            console.log(`Adding to cart: ${title} (ID: ${id})`);
            
            // Call addToCart from cart.js
            if (typeof addToCart === 'function') {
                addToCart(id, title, price, image);
            } else {
                // Fallback if cart.js not loaded
                console.error('addToCart function not available');
                showNotification(`"${title}" would be added to cart (cart.js not loaded)`);
            }
        }
    });
}

// Show notification function (shared across all scripts)
function showNotification(message, type = 'success') {
    console.log(`Notification: ${message}`);
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #027a00;
                color: white;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 2001;
                animation: slideIn 0.3s ease;
                max-width: 300px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification.error {
                background-color: #8b0000;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Make showNotification available globally
window.showNotification = showNotification;