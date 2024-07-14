const cart = {
    items: [],
    userId: null,
    
    loadCart: function() {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
            this.items = JSON.parse(storedCart);
        }
        this.updateCartDisplay();
        this.syncWithServer(); // Sync with server on load
    },
    
    saveCart: function() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },
    
    addToCart: function(product) {
        const existingItemIndex = this.items.findIndex(item => item.id === product.id);
        if (existingItemIndex >= 0) {
            this.items[existingItemIndex].quantity += 1;
        } else {
            this.items.push({ ...product, quantity: 1 });
        }
        this.saveCart();
        this.updateCartDisplay();
        this.syncWithServer(); // Sync with server after adding item
    },
    
    removeFromCart: function(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartDisplay();
        this.syncWithServer(); // Sync with server after removing item
    },
    
    updateQuantity: function(productId, quantity) {
        const itemIndex = this.items.findIndex(item => item.id === productId);
        if (itemIndex >= 0) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.items[itemIndex].quantity = quantity;
                this.saveCart();
                this.updateCartDisplay();
                this.syncWithServer(); // Sync with server after updating quantity
            }
        }
    },
    
    updateCartDisplay: function() {
        const cartCount = document.getElementById('cartCount');
        cartCount.textContent = this.items.reduce((sum, item) => sum + item.quantity, 0);

        const cartItemsSummary = document.getElementById('cartItemsSummary');
        const cartTotal = document.getElementById('cartTotal');

        cartItemsSummary.innerHTML = '';
        let total = 0;

        if (this.items.length === 0) {
            cartItemsSummary.innerHTML = '<li>Your cart is empty.</li>';
            cartTotal.textContent = 'Total: $0.00 USD';
        } else {
            this.items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="cart-item">
                        <img src="${item.imageUrl}" alt="${item.name}">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>$${item.price.toFixed(2)} x ${item.quantity}</p>
                        </div>
                        <div class="cart-item-total">
                            $${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <input type="number" min="1" value="${item.quantity}" onchange="cart.updateQuantity('${item.id}', this.value)">
                        <button class="remove-item" onclick="cart.removeFromCart('${item.id}')">Remove</button>
                    </div>
                `;
                cartItemsSummary.appendChild(li);
                total += item.price * item.quantity;
            });
            cartTotal.textContent = `Total: $${total.toFixed(2)} USD`;
        }
    },
    
    syncWithServer: async function() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('User not authenticated. Cart synchronization skipped.');
                return;
            }

            const response = await fetch('/api/cart/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: this.items })
            });

            if (response.status === 200) {
                console.log('Cart synchronized with server successfully.');
            } else {
                const data = await response.json();
                console.error('Failed to synchronize cart with server:', data.message);
                showNotification('Failed to synchronize cart with server', 'error');
            }
        } catch (error) {
            console.error('Error syncing cart with server:', error);
            showNotification('Error syncing cart with server', 'error');
        }
    },
    
    applyDiscount: function(code) {
        const discounts = {
            'DISCOUNT10': 0.10,
            'DISCOUNT20': 0.20,
        };

        const discount = discounts[code];
        if (discount) {
            this.items = this.items.map(item => ({
                ...item,
                price: item.price * (1 - discount)
            }));
            this.saveCart();
            this.updateCartDisplay();
            showNotification(`Discount ${code} applied!`, 'success');
        } else {
            showNotification('Invalid discount code', 'error');
        }
    },
    
    clearCart: function() {
        this.items = [];
        this.saveCart();
        this.updateCartDisplay();
        this.syncWithServer();
    },
    
    checkUserAuthentication: function() {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to use the cart.', 'error');
            return false;
        }
        return true;
    },
    
    checkout: async function() {
        if (!this.checkUserAuthentication()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: this.items })
            });

            const data = await response.json();
            if (response.status === 200) {
                this.clearCart();
                showNotification('Checkout successful! Your order has been placed.', 'success');
            } else {
                console.error('Checkout failed:', data.message);
                showNotification('Checkout failed: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error during checkout:', error);
            showNotification('Error during checkout. Please try again.', 'error');
        }
    }
};

window.cart = cart;

function showNotification(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = type;
    feedback.style.display = 'block';
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
}

// Load the cart when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    cart.loadCart();
});
