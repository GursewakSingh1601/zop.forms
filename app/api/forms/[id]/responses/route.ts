import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { Form, FormResponse } from "@/lib/models"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== FETCHING FORM RESPONSES ===", params.id)

    const userPayload = getUserFromRequest(request)
    if (!userPayload) {
      console.error("Unauthorized access to form responses")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate ObjectId format
    if (!params.id || params.id.length !== 24 || !ObjectId.isValid(params.id)) {
      console.error("Invalid form ID format:", params.id)
      return NextResponse.json({ error: "Invalid form ID format" }, { status: 400 })
    }

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")
    const responses = db.collection<FormResponse>("responses")

    console.log("Looking for form with ID:", params.id, "for user:", userPayload.userId)

    // Check if user owns the form
    const form = await forms.findOne({
      _id: new ObjectId(params.id),
      userId: userPayload.userId,
    })

    if (!form) {
      console.error("Form not found or access denied. Form ID:", params.id, "User ID:", userPayload.userId)

      // Check if form exists but user doesn't own it
      const formExists = await forms.findOne({ _id: new ObjectId(params.id) })
      if (formExists) {
        return NextResponse.json({ error: "Access denied - you don't own this form" }, { status: 403 })
      }

      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    console.log("Form found:", form.title)

    // Get all responses for this form
    const formResponses = await responses.find({ formId: params.id }).sort({ submittedAt: -1 }).toArray()
    console.log("Found responses:", formResponses.length)

    return NextResponse.json({
      form: {
        ...form,
        id: form._id!.toString(),
      },
      responses: formResponses.map((response) => ({
        ...response,
        id: response._id!.toString(),
      })),
    })
  } catch (error) {
    console.error("Get form responses error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== SUBMITTING FORM RESPONSE ===", params.id)

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
    }

    const { responses: responseData, submitterEmail, submitterName } = await request.json()
    console.log("Response data received:", {
      fieldsCount: Object.keys(responseData || {}).length,
      submitterEmail,
      submitterName,
    })

    const db = await getDatabase()
    const forms = db.collection<Form>("forms")
    const responses = db.collection<FormResponse>("responses")

    // Get the form
    const form = await forms.findOne({ _id: new ObjectId(params.id) })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (!form.isActive) {
      return NextResponse.json({ error: "Form is not accepting responses" }, { status: 400 })
    }

    // Check if multiple submissions are allowed
    if (!form.settings.allowMultipleSubmissions) {
      const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

      const existingResponse = await responses.findOne({
        formId: params.id,
        $or: [{ ipAddress: clientIP }, ...(submitterEmail ? [{ submitterEmail }] : [])],
      })

      if (existingResponse) {
        return NextResponse.json({ error: "You have already submitted a response to this form" }, { status: 400 })
      }
    }

    // Calculate score for quiz forms
    let score = 0
    if (form.settings.isQuiz) {
      for (const field of form.fields) {
        if (field.correctAnswer && responseData[field.id]) {
          const userAnswer = responseData[field.id]
          const correctAnswer = field.correctAnswer

          if (Array.isArray(correctAnswer)) {
            // For checkbox questions
            if (
              Array.isArray(userAnswer) &&
              userAnswer.length === correctAnswer.length &&
              userAnswer.every((answer) => correctAnswer.includes(answer))
            ) {
              score += field.points || 1
            }
          } else {
            // For single answer questions
            if (userAnswer === correctAnswer) {
              score += field.points || 1
            }
          }
        }
      }
    }

    // Create response
    const newResponse: Omit<FormResponse, "_id"> = {
      formId: params.id,
      responses: responseData,
      submittedAt: new Date(),
      submitterEmail,
      submitterName,
      score: form.settings.isQuiz ? score : undefined,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    }

    const result = await responses.insertOne(newResponse)

    // Update form response count
    await forms.updateOne({ _id: new ObjectId(params.id) }, { $inc: { responseCount: 1 } })

    console.log("Response submitted successfully")
    return NextResponse.json({
      success: true,
      response: {
        ...newResponse,
        id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("Submit response error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
