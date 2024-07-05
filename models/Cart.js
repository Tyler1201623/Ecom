const cart = {
    items: [],
    loadCart: function() {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
            this.items = JSON.parse(storedCart);
        }
        this.updateCartDisplay();
    },
    saveCart: function() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },
    addToCart: function(product) {
        const existingItemIndex = this.items.findIndex(item => item.name === product.name);
        if (existingItemIndex >= 0) {
            this.items[existingItemIndex].quantity += 1;
        } else {
            this.items.push({ ...product, quantity: 1 });
        }
        this.saveCart();
        this.updateCartDisplay();
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
                    </div>
                `;
                cartItemsSummary.appendChild(li);
                total += item.price * item.quantity;
            });
            cartTotal.textContent = `Total: $${total.toFixed(2)} USD`;
        }
    }
};

window.cart = cart;
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', CartSchema);
