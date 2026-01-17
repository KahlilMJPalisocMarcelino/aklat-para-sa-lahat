// cart.js - Shopping Cart Functionality

// Get or initialize cart from localStorage
function getCart() {
    return JSON.parse(localStorage.getItem('aklat_cart')) || [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('aklat_cart', JSON.stringify(cart));
}

// Maximum quantity per item
const MAX_QUANTITY_PER_ITEM = 50;

// Add item to cart
function addToCart(id, title, price, image) {
    const cart = getCart();
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => item.id === id);
    
    if (existingItemIndex !== -1) {
        // If item already exists, increase quantity by 1
        const existingItem = cart[existingItemIndex];
        const currentQuantity = parseInt(existingItem.quantity) || 1;
        const newQuantity = currentQuantity + 1;
        
        // Check if quantity exceeds limit
        if (newQuantity > MAX_QUANTITY_PER_ITEM) {
            if (typeof showNotification === 'function') {
                showNotification(`Maximum quantity of ${MAX_QUANTITY_PER_ITEM} reached for "${title}"`, 'error');
            } else {
                alert(`Maximum quantity of ${MAX_QUANTITY_PER_ITEM} reached for "${title}"`);
            }
            return;
        }
        
        existingItem.quantity = newQuantity;
    } else {
        // If item doesn't exist, add new item with quantity 1
        cart.push({
            id: parseInt(id),
            title: title,
            price: price,
            image: image,
            quantity: 1  // NEW ITEMS START AT 1
        });
    }
    
    // Save cart to localStorage
    saveCart(cart);
    
    // Update cart count display
    updateCartCount();
    
    // Show success notification
    if (typeof showNotification === 'function') {
        showNotification(`"${title}" added to cart!`, 'success');
    } else {
        console.log(`Added "${title}" to cart`);
    }
    
    // If on cart page, refresh cart display
    if (document.querySelector('.cart-page')) {
        displayCartItems();
    }
}

// Remove item from cart
function removeFromCart(id) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== id);
    saveCart(updatedCart);
    updateCartCount();
    
    // If on cart page, refresh cart display
    if (document.querySelector('.cart-page')) {
        displayCartItems();
    }
}

// Update item quantity in cart
function updateCartQuantity(id, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.id === id);
    
    if (item) {
        // Ensure quantity is always a number
        const numQuantity = parseInt(quantity) || 1;
        
        if (numQuantity <= 0) {
            removeFromCart(id);
        } else if (numQuantity > MAX_QUANTITY_PER_ITEM) {
            // Limit quantity to maximum
            item.quantity = MAX_QUANTITY_PER_ITEM;
            saveCart(cart);
            updateCartCount();
            
            if (typeof showNotification === 'function') {
                showNotification(`Maximum quantity of ${MAX_QUANTITY_PER_ITEM} per item`, 'error');
            }
            
            // If on cart page, refresh cart display
            if (document.querySelector('.cart-page')) {
                displayCartItems();
            }
        } else {
            item.quantity = numQuantity;
            saveCart(cart);
            updateCartCount();
            
            // If on cart page, refresh cart display
            if (document.querySelector('.cart-page')) {
                displayCartItems();
            }
        }
    }
}

// Update cart count in header
function updateCartCount() {
    const cart = getCart();
    // Ensure quantities are parsed as numbers
    const totalItems = cart.reduce((total, item) => {
        const quantity = parseInt(item.quantity) || 0;
        return total + quantity;
    }, 0);
    
    const cartCountElements = document.querySelectorAll('#cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
    
    // Update cart items count on cart page
    const cartItemsCount = document.getElementById('cart-items-count');
    if (cartItemsCount) {
        cartItemsCount.textContent = `${totalItems} Item${totalItems !== 1 ? 's' : ''}`;
    }
}

// Calculate cart total
function calculateCartTotal() {
    const cart = getCart();
    let subtotal = 0;
    
    cart.forEach(item => {
        // Extract numeric value from price string (e.g., "AED 35.55" -> 35.55)
        const priceMatch = item.price.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
        const quantity = parseInt(item.quantity) || 1;
        subtotal += price * quantity;
    });
    
    const shippingFee = 20.00;
    const deliveryFee = 10.00;
    const total = subtotal + shippingFee + deliveryFee;
    
    return {
        subtotal: subtotal,
        shippingFee: shippingFee,
        deliveryFee: deliveryFee,
        total: total
    };
}

// Display cart items on cart page
function displayCartItems() {
    const cartContainer = document.getElementById('cart-items-container');
    if (!cartContainer) return;
    
    const cart = getCart();
    
    // Clear existing content
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        // Show empty cart message
        cartContainer.innerHTML = `
            <div class="empty-cart" id="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add some books to your cart and they will appear here</p>
                <a href="store.html" class="btn shop-btn">Browse Books</a>
            </div>
        `;
    } else {
        // Display cart items
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.title}</h3>
                    <p class="cart-item-price">${item.price}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease-btn" data-id="${item.id}" type="button">-</button>
                    <span class="quantity-value">${item.quantity || 1}</span>
                    <button class="quantity-btn increase-btn" data-id="${item.id}" type="button">+</button>
                </div>
                <div class="cart-item-total">
                    ${calculateItemTotal(item)}
                </div>
                <button class="remove-item-btn" data-id="${item.id}" title="Remove item" type="button">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            cartContainer.appendChild(cartItem);
        });
    }
    
    // Update order summary
    updateOrderSummary();
}

// Handle cart item button clicks (event delegation)
function handleCartItemClick(e) {
    // Handle decrease button
    if (e.target.classList.contains('decrease-btn') || e.target.closest('.decrease-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.classList.contains('decrease-btn') ? e.target : e.target.closest('.decrease-btn');
        const id = parseInt(btn.getAttribute('data-id'));
        const cart = getCart();
        const item = cart.find(item => item.id === id);
        
        if (item) {
            const currentQuantity = parseInt(item.quantity) || 1;
            // Decrease by 1, minimum 1
            updateCartQuantity(id, Math.max(1, currentQuantity - 1));
        }
        return;
    }
    
    // Handle increase button
    if (e.target.classList.contains('increase-btn') || e.target.closest('.increase-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.classList.contains('increase-btn') ? e.target : e.target.closest('.increase-btn');
        const id = parseInt(btn.getAttribute('data-id'));
        const cart = getCart();
        const item = cart.find(item => item.id === id);
        
        if (item) {
            const currentQuantity = parseInt(item.quantity) || 1;
            
            // Check max limit
            if (currentQuantity >= MAX_QUANTITY_PER_ITEM) {
                if (typeof showNotification === 'function') {
                    showNotification(`Maximum quantity of ${MAX_QUANTITY_PER_ITEM} per item`, 'error');
                }
                return;
            }
            
            // Increase by exactly 1
            updateCartQuantity(id, currentQuantity + 1);
        }
        return;
    }
    
    // Handle remove button
    if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.classList.contains('remove-item-btn') ? e.target : e.target.closest('.remove-item-btn');
        const id = parseInt(btn.getAttribute('data-id'));
        const cart = getCart();
        const item = cart.find(item => item.id === id);
        
        if (item) {
            if (confirm(`Remove "${item.title}" from cart?`)) {
                removeFromCart(id);
                if (typeof showNotification === 'function') {
                    showNotification(`"${item.title}" removed from cart`, 'success');
                }
            }
        }
        return;
    }
}

// Setup cart event listeners (ONCE)
function setupCartEventListeners() {
    const cartContainer = document.getElementById('cart-items-container');
    if (cartContainer) {
        // Remove any existing listeners to prevent duplicates
        cartContainer.removeEventListener('click', handleCartItemClick);
        // Add the event listener
        cartContainer.addEventListener('click', handleCartItemClick);
    }
}

// Calculate total for a single item
function calculateItemTotal(item) {
    const priceMatch = item.price.match(/[\d.]+/);
    const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
    const quantity = parseInt(item.quantity) || 1;
    const total = price * quantity;
    return `AED ${total.toFixed(2)}`;
}

// Update order summary
function updateOrderSummary() {
    const totals = calculateCartTotal();
    
    const subtotalElement = document.getElementById('cart-subtotal');
    if (subtotalElement) {
        subtotalElement.textContent = `AED ${totals.subtotal.toFixed(2)}`;
    }
    
    const totalElement = document.getElementById('cart-total');
    if (totalElement) {
        totalElement.textContent = `AED ${totals.total.toFixed(2)}`;
    }
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function() {
    // Setup cart event listeners ONCE
    setupCartEventListeners();
    
    // Update cart count on page load
    updateCartCount();
    
    // Display cart items if on cart page
    if (document.querySelector('.cart-page')) {
        displayCartItems();
        setupAddressEdit();
        setupPaymentEdit();
    }
    
    // Proceed to buy button
    const proceedBtn = document.getElementById('proceed-to-buy');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function() {
            const cart = getCart();
            if (cart.length === 0) {
                if (typeof showNotification === 'function') {
                    showNotification('Your cart is empty. Add items before proceeding.', 'error');
                } else {
                    alert('Your cart is empty. Add items before proceeding.');
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('Thank you for your purchase! Your order has been placed.', 'success');
                } else {
                    alert('Thank you for your purchase! Your order has been placed.');
                }
                // Optionally clear cart after purchase
                // saveCart([]);
                // updateCartCount();
                // displayCartItems();
            }
        });
    }
});

// Setup address editing
function setupAddressEdit() {
    const editBtn = document.getElementById('edit-address-btn');
    const addressText = document.getElementById('delivery-address-text');
    const addressInput = document.getElementById('delivery-address-input');
    const saveBtn = document.getElementById('save-address-btn');
    
    if (!editBtn || !addressText || !addressInput || !saveBtn) return;
    
    // Load saved address from localStorage or use default
    const savedAddress = localStorage.getItem('aklat_delivery_address') || addressInput.value;
    addressText.textContent = savedAddress;
    addressInput.value = savedAddress;
    
    editBtn.addEventListener('click', function() {
        addressText.style.display = 'none';
        addressInput.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        addressInput.focus();
    });
    
    saveBtn.addEventListener('click', function() {
        const newAddress = addressInput.value.trim();
        if (newAddress) {
            addressText.textContent = newAddress;
            localStorage.setItem('aklat_delivery_address', newAddress);
            addressText.style.display = 'block';
            addressInput.style.display = 'none';
            saveBtn.style.display = 'none';
            editBtn.style.display = 'inline-block';
            
            if (typeof showNotification === 'function') {
                showNotification('Delivery address updated!', 'success');
            }
        }
    });
    
    // Save on Enter key
    addressInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}

// Setup payment method editing
function setupPaymentEdit() {
    const editBtn = document.getElementById('edit-payment-btn');
    const paymentText = document.getElementById('payment-method-text');
    const paymentSelect = document.getElementById('payment-method-select');
    
    if (!editBtn || !paymentText || !paymentSelect) return;
    
    // Load saved payment method from localStorage or use default
    const savedPayment = localStorage.getItem('aklat_payment_method') || 'Cash On Delivery';
    paymentText.textContent = savedPayment;
    paymentSelect.value = savedPayment;
    
    editBtn.addEventListener('click', function() {
        paymentText.style.display = 'none';
        paymentSelect.style.display = 'block';
        editBtn.style.display = 'none';
        paymentSelect.focus();
    });
    
    paymentSelect.addEventListener('change', function() {
        const newPayment = paymentSelect.value;
        paymentText.textContent = newPayment;
        localStorage.setItem('aklat_payment_method', newPayment);
        paymentText.style.display = 'block';
        paymentSelect.style.display = 'none';
        editBtn.style.display = 'inline-block';
        
        if (typeof showNotification === 'function') {
            showNotification('Payment method updated!', 'success');
        }
    });
    
    // Also allow clicking outside to save
    document.addEventListener('click', function(e) {
        if (paymentSelect.style.display === 'block' && 
            !paymentSelect.contains(e.target) && 
            e.target !== editBtn) {
            paymentSelect.dispatchEvent(new Event('change'));
        }
    });
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.updateCartCount = updateCartCount;
window.displayCartItems = displayCartItems;
window.setupCartEventListeners = setupCartEventListeners;