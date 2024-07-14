document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');
    const notification = document.getElementById('notification');

    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Clear previous error messages
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');

        const formData = new FormData(checkoutForm);
        const data = {
            fullName: formData.get('fullName'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip: formData.get('zip'),
            country: formData.get('country'),
            cardNumber: formData.get('cardNumber'),
            expiryDate: formData.get('expiryDate'),
            cvv: formData.get('cvv'),
            email: formData.get('email'),
            cart: JSON.parse(localStorage.getItem('cart')) // Assuming the cart is saved in localStorage
        };

        try {
            showLoading(true);

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            showLoading(false);

            if (response.ok) {
                showNotification('Order placed successfully!', 'success');
                localStorage.removeItem('cart');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                handleErrors(result.errors);
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showNotification('An error occurred while placing the order. Please try again later.', 'error');
            showLoading(false);
        }
    });

    function handleErrors(errors) {
        if (errors) {
            errors.forEach(error => {
                document.getElementById(`${error.param}Error`).textContent = error.msg;
            });
        }
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.style.display = 'block';
        } else {
            loadingSpinner.style.display = 'none';
        }
    }

    // Prefill form if user data exists in localStorage (for demonstration purposes)
    const prefillForm = () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            Object.keys(userData).forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    input.value = userData[key];
                }
            });
        }
    };

    prefillForm();
});

// CSS for loading spinner
const style = document.createElement('style');
style.textContent = `
    #loadingSpinner {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top: 4px solid #007bff;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.append(style);

// Adding loading spinner element to body
const spinner = document.createElement('div');
spinner.id = 'loadingSpinner';
document.body.append(spinner);

// Notification styles
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    .notification {
        position: fixed;
        top: 10%;
        right: 10%;
        background-color: #444;
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        display: none;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
    }
    .notification.success {
        background-color: #28a745;
    }
    .notification.error {
        background-color: #dc3545;
    }
    .notification.show {
        display: block;
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.append(notificationStyle);

// Adding notification element to body
const notificationDiv = document.createElement('div');
notificationDiv.id = 'notification';
notificationDiv.classList.add('notification');
document.body.append(notificationDiv);
