export interface User {
  _id?: string
  email: string
  name: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export interface FormField {
  id: string
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "date" | "rating"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  correctAnswer?: string | string[] // For quiz mode
  points?: number // For quiz scoring
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface Form {
  _id?: string
  title: string
  description: string
  fields: FormField[]
  settings: {
    allowMultipleSubmissions: boolean
    showProgressBar: boolean
    collectEmail: boolean
    isQuiz: boolean
    showResults: boolean
    isPublic: boolean
    requireAuth: boolean
  }
  userId: string
  createdAt: Date
  updatedAt: Date
  responseCount: number
  isActive: boolean
}

export interface FormResponse {
  _id?: string
  formId: string
  responses: Record<string, any>
  submittedAt: Date
  submitterEmail?: string
  submitterName?: string
  score?: number // For quiz forms
  ipAddress?: string
}

export interface FormAnalytics {
  formId: string
  totalResponses: number
  averageScore?: number
  completionRate: number
  responsesByDate: Array<{
    date: string
    count: number
  }>
  fieldAnalytics: Array<{
    fieldId: string
    fieldLabel: string
    responses: Record<string, number>
  }>
}
