"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  Circle,
  List,
  Star,
  FileText,
  Save,
  Eye,
  Zap,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

// Types for form builder
interface FormField {
  id: string
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "date" | "rating"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  correctAnswer?: string | string[]
  points?: number
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

interface FormData {
  id?: string
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
}

// Field type configurations
const fieldTypes = [
  { type: "text", label: "Text Input", icon: Type },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "textarea", label: "Long Text", icon: FileText },
  { type: "select", label: "Dropdown", icon: List },
  { type: "radio", label: "Multiple Choice", icon: Circle },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
  { type: "date", label: "Date", icon: Calendar },
  { type: "rating", label: "Rating", icon: Star },
]

export default function FormBuilder() {
  const [formData, setFormData] = useState<FormData>({
    title: "Untitled Form",
    description: "Form description",
    fields: [],
    settings: {
      allowMultipleSubmissions: false,
      showProgressBar: true,
      collectEmail: false,
      isQuiz: false,
      showResults: true,
      isPublic: true,
      requireAuth: false,
    },
  })

  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("build")
  const [isLoading, setIsLoading] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const formId = searchParams.get("id")
  const templateId = searchParams.get("template")

  // Load existing form if editing
  const { data: existingForm } = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      if (!formId) return null
      const response = await fetch(`/api/forms/${formId}`)
      if (!response.ok) throw new Error("Failed to fetch form")
      const data = await response.json()
      return data.form
    },
    enabled: !!formId,
  })

  // Load template if creating from template
  const { data: templateData } = useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      if (!templateId) return null
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      })
      if (!response.ok) throw new Error("Failed to fetch template")
      const data = await response.json()
      return data.template
    },
    enabled: !!templateId,
  })

  // Load form data when editing or using template
  useEffect(() => {
    if (existingForm) {
      setFormData({
        id: existingForm.id,
        title: existingForm.title,
        description: existingForm.description,
        fields: existingForm.fields,
        settings: existingForm.settings,
      })
    } else if (templateData) {
      setFormData({
        title: templateData.title,
        description: templateData.description,
        fields: templateData.fields.map((field: any) => ({
          ...field,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        })),
        settings: templateData.settings,
      })
    }
  }, [existingForm, templateData])

  const saveFormMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsLoading(true)

      if (data.id) {
        // Update existing form
        const response = await fetch(`/api/forms/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to update form")
        return response.json()
      } else {
        // Create new form
        const response = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to create form")
        return response.json()
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] })
      toast({
        title: "Success",
        description: formData.id ? "Form updated successfully" : "Form created successfully",
      })

      if (!formData.id && data.form) {
        // Redirect to edit mode for new forms
        router.push(`/form-builder?id=${data.form.id}`)
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save form",
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      label: `${fieldTypes.find((f) => f.type === type)?.label} Field`,
      required: false,
      ...(type === "select" || type === "radio" || type === "checkbox" ? { options: ["Option 1", "Option 2"] } : {}),
    }

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }))
    setSelectedField(newField.id)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    }))
  }

  const deleteField = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }))
    setSelectedField(null)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(formData.fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setFormData((prev) => ({ ...prev, fields: items }))
  }

  const addOption = (fieldId: string) => {
    const field = formData.fields.find((f) => f.id === fieldId)
    if (field && field.options) {
      updateField(fieldId, {
        options: [...field.options, `Option ${field.options.length + 1}`],
      })
    }
  }

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = formData.fields.find((f) => f.id === fieldId)
    if (field && field.options) {
      const newOptions = [...field.options]
      newOptions[optionIndex] = value
      updateField(fieldId, { options: newOptions })
    }
  }

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = formData.fields.find((f) => f.id === fieldId)
    if (field && field.options && field.options.length > 1) {
      const newOptions = field.options.filter((_, index) => index !== optionIndex)
      updateField(fieldId, { options: newOptions })
    }
  }

  const selectedFieldData = formData.fields.find((f) => f.id === selectedField)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Zop Forms
                </span>
              </Link>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Form Builder
              </Badge>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="text-base md:text-lg font-medium border-0 bg-transparent focus:bg-white focus:border focus:border-gray-200 w-32 sm:w-48 md:w-auto"
                placeholder="Form title"
              />
              <div className="flex gap-1 md:gap-2">
                {formData.id && (
                  <Link href={`/form/${formData.id}`}>
                    <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => saveFormMutation.mutate(formData)}
                  disabled={isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Save className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{isLoading ? "Saving..." : "Save Form"}</span>
                  <span className="sm:hidden">{isLoading ? "..." : "Save"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Sidebar - Field Types - Hidden on mobile, shown in modal */}
        <div className="hidden lg:block w-64 bg-white border-r p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Add Fields</h3>
          <div className="space-y-2">
            {fieldTypes.map((fieldType) => (
              <Button
                key={fieldType.type}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => addField(fieldType.type)}
              >
                <fieldType.icon className="w-4 h-4 mr-2" />
                {fieldType.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile field selector */}
        <div className="lg:hidden p-4 bg-white border-b">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {fieldTypes.slice(0, 4).map((fieldType) => (
              <Button
                key={fieldType.type}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => addField(fieldType.type)}
              >
                <fieldType.icon className="w-4 h-4 mr-1" />
                <span className="text-xs">{fieldType.label}</span>
              </Button>
            ))}
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <Plus className="w-4 h-4" />
              More
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Form Builder */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="build">Build</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="build">
                <div className="max-w-2xl mx-auto">
                  {/* Form Header */}
                  <Card className="mb-6">
                    <CardHeader>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        className="text-2xl font-bold border-0 p-0 focus:ring-0"
                        placeholder="Form title"
                      />
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className="border-0 p-0 resize-none focus:ring-0"
                        placeholder="Form description"
                        rows={2}
                      />
                    </CardHeader>
                  </Card>

                  {/* Form Fields */}
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="form-fields">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {formData.fields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${
                                    selectedField === field.id ? "ring-2 ring-blue-500" : ""
                                  } ${snapshot.isDragging ? "shadow-lg" : ""}`}
                                  onClick={() => setSelectedField(field.id)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-2 text-gray-400 hover:text-gray-600 cursor-grab"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                          <Label className="text-sm font-medium">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                          </Label>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              deleteField(field.id)
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>

                                        {/* Field Preview */}
                                        {field.type === "text" && (
                                          <Input placeholder={field.placeholder || "Enter text"} disabled />
                                        )}
                                        {field.type === "email" && (
                                          <Input
                                            type="email"
                                            placeholder={field.placeholder || "Enter email"}
                                            disabled
                                          />
                                        )}
                                        {field.type === "phone" && (
                                          <Input
                                            type="tel"
                                            placeholder={field.placeholder || "Enter phone number"}
                                            disabled
                                          />
                                        )}
                                        {field.type === "textarea" && (
                                          <Textarea
                                            placeholder={field.placeholder || "Enter long text"}
                                            disabled
                                            rows={3}
                                          />
                                        )}
                                        {field.type === "select" && (
                                          <Select disabled>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select an option" />
                                            </SelectTrigger>
                                          </Select>
                                        )}
                                        {field.type === "radio" && (
                                          <div className="space-y-2">
                                            {field.options?.map((option, idx) => (
                                              <div key={idx} className="flex items-center space-x-2">
                                                <input type="radio" disabled />
                                                <label className="text-sm">{option}</label>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {field.type === "checkbox" && (
                                          <div className="space-y-2">
                                            {field.options?.map((option, idx) => (
                                              <div key={idx} className="flex items-center space-x-2">
                                                <input type="checkbox" disabled />
                                                <label className="text-sm">{option}</label>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {field.type === "date" && <Input type="date" disabled />}
                                        {field.type === "rating" && (
                                          <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star key={star} className="w-6 h-6 text-gray-300" />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {formData.fields.length === 0 && (
                    <Card className="border-dashed border-2 border-gray-300">
                      <CardContent className="p-12 text-center">
                        <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No fields added yet</h3>
                        <p className="text-gray-600">Add fields from the sidebar to start building your form</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Multiple Submissions</Label>
                          <p className="text-sm text-gray-600">Allow users to submit the form multiple times</p>
                        </div>
                        <Switch
                          checked={formData.settings.allowMultipleSubmissions}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, allowMultipleSubmissions: checked },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Progress Bar</Label>
                          <p className="text-sm text-gray-600">Display progress indicator to users</p>
                        </div>
                        <Switch
                          checked={formData.settings.showProgressBar}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, showProgressBar: checked },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Collect Email Addresses</Label>
                          <p className="text-sm text-gray-600">Require users to provide their email</p>
                        </div>
                        <Switch
                          checked={formData.settings.collectEmail}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, collectEmail: checked },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Public Form</Label>
                          <p className="text-sm text-gray-600">Allow anyone with the link to access this form</p>
                        </div>
                        <Switch
                          checked={formData.settings.isPublic}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, isPublic: checked },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Quiz Mode</Label>
                          <p className="text-sm text-gray-600">Enable scoring and correct answers</p>
                        </div>
                        <Switch
                          checked={formData.settings.isQuiz}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, isQuiz: checked },
                            }))
                          }
                        />
                      </div>

                      {formData.settings.isQuiz && (
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Results to Users</Label>
                            <p className="text-sm text-gray-600">Display score and correct answers after submission</p>
                          </div>
                          <Switch
                            checked={formData.settings.showResults}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, showResults: checked },
                              }))
                            }
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Field Properties - Convert to modal on mobile */}
          {selectedFieldData && (
            <div className="lg:w-80 bg-white border-l p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4 lg:block">
                <h3 className="font-semibold">Field Properties</h3>
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSelectedField(null)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={selectedFieldData.label}
                    onChange={(e) => updateField(selectedField!, { label: e.target.value })}
                    placeholder="Enter field label"
                  />
                </div>

                <div>
                  <Label>Placeholder Text</Label>
                  <Input
                    value={selectedFieldData.placeholder || ""}
                    onChange={(e) => updateField(selectedField!, { placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Required Field</Label>
                  <Switch
                    checked={selectedFieldData.required}
                    onCheckedChange={(checked) => updateField(selectedField!, { required: checked })}
                  />
                </div>

                {/* Options for select, radio, checkbox fields */}
                {(selectedFieldData.type === "select" ||
                  selectedFieldData.type === "radio" ||
                  selectedFieldData.type === "checkbox") && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Options</Label>
                      <Button size="sm" variant="outline" onClick={() => addOption(selectedField!)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedFieldData.options?.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(selectedField!, index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                          />
                          {selectedFieldData.options!.length > 1 && (
                            <Button size="sm" variant="outline" onClick={() => removeOption(selectedField!, index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiz mode settings */}
                {formData.settings.isQuiz &&
                  (selectedFieldData.type === "radio" || selectedFieldData.type === "checkbox") && (
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <Label>Correct Answer</Label>
                        <p className="text-xs text-gray-600 mb-2">Set the correct answer for this question</p>
                        {selectedFieldData.type === "radio" && (
                          <Select
                            value={(selectedFieldData.correctAnswer as string) || ""}
                            onValueChange={(value) => updateField(selectedField!, { correctAnswer: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                          </Select>
                        )}
                      </div>

                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.points || 1}
                          onChange={(e) =>
                            updateField(selectedField!, { points: Number.parseInt(e.target.value) || 1 })
                          }
                          placeholder="Points for correct answer"
                          min="1"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
