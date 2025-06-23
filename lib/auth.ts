import type { NextRequest } from "next/server"

const JWT_SECRET = process.env.JWT || "zopforms-secret-key-2024"

export interface User {
  _id: string
  email: string
  name: string
  createdAt: Date
}

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export function generateToken(payload: JWTPayload): string {
  try {
    console.log("Generating token for user:", payload.email)

    const header = {
      alg: "HS256",
      typ: "JWT",
    }

    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    }

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url")
    const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url")

    // Create signature using a simple hash
    const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).toString("base64url")

    const token = `${encodedHeader}.${encodedPayload}.${signature}`
    console.log("Token generated successfully")
    return token
  } catch (error) {
    console.error("Error generating token:", error)
    throw new Error("Failed to generate authentication token")
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log("Verifying token...")
    const parts = token.split(".")
    if (parts.length !== 3) {
      console.log("Invalid token format")
      return null
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())
    console.log("Token payload decoded:", { userId: payload.userId, email: payload.email })

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log("Token expired")
      return null
    }

    // Verify signature
    const expectedSignature = Buffer.from(`${parts[0]}.${parts[1]}.${JWT_SECRET}`).toString("base64url")
    if (parts[2] !== expectedSignature) {
      console.log("Invalid token signature")
      return null
    }

    console.log("Token verified successfully")
    return payload
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  try {
    console.log("Hashing password...")

    // Use Node.js crypto for server-side hashing
    if (typeof window === "undefined") {
      const crypto = require("crypto")
      const hash = crypto.createHash("sha256")
      hash.update(password + JWT_SECRET)
      const hashedPassword = hash.digest("hex")
      console.log("Password hashed successfully (server-side)")
      return hashedPassword
    } else {
      // Browser fallback (though this shouldn't be used on client)
      const encoder = new TextEncoder()
      const data = encoder.encode(password + JWT_SECRET)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
      console.log("Password hashed successfully (client-side)")
      return hashedPassword
    }
  } catch (error) {
    console.error("Error hashing password:", error)
    throw new Error("Failed to hash password")
  }
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    console.log("Comparing password...")
    const hashedInput = await hashPassword(password)
    const isMatch = hashedInput === hashedPassword
    console.log("Password comparison result:", isMatch)
    return isMatch
  } catch (error) {
    console.error("Error comparing password:", error)
    return false
  }
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  try {
    const token =
      request.cookies.get("auth-token")?.value || request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      console.log("No token found in request")
      return null
    }

    console.log("Token found, verifying...")
    return verifyToken(token)
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}
