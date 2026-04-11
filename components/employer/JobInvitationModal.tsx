'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Briefcase, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { getWithImpersonation, postWithImpersonation } from '@/lib/api-client'

interface Job {
  id: string
  title: string
  jobType: string
  status: string
  createdAt: string
}

interface TalentInfo {
  id: string
  name: string
  profilePictureUrl: string | null
  headline: string | null
}

interface JobInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  talent: TalentInfo | null
  onSuccess: () => void
}

export function JobInvitationModal({ isOpen, onClose, talent, onSuccess }: JobInvitationModalProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch employer's active jobs
  const fetchJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getWithImpersonation('/api/employer/jobs?status=approved')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs')
      }

      setJobs(data.jobs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Effect to fetch jobs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchJobs()
      // Set default message
      if (talent) {
        setMessage(`Hi ${talent.name},

I came across your profile and I'm impressed with your background and skills. I have a position that I think would be a great fit for you.

I'd love to discuss this opportunity with you further. Please take a look at the job details and let me know if you're interested.

Looking forward to hearing from you!

Best regards`)
      }
    } else {
      // Reset form when modal closes
      setSelectedJobId('')
      setMessage('')
      setError(null)
    }
  }, [isOpen, talent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedJobId || !talent) {
      setError('Please select a job position')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await postWithImpersonation('/api/employer/talent/invite', {
        jobId: selectedJobId,
        seekerId: talent.id,
        message: message.trim()
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      // Show success toast
      toast({
        title: "Invitation Sent! 🎉",
        description: `Successfully invited ${talent.name} to apply for the position.`,
        variant: "default",
        duration: 5000
      })

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const getJobTypeColor = (jobType: string) => {
    if (!jobType) return 'bg-gray-100 text-gray-800'
    
    switch (jobType.toLowerCase()) {
      case 'full-time':
        return 'bg-green-100 text-green-800'
      case 'part-time':
        return 'bg-blue-100 text-blue-800'
      case 'freelance':
        return 'bg-yellow-100 text-yellow-800'
      case 'contract':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatJobType = (jobType: string) => {
    if (!jobType) return ''
    return jobType.charAt(0).toUpperCase() + jobType.slice(1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Invite to Job Position
          </DialogTitle>
        </DialogHeader>

        {talent && (
          <div className="mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={talent.profilePictureUrl || ''} alt={talent.name} />
                <AvatarFallback className="bg-brand-teal text-white">
                  {talent.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{talent.name}</p>
                {talent.headline && (
                  <p className="text-sm text-gray-600">{talent.headline}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Selection */}
          <div>
            <Label htmlFor="job-select">Select Job Position *</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-teal"></div>
                <span className="ml-2 text-gray-600">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-3">
                  <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-blue-800 text-sm font-medium mb-2">
                      No active job positions available
                    </p>
                    <p className="text-blue-700 text-sm mb-3">
                      You need to have active (non-expired) job posts to send invitations to talent.
                    </p>
                    <Link href="/employer/jobs/new">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Job Post
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job position..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{job.title}</span>
                        {job.jobType && (
                          <Badge className={`ml-2 text-xs ${getJobTypeColor(job.jobType)}`}>
                            {formatJobType(job.jobType)}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Personal Message */}
          <div>
            <Label htmlFor="message">Personal Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a personal message to introduce the opportunity..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              A personal touch helps increase response rates
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedJobId || jobs.length === 0}
              className="flex-1 bg-brand-coral hover:bg-brand-coral/90"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}