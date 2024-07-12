const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const morgan = require('morgan');
const dotenv = require('dotenv');
const compression = require('compression');
const hpp = require('hpp');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlerMiddleware');
const Order = require('./models/Order');
const Product = require('./models/Product');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGINS || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));
app.use(helmet());
app.use(morgan(process.env.LOG_LEVEL || 'common'));
app.use(compression());
app.use(hpp());

if (process.env.HTTPS_REDIRECT === 'true' && process.env.NODE_ENV !== 'development') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(['https://', req.get('Host'), req.url].join(''));
        }
        next();
    });
}

// Rate limiting and slow down
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 50,
    delayMs: 500
});
app.use(speedLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});

app.get('/create.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

// Admin routes for fetching, updating, and deleting products
app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching products', error: err.message });
    }
});

app.put('/api/admin/update/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, description, imageUrl } = req.body;

    try {
        const product = await Product.findByIdAndUpdate(id, { name, price, description, imageUrl }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product updated successfully', product });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating product', error: err.message });
    }
});

app.delete('/api/admin/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findByIdAndRemove(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting product', error: err.message });
    }
});

// Checkout route
app.post('/api/checkout', async (req, res) => {
    const { fullName, address, city, state, zip, country, cardNumber, expiryDate, cvv, cart, email } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: cart.reduce((total, item) => total + item.price * item.quantity, 0) * 100, // Amount in cents
            currency: 'usd',
            payment_method_data: {
                type: 'card',
                card: {
                    number: cardNumber,
                    exp_month: parseInt(expiryDate.split('/')[0]),
                    exp_year: parseInt(expiryDate.split('/')[1]),
                    cvc: cvv,
                },
            },
            confirm: true,
        });

        const order = new Order({
            fullName,
            address,
            city,
            state,
            zip,
            country,
            cart,
            status: 'Completed',
            paymentIntentId: paymentIntent.id,
        });

        await order.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Order Confirmation',
            text: `Thank you for your order, ${fullName}! Your order ID is ${order._id}.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Error sending email:', error);
            }
            console.log('Email sent:', info.response);
        });

        res.send({ success: true, message: 'Order placed successfully' });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).send({ success: false, message: 'Failed to place order', error: error.message });
    }
});

// Catch-all route for handling 404 errors
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
    mongoose.connection.close(() => {
        console.log('Mongoose connection closed');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.disable('etag');

// Run HTTP or HTTPS server
if (process.env.NODE_ENV === 'development') {
    const http = require('http');
    http.createServer(app).listen(port, () => {
        console.log(`HTTP Server is running on http://localhost:${port}`);
    });
} else {
    const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
    };
    https.createServer(sslOptions, app).listen(port, () => {
        console.log(`HTTPS Server is running on https://localhost:${port}`);
    });
}
