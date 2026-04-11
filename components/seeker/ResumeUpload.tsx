'use client';

import React from 'react';
import {
  CheckCircle,
  Trash2,
  Eye,
  AlertTriangle,
  Crown,
  Plus,
  Edit2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/common/FileUpload';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ResumeInUseDialog } from '@/components/seeker/ResumeInUseDialog';
import { getImpersonationSession } from '@/lib/admin-impersonation';
import Link from 'next/link';

interface ResumeLimits {
  currentResumeCount: number;
  resumeLimit: number | 'unlimited';
  canUpload: boolean;
  remainingUploads: number | 'unlimited';
  planName: string;
  isExpired: boolean;
  membershipExpiresAt?: string;
}

interface Resume {
  id: string;
  filename: string;
  uploadedAt: string;
  url: string;
  isPrimary: boolean;
  fileSize?: number;
}

interface ResumeUploadProps {
  onShowToast?: (toast: {
    title: string;
    description: string;
    variant: 'default' | 'destructive' | 'success';
    duration?: number;
  }) => void;
}

export function ResumeUpload({ onShowToast }: ResumeUploadProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [resumeLimits, setResumeLimits] = React.useState<ResumeLimits | null>(
    null
  );
  const [resumes, setResumes] = React.useState<Resume[]>([]);
  const [isLoadingLimits, setIsLoadingLimits] = React.useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [resumeToDelete, setResumeToDelete] = React.useState<string | null>(
    null
  );
  const [editingResumeId, setEditingResumeId] = React.useState<string | null>(
    null
  );
  const [editingFilename, setEditingFilename] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showResumeInUseDialog, setShowResumeInUseDialog] =
    React.useState(false);
  const [resumeInUseJobs, setResumeInUseJobs] = React.useState<any[]>([]);
  const [viewingResumeId, setViewingResumeId] = React.useState<string | null>(
    null
  );

  // Load resumes and limits on component mount
  React.useEffect(() => {
    loadResumesAndLimits();
  }, []);

  const loadResumesAndLimits = async () => {
    try {
      // Add impersonation headers if needed
      const headers: HeadersInit = {};
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          console.log(
            '🎭 RESUME UPLOAD: Adding impersonation headers to load request',
            {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId,
            }
          );
          headers['x-impersonated-user-id'] =
            impersonationSession.impersonatedUser.id;
          headers['x-admin-user-id'] = impersonationSession.adminId;
        }
      }

      const response = await fetch('/api/seeker/resumes', { headers });
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
        setResumeLimits(data.limits);
      } else {
        console.error('Failed to load resumes and limits');
      }
    } catch (error) {
      console.error('Error loading resumes and limits:', error);
    } finally {
      setIsLoadingLimits(false);
    }
  };

  const handleUploadComplete = (fileUrl: string) => {
    onShowToast?.({
      title: 'Resume Uploaded',
      description: 'Your resume has been successfully uploaded.',
      variant: 'success',
      duration: 5000,
    });

    // ✅ Reload resumes and limits immediately (confirm already completed)
    loadResumesAndLimits();
  };

  const handleUploadError = (error: string) => {
    console.error('Resume upload error:', error);
    onShowToast?.({
      title: 'Upload Failed',
      description: error,
      variant: 'destructive',
      duration: 5000,
    });
  };

  const handleDeleteClick = (resumeId: string) => {
    setResumeToDelete(resumeId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resumeToDelete) return;

    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      // Add impersonation headers if needed
      const headers: HeadersInit = {};
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          console.log(
            '🎭 RESUME UPLOAD: Adding impersonation headers to delete request',
            {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId,
              resumeId: resumeToDelete,
            }
          );
          headers['x-impersonated-user-id'] =
            impersonationSession.impersonatedUser.id;
          headers['x-admin-user-id'] = impersonationSession.adminId;
        }
      }

      const response = await fetch(`/api/seeker/resumes/${resumeToDelete}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        onShowToast?.({
          title: 'Resume Deleted',
          description:
            'Your resume has been successfully deleted and 1 credit has been restored.',
          variant: 'success',
          duration: 5000,
        });
        // ✅ Reload resumes and limits immediately
        loadResumesAndLimits();
      } else {
        const errorData = await response.json();

        // Handle resume in use error specially
        if (errorData.error === 'RESUME_IN_USE') {
          handleResumeInUseError(errorData);
        } else {
          onShowToast?.({
            title: 'Delete Failed',
            description:
              errorData.error || 'Failed to delete resume. Please try again.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      onShowToast?.({
        title: 'Delete Failed',
        description:
          'An error occurred while deleting the resume. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
      setResumeToDelete(null);
    }
  };

  const handleResumeInUseError = (errorData: any) => {
    const jobsAppliedTo = errorData.jobsAppliedTo || [];
    setResumeInUseJobs(jobsAppliedTo);
    setShowResumeInUseDialog(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setResumeToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Function to clean filename by removing UUID prefix
  const cleanFilename = (filename: string) => {
    // Remove UUID pattern at the beginning: "1b9d3064-4ff3-4404-bf13-07c7ea33d146-"
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    return filename.replace(uuidPattern, '');
  };

  const handleEditClick = (resume: Resume) => {
    setEditingResumeId(resume.id);
    setEditingFilename(cleanFilename(resume.filename));
  };

  const handleSaveEdit = async (resumeId: string) => {
    if (!editingFilename.trim()) return;

    setIsUpdating(true);
    try {
      // Add impersonation headers if needed
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          console.log(
            '🎭 RESUME UPLOAD: Adding impersonation headers to rename request',
            {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId,
              resumeId,
            }
          );
          headers['x-impersonated-user-id'] =
            impersonationSession.impersonatedUser.id;
          headers['x-admin-user-id'] = impersonationSession.adminId;
        }
      }

      const response = await fetch(`/api/seeker/resumes/${resumeId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          filename: editingFilename.trim(),
        }),
      });

      if (response.ok) {
        onShowToast?.({
          title: 'Resume Renamed',
          description: 'Your resume has been successfully renamed.',
          variant: 'success',
          duration: 3000,
        });
        // ✅ Reload resumes immediately
        loadResumesAndLimits();
      } else {
        onShowToast?.({
          title: 'Rename Failed',
          description: 'Failed to rename resume. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error renaming resume:', error);
      onShowToast?.({
        title: 'Rename Failed',
        description: 'An error occurred while renaming the resume.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
      setEditingResumeId(null);
      setEditingFilename('');
    }
  };

  const handleCancelEdit = () => {
    setEditingResumeId(null);
    setEditingFilename('');
  };

  const handleSetPrimary = async (resumeId: string) => {
    setIsUpdating(true);
    try {
      // Add impersonation headers if needed
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          console.log(
            '🎭 RESUME UPLOAD: Adding impersonation headers to set primary request',
            {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId,
              resumeId,
            }
          );
          headers['x-impersonated-user-id'] =
            impersonationSession.impersonatedUser.id;
          headers['x-admin-user-id'] = impersonationSession.adminId;
        }
      }

      const response = await fetch(`/api/seeker/resumes/${resumeId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          isPrimary: true,
        }),
      });

      if (response.ok) {
        onShowToast?.({
          title: 'Primary Resume Updated',
          description: 'This resume is now set as your primary resume.',
          variant: 'success',
          duration: 3000,
        });
        // ✅ Reload resumes immediately
        loadResumesAndLimits();
      } else {
        onShowToast?.({
          title: 'Update Failed',
          description: 'Failed to set primary resume. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error setting primary resume:', error);
      onShowToast?.({
        title: 'Update Failed',
        description: 'An error occurred while updating the primary resume.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canUploadMore =
    resumeLimits &&
    resumeLimits.canUpload &&
    (resumeLimits.resumeLimit === 'unlimited' ||
      resumes.length < resumeLimits.resumeLimit);

  const isAtLimit =
    resumeLimits &&
    resumeLimits.resumeLimit !== 'unlimited' &&
    resumes.length >= resumeLimits.resumeLimit;

  // Show loading state while fetching data
  if (isLoadingLimits) {
    return (
      <div className="space-y-6">
        {/* Loading Skeleton for Resume Limits */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Skeleton for Upload Area */}
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 bg-gray-50">
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 text-sm">Loading your resumes...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resume Limits Display */}
      {resumeLimits && (
        <Card
          className={`${
            resumeLimits.isExpired
              ? 'border-red-200 bg-red-50'
              : canUploadMore
              ? 'border-green-200 bg-green-50'
              : 'border-orange-200 bg-orange-50'
          }`}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    resumeLimits.isExpired
                      ? 'bg-red-100'
                      : canUploadMore
                      ? 'bg-green-100'
                      : 'bg-orange-100'
                  }`}
                >
                  {resumeLimits.isExpired ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : canUploadMore ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">
                      {resumeLimits.planName}
                    </p>
                    {resumeLimits.planName !== 'No Active Plan' && (
                      <Badge variant="outline" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      resumeLimits.isExpired
                        ? 'text-red-600'
                        : canUploadMore
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {resumeLimits.isExpired
                      ? 'Your plan has expired. Please renew to upload resumes.'
                      : resumeLimits.resumeLimit === 'unlimited'
                      ? `${resumes.length} resumes uploaded • Unlimited uploads available`
                      : canUploadMore
                      ? `${resumes.length} of ${resumeLimits.resumeLimit} resumes uploaded • ${resumeLimits.remainingUploads} uploads remaining`
                      : `Resume limit reached (${resumes.length}/${resumeLimits.resumeLimit})`}
                  </p>
                </div>
              </div>
              {(!canUploadMore || resumeLimits.isExpired) && (
                <Link href="/seeker/subscription">
                  <Button
                    size="sm"
                    className="bg-brand-teal hover:bg-brand-teal/90"
                  >
                    Upgrade Plan
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Resumes */}
      {resumes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Your Resumes</h3>
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {editingResumeId === resume.id ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <Input
                              value={editingFilename}
                              onChange={(e) =>
                                setEditingFilename(e.target.value)
                              }
                              className="flex-1"
                              placeholder="Enter resume name"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(resume.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(resume.id)}
                              disabled={isUpdating || !editingFilename.trim()}
                            >
                              {isUpdating ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isUpdating}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">
                              {cleanFilename(resume.filename)}
                            </p>
                            {resume.isPrimary && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>Uploaded: {formatDate(resume.uploadedAt)}</span>
                        {resume.fileSize && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(resume.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {editingResumeId !== resume.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(resume)}
                          disabled={isUpdating}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </Button>
                        {!resume.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimary(resume.id)}
                            disabled={isUpdating}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set Primary
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={viewingResumeId === resume.id}
                      onClick={async () => {
                        try {
                          setViewingResumeId(resume.id);
                          // Add impersonation headers if needed
                          const headers: HeadersInit = {};
                          if (typeof window !== 'undefined') {
                            const impersonationSession =
                              getImpersonationSession();
                            if (impersonationSession) {
                              console.log(
                                '🎭 RESUME UPLOAD: Adding impersonation headers to view request',
                                {
                                  impersonatedUserId:
                                    impersonationSession.impersonatedUser.id,
                                  adminId: impersonationSession.adminId,
                                  resumeId: resume.id,
                                }
                              );
                              headers['x-impersonated-user-id'] =
                                impersonationSession.impersonatedUser.id;
                              headers['x-admin-user-id'] =
                                impersonationSession.adminId;
                            }
                          }

                          const response = await fetch(
                            `/api/seeker/resumes/${resume.id}/download`,
                            { headers }
                          );
                          if (response.ok) {
                            const data = await response.json();
                            window.open(data.downloadUrl, '_blank');
                          } else {
                            onShowToast?.({
                              title: 'Error',
                              description:
                                'Failed to generate secure view link',
                              variant: 'destructive',
                              duration: 5000,
                            });
                          }
                        } catch (error) {
                          console.error('Error viewing resume:', error);
                          onShowToast?.({
                            title: 'Error',
                            description: 'Failed to view resume',
                            variant: 'destructive',
                            duration: 5000,
                          });
                        } finally {
                          setViewingResumeId(null);
                        }
                      }}
                    >
                      {viewingResumeId === resume.id ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      View
                    </Button>
                    {editingResumeId !== resume.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(resume.id)}
                        disabled={isDeleting || isUpdating}
                      >
                        {isDeleting ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>
              {resumes.length === 0
                ? 'Upload Your First Resume'
                : isAtLimit
                ? 'Resume Limit Reached'
                : 'Upload Additional Resume'}
            </span>
          </CardTitle>
          <CardDescription>
            {resumeLimits && (!canUploadMore || resumeLimits.isExpired) ? (
              <span
                className={
                  resumeLimits.isExpired ? 'text-red-600' : 'text-orange-600'
                }
              >
                {resumeLimits.isExpired
                  ? 'Your plan has expired. Please renew to upload resumes.'
                  : isAtLimit
                  ? `You've used all ${resumeLimits.resumeLimit} resume uploads for your ${resumeLimits.planName} plan. Delete a resume or upgrade to upload more.`
                  : 'Resume limit reached. Please upgrade your plan to upload more resumes.'}
              </span>
            ) : (
              <>
                <span className="block text-gray-600">
                  Upload your resume in PDF, DOC, or DOCX format (max 5MB)
                </span>
                {resumeLimits &&
                  resumeLimits.remainingUploads !== 'unlimited' && (
                    <span className="block text-sm text-blue-600 mt-1">
                      This will use 1 of your {resumeLimits.remainingUploads}{' '}
                      remaining resume credits
                    </span>
                  )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resumeLimits && (!canUploadMore || resumeLimits.isExpired) ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {resumeLimits.isExpired
                  ? 'Plan Expired'
                  : 'Upload Limit Reached'}
              </h3>
              <p className="text-gray-600 mb-4">
                {resumeLimits.isExpired
                  ? 'Your subscription has expired. Renew your plan to continue uploading resumes.'
                  : isAtLimit
                  ? `You've used all ${resumeLimits.resumeLimit} resume uploads for your ${resumeLimits.planName} plan.`
                  : `You need more resume credits to upload additional resumes.`}
              </p>
              <div className="flex justify-center space-x-3">
                {isAtLimit && resumes.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onShowToast?.({
                        title: 'Delete a Resume First',
                        description:
                          'To upload a new resume, please delete one of your existing resumes first.',
                        variant: 'default',
                        duration: 5000,
                      });
                    }}
                  >
                    Delete Resume First
                  </Button>
                )}
                <Link href="/seeker/subscription">
                  <Button className="bg-brand-teal hover:bg-brand-teal/90">
                    {resumeLimits.isExpired ? 'Renew Plan' : 'Upgrade Plan'}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <FileUpload
              onUpload={handleUploadComplete}
              accept=".pdf,.doc,.docx"
              maxSize={5 * 1024 * 1024}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Resume"
        description="Are you sure you want to delete this resume? This action cannot be undone and will permanently remove the resume from your profile. You will receive 1 resume credit back."
        confirmText="Delete Resume"
        cancelText="Keep Resume"
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Resume In Use Dialog */}
      <ResumeInUseDialog
        isOpen={showResumeInUseDialog}
        onClose={() => setShowResumeInUseDialog(false)}
        jobsAppliedTo={resumeInUseJobs}
      />
    </div>
  );
}
