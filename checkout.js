document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');

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
            cart: JSON.parse(localStorage.getItem('cart'))
        };

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderDetails)
            });

            const data = await response.json();
            if (data.success) {
                alert('Order placed successfully!');
                localStorage.removeItem('cart');
                window.location.href = 'index.html';
            } else {
                alert('Failed to place order: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while placing the order.');
        }
    });
});
