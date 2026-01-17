// Authentication functionality for Aklat Website

// API Configuration - Update this with your backend URL
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';
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
        // Show a message on button click if not configured, but keep button visible
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID in your HTML file.', 'error');
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
        }
    }, 5000);
}

// Setup Google Sign-In buttons
function setupGoogleButtons() {
    if (!window.google || !window.google.accounts || !GOOGLE_CLIENT_ID) {
        console.warn('Google Sign-In not available');
        return;
    }

    // Initialize Google Identity Services
    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn
        });

        // Attach click handlers to Google buttons
        document.querySelectorAll('.social-btn.google').forEach(btn => {
            // Remove any existing listeners
            btn.replaceWith(btn.cloneNode(true));
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
    }
}

// Trigger Google OAuth2 flow
function triggerGoogleOAuth() {
    if (!window.google || !window.google.accounts || !GOOGLE_CLIENT_ID) {
        showNotification('Google Sign-In is not available. Please configure GOOGLE_CLIENT_ID.', 'error');
        return;
    }

    window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response) => {
            if (response.error) {
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

                // For OAuth2 flow, we need to create a credential-like object
                // But the backend expects an ID token, so we'll send user info directly
                // Actually, let's use a different approach - we'll update the backend to accept OAuth2
                // For now, we'll create a user with the info we have
                await handleGoogleSignInWithUserInfo(userInfo);
            } catch (error) {
                console.error('Google OAuth error:', error);
                showNotification('Google Sign-In failed. Please try again.', 'error');
            }
        }
    }).requestAccessToken();
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ credential: typeof credential === 'string' ? credential : credential.credential || credential })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Network error' }));
            throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
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
    } catch (error) {
        console.error('Google Sign-In error:', error);
        if (error.message.includes('fetch')) {
            showNotification('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        } else {
            showNotification(error.message || 'Google Sign-In failed. Please try again.', 'error');
        }
    }
}

// Handle Google Sign-In with user info (OAuth2 fallback)
async function handleGoogleSignInWithUserInfo(userInfo) {
    try {
        // Since OAuth2 doesn't provide ID token by default, we'll register/login the user
        // by email. This is a fallback approach.
        const { email, name, picture } = userInfo;

        if (!email) {
            throw new Error('Email not provided by Google');
        }

        // Try to find existing user by email
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                name,
                picture,
                googleId: userInfo.sub || userInfo.id
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
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
    } catch (error) {
        console.error('Google OAuth error:', error);
        showNotification(error.message || 'Google Sign-In failed. Please try again.', 'error');
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
    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!res.ok) {
            throw new Error('Token invalid');
        }

        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('aklat_current_user', JSON.stringify(data.user));
            updateAuthState();
        }
    } catch (error) {
        // Token invalid, logout user
        logoutUser();
    }
}

// Update authentication state
function updateAuthState() {
    if (currentUser) {
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
        }
        
        // Show user menu, hide auth buttons
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
    } else {
        // User is logged out
        document.body.classList.remove('logged-in');
        
        // Show auth buttons, hide user menu
        if (userMenu) userMenu.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
    }
}

// Get auth headers for API calls
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
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
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            await loginUser(email, password);
        });
    }
    
    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showNotification('Please fill in all fields', 'error');
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
            
            const email = document.getElementById('forgot-email').value;
            
            if (!email) {
                showNotification('Please enter your email address', 'error');
                return;
            }
            
            try {
                const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();
                
                if (data.success) {
                    showNotification('Password reset link sent to your email', 'success');
                    setTimeout(() => {
                        switchTab('login');
                    }, 2000);
                } else {
                    showNotification(data.message || 'Error sending reset link', 'error');
                }
            } catch (error) {
                showNotification('Error sending reset link. Please try again.', 'error');
            }
        });
    }
    
    // User dropdown toggle
    if (userAvatar) {
        userAvatar.addEventListener('click', () => {
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

// Open auth modal
function openAuthModal(tab = 'login') {
    if (authModal) {
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchTab(tab);
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
    switchTab('login');
}

// Login function - Now connects to backend API
async function loginUser(email, password) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Network error' }));
            throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Login failed');
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
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('fetch') || error.message.includes('Network')) {
            showNotification('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        } else {
            showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
        }
        return false;
    }
}

// Sign up function - Now connects to backend API
async function signupUser(name, email, password) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Network error' }));
            throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Registration failed');
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
        showNotification(`Welcome to Aklat, ${name}!`, 'success');
        
        return true;
    } catch (error) {
        console.error('Signup error:', error);
        if (error.message.includes('fetch') || error.message.includes('Network')) {
            showNotification('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        } else {
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
        return false;
    }
}

// Logout function
function logoutUser() {
    // Clear user data and token
    localStorage.removeItem('aklat_current_user');
    localStorage.removeItem('aklat_auth_token');
    currentUser = null;
    authToken = null;
    
    // Update UI
    updateAuthState();
    
    // Show logout message
    showNotification('You have been logged out.', 'success');
}

// Export functions for use in other scripts
window.aklatAuth = {
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken,
    getAuthHeaders: getAuthHeaders,
    isAuthenticated: () => !!currentUser && !!authToken,
    logout: logoutUser
};
