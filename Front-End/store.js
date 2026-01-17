// store.js - Store/Collection Page Specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Load collection books
    if (document.querySelector('.books-grid')) {
        loadCollectionBooks();
        initFilterButtons();
        setupAddToCartListeners();
    }
    
    // Ensure mobile menu works on store page
    initMobileMenu();
    
    // Update cart count
    updateCartCount();
    
    // Add staff badge styles
    addStaffBadgeStyles();
});

// Load collection books with proper error handling
function loadCollectionBooks() {
    const booksGrid = document.getElementById('books-grid');
    if (!booksGrid) return;
    
    console.log('Loading collection books...');
    
    const collectionData = [
        { 
            id: 1, 
            title: "Trick Mirror", 
            currentPrice: "AED 35.55", 
            originalPrice: "AED 45.00",
            category: "fiction",
            image: "Images/Books/Trick Mirror.png"
        },
        { 
            id: 2, 
            title: "America Is Not The Heart", 
            currentPrice: "AED 40.25", 
            originalPrice: "AED 50.00",
            category: "fiction",
            image: "Images/Books/America Is Not Heart.png"
        },
        { 
            id: 3, 
            title: "Bibliolepsy", 
            currentPrice: "AED 30.00", 
            originalPrice: "AED 40.00",
            category: "fiction",
            image: "Images/Books/Bibliolepsy.png"
        },
        { 
            id: 4, 
            title: "How To Read Now", 
            currentPrice: "AED 55.55", 
            originalPrice: "AED 65.00",
            category: "non-fiction",
            image: "Images/Books/How To Read Now.png"
        },
        { 
            id: 5, 
            title: "The End Of All Skies", 
            currentPrice: "AED 45.50", 
            originalPrice: "AED 55.00",
            category: "fiction",
            image: "Images/Books/The End of All Skies.png"
        },
        { 
            id: 6, 
            title: "Maramihan", 
            currentPrice: "AED 25.00", 
            originalPrice: "AED 35.00",
            category: "other",
            image: "Images/Books/Maramihan.png"
        },
        { 
            id: 7, 
            title: "Noli Me Tangere", 
            currentPrice: "AED 28.00", 
            originalPrice: "AED 35.00",
            category: "fiction",
            staffPick: true,
            image: "Images/Books/Noli Me Tangere.png"
        },
        { 
            id: 8, 
            title: "El Filibusterismo", 
            currentPrice: "AED 28.00", 
            originalPrice: "AED 35.00",
            category: "fiction",
            staffPick: true,
            image: "Images/Books/El Filibusterismo.png"
        }
    ];
    
    booksGrid.innerHTML = '';
    
    collectionData.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'product-card';
        bookCard.setAttribute('data-category', book.category);
        
        // Set staff pick attribute if book is a staff pick
        if (book.staffPick) {
            bookCard.setAttribute('data-staff', 'true');
            bookCard.classList.add('staff-pick');
        } else {
            bookCard.setAttribute('data-staff', 'false');
        }
        
        // Create staff badge HTML if book is a staff pick
        const staffBadge = book.staffPick ? 
            '<div class="staff-badge"><i class="fas fa-star"></i> Staff Pick</div>' : 
            '';
        
        bookCard.innerHTML = `
            <div class="book-image-container">
                <img src="${book.image}" alt="${book.title}" class="book-image">
                ${staffBadge}
            </div>
            <h3>${book.title}</h3>
            <div class="price-container">
                <span class="price">${book.currentPrice}</span>
                <span class="original-price">${book.originalPrice}</span>
            </div>
            <button class="btn add-to-cart" 
                    data-id="${book.id}" 
                    data-title="${book.title}" 
                    data-price="${book.currentPrice}" 
                    data-image="${book.image}">
                Add to Cart
            </button>
        `;
        
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Loaded ${collectionData.length} books`);
}

// Initialize filter buttons
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter books
            const filter = this.getAttribute('data-filter');
            filterCollectionBooks(filter);
        });
    });
}

// Filter collection books
function filterCollectionBooks(filter) {
    const bookCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;
    
    console.log(`Filtering by: ${filter}`);
    
    bookCards.forEach(card => {
        const category = card.getAttribute('data-category');
        const isStaffPick = card.getAttribute('data-staff') === 'true';
        
        let shouldShow = false;
        
        if (filter === 'all') {
            shouldShow = true;
        } else if (filter === 'staff') {
            // Show only staff picks
            shouldShow = isStaffPick;
        } else {
            // Show by category
            shouldShow = category === filter;
        }
        
        if (shouldShow) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log(`Showing ${visibleCount} books for filter: ${filter}`);
    
    // Show message if no books found
    const booksGrid = document.getElementById('books-grid');
    const noBooksMessage = booksGrid.querySelector('.no-books-message');
    
    if (visibleCount === 0) {
        if (!noBooksMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'no-books-message';
            messageDiv.innerHTML = `
                <i class="fas fa-book-open"></i>
                <h3>No books found in this category</h3>
                <p>Try selecting a different filter or check back soon for new arrivals!</p>
            `;
            booksGrid.appendChild(messageDiv);
        }
    } else if (noBooksMessage) {
        noBooksMessage.remove();
    }
}

// Setup add to cart listeners
function setupAddToCartListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-to-cart')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            const title = e.target.getAttribute('data-title');
            const price = e.target.getAttribute('data-price');
            const image = e.target.getAttribute('data-image');
            
            // Use cart function from cart.js
            if (typeof addToCart === 'function') {
                addToCart(id, title, price, image);
            } else {
                console.error('addToCart function not found!');
            }
        }
    });
}

// Mobile menu initialization (from script.js)
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (!mobileMenuToggle || !navMenu) return;
    
    // Create overlay for mobile menu
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
    }
    
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileMenu();
    });
    
    // Close menu when clicking overlay
    overlay.addEventListener('click', function() {
        closeMobileMenu();
    });
    
    // Close menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
    
    // Toggle mobile menu function
    function toggleMobileMenu() {
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Change icon
        const icon = mobileMenuToggle.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            document.body.style.overflow = 'hidden';
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = '';
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
    }
}

// Update cart count
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('#cart-count');
    const cart = JSON.parse(localStorage.getItem('aklat_cart')) || [];
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}

// Add staff badge styles
function addStaffBadgeStyles() {
    if (!document.querySelector('#staff-badge-styles')) {
        const style = document.createElement('style');
        style.id = 'staff-badge-styles';
        style.textContent = `
            .book-image-container {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .staff-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: #ffd700;
                color: #333;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 10;
            }
            .staff-badge i {
                color: #ff6b00;
            }
        `;
        document.head.appendChild(style);
    }
}