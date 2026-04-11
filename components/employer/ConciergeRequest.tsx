'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Star,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import { postWithImpersonation } from '@/lib/api-client'

interface ConciergeRequestProps {
  jobId: string
  jobTitle: string
  applicationCount: number
  conciergeRequested: boolean
  conciergeStatus: 'not_requested' | 'pending' | 'completed'
  onRequestSubmitted?: () => void
}

interface ConciergeRequirements {
  maxCandidates: number
  prioritySkills: string[]
  experienceLevel: 'entry' | 'mid' | 'senior'
  notes: string
}

export default function ConciergeRequest({
  jobId,
  applicationCount,
  conciergeRequested,
  conciergeStatus,
  onRequestSubmitted
}: ConciergeRequestProps) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<ConciergeRequirements>({
    maxCandidates: 5,
    prioritySkills: [],
    experienceLevel: 'mid',
    notes: ''
  })

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await postWithImpersonation(
        `/api/employer/jobs/${jobId}/concierge`,
        requirements
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to request concierge service')
      }

      setShowForm(false)
      onRequestSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkillsChange = (value: string) => {
    const skills = value.split(',').map(skill => skill.trim()).filter(Boolean)
    setRequirements(prev => ({ ...prev, prioritySkills: skills }))
  }

  const getStatusDisplay = () => {
    switch (conciergeStatus) {
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Concierge service requested',
          description: 'Our team is reviewing candidates for your job',
          variant: 'default' as const
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Candidates shortlisted',
          description: 'Check your applications to see the recommended candidates',
          variant: 'default' as const
        }
      default:
        return null
    }
  }

  const statusDisplay = getStatusDisplay()

  // If concierge service is already requested or completed
  if (conciergeRequested && statusDisplay) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Premium Concierge Service</CardTitle>
            </div>
            <Badge variant={statusDisplay.variant} className="flex items-center">
              {statusDisplay.icon}
              <span className="ml-1">{statusDisplay.text}</span>
            </Badge>
          </div>
          <CardDescription>{statusDisplay.description}</CardDescription>
        </CardHeader>
        {conciergeStatus === 'completed' && (
          <CardContent>
            <Button asChild>
              <a href={`/employer/jobs/${jobId}/applications`}>
                View Shortlisted Candidates
              </a>
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  // If not enough applications to warrant concierge service
  if (applicationCount < 5) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-muted-foreground">Premium Concierge Service</CardTitle>
          </div>
          <CardDescription>
            Get expert help shortlisting the best candidates for your job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Concierge service is available when you have 5 or more applications. 
              You currently have {applicationCount} application{applicationCount !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">Premium Concierge Service</CardTitle>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Sparkles className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              Request Service
            </Button>
          )}
        </div>
        <CardDescription>
          Let our experts review and shortlist the best candidates from your {applicationCount} applications
        </CardDescription>
      </CardHeader>

      {showForm && (
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxCandidates">Maximum Candidates to Shortlist</Label>
              <Select
                value={requirements.maxCandidates.toString()}
                onValueChange={(value) => 
                  setRequirements(prev => ({ ...prev, maxCandidates: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 candidates</SelectItem>
                  <SelectItem value="5">5 candidates</SelectItem>
                  <SelectItem value="7">7 candidates</SelectItem>
                  <SelectItem value="10">10 candidates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Preferred Experience Level</Label>
              <Select
                value={requirements.experienceLevel}
                onValueChange={(value: 'entry' | 'mid' | 'senior') => 
                  setRequirements(prev => ({ ...prev, experienceLevel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioritySkills">Priority Skills (comma-separated)</Label>
            <Input
              id="prioritySkills"
              placeholder="e.g., React, TypeScript, Node.js"
              value={requirements.prioritySkills.join(', ')}
              onChange={(e) => handleSkillsChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              List the most important skills for this role
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Special Requirements (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific requirements or preferences for candidate selection..."
              value={requirements.notes}
              onChange={(e) => setRequirements(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What&apos;s Included:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-center">
                <Users className="h-3 w-3 mr-2" />
                Expert review of all {applicationCount} applications
              </li>
              <li className="flex items-center">
                <Star className="h-3 w-3 mr-2" />
                Skills matching and compatibility scoring
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2" />
                Shortlist of top {requirements.maxCandidates} candidates
              </li>
              <li className="flex items-center">
                <Clock className="h-3 w-3 mr-2" />
                Completed within 24-48 hours
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Requesting...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Request Concierge Service
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}

      {!showForm && (
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {applicationCount} applications
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                24-48 hour turnaround
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-foreground">Premium Service</div>
              <div>Expert candidate review</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}