'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Star,
  Download,
  Eye,
  MessageSquare,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'
import { CritiqueRequest } from '@/lib/resume-critique'
import { useToast } from '@/components/ui/toast'
import jsPDF from 'jspdf'


interface ResumeCritiqueManagementProps {
  adminId: string
}

export function ResumeCritiqueManagement({ adminId }: ResumeCritiqueManagementProps) {
  console.log('ResumeCritiqueManagement mounted with adminId:', adminId)
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingRequests, setPendingRequests] = useState<CritiqueRequest[]>([])
  const [completedRequests, setCompletedRequests] = useState<CritiqueRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<CritiqueRequest | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [isViewingFeedback, setIsViewingFeedback] = useState(false)
  const [reviewData, setReviewData] = useState({
    overallScore: 75,
    formattingScore: 75,
    contentScore: 75,
    keywordsScore: 75,
    experienceScore: 75,
    skillsScore: 75,
    feedback: '',
    recommendations: ''
  })
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Helper function to ensure score values are between 0 and 100
  const clampScore = (value: number): number => {
    if (isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
  }

  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useToast()
  const feedbackRef = useRef<HTMLDivElement>(null)

  // Helper function to convert string dates to Date objects
  const convertDateStringToDate = (critiques: any[]): CritiqueRequest[] => {
    return critiques.map(critique => ({
      ...critique,
      requestedAt: typeof critique.requestedAt === 'string'
        ? new Date(critique.requestedAt)
        : critique.requestedAt,
      completedAt: typeof critique.completedAt === 'string' && critique.completedAt
        ? new Date(critique.completedAt)
        : critique.completedAt
    }))
  }

  // Fetch all critiques once on component mount
  useEffect(() => {
    const fetchAllCritiques = async () => {
      try {
        setIsLoading(true)

        // First try fetching all critiques without authentication headers
        const response = await fetch('/api/admin/resume-critiques')

        if (response.ok) {
          const data = await response.json()
          console.log('Fetched all critiques:', data)
          const critiques: any[] = data.critiques || []

          // Convert string dates to Date objects
          const convertedCritiques = convertDateStringToDate(critiques)

          // Separate pending and completed critiques
          const pending = convertedCritiques.filter(critique => ['pending', 'in_progress'].includes(critique.status))
          const completed = convertedCritiques.filter(critique => critique.status === 'completed')

          console.log('Pending critiques:', pending)
          console.log('Completed critiques:', completed)

          setPendingRequests(pending)
          setCompletedRequests(completed)
        } else {
          console.error('Failed to fetch all critiques, status:', response.status)
          const errorText = await response.text()
          console.error('Error response:', errorText)

        }
      } catch (error) {
        console.error('Error fetching all critiques:', error)
        addToast({
          title: 'Warning',
          description: 'Failed to load all resume critiques, trying pending only.',
          variant: 'default',
          duration: 5000,
        })

      } finally {
        setIsLoading(false)
      }
    }

    fetchAllCritiques()
  }, [addToast])


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'in_progress':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    return (
      <Badge variant={priority === 'rush' ? 'destructive' : 'secondary'}>
        {priority === 'rush' ? 'Rush' : 'Standard'}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'in_progress':
        return <Badge variant="destructive">In Progress</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Helper function to format dates safely
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'N/A'

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString()
    } catch {
      return 'Invalid Date'
    }
  }

  const handleStartReview = (request: CritiqueRequest) => {
    setSelectedRequest(request)
    setIsReviewing(true)
    // Load existing review data if available
    if (request.analysis) {
      const analysis = request.analysis as any;
      setReviewData({
        overallScore: analysis.overallScore || 75,
        formattingScore: analysis.sections?.formatting?.score || 75,
        contentScore: analysis.sections?.content?.score || 75,
        keywordsScore: analysis.sections?.keywords?.score || 75,
        experienceScore: analysis.sections?.experience?.score || 75,
        skillsScore: analysis.sections?.skills?.score || 75,
        // Load existing feedback from content section
        feedback: analysis.sections?.content?.feedback?.[0] || '',
        // Load existing custom recommendations
        recommendations: analysis.recommendations?.find((rec: any) => rec.category === 'Custom')?.description || ''
      });
    } else {
      // Reset to default values if no analysis data
      setReviewData({
        overallScore: 75,
        formattingScore: 75,
        contentScore: 75,
        keywordsScore: 75,
        experienceScore: 75,
        skillsScore: 75,
        feedback: '',
        recommendations: ''
      });
    }
  }

  const handleViewFeedback = (request: CritiqueRequest) => {
    setSelectedRequest(request)
    setIsViewingFeedback(true)
  }

  const handleExportFeedback = async (request: CritiqueRequest) => {
    if (!jsPDF) {
      addToast({
        title: 'Error',
        description: 'PDF export is not available in this environment.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setExportingId(request.id);
    try {
      // Set the request for export
      setSelectedRequest(request);

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // If we have a ref to the feedback content, we could use html2canvas
      // For now, let's create a simple PDF with jsPDF
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.text(`Resume Feedback - ${request.targetRole || 'Resume Review'}`, 20, 20);

      // Add metadata
      doc.setFontSize(12);
      doc.text(`Completed on: ${formatDate(request.completedAt)}`, 20, 30);
      doc.text(`Reviewer: ${request.reviewerName || request.reviewerId}`, 20, 37);

      // Add overall score
      doc.setFontSize(16);
      doc.text('Overall Score', 20, 50);
      doc.setFontSize(14);
      doc.text(`${request.analysis?.overallScore || 'N/A'}/100`, 20, 57);

      // Add section scores
      doc.setFontSize(16);
      doc.text('Section Scores', 20, 70);

      let yPosition = 80;
      const sections = request.analysis?.sections;

      if (sections) {
        doc.setFontSize(12);
        if (sections.formatting) {
          doc.text(`Formatting: ${sections.formatting.score}/100`, 20, yPosition);
          yPosition += 7;
        }
        if (sections.content) {
          doc.text(`Content: ${sections.content.score}/100`, 20, yPosition);
          yPosition += 7;
        }
        if (sections.keywords) {
          doc.text(`Keywords: ${sections.keywords.score}/100`, 20, yPosition);
          yPosition += 7;
        }
        if (sections.experience) {
          doc.text(`Experience: ${sections.experience.score}/100`, 20, yPosition);
          yPosition += 7;
        }
        if (sections.skills) {
          doc.text(`Skills: ${sections.skills.score}/100`, 20, yPosition);
          yPosition += 7;
        }
      }

      // Add recommendations header if there are recommendations
      if (request.analysis?.recommendations && request.analysis.recommendations.length > 0) {
        yPosition += 10;
        doc.setFontSize(16);
        doc.text('Recommendations', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        request.analysis.recommendations.forEach((rec: any, index: number) => {
          if (yPosition > 270) { // Check if we need a new page
            doc.addPage();
            yPosition = 20;
          }

          doc.text(`${index + 1}. ${rec.title}`, 20, yPosition);
          yPosition += 7;
          doc.text(`   Priority: ${rec.priority || 'medium'}`, 25, yPosition);
          yPosition += 7;
          doc.text(`   ${rec.description}`, 25, yPosition, { maxWidth: 170 });
          yPosition += 15;
        });
      }

      // Save the PDF
      doc.save(`resume-feedback-${request.id}.pdf`);

      addToast({
        title: 'Success',
        description: 'Feedback exported successfully!',
        variant: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting feedback:', error);
      addToast({
        title: 'Error',
        description: 'Failed to export feedback as PDF. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setExportingId(null);
    }
  }

  const handlePreview = async (id: string) => {
    try {
      // Add impersonation headers if needed
      const headers: HeadersInit = {
        'x-admin-user-id': adminId
      };

      const response = await fetch(
        `/api/admin/resume-critiques/${id}/download`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const popup = window.open(
          data.downloadUrl,
          'resume-viewer',
          'width=800,height=900,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
        );
        if (!popup) {
          addToast?.({
            title: 'Popup Blocked',
            description: 'Please allow popups to view your resume',
            variant: 'destructive',
            duration: 5000,
          });
        }
      } else {
        addToast?.({
          title: 'Error',
          description: 'Failed to generate secure view link',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error opening resume preview:', error)
      addToast({
        title: 'Preview Error',
        description: 'Failed to open resume preview. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // Flexible function to send review data to the API
  const sendReviewData = async (isComplete: boolean) => {
    if (!selectedRequest) return;

    // Use the real admin ID if available, otherwise use a placeholder
    const reviewerId = adminId !== 'admin_user' ? adminId : 'admin_placeholder';

    try {
      // Submit the review to the API with minimal headers
      const response = await fetch('/api/admin/resume-critiques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          reviewerId: reviewerId,
          isDraft: !isComplete, // New flag to indicate if this is a draft save
          analysis: {
            overallScore: reviewData.overallScore,
            sections: {
              formatting: {
                score: reviewData.formattingScore,
                feedback: ['Professional layout with clear sections'],
                suggestions: ['Consider using a more modern font']
              },
              content: {
                score: reviewData.contentScore,
                // Include custom feedback from textarea in the content section
                feedback: reviewData.feedback ? [reviewData.feedback] : ['Clear and concise job descriptions'],
                suggestions: ['Add more quantifiable achievements']
              },
              keywords: {
                score: reviewData.keywordsScore,
                feedback: ['Some relevant industry keywords present'],
                suggestions: ['Add more role-specific keywords'],
                missingKeywords: ['Leadership', 'Communication'],
                industryKeywords: ['Professional', 'Excellence']
              },
              experience: {
                score: reviewData.experienceScore,
                feedback: ['Relevant work experience for target role'],
                suggestions: ['Add more specific project details']
              },
              skills: {
                score: reviewData.skillsScore,
                feedback: ['Comprehensive skills section'],
                suggestions: ['Organize skills by category']
              }
            },
            recommendations: [
              {
                priority: 'high',
                category: 'Content',
                title: 'Add Quantifiable Achievements',
                description: 'Replace generic job duties with specific, measurable accomplishments',
                impact: 'Could increase interview callbacks by 35-50%'
              },
              // Add custom recommendation from textarea if provided
              ...(reviewData.recommendations ? [{
                priority: 'medium',
                category: 'Custom',
                title: 'Custom Recommendations',
                description: reviewData.recommendations,
                impact: 'Tailored feedback from reviewer'
              }] : [])
            ],
            industryComparison: {
              averageScore: 68,
              percentile: 75,
              topPerformingAreas: ['Experience', 'Skills'],
              improvementAreas: ['Keywords', 'Content']
            }
          }
        })
      });

      if (response.ok) {
        if (isComplete) {
          // Refetch all critiques to get the updated data with analysis
          try {
            const refetchResponse = await fetch('/api/admin/resume-critiques')
            if (refetchResponse.ok) {
              const data = await refetchResponse.json()
              const critiques = data.critiques || []
              const convertedCritiques = convertDateStringToDate(critiques)

              const pending = convertedCritiques.filter(critique => ['pending', 'in_progress'].includes(critique.status))
              const completed = convertedCritiques.filter(critique => critique.status === 'completed')

              setPendingRequests(pending)
              setCompletedRequests(completed)
            }
          } catch (refetchError) {
            console.error('Error refetching critiques after completion:', refetchError)
            // Fallback to basic local state update if refetch fails
            setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
            setCompletedRequests(prev => [...prev, {
              ...selectedRequest,
              status: 'completed',
              completedAt: new Date(),
              reviewerId: reviewerId
            }])
          }

          setSelectedRequest(null)
          setActiveTab('completed')

          addToast({
            title: 'Success',
            description: 'Resume critique submitted successfully!',
            variant: 'success',
            duration: 5000,
          })
        } else {
          // For draft saves, just show a success message
          addToast({
            title: 'Success',
            description: 'Draft saved successfully!',
            variant: 'default',
            duration: 3000,
          })
        }
        setIsReviewing(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save review')
      }
    } catch (error) {
      console.error('Error saving review:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error saving review. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    }
  };

  // Handle saving draft without changing status
  const handleSaveDraft = async () => {
    await sendReviewData(false); // false means draft save
  };

  // Handle completing the review
  const handleSubmitReview = async () => {
    await sendReviewData(true); // true means complete submission
  };

  // Stats based on actual data
  const stats = {
    pending: pendingRequests.length,
    completed: completedRequests.length,
    revenue: completedRequests.reduce((sum, req) => sum + (req.cost || 0), 0),
    avgScore: 78 // Mock average score
  }

  // Show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading resume critiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Resume Critique Management</h2>
        <p className="text-gray-600 mt-2">
          Review and provide feedback on job seeker resumes
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Debug: {pendingRequests.length} pending, {completedRequests.length} completed
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">${stats.revenue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      {isReviewing && selectedRequest && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Reviewing Resume - {selectedRequest.targetRole || 'N/A'}</span>
              <div className="flex items-center space-x-2">
                {getPriorityBadge(selectedRequest.priority)}
                <Button variant="outline" size="sm" onClick={() => setIsReviewing(false)}>
                  Cancel
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Requested {formatDate(selectedRequest.requestedAt)} •
              Target Industry: {selectedRequest.targetIndustry || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resume Preview */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">Resume Document</p>
                  <p className="text-sm text-gray-600 truncate max-w-xs">{selectedRequest.resumeUrl.split('/').pop()}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(selectedRequest.id)}
                  disabled={isPreviewLoading}
                >
                  {isPreviewLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Scoring */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Section Scores</h3>

                <div>
                  <Label htmlFor="overallScore">Overall Score (0-100)</Label>
                  <Input
                    id="overallScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.overallScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      overallScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="formattingScore">Formatting Score</Label>
                  <Input
                    id="formattingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.formattingScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      formattingScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contentScore">Content Score</Label>
                  <Input
                    id="contentScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.contentScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      contentScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Additional Scores</h3>

                <div>
                  <Label htmlFor="keywordsScore">Keywords Score</Label>
                  <Input
                    id="keywordsScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.keywordsScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      keywordsScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="experienceScore">Experience Score</Label>
                  <Input
                    id="experienceScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.experienceScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      experienceScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="skillsScore">Skills Score</Label>
                  <Input
                    id="skillsScore"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewData.skillsScore}
                    onChange={(e) => setReviewData(prev => ({
                      ...prev,
                      skillsScore: clampScore(parseInt(e.target.value) || 0)
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback">Detailed Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide detailed feedback on the resume..."
                  value={reviewData.feedback}
                  onChange={(e) => setReviewData(prev => ({
                    ...prev,
                    feedback: e.target.value
                  }))}
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  placeholder="Provide specific recommendations for improvement..."
                  value={reviewData.recommendations}
                  onChange={(e) => setReviewData(prev => ({
                    ...prev,
                    recommendations: e.target.value
                  }))}
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button onClick={handleSubmitReview}>
                Complete Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Feedback Modal */}
      {isViewingFeedback && selectedRequest && selectedRequest.analysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 !mt-0">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" ref={feedbackRef}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Feedback for {selectedRequest.targetRole || 'Resume Review'}</span>
                <Button variant="ghost" size="sm" onClick={() => setIsViewingFeedback(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Completed on {formatDate(selectedRequest.completedAt)} by {selectedRequest.reviewerName || selectedRequest.reviewerId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Overall Score: {selectedRequest.analysis.overallScore}/100</h3>
                <p className="text-sm text-gray-600">
                  This score reflects the overall quality of the resume based on formatting, content, keywords, experience, and skills.
                </p>
              </div>

              {/* Section Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">Section Scores</h3>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Formatting</span>
                      <span className="font-semibold">{selectedRequest.analysis.sections?.formatting?.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.analysis.sections?.formatting?.feedback?.[0] || 'No feedback available'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Content</span>
                      <span className="font-semibold">{selectedRequest.analysis.sections?.content?.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.analysis.sections?.content?.feedback?.[0] || 'No feedback available'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Additional Scores</h3>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Keywords</span>
                      <span className="font-semibold">{selectedRequest.analysis.sections?.keywords?.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.analysis.sections?.keywords?.feedback?.[0] || 'No feedback available'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Experience</span>
                      <span className="font-semibold">{selectedRequest.analysis.sections?.experience?.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.analysis.sections?.experience?.feedback?.[0] || 'No feedback available'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Skills</span>
                      <span className="font-semibold">{selectedRequest.analysis.sections?.skills?.score}/100</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.analysis.sections?.skills?.feedback?.[0] || 'No feedback available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* General Feedback */}
              {selectedRequest.analysis.sections?.content?.feedback && selectedRequest.analysis.sections.content.feedback.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Detailed Feedback</h3>
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedRequest.analysis.sections.content.feedback[0]}
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Recommendations */}
              {selectedRequest.analysis.recommendations && selectedRequest.analysis.recommendations.some((rec: any) => rec.category === 'Custom') && (
                <div>
                  <h3 className="font-semibold mb-2">Custom Recommendations</h3>
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    {selectedRequest.analysis.recommendations
                      .filter((rec: any) => rec.category === 'Custom')
                      .map((rec: any, index: number) => (
                        <div key={index}>
                          <p className="text-sm whitespace-pre-wrap">{rec.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Tailored feedback from reviewer</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Priority Recommendations */}
              {selectedRequest.analysis.recommendations && selectedRequest.analysis.recommendations.some((rec: any) => rec.category !== 'Custom') && (
                <div>
                  <h3 className="font-semibold mb-2">Priority Recommendations</h3>
                  <div className="space-y-3">
                    {selectedRequest.analysis.recommendations
                      .filter((rec: any) => rec.category !== 'Custom')
                      .map((rec: any, index: number) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{rec.title}</span>
                            <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                              {rec.priority?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{rec.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Category: {rec.category}</p>
                          {rec.impact && <p className="text-xs text-gray-500 mt-1">Impact: {rec.impact}</p>}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Industry Comparison */}
              {selectedRequest.analysis.industryComparison && (
                <div>
                  <h3 className="font-semibold mb-2">Industry Comparison</h3>
                  <div className="p-3 bg-green-50 rounded">
                    <p>Average Score: <span className="font-semibold">{selectedRequest.analysis.industryComparison.averageScore}/100</span></p>
                    <p>Percentile: <span className="font-semibold">{selectedRequest.analysis.industryComparison.percentile}%</span></p>
                    <div className="mt-2">
                      <p className="text-sm">
                        <span className="font-medium">Top Performing Areas:</span> {selectedRequest.analysis.industryComparison.topPerformingAreas?.join(', ')}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Improvement Areas:</span> {selectedRequest.analysis.industryComparison.improvementAreas?.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsViewingFeedback(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePreview(selectedRequest.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending Reviews ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No pending reviews
                  </h3>
                  <p className="text-gray-600">
                    All resume critiques have been completed
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Debug: Found {pendingRequests.length} pending critiques
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span>Target Role: <span className="font-normal">{request.targetRole || 'Resume Review'}</span></span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                        <Badge variant="outline">${request.cost}</Badge>
                      </div>
                    </div>
                    {/* Fixed: Using div instead of CardDescription to avoid p>div error */}
                    <div className="text-sm text-gray-600">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>Seeker ID: {request.seekerId}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Requested: {formatDate(request.requestedAt)}</span>
                        </span>
                        {request.targetIndustry && (
                          <span>Industry: {request.targetIndustry}</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 truncate max-w-xs">
                            {request.resumeUrl.split('/').pop()}
                          </span>
                        </div>
                        {request.priority === 'rush' && (
                          <Alert className="py-1 px-5 border-orange-200 bg-orange-50 flex items-center gap-2 w-max">
                            <AlertTriangle className="h-3 w-3 !relative !top-0 !left-0" />
                            <AlertDescription className="text-xs !pl-0 pt-2">
                              Rush delivery - 24 hour deadline
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(request.id)}
                          disabled={isPreviewLoading}
                        >
                          {isPreviewLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] mr-2"></div>
                          ) : (
                            <Eye className="h-4 w-4 mr-2" />
                          )}
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStartReview(request)}
                        >
                          {request.status === 'in_progress' ? 'Edit Review' : 'Start Review'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No completed reviews
                  </h3>
                  <p className="text-gray-600">
                    Completed reviews will appear here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Debug: Found {completedRequests.length} completed critiques
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span>{request.targetRole || 'Resume Review'}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        <Badge variant="outline">${request.cost}</Badge>
                      </div>
                    </div>
                    {/* Fixed: Using div instead of CardDescription to avoid p>div error */}
                    <div className="text-sm text-gray-600">
                      <div className="flex flex-wrap items-center gap-4">
                        <span>Completed: {formatDate(request.completedAt)}</span>
                        <span>Reviewer: {request.reviewerName || request.reviewerId}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Review completed and sent to job seeker
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewFeedback(request)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Feedback
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportFeedback(request)}
                          disabled={exportingId === request.id}
                        >
                          {exportingId === request.id ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] mr-2"></div>
                              Exporting...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
