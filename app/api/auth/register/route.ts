import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth"
import type { User } from "@/lib/models"

export async function POST(request: NextRequest) {
  console.log("=== REGISTRATION ATTEMPT ===")

  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("Request body parsed:", {
        email: body.email,
        name: body.name,
        hasPassword: !!body.password,
      })
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: "Request body must be valid JSON",
        },
        { status: 400 },
      )
    }

    const { email, password, name } = body

    // Validate input
    console.log("Validating input...")
    if (!email || !password || !name) {
      console.error("Missing required fields:", { email: !!email, password: !!password, name: !!name })
      return NextResponse.json(
        {
          error: "Email, password, and name are required",
          details: "All fields must be provided",
        },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      console.error("Password too short:", password.length)
      return NextResponse.json(
        {
          error: "Password must be at least 6 characters long",
          details: `Password length: ${password.length}`,
        },
        { status: 400 },
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email)
      return NextResponse.json(
        {
          error: "Invalid email format",
          details: "Please provide a valid email address",
        },
        { status: 400 },
      )
    }

    // Connect to database with detailed error handling
    console.log("Attempting database connection...")
    let db
    try {
      db = await getDatabase()
      console.log("Database connection successful")
    } catch (dbError) {
      console.error("=== DATABASE CONNECTION ERROR ===")
      console.error("Database error details:", dbError)

      // Provide specific error messages based on error type
      let errorMessage = "Database connection failed"
      let errorDetails = "Unknown database error"

      if (dbError instanceof Error) {
        errorDetails = dbError.message

        if (dbError.message.includes("SSL") || dbError.message.includes("TLS")) {
          errorMessage = "Database SSL/TLS connection failed"
          errorDetails =
            "SSL certificate or connection security issue. Please check your MongoDB cluster configuration."
        } else if (dbError.message.includes("authentication")) {
          errorMessage = "Database authentication failed"
          errorDetails = "Invalid MongoDB credentials. Please check your username and password."
        } else if (dbError.message.includes("timeout")) {
          errorMessage = "Database connection timeout"
          errorDetails = "Could not connect to MongoDB cluster. Please check your network and cluster status."
        } else if (dbError.message.includes("ENOTFOUND") || dbError.message.includes("ECONNREFUSED")) {
          errorMessage = "Database server not found"
          errorDetails = "MongoDB cluster is not accessible. Please check your connection string and cluster status."
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          mongoError: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    const users = db.collection<User>("users")

    // Check if user already exists
    console.log("Checking for existing user...")
    let existingUser
    try {
      existingUser = await users.findOne({ email: email.toLowerCase() })
      console.log("Existing user check completed:", !!existingUser)
    } catch (findError) {
      console.error("Error checking for existing user:", findError)
      return NextResponse.json(
        {
          error: "Database query failed",
          details: "Failed to check for existing user",
        },
        { status: 500 },
      )
    }

    if (existingUser) {
      console.error("User already exists:", email)
      return NextResponse.json(
        {
          error: "User with this email already exists",
          details: "Please use a different email address or try logging in",
        },
        { status: 400 },
      )
    }

    // Hash password
    console.log("Hashing password...")
    let hashedPassword
    try {
      hashedPassword = await hashPassword(password)
      console.log("Password hashed successfully")
    } catch (hashError) {
      console.error("Password hashing failed:", hashError)
      return NextResponse.json(
        {
          error: "Password processing failed",
          details: "Failed to secure password",
        },
        { status: 500 },
      )
    }

    // Create user object
    const newUser: Omit<User, "_id"> = {
      email: email.toLowerCase(),
      name: name.trim(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("Creating new user:", { email: newUser.email, name: newUser.name })

    // Insert user into database
    let result
    try {
      result = await users.insertOne(newUser)
      console.log("User created successfully with ID:", result.insertedId.toString())
    } catch (insertError) {
      console.error("Failed to insert user:", insertError)
      return NextResponse.json(
        {
          error: "Failed to create user account",
          details: insertError instanceof Error ? insertError.message : "Database insertion failed",
        },
        { status: 500 },
      )
    }

    const userId = result.insertedId.toString()

    // Generate JWT token
    console.log("Generating authentication token...")
    let token
    try {
      token = generateToken({ userId, email: newUser.email })
      console.log("Token generated successfully")
    } catch (tokenError) {
      console.error("Token generation failed:", tokenError)
      return NextResponse.json(
        {
          error: "Authentication setup failed",
          details: "Failed to create authentication token",
        },
        { status: 500 },
      )
    }

    // Create response
    const responseData = {
      success: true,
      user: {
        id: userId,
        email: newUser.email,
        name: newUser.name,
      },
      message: "Account created successfully",
    }

    console.log("Creating response with user data:", responseData.user)

    const response = NextResponse.json(responseData)

    // Set HTTP-only cookie
    try {
      response.cookies.set("auth-token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      })
      console.log("Authentication cookie set successfully")
    } catch (cookieError) {
      console.error("Failed to set cookie:", cookieError)
      // Don't fail the request for cookie issues
    }

    console.log("=== REGISTRATION SUCCESSFUL ===")
    return response
  } catch (error) {
    console.error("=== REGISTRATION FAILED ===")
    console.error("Unexpected error during registration:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
