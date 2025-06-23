import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getUserFromRequest, hashPassword } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, currentPassword, newPassword } = await request.json()
    const db = await getDatabase()

    const user = await db.collection("users").findOne({ _id: new ObjectId(userPayload.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: any = {}

    if (name && name !== user.name) {
      updateData.name = name
    }

    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await db.collection("users").findOne({
        email,
        _id: { $ne: new ObjectId(userPayload.userId) },
      })
      if (existingUser) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
      updateData.email = email
    }

    if (currentPassword && newPassword) {
      const { comparePassword } = await import("@/lib/auth")
      const isValidPassword = await comparePassword(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      updateData.password = await hashPassword(newPassword)
    }

    if (Object.keys(updateData).length > 0) {
      await db.collection("users").updateOne({ _id: new ObjectId(userPayload.userId) }, { $set: updateData })
    }

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
