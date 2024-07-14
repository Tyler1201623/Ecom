const express = require('express');
const router = express.Router();
const braintree = require('braintree');
const nodemailer = require('nodemailer');
const paypal = require('@paypal/checkout-server-sdk');
const { check, validationResult } = require('express-validator');
const Order = require('../models/Order');

// Braintree Configuration
const gateway = braintree.connect({
    environment: braintree.Environment.Sandbox, // Use 'braintree.Environment.Production' for production
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

// PayPal Configuration
let environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
let client = new paypal.core.PayPalHttpClient(environment);

// Cash App (Placeholder, as Cash App doesn't provide public API for payments)
const cashAppPayment = (amount) => {
    // Implement Cash App payment integration logic here
    return { success: true, transactionId: 'CASHAPP12345' }; // Placeholder response
};

// Generate Braintree client token
router.get('/token', (req, res) => {
    gateway.clientToken.generate({}, (err, response) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send({ clientToken: response.clientToken });
    });
});

// Checkout route
router.post('/', [
    check('fullName', 'Full name is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty(),
    check('city', 'City is required').not().isEmpty(),
    check('state', 'State is required').not().isEmpty(),
    check('zip', 'ZIP code is required').not().isEmpty(),
    check('country', 'Country is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('paymentMethod', 'Payment method is required').not().isEmpty(),
    check('amount', 'Amount is required and should be a number').isFloat({ gt: 0 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { paymentMethod, paymentMethodNonce, amount, fullName, address, city, state, zip, country, cart, email } = req.body;

    try {
        let paymentResult;

        if (paymentMethod === 'braintree') {
            paymentResult = await gateway.transaction.sale({
                amount,
                paymentMethodNonce,
                options: { submitForSettlement: true }
            });
        } else if (paymentMethod === 'paypal') {
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{ amount: { currency_code: 'USD', value: amount } }]
            });

            const response = await client.execute(request);
            paymentResult = {
                success: true,
                transaction: { id: response.result.id }
            };
        } else if (paymentMethod === 'cashapp') {
            paymentResult = cashAppPayment(amount);
        } else {
            return res.status(400).send({ success: false, message: 'Invalid payment method' });
        }

        if (paymentResult.success) {
            const order = new Order({
                fullName,
                address,
                city,
                state,
                zip,
                country,
                orderItems: cart,
                orderStatus: 'Completed',
                paymentMethod,
                paymentIntentId: paymentResult.transaction.id
            });

            await order.save();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const customerMailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Order Confirmation',
                text: `Thank you for your order, ${fullName}! Your order ID is ${order._id}.`
            };

            const adminMailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL, // Admin email address
                subject: 'New Order Received',
                text: `A new order has been placed by ${fullName}. Order ID: ${order._id}.`
            };

            await transporter.sendMail(customerMailOptions);
            await transporter.sendMail(adminMailOptions);

            res.send({ success: true, message: 'Order placed successfully' });
        } else {
            res.status(500).send({ success: false, message: 'Payment failed', error: paymentResult.message });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).send({ success: false, message: 'Failed to place order', error: error.message });
    }
});

module.exports = router;
