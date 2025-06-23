import { NextResponse, type NextRequest } from "next/server"

const templates = [
  {
    id: "customer-feedback",
    title: "Customer Feedback Survey",
    description: "Collect customer feedback and satisfaction ratings",
    category: "Business",
    icon: "📊",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        required: true,
        placeholder: "Enter your full name",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        placeholder: "Enter your email",
      },
      {
        id: "satisfaction",
        type: "radio",
        label: "How satisfied are you with our service?",
        required: true,
        options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
      },
      {
        id: "features",
        type: "checkbox",
        label: "Which features do you use most? (Select all that apply)",
        required: false,
        options: ["Dashboard", "Reports", "Analytics", "Integrations", "Mobile App"],
      },
      {
        id: "rating",
        type: "rating",
        label: "Rate our customer support",
        required: true,
      },
      {
        id: "comments",
        type: "textarea",
        label: "Additional Comments",
        required: false,
        placeholder: "Share your feedback...",
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "event-registration",
    title: "Event Registration Form",
    description: "Register attendees for events and conferences",
    category: "Events",
    icon: "🎟️",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        required: true,
        placeholder: "Enter your full name",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        placeholder: "Enter your email",
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number",
        required: true,
        placeholder: "Enter your phone number",
      },
      {
        id: "ticket-type",
        type: "select",
        label: "Ticket Type",
        required: true,
        options: ["General Admission", "VIP", "Student", "Senior"],
      },
      {
        id: "dietary",
        type: "checkbox",
        label: "Dietary Restrictions",
        required: false,
        options: ["Vegetarian", "Vegan", "Gluten-Free", "Nut Allergy", "None"],
      },
      {
        id: "special-requests",
        type: "textarea",
        label: "Special Requests",
        required: false,
        placeholder: "Any special accommodations needed?",
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "job-application",
    title: "Job Application Form",
    description: "Collect job applications and candidate information",
    category: "HR",
    icon: "💼",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        required: true,
        placeholder: "Enter your full name",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        placeholder: "Enter your email",
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number",
        required: true,
        placeholder: "Enter your phone number",
      },
      {
        id: "position",
        type: "select",
        label: "Position Applied For",
        required: true,
        options: ["Software Engineer", "Product Manager", "Designer", "Marketing Manager", "Sales Representative"],
      },
      {
        id: "experience",
        type: "radio",
        label: "Years of Experience",
        required: true,
        options: ["0-1 years", "2-5 years", "6-10 years", "10+ years"],
      },
      {
        id: "motivation",
        type: "textarea",
        label: "Why do you want to work with us?",
        required: true,
        placeholder: "Tell us about your motivation...",
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: true,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "product-survey",
    title: "Product Feedback Survey",
    description: "Get feedback on products and services",
    category: "Marketing",
    icon: "🛍️",
    fields: [
      {
        id: "discovery",
        type: "radio",
        label: "How did you hear about our product?",
        required: true,
        options: ["Social Media", "Google Search", "Friend Referral", "Advertisement", "Other"],
      },
      {
        id: "quality-rating",
        type: "rating",
        label: "Rate the product quality",
        required: true,
      },
      {
        id: "features-used",
        type: "checkbox",
        label: "Which features do you use most?",
        required: false,
        options: ["Dashboard", "Reports", "Analytics", "Integrations", "Mobile App"],
      },
      {
        id: "improvements",
        type: "textarea",
        label: "What improvements would you suggest?",
        required: false,
        placeholder: "Share your suggestions...",
      },
      {
        id: "recommend",
        type: "radio",
        label: "Would you recommend this product to others?",
        required: true,
        options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"],
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: false,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "quiz-template",
    title: "Knowledge Quiz",
    description: "Create engaging quizzes with scoring",
    category: "Education",
    icon: "🧠",
    fields: [
      {
        id: "q1",
        type: "radio",
        label: "What is the capital of France?",
        required: true,
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        points: 1,
      },
      {
        id: "q2",
        type: "radio",
        label: "Which planet is closest to the Sun?",
        required: true,
        options: ["Venus", "Mercury", "Earth", "Mars"],
        correctAnswer: "Mercury",
        points: 1,
      },
      {
        id: "q3",
        type: "checkbox",
        label: "Which of these are programming languages?",
        required: true,
        options: ["JavaScript", "HTML", "Python", "CSS", "Java"],
        correctAnswer: ["JavaScript", "Python", "Java"],
        points: 2,
      },
      {
        id: "q4",
        type: "radio",
        label: "What does HTML stand for?",
        required: true,
        options: [
          "Hyper Text Markup Language",
          "High Tech Modern Language",
          "Home Tool Markup Language",
          "Hyperlink and Text Markup Language",
        ],
        correctAnswer: "Hyper Text Markup Language",
        points: 1,
      },
    ],
    settings: {
      allowMultipleSubmissions: true,
      showProgressBar: true,
      collectEmail: false,
      isQuiz: true,
      showResults: true,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "newsletter-signup",
    title: "Newsletter Subscription",
    description: "Collect email subscribers for your newsletter",
    category: "Marketing",
    icon: "📧",
    fields: [
      {
        id: "first-name",
        type: "text",
        label: "First Name",
        required: true,
        placeholder: "Enter your first name",
      },
      {
        id: "last-name",
        type: "text",
        label: "Last Name",
        required: true,
        placeholder: "Enter your last name",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        placeholder: "Enter your email",
      },
      {
        id: "interests",
        type: "checkbox",
        label: "What topics interest you?",
        required: false,
        options: ["Technology", "Business", "Design", "Marketing", "Productivity"],
      },
      {
        id: "frequency",
        type: "radio",
        label: "How often would you like to receive emails?",
        required: true,
        options: ["Daily", "Weekly", "Monthly", "Quarterly"],
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: false,
      collectEmail: true,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
  {
    id: "contact-form",
    title: "Contact Us Form",
    description: "Simple contact form for customer inquiries",
    category: "Business",
    icon: "📞",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        required: true,
        placeholder: "Enter your full name",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        placeholder: "Enter your email",
      },
      {
        id: "subject",
        type: "select",
        label: "Subject",
        required: true,
        options: ["General Inquiry", "Support Request", "Sales Question", "Partnership", "Other"],
      },
      {
        id: "message",
        type: "textarea",
        label: "Message",
        required: true,
        placeholder: "Enter your message...",
      },
    ],
    settings: {
      allowMultipleSubmissions: true,
      showProgressBar: false,
      collectEmail: true,
      isQuiz: false,
      showResults: false,
      isPublic: true,
      requireAuth: false,
    },
  },
]

export async function GET() {
  try {
    console.log("=== FETCHING TEMPLATES ===")
    console.log("Available templates:", templates.length)

    return NextResponse.json({
      templates,
      total: templates.length,
    })
  } catch (error) {
    console.error("Get templates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATING FORM FROM TEMPLATE ===")

    const { templateId } = await request.json()
    console.log("Template ID requested:", templateId)

    const template = templates.find((t) => t.id === templateId)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    console.log("Template found:", template.title)
    return NextResponse.json({ template })
  } catch (error) {
    console.error("Get template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
