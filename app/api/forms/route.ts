import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import type { Form } from "@/lib/models"

export async function GET(request: NextRequest) {
  try {
    console.log("=== FETCHING USER FORMS ===")

    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      console.error("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", userPayload.email)

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")
    const responses = db.collection("responses")

    console.log("Fetching forms for user:", userPayload.userId)

    const userForms = await forms.find({ userId: userPayload.userId }).sort({ updatedAt: -1 }).toArray()
    console.log("Found forms:", userForms.length)

    // Get response counts for each form
    const formsWithCounts = await Promise.all(
      userForms.map(async (form) => {
        const responseCount = await responses.countDocuments({
          formId: form._id!.toString(),
        })

        return {
          id: form._id!.toString(),
          title: form.title,
          description: form.description,
          fields: form.fields,
          settings: form.settings,
          responses: responseCount,
          status: form.isActive ? "active" : "inactive",
          createdAt: form.createdAt.toISOString().split("T")[0],
          updatedAt: form.updatedAt.toISOString(),
        }
      }),
    )

    console.log("Forms with response counts prepared")
    return NextResponse.json({ forms: formsWithCounts })
  } catch (error) {
    console.error("Get forms error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATING NEW FORM ===")

    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      console.error("Unauthorized form creation attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.json()
    console.log("Form data received:", {
      title: formData.title,
      fieldsCount: formData.fields?.length || 0,
    })

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")

    const newForm: Omit<Form, "_id"> = {
      title: formData.title || "Untitled Form",
      description: formData.description || "",
      fields: formData.fields || [],
      settings: {
        allowMultipleSubmissions: false,
        showProgressBar: true,
        collectEmail: false,
        isQuiz: false,
        showResults: true,
        isPublic: true,
        requireAuth: false,
        ...formData.settings,
      },
      userId: userPayload.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      responseCount: 0,
      isActive: true,
    }

    const result = await forms.insertOne(newForm)
    console.log("Form created with ID:", result.insertedId.toString())

    return NextResponse.json({
      success: true,
      form: {
        ...newForm,
        id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("Create form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
