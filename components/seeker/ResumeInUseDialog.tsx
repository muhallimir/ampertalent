'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, ExternalLink, Briefcase } from 'lucide-react'
import Link from 'next/link'

interface JobApplication {
  jobId: string
  jobTitle: string
  companyName: string
  appliedAt: string
}

interface ResumeInUseDialogProps {
  isOpen: boolean
  onClose: () => void
  jobsAppliedTo: JobApplication[]
}

export function ResumeInUseDialog({ isOpen, onClose, jobsAppliedTo }: ResumeInUseDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-orange-500" />
            <span>Cannot Delete Resume</span>
          </DialogTitle>
          <DialogDescription>
            This resume cannot be deleted because you've applied to jobs with it. 
            Upgrade your plan to upload additional resumes instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Jobs Applied To:</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {jobsAppliedTo.map((job, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{job.jobTitle}</h5>
                    <p className="text-sm text-gray-600">{job.companyName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {formatDate(job.appliedAt)}
                    </p>
                  </div>
                  <Link href={`/seeker/jobs/${job.jobId}`}>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Upgrade Your Plan</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Get unlimited resume uploads and manage multiple versions for different job types.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Keep Resume
          </Button>
          <Link href="/seeker/subscription" className="w-full sm:w-auto">
            <Button className="w-full bg-brand-teal hover:bg-brand-teal/90">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}