document.addEventListener('DOMContentLoaded', () => {
    const cartCount = document.getElementById('cartCount');
    const cartItemsSummary = document.getElementById('cartItemsSummary');
    const cartTotal = document.getElementById('cartTotal');
    const notification = document.getElementById('notification');
    const emptyCartButton = document.getElementById('emptyCartButton');
    const discountCodeInput = document.getElementById('discountCodeInput');
    const applyDiscountButton = document.getElementById('applyDiscountButton');

    let cart = [];
    let discount = 0;

    // Update the cart UI and local storage
    function updateCart() {
        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartItemsSummary.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsSummary.innerHTML = '<li>Your cart is empty.</li>';
            cartTotal.textContent = 'Total: $0.00 USD';
        } else {
            cart.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="cart-item">
                        <img src="${item.imageUrl}" alt="${item.name}">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>$${item.price.toFixed(2)} x ${item.quantity}</p>
                            <input type="number" class="item-quantity" value="${item.quantity}" min="1">
                        </div>
                        <div class="cart-item-total">
                            $${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button class="remove-from-cart">Remove</button>
                    </div>
                `;
                const quantityInput = li.querySelector('.item-quantity');
                const removeButton = li.querySelector('.remove-from-cart');
                quantityInput.addEventListener('change', () => {
                    item.quantity = parseInt(quantityInput.value);
                    updateCart();
                    saveCart();
                    showNotification('Item quantity updated');
                });
                removeButton.addEventListener('click', () => {
                    if (confirm('Are you sure you want to remove this item from the cart?')) {
                        cart = cart.filter(cartItem => cartItem !== item);
                        updateCart();
                        saveCart();
                        showUndoNotification(item);
                    }
                });
                cartItemsSummary.appendChild(li);

                total += item.price * item.quantity;
            });
            cartTotal.textContent = `Total: $${(total * (1 - discount)).toFixed(2)} USD`;
        }
        saveCart();
    }

    // Save the cart to local storage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('discount', discount);
    }

    // Load the cart from local storage
    function loadCart() {
        const savedCart = localStorage.getItem('cart');
        const savedDiscount = localStorage.getItem('discount');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        if (savedDiscount) {
            discount = parseFloat(savedDiscount);
        }
        updateCart();
    }

    // Add item to cart
    function addToCart(product) {
        if (!checkStock(product)) {
            showNotification('Product is out of stock');
            return;
        }
        const existingItemIndex = cart.findIndex(item => item.name === product.name);
        if (existingItemIndex >= 0) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCart();
        showNotification('Product added to cart');
    }

    // Check stock before adding to cart
    function checkStock(product) {
        // Placeholder for stock check logic
        return true; // Assume all products are in stock for this example
    }

    // Show notifications for user feedback
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Show undo notification for item removal
    function showUndoNotification(item) {
        notification.innerHTML = `Removed ${item.name} from cart. <button id="undoButton">Undo</button>`;
        notification.classList.add('show');
        document.getElementById('undoButton').addEventListener('click', () => {
            cart.push(item);
            updateCart();
            saveCart();
            showNotification('Item restored');
        });
        setTimeout(() => {
            notification.classList.remove('show');
            notification.textContent = '';
        }, 5000);
    }

    // Empty the entire cart
    function emptyCart() {
        if (confirm('Are you sure you want to empty the cart?')) {
            cart = [];
            updateCart();
            saveCart();
        }
    }

    // Apply discount code
    function applyDiscount() {
        const discountCode = discountCodeInput.value.trim();
        if (discountCode === 'SAVE10') {
            applyCoupon(0.10); // 10% discount
        } else {
            showNotification('Invalid discount code');
        }
    }

    // Apply coupon to the cart total
    function applyCoupon(discountRate) {
        discount = discountRate;
        updateCart();
        saveCart();
        showNotification('Discount applied successfully');
    }

    // Format price to USD
    function formatPrice(price) {
        return `$${price.toFixed(2)} USD`;
    }

    emptyCartButton.addEventListener('click', emptyCart);
    applyDiscountButton.addEventListener('click', applyDiscount);

    window.cart = {
        addToCart,
        loadCart
    };

    loadCart();

    // Simulate adding products to the cart
    const products = [
        {
            name: 'Stylish Headphones',
            price: 250,
            description: 'High-quality sound and noise cancellation.',
            imageUrl: 'images/headphones.jpg'
        },
        {
            name: 'Ergonomic Keyboard',
            price: 150,
            description: 'Comfortable typing for long work sessions.',
            imageUrl: 'images/keyboard.jpg'
        },
        {
            name: 'Gaming Mouse',
            price: 85,
            description: 'Precision and durability for gamers.',
            imageUrl: 'images/mouse.jpg'
        },
        {
            name: 'HD Monitor',
            price: 200,
            description: 'Crisp visuals for gaming and video editing.',
            imageUrl: 'images/monitor.jpg'
        },
        {
            name: 'Bluetooth Speaker',
            price: 120,
            description: 'Portable sound with deep bass.',
            imageUrl: 'images/speaker.jpg'
        }
    ];

    products.forEach(product => {
        const addToCartButton = document.createElement('button');
        addToCartButton.textContent = 'Add to Cart';
        addToCartButton.addEventListener('click', () => {
            addToCart(product);
        });

        const productElement = document.createElement('div');
        productElement.classList.add('product');
        productElement.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>$${product.price}</p>
                <p>${product.description}</p>
            </div>
        `;
        productElement.appendChild(addToCartButton);

        document.getElementById('products').appendChild(productElement);
    });
});
