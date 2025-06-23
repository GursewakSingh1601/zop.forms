import { MongoClient, type Db } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {
  // Add SSL/TLS options for better compatibility
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // Connection timeout options
  serverSelectionTimeoutMS: 10000, // 10 seconds
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  // Retry options
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10,
  minPoolSize: 1,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    console.log("Creating new MongoDB client for development...")
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  console.log("Creating new MongoDB client for production...")
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(): Promise<Db> {
  try {
    console.log("=== MONGODB CONNECTION ATTEMPT ===")
    console.log("MongoDB URI (masked):", uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"))
    console.log("Connection options:", {
      tls: options.tls,
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      connectTimeoutMS: options.connectTimeoutMS,
    })

    const client = await clientPromise
    console.log("MongoDB client connected successfully")

    // Test the connection
    await client.db("admin").command({ ping: 1 })
    console.log("MongoDB ping successful")

    const db = client.db("zopforms")
    console.log("Connected to database: zopforms")

    // Test database access
    const collections = await db.listCollections().toArray()
    console.log(
      "Available collections:",
      collections.map((c) => c.name),
    )

    return db
  } catch (error) {
    console.error("=== MONGODB CONNECTION FAILED ===")
    console.error("Error type:", error?.constructor?.name)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    // Provide specific error guidance
    if (error instanceof Error) {
      if (error.message.includes("SSL") || error.message.includes("TLS")) {
        console.error("SSL/TLS Error - This is likely a certificate or connection security issue")
        console.error("Suggestions:")
        console.error("1. Check if your MongoDB cluster allows connections from your IP")
        console.error("2. Verify your MongoDB connection string")
        console.error("3. Ensure your cluster is running and accessible")
      } else if (error.message.includes("authentication")) {
        console.error("Authentication Error - Check your username and password")
      } else if (error.message.includes("timeout")) {
        console.error("Timeout Error - Check your network connection and MongoDB cluster status")
      }
    }

    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Add a function to test database connectivity
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("=== TESTING DATABASE CONNECTION ===")
    const db = await getDatabase()

    // Try to perform a simple operation
    const testCollection = db.collection("connection_test")
    const testDoc = { test: true, timestamp: new Date() }

    // Insert test document
    const insertResult = await testCollection.insertOne(testDoc)
    console.log("Test document inserted:", insertResult.insertedId)

    // Read test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId })
    console.log("Test document found:", !!foundDoc)

    // Delete test document
    await testCollection.deleteOne({ _id: insertResult.insertedId })
    console.log("Test document cleaned up")

    console.log("=== DATABASE CONNECTION TEST PASSED ===")
    return true
  } catch (error) {
    console.error("=== DATABASE CONNECTION TEST FAILED ===")
    console.error("Test error:", error)
    return false
  }
}

export async function connectToDatabase() {
  try {
    console.log("=== CONNECTING TO DATABASE ===")
    const client = await clientPromise
    const db = client.db("zopforms")

    console.log("Connected to database: zopforms")
    return { client, db }
  } catch (error) {
    console.error("=== DATABASE CONNECTION FAILED ===")
    console.error("Error:", error)
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
