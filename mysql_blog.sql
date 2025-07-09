-- Exercise 3: MySQL Implementation for Blogging Application
-- Simplified schema focusing on core requirements from Exercise 1

-- ============================================================================
-- DATABASE SETUP
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS blogging_app;
USE blogging_app;

-- Drop existing tables for clean start
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Users table - stores basic user information
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Posts table - stores blog posts
CREATE TABLE posts (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    slug VARCHAR(250) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT TRUE,

    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_published (is_published),
    INDEX idx_slug (slug)
);

-- Likes table - tracks user likes on posts
CREATE TABLE likes (
    like_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,

    -- Prevent duplicate likes
    UNIQUE KEY unique_user_post_like (user_id, post_id),

    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id)
);

-- Comments table - stores user comments on posts
CREATE TABLE comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_parent_comment_id (parent_comment_id)
);

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================

-- Insert sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, bio) VALUES
('johndoe', 'john@example.com', '$2y$10$examplehash1', 'John', 'Doe', 'Tech enthusiast and blogger'),
('janedoe', 'jane@example.com', '$2y$10$examplehash2', 'Jane', 'Doe', 'Travel blogger and photographer'),
('mikejohnson', 'mike@example.com', '$2y$10$examplehash3', 'Mike', 'Johnson', 'Food lover and recipe writer'),
('sarahwilson', 'sarah@example.com', '$2y$10$examplehash4', 'Sarah', 'Wilson', 'Digital marketing specialist');

-- Insert sample posts
INSERT INTO posts (user_id, title, description, slug, image_url) VALUES
(1, 'Getting Started with Database Design',
 'A comprehensive guide to designing efficient databases for modern applications. This post covers normalization, relationships, and best practices.',
 'getting-started-database-design',
 'https://example.com/images/database-design.jpg'),

(2, 'My Journey Through Southeast Asia',
 'Amazing experiences and hidden gems discovered during my 3-month backpacking trip through Thailand, Vietnam, and Cambodia.',
 'journey-southeast-asia',
 'https://example.com/images/southeast-asia.jpg'),

(3, 'The Perfect Chocolate Chip Cookie Recipe',
 'After 50 attempts, I finally found the secret to the perfect cookie. Here is my foolproof recipe with tips and tricks.',
 'perfect-chocolate-chip-cookie',
 'https://example.com/images/cookies.jpg'),

(4, '10 Digital Marketing Trends for 2024',
 'Stay ahead of the curve with these emerging digital marketing trends that will shape the industry in 2024.',
 'digital-marketing-trends-2024',
 'https://example.com/images/marketing-trends.jpg');

-- Insert sample likes
INSERT INTO likes (user_id, post_id) VALUES
(2, 1), -- Jane likes John's database post
(3, 1), -- Mike likes John's database post
(4, 1), -- Sarah likes John's database post
(1, 2), -- John likes Jane's travel post
(3, 2), -- Mike likes Jane's travel post
(4, 2), -- Sarah likes Jane's travel post
(1, 3), -- John likes Mike's cookie post
(2, 3), -- Jane likes Mike's cookie post
(1, 4), -- John likes Sarah's marketing post
(2, 4); -- Jane likes Sarah's marketing post

-- Insert sample comments
INSERT INTO comments (user_id, post_id, content) VALUES
(2, 1, 'Great article! Really helped me understand normalization better.'),
(3, 1, 'Thanks for sharing. Could you do a follow-up on indexing strategies?'),
(4, 1, 'This is exactly what I needed for my database project!'),
(1, 2, 'Your photos are incredible! Southeast Asia is definitely on my bucket list now.'),
(3, 2, 'Did you try the street food in Bangkok? It was amazing when I visited!'),
(1, 3, 'Just tried this recipe and it worked perfectly! Thanks for sharing.'),
(2, 3, 'The secret ingredient tip was genius. My cookies turned out amazing!'),
(2, 4, 'Really insightful predictions! Social commerce is definitely trending.');

-- Insert sample comment replies
INSERT INTO comments (user_id, post_id, content, parent_comment_id) VALUES
(1, 1, 'Thanks! An indexing guide is definitely on my todo list.', 2),
(3, 1, 'Looking forward to it! Your tutorials are always top-notch.', 2),
(2, 2, 'Yes! The street food was incredible. Pad Thai at every corner!', 5),
(3, 3, 'Glad it worked for you! The key is using room temperature ingredients.', 6);

-- ============================================================================
-- USEFUL VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for posts with author information and engagement stats
CREATE VIEW post_details AS
SELECT
    p.post_id,
    p.title,
    p.description,
    p.image_url,
    p.slug,
    p.created_at,
    p.updated_at,
    p.is_published,
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) as author_name,
    COUNT(DISTINCT l.like_id) as like_count,
    COUNT(DISTINCT CASE WHEN c.is_deleted = FALSE THEN c.comment_id END) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN likes l ON p.post_id = l.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
GROUP BY p.post_id, u.user_id;

-- View for comments with author information
CREATE VIEW comment_details AS
SELECT
    c.comment_id,
    c.post_id,
    c.content,
    c.parent_comment_id,
    c.created_at,
    c.updated_at,
    c.is_deleted,
    u.user_id,
    u.username,
    CONCAT(u.first_name, ' ', u.last_name) as commenter_name,
    p.title as post_title
FROM comments c
JOIN users u ON c.user_id = u.user_id
JOIN posts p ON c.post_id = p.post_id
WHERE c.is_deleted = FALSE;

-- ============================================================================
-- SAMPLE QUERIES TO TEST THE DATABASE
-- ============================================================================

-- 1. Get all published posts with engagement stats
-- SELECT * FROM post_details WHERE is_published = TRUE ORDER BY created_at DESC;

-- 2. Get posts by a specific user
-- SELECT * FROM post_details WHERE user_id = 1 ORDER BY created_at DESC;

-- 3. Check if a user has liked a specific post
-- SELECT COUNT(*) as has_liked FROM likes WHERE user_id = 2 AND post_id = 1;

-- 4. Get most liked posts
-- SELECT post_id, title, author_name, like_count FROM post_details ORDER BY like_count DESC LIMIT 5;

-- 5. Get comments for a specific post (with nested structure)
-- SELECT
--     c.comment_id,
--     c.content,
--     c.parent_comment_id,
--     u.username,
--     CONCAT(u.first_name, ' ', u.last_name) as commenter_name,
--     c.created_at
-- FROM comments c
-- JOIN users u ON c.user_id = u.user_id
-- WHERE c.post_id = 1 AND c.is_deleted = FALSE
-- ORDER BY c.parent_comment_id IS NULL DESC, c.created_at ASC;

-- 6. Get user activity summary
-- SELECT
--     u.username,
--     CONCAT(u.first_name, ' ', u.last_name) as full_name,
--     COUNT(DISTINCT p.post_id) as posts_created,
--     COUNT(DISTINCT l.like_id) as likes_given,
--     COUNT(DISTINCT c.comment_id) as comments_made
-- FROM users u
-- LEFT JOIN posts p ON u.user_id = p.user_id
-- LEFT JOIN likes l ON u.user_id = l.user_id
-- LEFT JOIN comments c ON u.user_id = c.user_id AND c.is_deleted = FALSE
-- GROUP BY u.user_id;

-- 7. Get trending posts (most engagement in last 30 days)
-- SELECT
--     p.title,
--     CONCAT(u.first_name, ' ', u.last_name) as author,
--     COUNT(DISTINCT l.like_id) as recent_likes,
--     COUNT(DISTINCT c.comment_id) as recent_comments,
--     (COUNT(DISTINCT l.like_id) * 2 + COUNT(DISTINCT c.comment_id) * 3) as engagement_score
-- FROM posts p
-- JOIN users u ON p.user_id = u.user_id
-- LEFT JOIN likes l ON p.post_id = l.post_id AND l.created_at >= DATE_SUB(
