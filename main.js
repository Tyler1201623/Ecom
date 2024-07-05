document.addEventListener('DOMContentLoaded', () => {
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const searchBar = document.getElementById('searchBar');
    const cartButton = document.getElementById('cartButton');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const profileButton = document.getElementById('profileButton');
    const wishlistButton = document.getElementById('wishlistButton');
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm1');
    const closeAuthModal = authModal.querySelector('.close');
    const productModal = document.getElementById('productModal');
    const closeProductModal = productModal.querySelector('.close');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyCartButton = document.getElementById('emptyCartButton');
    const applyDiscountButton = document.getElementById('applyDiscountButton');
    const checkoutButton = document.getElementById('checkoutButton'); // Add this line

    // Redirect to login and register pages
    loginButton.addEventListener('click', () => {
        window.location.href = 'Login.html';
    });

    registerButton.addEventListener('click', () => {
        window.location.href = 'create.html';
    });

    // Fetch products from the product_details.json
    async function fetchProducts() {
        try {
            const response = await fetch('product_details.json');
            const products = await response.json();

            const productsContainer = document.getElementById('products');
            productsContainer.innerHTML = '';
            products.forEach(product => {
                const productElement = document.createElement('div');
                productElement.classList.add('product');
                productElement.dataset.price = product.price;
                productElement.dataset.name = product.name;
                productElement.dataset.imageUrl = `images/${product.imageUrl}`;
                productElement.innerHTML = `
                    <img src="images/${product.imageUrl}" alt="${product.name}">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p>$${product.price}</p>
                        <p>${product.description}</p>
                        <button class="add-to-cart">Add to Cart</button>
                    </div>
                `;
                productsContainer.appendChild(productElement);
            });
            attachProductEventListeners();
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    // Attach event listeners to product elements
    function attachProductEventListeners() {
        const productElements = document.querySelectorAll('.product');
        productElements.forEach(product => {
            const button = product.querySelector('.add-to-cart');
            const name = product.querySelector('h3').textContent;
            const price = parseFloat(product.dataset.price);
            const description = product.querySelector('p').textContent;
            const imageUrl = product.dataset.imageUrl;

            button.addEventListener('click', (event) => {
                event.stopPropagation();
                window.cart.addToCart({ name, price, description, imageUrl });
                showNotification('Product added to cart');
            });
        });
    }

    // Filter products by price range
    priceRange.addEventListener('input', () => {
        const maxPrice = priceRange.value;
        priceValue.textContent = `Max Price: $${maxPrice}`;
        const productElements = document.querySelectorAll('.product');
        productElements.forEach(product => {
            const productPrice = parseInt(product.dataset.price);
            product.style.display = (productPrice > maxPrice) ? 'none' : 'block';
        });
    });

    // Search products
    searchBar.addEventListener('input', () => {
        const query = searchBar.value.toLowerCase();
        const productElements = document.querySelectorAll('.product');
        productElements.forEach(product => {
            const productName = product.dataset.name.toLowerCase();
            product.style.display = (productName.includes(query)) ? 'block' : 'none';
        });
    });

    // Auth modal functionality
    closeAuthModal.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.email.value;
        const password = event.target.password.value;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = 'index.html';
            } else {
                alert('Login failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        authModal.style.display = 'none';
    });

    // Product modal functionality
    closeProductModal.addEventListener('click', () => {
        productModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === productModal) {
            productModal.style.display = 'none';
        }
    });

    // Dark mode toggle
    darkModeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });

    // Initialize cart and products
    window.cart.loadCart();
    fetchProducts();

    // Empty cart functionality
    emptyCartButton.addEventListener('click', () => {
        window.cart.emptyCart();
        showNotification('Cart emptied');
    });

    // Apply discount functionality
    applyDiscountButton.addEventListener('click', () => {
        const discountCodeInput = document.getElementById('discountCodeInput').value;
        window.cart.applyDiscount(discountCodeInput);
    });

    // Redirect to checkout page
    checkoutButton.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
});

window.cart = {
    items: [],
    discounts: {
        'DISCOUNT10': 0.1,
        'DISCOUNT20': 0.2
    },
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
    emptyCart: function() {
        this.items = [];
        this.saveCart();
        this.updateCartDisplay();
    },
    applyDiscount: function(code) {
        const discount = this.discounts[code];
        if (discount) {
            this.items = this.items.map(item => ({
                ...item,
                price: item.price * (1 - discount)
            }));
            this.saveCart();
            this.updateCartDisplay();
            showNotification(`Discount ${code} applied!`);
        } else {
            showNotification('Invalid discount code');
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
                    </div>
                `;
                cartItemsSummary.appendChild(li);
                total += item.price * item.quantity;
            });
            cartTotal.textContent = `Total: $${total.toFixed(2)} USD`;
        }
    }
};

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
