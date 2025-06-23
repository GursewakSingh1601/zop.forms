import { NextResponse } from "next/server"
import { testDatabaseConnection, getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("=== DATABASE TEST API CALLED ===")

    // Test basic connection
    const isConnected = await testDatabaseConnection()

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection test failed",
          details: "Could not perform basic database operations",
        },
        { status: 500 },
      )
    }

    // Get additional database info
    const db = await getDatabase()
    const stats = await db.stats()
    const collections = await db.listCollections().toArray()

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      details: {
        databaseName: db.databaseName,
        collections: collections.map((c) => c.name),
        stats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
        },
      },
    })
  } catch (error) {
    console.error("Database test API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
