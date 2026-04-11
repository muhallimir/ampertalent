'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'

interface WebhookConfig {
  seeker: Record<string, string>
  employer: Record<string, string>
}

interface TestResult {
  success: boolean
  responseTime?: number
  error?: string
}

export default function WebhookManager() {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetchWebhookConfig()
  }, [])

  const fetchWebhookConfig = async () => {
    try {
      const response = await fetch('/api/admin/webhooks/test')
      const data = await response.json()
      setWebhookConfig(data.configured)
    } catch (error) {
      console.error('Error fetching webhook config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async (url?: string) => {
    const urlToTest = url || testUrl
    if (!urlToTest) return

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: urlToTest })
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test webhook'
      })
    } finally {
      setTesting(false)
    }
  }

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success ({result.responseTime}ms)
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      )
    }
  }

  const webhookDescriptions = {
    seeker: {
      welcome: 'Triggered when a new job seeker completes registration and payment',
      applicationStatus: 'Triggered when an employer updates the status of a job seeker\'s application',
      jobInvitation: 'Triggered when an employer invites a job seeker to apply for a position',
      paymentConfirmation: 'Triggered when a job seeker\'s payment is successfully processed',
      subscriptionReminder: 'Triggered when a job seeker\'s subscription is about to expire'
    },
    employer: {
      welcome: 'Triggered when a new employer completes registration and payment',
      jobApproved: 'Triggered when an admin approves an employer\'s job posting',
      jobRejected: 'Triggered when an admin declines an employer\'s job posting',
      newApplication: 'Triggered when a job seeker applies to an employer\'s job posting',
      paymentConfirmation: 'Triggered when an employer\'s payment is successfully processed'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading webhook configuration...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>External Webhook Management</CardTitle>
          <CardDescription>
            Manage and test external webhook endpoints for real-time notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              External webhooks send real-time notifications to your configured endpoints when events occur in the platform.
              See the <strong>EXTERNAL_WEBHOOK_INTEGRATION.md</strong> documentation for complete setup instructions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Webhook Endpoint</CardTitle>
          <CardDescription>
            Test connectivity to any webhook endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="test-url">Webhook URL</Label>
              <Input
                id="test-url"
                placeholder="https://your-service.com/webhook"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => testWebhook()}
                disabled={!testUrl || testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Webhook'
                )}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Test Result</span>
                {getStatusBadge(testResult)}
              </div>
              {testResult.error && (
                <p className="text-sm text-red-600">{testResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>
            Currently configured webhook endpoints from environment variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!webhookConfig || (Object.keys(webhookConfig.seeker).length === 0 && Object.keys(webhookConfig.employer).length === 0) ? (
            <Alert>
              <AlertDescription>
                No webhook endpoints are currently configured. Add webhook URLs to your environment variables to enable external notifications.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="seeker" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="seeker">
                  Job Seeker Webhooks ({Object.keys(webhookConfig.seeker).length})
                </TabsTrigger>
                <TabsTrigger value="employer">
                  Employer Webhooks ({Object.keys(webhookConfig.employer).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="seeker" className="space-y-4">
                {Object.keys(webhookConfig.seeker).length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No job seeker webhook endpoints configured.
                    </AlertDescription>
                  </Alert>
                ) : (
                  Object.entries(webhookConfig.seeker).map(([key, url]) => (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <Badge variant="outline">seeker.{key.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {webhookDescriptions.seeker[key as keyof typeof webhookDescriptions.seeker]}
                            </p>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                              {url}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(url)}
                            disabled={testing}
                          >
                            {testing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="employer" className="space-y-4">
                {Object.keys(webhookConfig.employer).length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No employer webhook endpoints configured.
                    </AlertDescription>
                  </Alert>
                ) : (
                  Object.entries(webhookConfig.employer).map(([key, url]) => (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <Badge variant="outline">employer.{key.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {webhookDescriptions.employer[key as keyof typeof webhookDescriptions.employer]}
                            </p>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                              {url}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(url)}
                            disabled={testing}
                          >
                            {testing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Required environment variables for webhook configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Security:</p>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SECRET=your_secret_key</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_TIMEOUT=5000</code>

            <p className="font-medium mt-4">Job Seeker Webhooks:</p>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SEEKER_WELCOME=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SEEKER_APPLICATION_STATUS=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SEEKER_JOB_INVITATION=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SEEKER_PAYMENT_CONFIRMATION=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_SEEKER_SUBSCRIPTION_REMINDER=https://...</code>

            <p className="font-medium mt-4">Employer Webhooks:</p>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_EMPLOYER_WELCOME=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_EMPLOYER_JOB_APPROVED=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_EMPLOYER_JOB_REJECTED=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_EMPLOYER_NEW_APPLICATION=https://...</code>
            <code className="block bg-gray-100 p-2 rounded">EXTERNAL_WEBHOOK_EMPLOYER_PAYMENT_CONFIRMATION=https://...</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}