const mongoose = require('mongoose');
const slugify = require('slugify');

// Review Schema
const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
}, { timestamps: true });

// Product Schema
const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Product name is required'],
        trim: true
    },
    price: { 
        type: Number, 
        required: [true, 'Product price is required'],
        min: [0, 'Price must be positive']
    },
    description: { 
        type: String, 
        required: [true, 'Product description is required'] 
    },
    imageUrl: { 
        type: String, 
        required: [true, 'Product image URL is required'] 
    },
    category: { 
        type: String, 
        required: [true, 'Product category is required']
    },
    stock: { 
        type: Number, 
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock must be positive']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount must be positive'],
        max: [100, 'Discount cannot exceed 100']
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    tags: {
        type: [String],
        default: []
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: [0, 'Rating must be positive'],
            max: [5, 'Rating cannot exceed 5']
        },
        count: {
            type: Number,
            default: 0,
            min: [0, 'Rating count must be positive']
        }
    },
    reviews: [reviewSchema],
    deleted: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

// Middleware to generate slug from product name
productSchema.pre('save', function(next) {
    if (!this.isModified('name')) {
        return next();
    }
    this.slug = slugify(this.name, { lower: true, strict: true });
    next();
});

// Middleware for soft delete
productSchema.pre(/^find/, function(next) {
    this.where({ deleted: false });
    next();
});

// Virtual for calculating the effective price after discount
productSchema.virtual('effectivePrice').get(function() {
    return this.price * (1 - this.discount / 100);
});

// Method to update product stock
productSchema.methods.updateStock = function(quantity) {
    this.stock = this.stock - quantity;
    return this.save();
};

// Method to add a review
productSchema.methods.addReview = function(userId, rating, comment) {
    const review = { user: userId, rating, comment };
    this.reviews.push(review);
    this.ratings.count = this.reviews.length;
    this.ratings.average = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviews.length;
    return this.save();
};

// Method to calculate and update average rating
productSchema.methods.calculateAverageRating = function() {
    if (this.reviews.length > 0) {
        this.ratings.average = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviews.length;
    } else {
        this.ratings.average = 0;
    }
    this.ratings.count = this.reviews.length;
    return this.save();
};

// Method to soft delete a product
productSchema.methods.softDelete = function() {
    this.deleted = true;
    return this.save();
};

module.exports = mongoose.model('Product', productSchema);
