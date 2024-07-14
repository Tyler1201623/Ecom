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
    const authForm = document.getElementById('authForm');
    const closeAuthModal = authModal.querySelector('.close');
    const productModal = document.getElementById('productModal');
    const closeProductModal = productModal.querySelector('.close');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyCartButton = document.getElementById('emptyCartButton');
    const applyDiscountButton = document.getElementById('applyDiscountButton');
    const checkoutButton = document.getElementById('checkoutButton');
    const recommendationsContainer = document.getElementById('recommendations');
    const sortSelect = document.getElementById('sortSelect');
    const notification = document.getElementById('notification');
    const logoutButton = document.getElementById('logoutButton');

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
                showNotification('Product added to cart', 'success');
            });

            product.addEventListener('click', () => {
                showProductModal({ name, price, description, imageUrl });
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
                localStorage.setItem('token', data.token);
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
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Initialize cart and products
    window.cart.loadCart();
    fetchProducts();

    // Load dark mode setting from local storage
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeSwitch.checked = true;
    }

    // Empty cart functionality
    emptyCartButton.addEventListener('click', () => {
        window.cart.emptyCart();
        showNotification('Cart emptied', 'info');
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

    // Enhanced: Personalized Recommendations
    async function fetchRecommendations() {
        try {
            const response = await fetch('/api/recommendations');
            const recommendations = await response.json();

            recommendationsContainer.innerHTML = '';
            recommendations.forEach(recommendation => {
                const recommendationElement = document.createElement('div');
                recommendationElement.classList.add('recommendation');
                recommendationElement.innerHTML = `
                    <img src="images/${recommendation.imageUrl}" alt="${recommendation.name}">
                    <div class="recommendation-info">
                        <h3>${recommendation.name}</h3>
                        <p>$${recommendation.price}</p>
                        <p>${recommendation.description}</p>
                        <button class="add-to-cart">Add to Cart</button>
                    </div>
                `;
                recommendationsContainer.appendChild(recommendationElement);
            });
            attachProductEventListeners();
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        }
    }

    // Load recommendations
    fetchRecommendations();

    // Enhanced: Product Sorting
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const sortValue = sortSelect.value;
            sortProducts(sortValue);
        });
    }

    function sortProducts(criteria) {
        const productsContainer = document.getElementById('products');
        const products = Array.from(productsContainer.children);

        products.sort((a, b) => {
            const priceA = parseFloat(a.dataset.price);
            const priceB = parseFloat(b.dataset.price);

            if (criteria === 'price-asc') {
                return priceA - priceB;
            } else if (criteria === 'price-desc') {
                return priceB - priceA;
            } else if (criteria === 'name-asc') {
                return a.dataset.name.localeCompare(b.dataset.name);
            } else if (criteria === 'name-desc') {
                return b.dataset.name.localeCompare(a.dataset.name);
            }
        });

        products.forEach(product => productsContainer.appendChild(product));
    }

    // Enhanced: User Authentication Handling
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        loginButton.style.display = 'none';
        registerButton.style.display = 'none';
        profileButton.style.display = 'block';
        logoutButton.style.display = 'block';
    } else {
        loginButton.style.display = 'block';
        registerButton.style.display = 'block';
        profileButton.style.display = 'none';
        logoutButton.style.display = 'none';
    }

    // Logout functionality
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});

const cart = {
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
            showNotification(`Discount ${code} applied!`, 'success');
        } else {
            showNotification('Invalid discount code', 'error');
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

window.cart = cart;

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

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

// Checkout functionality
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

function showProductModal(product) {
    const productModal = document.getElementById('productModal');
    productModal.style.display = 'block';
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productImage').src = product.imageUrl;
    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productPrice').textContent = `$${product.price.toFixed(2)}`;

    const addToCartButton = document.getElementById('addToCartFromModal');
    addToCartButton.onclick = () => {
        window.cart.addToCart(product);
        showNotification('Product added to cart', 'success');
        productModal.style.display = 'none';
    };
}
