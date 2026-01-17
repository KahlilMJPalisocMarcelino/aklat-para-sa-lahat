// Authentication functionality for Aklat Website

// API Configuration - Updated for Render backend
const API_BASE_URL = window.API_BASE_URL || 'https://aklat-backend.onrender.com/api';
const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || ''; // Set this in your HTML or environment

// DOM Elements
const authModal = document.getElementById('auth-modal');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const closeModal = document.getElementById('close-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotForm = document.getElementById('forgot-form');
const switchToSignupLinks = document.querySelectorAll('.switch-to-signup');
const switchToLoginLinks = document.querySelectorAll('.switch-to-login');
const forgotPasswordLink = document.getElementById('forgot-password');
const userAvatar = document.getElementById('user-avatar');
const userDropdown = document.getElementById('user-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');

// Check if user is logged in from localStorage
let currentUser = JSON.parse(localStorage.getItem('aklat_current_user')) || null;
let authToken = localStorage.getItem('aklat_auth_token') || null;

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    if (!GOOGLE_CLIENT_ID) {
        console.warn('Google Client ID not configured. Google Sign-In will not work.');
        // Show a message on button click if not configured
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID.', 'error');
            });
        });
        return;
    }

    // Wait for Google script to load
    const checkGoogle = setInterval(() => {
        if (window.google && window.google.accounts) {
            clearInterval(checkGoogle);
            setupGoogleButtons();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkGoogle);
        if (!window.google || !window.google.accounts) {
            console.warn('Google Sign-In script failed to load.');
            document.querySelectorAll('.social-btn.google').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showNotification('Google Sign-In service is currently unavailable.', 'error');
                });
            });
        }
    }, 5000);
}

// Setup Google Sign-In buttons
function setupGoogleButtons() {
    if (!window.google || !window.google.accounts || !GOOGLE_CLIENT_ID) {
        console.warn('Google Sign-In not available');
        return;
    }

    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin'
        });

        // Attach click handlers to Google buttons
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            // Remove any existing listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Re-select buttons after cloning
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // Use One Tap prompt first
                    window.google.accounts.id.prompt((notification) => {
                        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                            // Fallback: Use OAuth2 button flow
                            triggerGoogleOAuth();
                        }
                    });
                } catch (err) {
                    console.error('Google prompt error:', err);
                    // Fallback to OAuth2
                    triggerGoogleOAuth();
                }
            });
        });
    } catch (error) {
        console.error('Error setting up Google buttons:', error);
        showNotification('Google Sign-In setup failed. Please try again.', 'error');
    }
}

// Trigger Google OAuth2 flow
function triggerGoogleOAuth() {
    if (!window.google || !window.google.accounts || !GOOGLE_CLIENT_ID) {
        showNotification('Google Sign-In is not available.', 'error');
        return;
    }

    try {
        window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: async (response) => {
                if (response.error) {
                    console.error('Google OAuth error:', response.error);
                    showNotification('Google Sign-In failed. Please try again.', 'error');
                    return;
                }

                // Get user info using access token
                try {
                    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: {
                            'Authorization': `Bearer ${response.access_token}`
                        }
                    });

                    if (!userInfoResponse.ok) {
                        throw new Error('Failed to get user info from Google');
                    }

                    const userInfo = await userInfoResponse.json();
                    await handleGoogleSignInWithUserInfo(userInfo);
                } catch (error) {
                    console.error('Google OAuth error:', error);
                    showNotification('Failed to get user information from Google.', 'error');
                }
            }
        }).requestAccessToken();
    } catch (error) {
        console.error('Google OAuth initialization error:', error);
        showNotification('Google Sign-In initialization failed.', 'error');
    }
}

// Handle Google Sign-In with credential (ID token)
async function handleGoogleSignIn(response) {
    try {
        let credential;
        
        if (typeof response === 'string') {
            // Direct credential string
            credential = response;
        } else if (response.credential) {
            // Credential from response object
            credential = response.credential;
        } else if (response && typeof response === 'object') {
            // Sometimes Google returns the credential directly in the response
            credential = response.credential || response;
        } else {
            console.error('Invalid Google response:', response);
            showNotification('Invalid Google Sign-In response. Please try again.', 'error');
            return;
        }

        if (!credential) {
            showNotification('No Google credential received. Please try again.', 'error');
            return;
        }

        // Send credential to backend
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ credential: typeof credential === 'string' ? credential : credential.credential || credential }),
            mode: 'cors'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ 
                message: `Server error (${res.status}): ${res.statusText}` 
            }));
            
            if (res.status === 401) {
                throw new Error('Authentication failed. Invalid credentials.');
            } else if (res.status === 403) {
                throw new Error('Access denied. Please contact support.');
            } else if (res.status === 404) {
                throw new Error('Authentication endpoint not found.');
            } else if (res.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
            }
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Google authentication failed');
        }

        // Store token and user data
        authToken = data.token;
        localStorage.setItem('aklat_auth_token', authToken);
        localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
        currentUser = data.user;

        // Update UI
        updateAuthState();
        closeAuthModal();

        // Show welcome message
        showNotification(`Welcome to Aklat, ${data.user.name}!`, 'success');
        
        // Refresh page to update auth state everywhere
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Google Sign-In error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check your internet connection or try again later.', 'error');
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            showNotification('Cross-origin request blocked. Please contact support.', 'error');
        } else {
            showNotification(error.message || 'Google Sign-In failed. Please try again.', 'error');
        }
    }
}

// Handle Google Sign-In with user info (OAuth2 fallback)
async function handleGoogleSignInWithUserInfo(userInfo) {
    try {
        const { email, name, picture } = userInfo;

        if (!email) {
            throw new Error('Email not provided by Google');
        }

        // Try to find existing user by email
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email,
                name: name || email.split('@')[0],
                picture,
                googleId: userInfo.sub || userInfo.id
            }),
            mode: 'cors'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ 
                message: `Server error (${res.status}): ${res.statusText}` 
            }));
            throw new Error(errorData.message || 'Google authentication failed');
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Google authentication failed');
        }

        // Store token and user data
        authToken = data.token;
        localStorage.setItem('aklat_auth_token', authToken);
        localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
        currentUser = data.user;

        // Update UI
        updateAuthState();
        closeAuthModal();

        // Show welcome message
        showNotification(`Welcome to Aklat, ${data.user.name}!`, 'success');
        
        // Refresh page to update auth state everywhere
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Google OAuth error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check your internet connection.', 'error');
        } else {
            showNotification(error.message || 'Google Sign-In failed. Please try again.', 'error');
        }
    }
}

// Initialize authentication
document.addEventListener('DOMContentLoaded', function() {
    updateAuthState();
    setupAuthEventListeners();
    
    // Initialize Google Sign-In after DOM is ready
    setTimeout(() => {
        initializeGoogleSignIn();
    }, 100);

    // Check if user token is still valid on page load
    if (authToken && currentUser) {
        verifyAuthToken();
    }
});

// Verify auth token is still valid
async function verifyAuthToken() {
    if (!authToken || !currentUser) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new Error('Token invalid or expired');
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.success && data.user) {
            // Update user data if changed
            currentUser = data.user;
            localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
            updateAuthState();
            console.log('User session verified and updated');
        } else {
            throw new Error('Invalid user data received');
        }
    } catch (error) {
        console.warn('Token verification failed:', error.message);
        // Token invalid, logout user
        logoutUser();
    }
}

// Update authentication state
function updateAuthState() {
    if (currentUser && authToken) {
        // User is logged in
        document.body.classList.add('logged-in');
        
        // Update user avatar with initials
        if (userAvatar) {
            const initials = currentUser.name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            userAvatar.textContent = initials;
            userAvatar.title = `Logged in as ${currentUser.name}`;
        }
        
        // Show user menu, hide auth buttons
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
        
        // Update any user-specific elements on the page
        updateUserSpecificElements();
    } else {
        // User is logged out
        document.body.classList.remove('logged-in');
        
        // Show auth buttons, hide user menu
        if (userMenu) userMenu.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
        
        // Reset any user-specific elements
        resetUserSpecificElements();
    }
}

// Update user-specific elements on the page
function updateUserSpecificElements() {
    // Example: Update welcome message if exists
    const welcomeElement = document.getElementById('welcome-user');
    if (welcomeElement && currentUser) {
        welcomeElement.textContent = `Welcome, ${currentUser.name.split(' ')[0]}!`;
        welcomeElement.style.display = 'block';
    }
    
    // Example: Update user email in profile if exists
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement && currentUser) {
        userEmailElement.textContent = currentUser.email;
    }
}

// Reset user-specific elements
function resetUserSpecificElements() {
    const welcomeElement = document.getElementById('welcome-user');
    if (welcomeElement) {
        welcomeElement.style.display = 'none';
    }
}

// Get auth headers for API calls
function getAuthHeaders() {
    if (!authToken) {
        console.warn('No auth token available');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// Setup authentication event listeners
function setupAuthEventListeners() {
    // Open login modal
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openAuthModal('login'));
    }
    
    // Open signup modal
    if (signupBtn) {
        signupBtn.addEventListener('click', () => openAuthModal('signup'));
    }
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', closeAuthModal);
    }
    
    // Close modal when clicking outside
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && authModal.classList.contains('active')) {
            closeAuthModal();
        }
    });
    
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Switch to signup
    switchToSignupLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('signup');
        });
    });
    
    // Switch to login
    switchToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('login');
        });
    });
    
    // Forgot password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('forgot');
        });
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            await loginUser(email, password);
        });
    }
    
    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters', 'error');
                return;
            }
            
            if (!document.getElementById('terms-agree').checked) {
                showNotification('Please agree to the terms and conditions', 'error');
                return;
            }
            
            await signupUser(name, email, password);
        });
    }
    
    // Forgot password form submission
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value.trim();
            
            if (!email) {
                showNotification('Please enter your email address', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            try {
                const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email }),
                    mode: 'cors'
                });

                const data = await res.json();
                
                if (res.ok && data.success) {
                    showNotification('Password reset link sent to your email', 'success');
                    setTimeout(() => {
                        switchTab('login');
                    }, 2000);
                } else {
                    showNotification(data.message || 'Error sending reset link. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Forgot password error:', error);
                showNotification('Error sending reset link. Please try again later.', 'error');
            }
        });
    }
    
    // User dropdown toggle
    if (userAvatar) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            if (userDropdown) userDropdown.classList.toggle('active');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userAvatar && !userAvatar.contains(e.target) && userDropdown && !userDropdown.contains(e.target)) {
            if (userDropdown) userDropdown.classList.remove('active');
        }
    });
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
            if (userDropdown) userDropdown.classList.remove('active');
        });
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Open auth modal
function openAuthModal(tab = 'login') {
    if (authModal) {
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchTab(tab);
        
        // Focus on first input field
        setTimeout(() => {
            const activeForm = document.querySelector('.auth-form.active');
            if (activeForm) {
                const firstInput = activeForm.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        }, 100);
    }
}

// Close auth modal
function closeAuthModal() {
    if (authModal) {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        resetForms();
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update tabs
    authTabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                modalTitle.textContent = tabName === 'login' ? 'Welcome Back' : 'Join Aklat Community';
            }
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update forms
    authForms.forEach(form => {
        if (form.id === `${tabName}-form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
    
    // Show forgot password form
    if (tabName === 'forgot') {
        authForms.forEach(form => form.classList.remove('active'));
        if (forgotForm) forgotForm.classList.add('active');
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = 'Reset Password';
    }
}

// Reset all forms
function resetForms() {
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    if (forgotForm) forgotForm.reset();
    
    // Clear validation errors
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.classList.remove('error');
    });
    
    switchTab('login');
}

// Login function - Connects to backend API
async function loginUser(email, password) {
    try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            mode: 'cors'
        });

        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ 
                message: `Server error (${res.status}): ${res.statusText}` 
            }));
            
            if (res.status === 401) {
                throw new Error('Invalid email or password. Please try again.');
            } else if (res.status === 404) {
                throw new Error('Login service unavailable. Please try again later.');
            } else if (res.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorData.message || `Login failed (${res.status})`);
            }
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Login failed. Please try again.');
        }

        // Store token and user data
        authToken = data.token;
        localStorage.setItem('aklat_auth_token', authToken);
        localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
        currentUser = data.user;

        // Update UI
        updateAuthState();
        closeAuthModal();

        // Show welcome message
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        
        // Refresh page after a short delay to update all components
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check your internet connection.', 'error');
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            showNotification('Network error. Please try again or contact support.', 'error');
        } else {
            showNotification(error.message || 'Login failed. Please try again.', 'error');
        }
        return false;
    }
}

// Sign up function - Connects to backend API
async function signupUser(name, email, password) {
    try {
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, password }),
            mode: 'cors'
        });

        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ 
                message: `Server error (${res.status}): ${res.statusText}` 
            }));
            
            if (res.status === 400) {
                throw new Error('Invalid registration data. Please check your information.');
            } else if (res.status === 409) {
                throw new Error('Email already registered. Please login instead.');
            } else if (res.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorData.message || `Registration failed (${res.status})`);
            }
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Registration failed. Please try again.');
        }

        // Store token and user data
        authToken = data.token;
        localStorage.setItem('aklat_auth_token', authToken);
        localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
        currentUser = data.user;

        // Update UI
        updateAuthState();
        closeAuthModal();

        // Show welcome message
        showNotification(`Welcome to Aklat, ${name}! Your account has been created.`, 'success');
        
        // Refresh page after a short delay to update all components
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
        return true;
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Please check your internet connection.', 'error');
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            showNotification('Network error. Please try again or contact support.', 'error');
        } else {
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
        return false;
    }
}

// Logout function
function logoutUser() {
    try {
        // Optional: Notify backend about logout
        if (authToken) {
            fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders(),
                mode: 'cors'
            }).catch(err => console.log('Logout notification failed:', err));
        }
        
        // Clear user data and token
        localStorage.removeItem('aklat_current_user');
        localStorage.removeItem('aklat_auth_token');
        currentUser = null;
        authToken = null;
        
        // Update UI
        updateAuthState();
        
        // Show logout message
        showNotification('You have been logged out successfully.', 'success');
        
        // Refresh page to clear any user-specific data
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local data even if backend logout fails
        localStorage.removeItem('aklat_current_user');
        localStorage.removeItem('aklat_auth_token');
        currentUser = null;
        authToken = null;
        updateAuthState();
        showNotification('Logged out successfully.', 'success');
    }
}

// Check authentication status
function isAuthenticated() {
    return !!currentUser && !!authToken;
}

// Export functions for use in other scripts
window.aklatAuth = {
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken,
    getAuthHeaders: getAuthHeaders,
    isAuthenticated: isAuthenticated,
    logout: logoutUser,
    openAuthModal: openAuthModal,
    closeAuthModal: closeAuthModal,
    verifyAuthToken: verifyAuthToken
};

// Auto-verify token every 30 minutes
setInterval(() => {
    if (authToken && currentUser) {
        verifyAuthToken();
    }
}, 30 * 60 * 1000); // 30 minutes

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        updateAuthState();
        setupAuthEventListeners();
        setTimeout(() => {
            initializeGoogleSignIn();
        }, 100);
        
        if (authToken && currentUser) {
            verifyAuthToken();
        }
    });
} else {
    // DOM already loaded
    updateAuthState();
    setupAuthEventListeners();
    setTimeout(() => {
        initializeGoogleSignIn();
    }, 100);
    
    if (authToken && currentUser) {
        verifyAuthToken();
    }
}