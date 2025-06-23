import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { comparePassword, generateToken } from "@/lib/auth"
import type { User } from "@/lib/models"

export async function POST(request: NextRequest) {
  console.log("=== LOGIN ATTEMPT ===")

  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("Login request for email:", body.email)
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

    const { email, password } = body

    // Validate input
    if (!email || !password) {
      console.error("Missing credentials:", { email: !!email, password: !!password })
      return NextResponse.json(
        {
          error: "Email and password are required",
          details: "Both email and password must be provided",
        },
        { status: 400 },
      )
    }

    // Connect to database
    console.log("Connecting to database...")
    let db
    try {
      db = await getDatabase()
      console.log("Database connection successful")
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    const users = db.collection<User>("users")

    // Find user by email
    console.log("Looking for user with email:", email.toLowerCase())
    let user
    try {
      user = await users.findOne({ email: email.toLowerCase() })
      console.log("User lookup completed:", !!user)
    } catch (findError) {
      console.error("Error finding user:", findError)
      return NextResponse.json(
        {
          error: "Database query failed",
          details: "Failed to lookup user",
        },
        { status: 500 },
      )
    }

    if (!user) {
      console.error("User not found:", email)
      return NextResponse.json(
        {
          error: "Invalid email or password",
          details: "No account found with this email address",
        },
        { status: 401 },
      )
    }

    // Verify password
    console.log("Verifying password...")
    let isValidPassword
    try {
      isValidPassword = await comparePassword(password, user.password)
      console.log("Password verification result:", isValidPassword)
    } catch (compareError) {
      console.error("Password comparison failed:", compareError)
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: "Failed to verify password",
        },
        { status: 500 },
      )
    }

    if (!isValidPassword) {
      console.error("Invalid password for user:", email)
      return NextResponse.json(
        {
          error: "Invalid email or password",
          details: "Password does not match",
        },
        { status: 401 },
      )
    }

    // Generate JWT token
    console.log("Generating authentication token...")
    let token
    try {
      token = generateToken({
        userId: user._id!.toString(),
        email: user.email,
      })
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
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
      },
      message: "Login successful",
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

    console.log("=== LOGIN SUCCESSFUL ===")
    return response
  } catch (error) {
    console.error("=== LOGIN FAILED ===")
    console.error("Unexpected error during login:", error)
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
