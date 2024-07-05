document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');
    const orderSummary = document.getElementById('orderSummary');
    const orderTotal = document.getElementById('orderTotal');

    // Load cart items from local storage
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Display cart items in order summary
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - $${item.price.toFixed(2)} x ${item.quantity}`;
        orderSummary.appendChild(li);
        total += item.price * item.quantity;
    });
    orderTotal.textContent = `Total: $${total.toFixed(2)} USD`;

    // Handle form submission
    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(checkoutForm);
        const orderDetails = {
            fullName: formData.get('fullName'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip: formData.get('zip'),
            country: formData.get('country'),
            cardNumber: formData.get('cardNumber'),
            expiryDate: formData.get('expiryDate'),
            cvv: formData.get('cvv'),
            cart
        };

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderDetails)
            });

            const data = await response.json();
            if (data.success) {
                alert('Order placed successfully!');
                localStorage.removeItem('cart'); // Clear cart
                window.location.href = 'index.html';
            } else {
                alert(`Order failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while placing your order. Please try again.');
        }
    });
});
