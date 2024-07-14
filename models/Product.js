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
        trim: true,
        unique: true
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
    this.stock -= quantity;
    return this.save();
};

// Method to add a review
productSchema.methods.addReview = async function(userId, rating, comment) {
    const review = { user: userId, rating, comment };
    this.reviews.push(review);
    await this.calculateAverageRating();
    return this.save();
};

// Method to calculate and update average rating
productSchema.methods.calculateAverageRating = async function() {
    if (this.reviews.length > 0) {
        this.ratings.average = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviews.length;
    } else {
        this.ratings.average = 0;
    }
    this.ratings.count = this.reviews.length;
    await this.save();
};

// Method to soft delete a product
productSchema.methods.softDelete = function() {
    this.deleted = true;
    return this.save();
};

// Method to search products by name, description, category, or tags
productSchema.statics.search = function(query) {
    const regex = new RegExp(query, 'i'); // i for case insensitive
    return this.find({
        $or: [
            { name: regex },
            { description: regex },
            { category: regex },
            { tags: regex }
        ]
    });
};

// Method to filter products by category
productSchema.statics.filterByCategory = function(category) {
    return this.find({ category });
};

// Method to get featured products
productSchema.statics.getFeaturedProducts = function() {
    return this.find({ isFeatured: true });
};

// Method to get products with pagination
productSchema.statics.getPaginatedProducts = function(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find()
        .skip(skip)
        .limit(limit);
};

// Method to get discounted products
productSchema.statics.getDiscountedProducts = function() {
    return this.find({ discount: { $gt: 0 } });
};

// Method to get products by price range
productSchema.statics.getProductsByPriceRange = function(minPrice, maxPrice) {
    return this.find({ price: { $gte: minPrice, $lte: maxPrice } });
};

// Method to get products by rating
productSchema.statics.getProductsByRating = function(minRating) {
    return this.find({ 'ratings.average': { $gte: minRating } });
};

// Method to get products by tags
productSchema.statics.getProductsByTags = function(tags) {
    return this.find({ tags: { $in: tags } });
};

// Method to perform bulk update of stock
productSchema.statics.bulkUpdateStock = async function(productUpdates) {
    const bulkOps = productUpdates.map(update => ({
        updateOne: {
            filter: { _id: update.id },
            update: { $inc: { stock: update.quantity } }
        }
    }));
    return this.bulkWrite(bulkOps);
};

// Method to bulk delete products
productSchema.statics.bulkDelete = async function(productIds) {
    const bulkOps = productIds.map(id => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { deleted: true } }
        }
    }));
    return this.bulkWrite(bulkOps);
};

// Method to handle product recommendations based on category and tags
productSchema.statics.getRecommendedProducts = function(category, tags) {
    return this.find({ 
        category, 
        tags: { $in: tags },
        deleted: false 
    }).limit(10);
};

// Method to get product count by category
productSchema.statics.getProductCountByCategory = function() {
    return this.aggregate([
        { $match: { deleted: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
};

module.exports = mongoose.model('Product', productSchema);
