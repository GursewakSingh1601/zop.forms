import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { Form } from "@/lib/models"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== FETCHING FORM ===", params.id)

    // Validate ObjectId format
    if (!params.id || params.id.length !== 24 || !ObjectId.isValid(params.id)) {
      console.error("Invalid form ID format:", params.id)
      return NextResponse.json({ error: "Invalid form ID format" }, { status: 400 })
    }

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")

    const form = await forms.findOne({ _id: new ObjectId(params.id) })

    if (!form) {
      console.error("Form not found:", params.id)
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Check if form is public or user owns it
    const userPayload = getUserFromRequest(request)
    const isOwner = userPayload && userPayload.userId === form.userId
    const isPublic = form.settings.isPublic

    if (!isPublic && !isOwner) {
      console.error("Form not accessible - not public and user doesn't own it")
      return NextResponse.json({ error: "Form not accessible" }, { status: 403 })
    }

    console.log("Form found and accessible:", form.title)
    return NextResponse.json({
      form: {
        ...form,
        id: form._id!.toString(),
      },
    })
  } catch (error) {
    console.error("Get form error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== UPDATING FORM ===", params.id)

    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
    }

    const formData = await request.json()
    const db = await getDatabase()
    const forms = db.collection<Form>("forms")

    // Check if user owns the form
    const existingForm = await forms.findOne({
      _id: new ObjectId(params.id),
      userId: userPayload.userId,
    })

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found or access denied" }, { status: 404 })
    }

    const updateData = {
      title: formData.title,
      description: formData.description,
      fields: formData.fields,
      settings: formData.settings,
      updatedAt: new Date(),
    }

    await forms.updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })
    console.log("Form updated successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== DELETING FORM ===", params.id)

    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")

    // Check if user owns the form
    const result = await forms.deleteOne({
      _id: new ObjectId(params.id),
      userId: userPayload.userId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Form not found or access denied" }, { status: 404 })
    }

    // Also delete all responses for this form
    const responses = db.collection("responses")
    await responses.deleteMany({ formId: params.id })

    console.log("Form and responses deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
