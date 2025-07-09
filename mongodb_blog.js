// MongoDB Blogging Application - Node.js Implementation
// Simplified script demonstrating CRUD operations for blogging platform

const { MongoClient, ObjectId } = require("mongodb");

// MongoDB connection configuration
const MONGODB_URI = "mongodb://localhost:27017";
const DATABASE_NAME = "blogging_app";

class BlogApp {
  constructor() {
    this.client = null;
    this.db = null;
  }

  // Connect to MongoDB
  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DATABASE_NAME);
      console.log("✅ Connected to MongoDB");

      // Create indexes for performance
      await this.createIndexes();
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  // Create database indexes
  async createIndexes() {
    const users = this.db.collection("users");
    const posts = this.db.collection("posts");

    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });
    await posts.createIndex({ "author.userId": 1 });
    await posts.createIndex({ createdAt: -1 });
    await posts.createIndex({ slug: 1 }, { unique: true });
    await posts.createIndex({ isPublished: 1 });

    console.log("✅ Database indexes created");
  }

  // Clean database for fresh start
  async cleanDatabase() {
    await this.db.collection("users").deleteMany({});
    await this.db.collection("posts").deleteMany({});
    console.log("🧹 Database cleaned");
  }

  // Check if database has existing data
  async hasExistingData() {
    const userCount = await this.db.collection("users").countDocuments();
    const postCount = await this.db.collection("posts").countDocuments();
    return userCount > 0 || postCount > 0;
  }

  // Create a new user
  async createUser(userData) {
    const users = this.db.collection("users");
    const user = {
      username: userData.username,
      email: userData.email,
      passwordHash: userData.passwordHash,
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio || "",
        avatarUrl: userData.avatarUrl || "",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const result = await users.insertOne(user);
    console.log(`👤 Created user: ${user.username}`);
    return { ...user, _id: result.insertedId };
  }

  // Create a new blog post
  async createPost(postData, author) {
    const posts = this.db.collection("posts");
    const post = {
      title: postData.title,
      description: postData.description,
      imageUrl: postData.imageUrl || "",
      slug: postData.slug,
      author: {
        userId: author._id,
        username: author.username,
        displayName: `${author.profile.firstName} ${author.profile.lastName}`,
      },
      likes: [],
      comments: [],
      stats: {
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true,
    };

    const result = await posts.insertOne(post);
    console.log(`📝 Created post: ${post.title}`);
    return { ...post, _id: result.insertedId };
  }

  // Add a like to a post
  async addLike(postId, user) {
    const posts = this.db.collection("posts");

    // Check if user already liked this post
    const existingLike = await posts.findOne({
      _id: new ObjectId(postId),
      "likes.userId": user._id,
    });

    if (existingLike) {
      console.log(`⚠️ User ${user.username} already liked this post`);
      return false;
    }

    // Add like
    const result = await posts.updateOne(
      { _id: new ObjectId(postId) },
      {
        $push: {
          likes: {
            userId: user._id,
            username: user.username,
            likedAt: new Date(),
          },
        },
        $inc: { "stats.likeCount": 1 },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`❤️ ${user.username} liked the post`);
      return true;
    }
    return false;
  }

  // Add a comment to a post
  async addComment(postId, user, content, parentCommentId = null) {
    const posts = this.db.collection("posts");
    const comment = {
      commentId: new ObjectId(),
      userId: user._id,
      username: user.username,
      content: content,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      replies: [],
    };

    let updateQuery;
    if (parentCommentId) {
      // Add reply to existing comment
      updateQuery = {
        $push: {
          "comments.$[comment].replies": {
            commentId: new ObjectId(),
            userId: user._id,
            username: user.username,
            content: content,
            createdAt: new Date(),
            isDeleted: false,
          },
        },
        $inc: { "stats.commentCount": 1 },
        $set: { updatedAt: new Date() },
      };
    } else {
      // Add new top-level comment
      updateQuery = {
        $push: { comments: comment },
        $inc: { "stats.commentCount": 1 },
        $set: { updatedAt: new Date() },
      };
    }

    const result = await posts.updateOne(
      { _id: new ObjectId(postId) },
      updateQuery,
      parentCommentId
        ? {
            arrayFilters: [
              { "comment.commentId": new ObjectId(parentCommentId) },
            ],
          }
        : {},
    );

    if (result.modifiedCount > 0) {
      console.log(`💬 ${user.username} added a comment`);
      return true;
    }
    return false;
  }

  // Get all published posts
  async getAllPosts() {
    const posts = this.db.collection("posts");
    return await posts
      .find({ isPublished: true })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Get posts by user
  async getPostsByUser(userId) {
    const posts = this.db.collection("posts");
    return await posts
      .find({ "author.userId": new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Get trending posts (by engagement score)
  async getTrendingPosts(limit = 5) {
    const posts = this.db.collection("posts");
    return await posts
      .aggregate([
        { $match: { isPublished: true } },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ["$stats.likeCount", 2] },
                { $multiply: ["$stats.commentCount", 3] },
                { $multiply: ["$stats.viewCount", 0.1] },
              ],
            },
          },
        },
        { $sort: { engagementScore: -1 } },
        { $limit: limit },
      ])
      .toArray();
  }

  // Search posts by title
  async searchPosts(query) {
    const posts = this.db.collection("posts");
    return await posts
      .find({
        title: { $regex: query, $options: "i" },
        isPublished: true,
      })
      .toArray();
  }

  // Get user statistics
  async getUserStats(userId) {
    const posts = this.db.collection("posts");
    const stats = await posts
      .aggregate([
        { $match: { "author.userId": new ObjectId(userId) } },
        {
          $group: {
            _id: "$author.userId",
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: "$stats.likeCount" },
            totalComments: { $sum: "$stats.commentCount" },
            totalViews: { $sum: "$stats.viewCount" },
          },
        },
      ])
      .toArray();

    return stats.length > 0
      ? stats[0]
      : {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          totalViews: 0,
        };
  }

  // Close database connection
  async close() {
    if (this.client) {
      await this.client.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
}

// Demo function to showcase the blogging application
async function runDemo(cleanDB = false) {
  const blog = new BlogApp();

  try {
    // Connect to database
    await blog.connect();

    // Check if we should clean or preserve existing data
    const hasData = await blog.hasExistingData();

    if (cleanDB || !hasData) {
      await blog.cleanDatabase();
      console.log("\n🚀 Starting Blogging App Demo (Fresh Data)\n");
    } else {
      console.log("\n🚀 Starting Blogging App Demo (Using Existing Data)\n");
    }

    // Create users
    const john = await blog.createUser({
      username: "johndoe",
      email: "john@example.com",
      passwordHash: "$2y$10$examplehash1",
      firstName: "John",
      lastName: "Doe",
      bio: "Tech enthusiast and blogger",
    });

    const jane = await blog.createUser({
      username: "janedoe",
      email: "jane@example.com",
      passwordHash: "$2y$10$examplehash2",
      firstName: "Jane",
      lastName: "Doe",
      bio: "Travel blogger and photographer",
    });

    const mike = await blog.createUser({
      username: "mikejohnson",
      email: "mike@example.com",
      passwordHash: "$2y$10$examplehash3",
      firstName: "Mike",
      lastName: "Johnson",
      bio: "Food lover and recipe writer",
    });

    // Create posts
    const post1 = await blog.createPost(
      {
        title: "Getting Started with Database Design",
        description:
          "A comprehensive guide to designing efficient databases for modern applications.",
        slug: "getting-started-database-design",
        imageUrl: "https://example.com/images/database-design.jpg",
      },
      john,
    );

    const post2 = await blog.createPost(
      {
        title: "My Journey Through Southeast Asia",
        description:
          "Amazing experiences and hidden gems discovered during my 3-month backpacking trip.",
        slug: "journey-southeast-asia",
        imageUrl: "https://example.com/images/travel.jpg",
      },
      jane,
    );

    const post3 = await blog.createPost(
      {
        title: "The Perfect Chocolate Chip Cookie Recipe",
        description:
          "After 50 attempts, I finally found the secret to the perfect cookie.",
        slug: "perfect-chocolate-chip-cookie",
        imageUrl: "https://example.com/images/cookies.jpg",
      },
      mike,
    );

    // Add likes
    await blog.addLike(post1._id, jane);
    await blog.addLike(post1._id, mike);
    await blog.addLike(post2._id, john);
    await blog.addLike(post2._id, mike);
    await blog.addLike(post3._id, john);
    await blog.addLike(post3._id, jane);

    // Add comments
    await blog.addComment(
      post1._id,
      jane,
      "Great article! Really helped me understand normalization better.",
    );
    await blog.addComment(
      post1._id,
      mike,
      "Thanks for sharing. Could you do a follow-up on indexing strategies?",
    );
    await blog.addComment(
      post2._id,
      john,
      "Your photos are incredible! Southeast Asia is definitely on my bucket list now.",
    );
    await blog.addComment(
      post3._id,
      john,
      "Just tried this recipe and it worked perfectly! Thanks for sharing.",
    );

    // Add a reply
    const post1Updated = await blog.db
      .collection("posts")
      .findOne({ _id: post1._id });
    const firstCommentId = post1Updated.comments[0].commentId;
    await blog.addComment(
      post1._id,
      john,
      "Thanks! An indexing guide is definitely on my todo list.",
      firstCommentId,
    );

    console.log("\n📊 Demo Results:");
    console.log("================");

    // Show all posts
    console.log("\n📝 All Posts:");
    const allPosts = await blog.getAllPosts();
    allPosts.forEach((post) => {
      console.log(`- "${post.title}" by ${post.author.displayName}`);
      console.log(
        `  Likes: ${post.stats.likeCount}, Comments: ${post.stats.commentCount}`,
      );
    });

    // Show trending posts
    console.log("\n🔥 Trending Posts:");
    const trending = await blog.getTrendingPosts(3);
    trending.forEach((post, index) => {
      console.log(
        `${index + 1}. "${post.title}" by ${post.author.displayName}`,
      );
      console.log(`   Engagement Score: ${Math.round(post.engagementScore)}`);
    });

    // Show user statistics
    console.log("\n👤 User Statistics:");
    const johnStats = await blog.getUserStats(john._id);
    console.log(
      `John: ${johnStats.totalPosts} posts, ${johnStats.totalLikes} likes received`,
    );

    // Search functionality
    console.log('\n🔍 Search Results for "database":');
    const searchResults = await blog.searchPosts("database");
    searchResults.forEach((post) => {
      console.log(`- "${post.title}" by ${post.author.displayName}`);
    });

    console.log("\n✅ Demo completed successfully!");
    console.log("📈 MongoDB demonstrates excellent performance for:");
    console.log("   • Single-query data retrieval");
    console.log("   • Embedded document relationships");
    console.log("   • Flexible schema evolution");
    console.log("   • Horizontal scaling capabilities");

    const finalUserCount = await blog.db.collection("users").countDocuments();
    const finalPostCount = await blog.db.collection("posts").countDocuments();
    console.log(
      `\n📊 Database State: ${finalUserCount} users, ${finalPostCount} posts`,
    );
    console.log('💾 Data persisted in MongoDB "blogging_app" database');
  } catch (error) {
    console.error("❌ Demo error:", error);
  } finally {
    await blog.close();
  }
}

// Run the demo
if (require.main === module) {
  // Check command line arguments
  const cleanDB = process.argv.includes("--clean");

  if (cleanDB) {
    console.log("🧹 Running with --clean flag (will delete existing data)");
  } else {
    console.log("💾 Running in persistence mode (preserves existing data)");
    console.log('   Use "node mongodb_blog.js --clean" to start fresh');
  }

  runDemo(cleanDB).catch(console.error);
}

module.exports = BlogApp;
