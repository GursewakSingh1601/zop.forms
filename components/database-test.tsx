"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Database, Loader2 } from "lucide-react"

export function DatabaseTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const testConnection = async () => {
    setIsLoading(true)
    setResult(null)
    setError("")

    try {
      console.log("Testing database connection...")
      const response = await fetch("/api/test-db")
      const data = await response.json()

      console.log("Database test response:", data)

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Database test failed")
        console.error("Database test failed:", data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error"
      setError(errorMessage)
      console.error("Database test error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Connection Test
        </CardTitle>
        <CardDescription>Test the MongoDB connection to diagnose any connectivity issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Test Database Connection
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Failed:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Successful!</strong>
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <strong>Database:</strong> {result.details?.databaseName}
                </div>
                <div>
                  <strong>Collections:</strong> {result.details?.collections?.join(", ") || "None"}
                </div>
                <div>
                  <strong>Data Size:</strong> {result.details?.stats?.dataSize || 0} bytes
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
