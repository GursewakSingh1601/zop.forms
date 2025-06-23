"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { ArrowLeft, Download, Users, TrendingUp, Calendar, Zap, Star, FileText, BarChart3 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { useEffect, useMemo } from "react"

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#F97316"]

export default function FormResponses() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const formId = params.id as string

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth")
    }
  }, [isAuthenticated, authLoading, router])

  const { data, isLoading, error } = useQuery({
    queryKey: ["form-responses", formId],
    queryFn: async () => {
      console.log("Fetching form responses for:", formId)
      const response = await fetch(`/api/forms/${formId}/responses`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch responses")
      }
      return response.json()
    },
    enabled: isAuthenticated,
  })

  // Calculate analytics from real data
  const analytics = useMemo(() => {
    if (!data?.responses || !data?.form) return null

    const responses = data.responses
    const form = data.form
    const fields = form.fields

    // Basic stats
    const totalResponses = responses.length
    const averageRating =
      responses.length > 0
        ? responses.reduce((sum: number, r: any) => {
            const ratingField = fields.find((f: any) => f.type === "rating")
            if (ratingField && r.responses[ratingField.id]) {
              return sum + r.responses[ratingField.id]
            }
            return sum
          }, 0) /
          responses.filter((r: any) => {
            const ratingField = fields.find((f: any) => f.type === "rating")
            return ratingField && r.responses[ratingField.id]
          }).length
        : 0

    // Calculate completion rate (responses with all required fields filled)
    const completionRate =
      responses.length > 0
        ? (responses.filter((r: any) => {
            const requiredFields = fields.filter((f: any) => f.required)
            return requiredFields.every(
              (field: any) =>
                r.responses[field.id] !== undefined && r.responses[field.id] !== "" && r.responses[field.id] !== null,
            )
          }).length /
            responses.length) *
          100
        : 0

    // Latest response time
    const latestResponse =
      responses.length > 0 ? new Date(Math.max(...responses.map((r: any) => new Date(r.submittedAt).getTime()))) : null

    const timeSinceLatest = latestResponse
      ? Math.floor((Date.now() - latestResponse.getTime()) / (1000 * 60 * 60)) // hours
      : null

    // Responses by date
    const responsesByDate = responses.reduce((acc: any, response: any) => {
      const date = new Date(response.submittedAt).toISOString().split("T")[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    const responseTimeData = Object.entries(responsesByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7) // Last 7 days

    // Field analytics
    const fieldAnalytics = fields
      .map((field: any) => {
        const fieldResponses = responses
          .map((r: any) => r.responses[field.id])
          .filter((value: any) => value !== undefined && value !== "" && value !== null)

        const analytics: any = {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          responseCount: fieldResponses.length,
          responses: {},
        }

        if (field.type === "radio" || field.type === "select") {
          // Count occurrences of each option
          fieldResponses.forEach((value: string) => {
            analytics.responses[value] = (analytics.responses[value] || 0) + 1
          })
        } else if (field.type === "checkbox") {
          // Count occurrences of each checkbox option
          fieldResponses.forEach((values: string[]) => {
            if (Array.isArray(values)) {
              values.forEach((value: string) => {
                analytics.responses[value] = (analytics.responses[value] || 0) + 1
              })
            }
          })
        } else if (field.type === "rating") {
          // Count occurrences of each rating
          fieldResponses.forEach((value: number) => {
            const rating = `${value} Star${value !== 1 ? "s" : ""}`
            analytics.responses[rating] = (analytics.responses[rating] || 0) + 1
          })
          analytics.averageRating =
            fieldResponses.reduce((sum: number, val: number) => sum + val, 0) / fieldResponses.length
        } else if (field.type === "text" || field.type === "email" || field.type === "textarea") {
          // For text fields, just count total responses
          analytics.responses["Total Responses"] = fieldResponses.length
          analytics.sampleResponses = fieldResponses.slice(0, 5) // Show first 5 responses as samples
        }

        return analytics
      })
      .filter((analytics: any) => analytics.responseCount > 0)

    return {
      totalResponses,
      averageRating: isNaN(averageRating) ? 0 : averageRating,
      completionRate,
      timeSinceLatest,
      responseTimeData,
      fieldAnalytics,
    }
  }, [data])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 animate-spin">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 animate-spin">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Responses</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "Failed to load form responses"}
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!data?.form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form not found</h2>
          <p className="text-gray-600 mb-4">
            The form you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const form = data.form
  const responses = data.responses || []

  const exportData = () => {
    if (responses.length === 0) {
      alert("No data to export")
      return
    }

    // Create CSV content
    const headers = ["Submission Date", ...form.fields.map((f: any) => f.label)]
    const csvContent = [
      headers.join(","),
      ...responses.map((response: any) =>
        [
          new Date(response.submittedAt).toLocaleString(),
          ...form.fields.map((field: any) => {
            const value = response.responses[field.id]
            if (Array.isArray(value)) {
              return `"${value.join(", ")}"`
            }
            return `"${value || ""}"`
          }),
        ].join(","),
      ),
    ].join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_responses.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                Analytics
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <h1 className="text-base md:text-lg font-semibold truncate max-w-xs sm:max-w-none">{form?.title}</h1>
              <Button variant="outline" onClick={exportData} disabled={responses.length === 0} size="sm">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalResponses || 0}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.averageRating ? analytics.averageRating.toFixed(1) : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.averageRating ? "Out of 5 stars" : "No ratings yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.completionRate ? `${Math.round(analytics.completionRate)}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Forms completed fully</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Response</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.timeSinceLatest !== null
                  ? analytics?.timeSinceLatest === 0
                    ? "< 1h ago"
                    : `${analytics?.timeSinceLatest}h ago`
                  : "None yet"}
              </div>
              <p className="text-xs text-muted-foreground">Most recent submission</p>
            </CardContent>
          </Card>
        </div>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
              <p className="text-gray-600 mb-4">Share your form to start collecting responses</p>
              <div className="flex gap-2 justify-center">
                <Link href={`/form/${formId}`}>
                  <Button variant="outline">View Form</Button>
                </Link>
                <Button
                  onClick={() => {
                    const link = `${window.location.origin}/form/${formId}`
                    navigator.clipboard.writeText(link)
                    alert("Form link copied to clipboard!")
                  }}
                >
                  Copy Form Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="responses">Individual Responses</TabsTrigger>
              <TabsTrigger value="timeline">Response Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {analytics?.fieldAnalytics?.map((fieldAnalytic: any, index: number) => (
                  <Card key={fieldAnalytic.fieldId} className="w-full">
                    <CardHeader>
                      <CardTitle className="text-base md:text-lg truncate">{fieldAnalytic.fieldLabel}</CardTitle>
                      <CardDescription className="text-sm">
                        {fieldAnalytic.responseCount} responses • {fieldAnalytic.fieldType} field
                        {fieldAnalytic.averageRating && <span> • Avg: {fieldAnalytic.averageRating.toFixed(1)}/5</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(fieldAnalytic.fieldType === "radio" ||
                        fieldAnalytic.fieldType === "select" ||
                        fieldAnalytic.fieldType === "checkbox" ||
                        fieldAnalytic.fieldType === "rating") &&
                      Object.keys(fieldAnalytic.responses).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                          {fieldAnalytic.fieldType === "rating" ? (
                            <BarChart
                              data={Object.entries(fieldAnalytic.responses).map(([key, value]) => ({
                                name: key,
                                value,
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill={COLORS[index % COLORS.length]} />
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Pie
                                data={Object.entries(fieldAnalytic.responses).map(([key, value]) => ({
                                  name: key,
                                  value,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.entries(fieldAnalytic.responses).map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      ) : fieldAnalytic.fieldType === "text" ||
                        fieldAnalytic.fieldType === "email" ||
                        fieldAnalytic.fieldType === "textarea" ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">Total responses: {fieldAnalytic.responseCount}</div>
                          {fieldAnalytic.sampleResponses && fieldAnalytic.sampleResponses.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Sample responses:</h4>
                              <div className="space-y-2">
                                {fieldAnalytic.sampleResponses.map((response: string, idx: number) => (
                                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                    {response.length > 100 ? `${response.substring(0, 100)}...` : response}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">No data to visualize for this field type</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="responses">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Individual Responses</CardTitle>
                  <CardDescription>Detailed view of all form submissions ({responses.length} total)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Submitted</TableHead>
                          {form.fields.slice(0, window.innerWidth < 768 ? 2 : 4).map((field: any) => (
                            <TableHead key={field.id} className="min-w-[100px]">
                              {field.label}
                            </TableHead>
                          ))}
                          {form.fields.length > (window.innerWidth < 768 ? 2 : 4) && <TableHead>...</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responses.map((response: any) => (
                          <TableRow key={response.id}>
                            <TableCell className="text-xs md:text-sm">
                              <div className="flex flex-col">
                                <span>{new Date(response.submittedAt).toLocaleDateString()}</span>
                                <span className="text-gray-500 hidden md:inline">
                                  {new Date(response.submittedAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </TableCell>
                            {form.fields.slice(0, window.innerWidth < 768 ? 2 : 4).map((field: any) => (
                              <TableCell key={field.id} className="max-w-[150px] md:max-w-xs">
                                {field.type === "rating" ? (
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < (response.responses[field.id] || 0)
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                ) : field.type === "checkbox" ? (
                                  <div className="text-sm">
                                    {Array.isArray(response.responses[field.id])
                                      ? response.responses[field.id].join(", ")
                                      : response.responses[field.id] || "—"}
                                  </div>
                                ) : (
                                  <div className="text-sm truncate">{response.responses[field.id] || "—"}</div>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Response Timeline</CardTitle>
                  <CardDescription>Responses received over time (last 7 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.responseTimeData && analytics.responseTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [value, "Responses"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ fill: "#3B82F6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No timeline data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
