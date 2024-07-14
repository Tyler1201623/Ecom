// Toggle between login and registration forms
function toggleForm(e) {
    e.preventDefault();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Clear error messages and input values when toggling forms
    clearFormErrors(loginForm);
    clearFormErrors(registerForm);

    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
}

function clearFormErrors(form) {
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.remove('input-error');
        const errorSpan = input.nextElementSibling;
        if (errorSpan && errorSpan.classList.contains('error-message')) {
            errorSpan.textContent = '';
        }
    });
}

// Form validation function
function validateForm(form) {
    let valid = true;
    const inputs = form.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        const errorSpan = input.nextElementSibling;
        if (!input.value.trim()) {
            valid = false;
            input.classList.add('input-error');
            showError(input, 'This field is required');
        } else {
            input.classList.remove('input-error');
            if (errorSpan) errorSpan.textContent = '';
        }
    });
    
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput && !validateEmail(emailInput.value)) {
        valid = false;
        emailInput.classList.add('input-error');
        showError(emailInput, 'Please enter a valid email address');
    }

    const passwordInput = form.querySelector('input[type="password"]');
    const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');
    if (passwordInput) {
        const strength = getPasswordStrength(passwordInput.value);
        const strengthSpan = document.getElementById('passwordStrength');
        if (strengthSpan) strengthSpan.textContent = `Password strength: ${strength}`;
        
        if (confirmPasswordInput && passwordInput.value !== confirmPasswordInput.value) {
            valid = false;
            confirmPasswordInput.classList.add('input-error');
            showError(confirmPasswordInput, 'Passwords do not match');
        } else if (confirmPasswordInput) {
            confirmPasswordInput.classList.remove('input-error');
            if (confirmPasswordInput.nextElementSibling) confirmPasswordInput.nextElementSibling.textContent = '';
        }
    }

    return valid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function getPasswordStrength(password) {
    let strength = 'Weak';
    if (password.length >= 8) strength = 'Medium';
    if (password.length >= 12) strength = 'Strong';
    if (password.length >= 16 && /[\W_]/.test(password)) strength = 'Very Strong';
    return strength;
}

// Handle form submission with validation and local storage
function handleFormSubmit(form, url) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm(form)) {
            return;
        }

        const formData = new FormData(form);
        const userData = Object.fromEntries(formData);
        const loader = document.getElementById('loader');
        loader.style.display = 'block';

        // Simulate server response
        setTimeout(() => {
            loader.style.display = 'none';
            if (url === '/register') {
                // Save the user data in localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('registeredUsername', formData.get('username'));
                window.location.href = 'login.html';  // Redirect to login page after successful registration
            } else {
                const storedUserData = JSON.parse(localStorage.getItem('userData'));
                if (storedUserData && storedUserData.username === userData.username && storedUserData.password === userData.password) {
                    showFeedback(`Welcome, ${storedUserData.username}!`, 'success');
                    alert(`Welcome, ${storedUserData.username}!`);
                    if (form.remember && form.remember.checked) {
                        localStorage.setItem('remember', storedUserData.username);
                    }
                    manageSession(generateJWTToken(storedUserData)); // Handle user session with JWT
                } else {
                    showFeedback('Invalid username or password.', 'error');
                }
            }
        }, 1000);
    });
}

// Show feedback message
function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = type;
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
}

// Add dynamic password strength feedback
document.getElementById('register-password').addEventListener('input', function() {
    const strength = getPasswordStrength(this.value);
    const strengthSpan = document.getElementById('passwordStrength');
    if (strengthSpan) strengthSpan.textContent = `Password strength: ${strength}`;
});

// Client-side encryption (example using CryptoJS)
function encryptPassword(password) {
    return CryptoJS.AES.encrypt(password, 'secret key 123').toString();
}

// Generate JWT token for session management
function generateJWTToken(userData) {
    // Simulate JWT generation
    return btoa(JSON.stringify(userData));
}

// Initialize form event listeners
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) handleFormSubmit(loginForm, '/login');
    if (registerForm) handleFormSubmit(registerForm, '/register');
    
    // Prefill username if "Remember Me" was checked
    const rememberedUsername = localStorage.getItem('remember');
    if (rememberedUsername) {
        const usernameInput = document.querySelector('#loginForm input[type="text"]');
        if (usernameInput) usernameInput.value = rememberedUsername;
    }
    
    // Display the registered username
    const registeredUsername = localStorage.getItem('registeredUsername');
    if (registeredUsername) {
        showFeedback(`Welcome back, ${registeredUsername}! Please log in.`, 'info');
        localStorage.removeItem('registeredUsername'); // Clear after displaying
    }
    
    // Enhance feedback with different types (info, warning)
    document.querySelectorAll('form').forEach(form => {
        form.insertAdjacentHTML('beforeend', '<span class="error-message"></span>');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            setTimeout(() => {
                submitButton.disabled = false;
            }, 3000);
        });
    });
});

// Add error styles for invalid input fields
const style = document.createElement('style');
style.innerHTML = `
    .input-error {
        border-color: red;
    }
    .error-message {
        color: red;
        font-size: 12px;
        margin-top: -15px;
        margin-bottom: 10px;
        display: block;
    }
    #loader {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 16px solid #f3f3f3;
        border-radius: 50%;
        border-top: 16px solid #3498db;
        width: 120px;
        height: 120px;
        animation: spin 2s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    #feedback {
        display: none;
        padding: 10px;
        margin-top: 20px;
        border-radius: 5px;
    }
    .success {
        background-color: #4CAF50;
        color: white;
    }
    .error {
        background-color: #f44336;
        color: white;
    }
    .info {
        background-color: #2196F3;
        color: white;
    }
    .warning {
        background-color: #ff9800;
        color: white;
    }
    .input-error ~ .error-message {
        display: block;
    }
    #passwordStrength {
        margin-top: -15px;
        font-size: 12px;
        color: #666;
    }
    input:focus, button:focus {
        outline: 2px solid #0056b3;
        outline-offset: 2px;
    }
    .password-toggle {
        cursor: pointer;
        margin-left: 10px;
        color: #007bff;
    }
    .password-toggle:hover {
        color: #0056b3;
    }
    .hidden {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    .active-form {
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
    }
`;
document.head.appendChild(style);

// Add loader and feedback elements
const loader = document.createElement('div');
loader.id = 'loader';
document.body.appendChild(loader);

const feedback = document.createElement('div');
feedback.id = 'feedback';
document.body.appendChild(feedback);

// Add password strength indicator
document.getElementById('register-password').insertAdjacentHTML('afterend', '<div id="passwordStrength"></div>');

// Show/hide password toggle
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = 'Hide';
    } else {
        input.type = 'password';
        toggle.textContent = 'Show';
    }
}

// Password encryption before form submission
document.getElementById('registerForm').addEventListener('submit', function(e) {
    const passwordInput = document.getElementById('register-password');
    passwordInput.value = encryptPassword(passwordInput.value);
});
document.getElementById('loginForm').addEventListener('submit', function(e) {
    const passwordInput = document.getElementById('login-password');
    passwordInput.value = encryptPassword(passwordInput.value);
});

// Auto-focus first input field
document.querySelectorAll('form').forEach(form => {
    form.querySelector('input').focus();
});

// Scroll to top on form toggle
function toggleFormWithScroll(e) {
    toggleForm(e);
    window.scrollTo(0, 0);
}

document.querySelectorAll('.form-toggle a').forEach(link => {
    link.addEventListener('click', toggleFormWithScroll);
});

// Enhancements

// 1. Sanitize inputs before submission
function sanitizeInput(value) {
    const temp = document.createElement('div');
    temp.textContent = value;
    return temp.innerHTML;
}

// 2. Check for input sanitization on form submission
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = sanitizeInput(input.value);
        });
    });
});

// 3. Session timeout handling
let sessionTimeout;
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        alert('Session expired. Please log in again.');
        window.location.reload();
    }, 30 * 60 * 1000); // 30 minutes
}

document.addEventListener('mousemove', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);

// 4. Detailed error messages
function showError(input, message) {
    input.classList.add('input-error');
    const errorSpan = input.nextElementSibling;
    errorSpan.textContent = message;
    errorSpan.classList.add('error-message');
}

// 5. Remove detailed error messages on input
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function() {
        if (input.classList.contains('input-error')) {
            input.classList.remove('input-error');
            const errorSpan = input.nextElementSibling;
            errorSpan.textContent = '';
            errorSpan.classList.remove('error-message');
        }
    });
});

// 6. Enhance feedback with different types (info, warning)
function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = type;
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
}

// 7. Implement "Forgot Password" functionality (simulation)
document.querySelector('#forgot-password-link').addEventListener('click', function(e) {
    e.preventDefault();
    const email = prompt('Please enter your email to reset password:');
    if (email && validateEmail(email)) {
        // Simulate sending reset password link
        showFeedback('A reset password link has been sent to your email.', 'info');
    } else {
        showFeedback('Please enter a valid email address.', 'error');
    }
});

// 8. Confirmation before leaving page with unsaved changes
let formChanged = false;
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', () => formChanged = true);
});
window.addEventListener('beforeunload', (e) => {
    if (formChanged) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// 9. Enhanced accessibility with focus indicators
style.innerHTML += `
    input:focus, button:focus {
        outline: 2px solid #0056b3;
        outline-offset: 2px;
    }
`;

// 10. Display user's input while typing with real-time feedback
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function() {
        const feedbackSpan = document.getElementById(input.name + '-feedback');
        if (feedbackSpan) {
            feedbackSpan.textContent = input.value;
        }
    });
});

// Add real-time feedback spans
document.getElementById('loginForm').insertAdjacentHTML('beforeend', '<span id="username-feedback"></span>');
document.getElementById('loginForm').insertAdjacentHTML('beforeend', '<span id="email-feedback"></span>');

// 11. Animation for form transitions
style.innerHTML += `
    .hidden {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    .active-form {
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
    }
`;

// Apply animation classes
document.getElementById('loginForm').classList.add('active-form');
document.getElementById('registerForm').classList.add('hidden');

// 12. Prevent multiple form submissions
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        setTimeout(() => {
            submitButton.disabled = false;
        }, 3000);
    });
});

// 13. Add Two-Factor Authentication (2FA)
function requestTwoFactorAuth(email) {
    // Simulate 2FA request
    const code = prompt('Enter the 2FA code sent to your email:');
    return code === '123456'; // Example 2FA code
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = document.querySelector('#loginForm input[type="email"]');
    const passwordInput = document.querySelector('#loginForm input[type="password"]');
    if (validateForm(this) && requestTwoFactorAuth(emailInput.value)) {
        this.submit(); // Proceed with form submission if 2FA is successful
    } else {
        showFeedback('Invalid 2FA code. Please try again.', 'error');
    }
});

// 14. Rate Limiting
let loginAttempts = 0;
const maxLoginAttempts = 10; //hardcode 10 tries

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (loginAttempts >= maxLoginAttempts) {
        showFeedback('Too many login attempts. Please try again later.', 'error');
        return;
    }
    if (validateForm(this)) {
        loginAttempts++;
        this.submit();
    }
});

// 15. Implement CSRF Protection
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const csrfToken = getCsrfToken();
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_csrf';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
    });
});

// Log errors for administrative review
function logError(error) {
    fetch('/log-error', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: error.toString() })
    });
}

// Manage user session
function manageSession(token) {
    localStorage.setItem('authToken', token);
    // Further session management logic can be implemented here
}
