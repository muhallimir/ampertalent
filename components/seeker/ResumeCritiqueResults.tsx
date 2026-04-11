'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'
import {
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Lightbulb,
  Award,
  User,
  Calendar
} from 'lucide-react'
import { ResumeAnalysis } from '@/lib/resume-critique'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SetStateAction } from 'react'

interface ResumeCritiqueResultsProps {
  analysis: ResumeAnalysis
  requestId: string
  completedAt: Date | string
  targetRole?: string
  targetIndustry?: string
  reviewerName?: string,
  setActiveTab?: SetStateAction
}

export function ResumeCritiqueResults({
  analysis,
  requestId,
  completedAt,
  targetRole,
  targetIndustry,
  reviewerName,
  setActiveTab
}: ResumeCritiqueResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <Target className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <Lightbulb className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  // Helper function to format date regardless of whether it's a Date object or string
  const formatDate = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toLocaleDateString();
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  // Function to generate and download PDF report
  const handleDownloadReport = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(22)
    doc.text('Resume Critique Report', 20, 20)
    
    // Add metadata
    doc.setFontSize(12)
    doc.text(`Request ID: ${requestId}`, 20, 30)
    doc.text(`Completed on: ${formatDate(completedAt)}`, 20, 37)
    if (targetRole) {
      doc.text(`Target Role: ${targetRole}`, 20, 44)
    }
    if (targetIndustry) {
      doc.text(`Target Industry: ${targetIndustry}`, 20, 51)
    }
    if (reviewerName) {
      doc.text(`Reviewed by: ${reviewerName}`, 20, 58)
    }
    
    // Add overall score
    doc.setFontSize(18)
    doc.text('Overall Score', 20, 70)
    doc.setFontSize(16)
    doc.text(`${analysis.overallScore}/100`, 20, 78)
    
    // Add industry comparison
    doc.setFontSize(16)
    doc.text('Industry Comparison', 20, 90)
    doc.setFontSize(12)
    doc.text(`Percentile: ${analysis.industryComparison.percentile}th`, 20, 98)
    doc.text(`Industry Average: ${analysis.industryComparison.averageScore}`, 20, 105)
    doc.text(`Above Average: +${analysis.overallScore - analysis.industryComparison.averageScore}`, 20, 112)
    
    // Add section scores
    doc.setFontSize(16)
    doc.text('Section Scores', 20, 125)
    
    const sectionData = [
      ['Formatting', analysis.sections.formatting.score.toString()],
      ['Content', analysis.sections.content.score.toString()],
      ['Keywords', analysis.sections.keywords.score.toString()],
      ['Experience', analysis.sections.experience.score.toString()],
      ['Skills', analysis.sections.skills.score.toString()]
    ]
    
    autoTable(doc, {
      startY: 130,
      head: [['Section', 'Score']],
      body: sectionData,
      theme: 'grid'
    })
    
    // Add detailed feedback
    if (analysis.sections.content.feedback && analysis.sections.content.feedback.length > 0) {
      const finalY1 = (doc as any).lastAutoTable?.finalY || 130;
      doc.setFontSize(16);
      doc.text('Detailed Feedback from Reviewer', 20, finalY1 + 15);
      doc.setFontSize(12);
      doc.text(analysis.sections.content.feedback[0], 20, finalY1 + 25, { maxWidth: 170 });
    }
    
    // Add recommendations
    if (analysis.recommendations.length > 0) {
      const finalY2 = (doc as any).lastAutoTable?.finalY || 150;
      doc.setFontSize(16);
      doc.text('Recommendations', 20, finalY2 + 15);
      
      // Custom recommendations
      const customRecs = analysis.recommendations.filter(rec => rec.category === 'Custom');
      if (customRecs.length > 0) {
        doc.setFontSize(14);
        doc.text('Custom Feedback from Reviewer', 20, finalY2 + 25);
        doc.setFontSize(12);
        let yPosition = finalY2 + 35;
        customRecs.forEach((rec, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${index + 1}. ${rec.title}`, 20, yPosition);
          yPosition += 7;
          doc.text(rec.description, 25, yPosition, { maxWidth: 170 });
          yPosition += 15;
        });
      }
      
      // Priority recommendations
      const priorityRecs = analysis.recommendations.filter(rec => rec.category !== 'Custom');
      if (priorityRecs.length > 0) {
        const startY = (doc as any).lastAutoTable?.finalY || finalY2 + 40;
        doc.setFontSize(14);
        doc.text('Priority Recommendations', 20, startY + 15);
        
        const recommendationData = priorityRecs.map(rec => [
          rec.title,
          rec.priority,
          rec.description,
          rec.impact
        ]);
        
        autoTable(doc, {
          startY: startY + 20,
          head: [['Title', 'Priority', 'Description', 'Impact']],
          body: recommendationData,
          theme: 'grid'
        });
      }
    }
    
    // Save the PDF
    doc.save(`resume-critique-${requestId}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resume Critique Results</h2>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Completed on {formatDate(completedAt)}</span>
            </div>
            {targetRole && (
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                <span>{targetRole}</span>
              </div>
            )}
            {targetIndustry && (
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                <span>{targetIndustry}</span>
              </div>
            )}
            {reviewerName && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>Reviewed by {reviewerName}</span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleDownloadReport} variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Download Report</span>
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Overall Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>
            <div className="flex-1">
              <Progress value={analysis.overallScore} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Needs Work</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>
            <Badge variant={getScoreBadgeVariant(analysis.overallScore)} className="text-sm">
              {analysis.overallScore >= 80 ? 'Excellent' : 
               analysis.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Industry Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Industry Comparison</span>
          </CardTitle>
          <CardDescription>
            How your resume compares to others in your field
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analysis.industryComparison.percentile}th
              </div>
              <div className="text-sm text-gray-500">Percentile</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analysis.industryComparison.averageScore}
              </div>
              <div className="text-sm text-gray-500">Industry Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{analysis.overallScore - analysis.industryComparison.averageScore}
              </div>
              <div className="text-sm text-gray-500">Above Average</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Top Performing Areas</h4>
              <ul className="space-y-1">
                {analysis.industryComparison.topPerformingAreas.map((area, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-700 mb-2">Areas for Improvement</h4>
              <ul className="space-y-1">
                {analysis.industryComparison.improvementAreas.map((area, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
          <CardDescription>
            Section-by-section breakdown of your resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="formatting" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="formatting">Formatting</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>

            {/* Formatting Tab */}
            <TabsContent value="formatting" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Formatting & Design</h3>
                <Badge variant={getScoreBadgeVariant(analysis.sections.formatting.score)}>
                  {analysis.sections.formatting.score}/100
                </Badge>
              </div>
              <Progress value={analysis.sections.formatting.score} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">What's Working Well</h4>
                  <ul className="space-y-1">
                    {analysis.sections.formatting.feedback.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Suggestions for Improvement</h4>
                  <ul className="space-y-1">
                    {analysis.sections.formatting.suggestions.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Content Quality</h3>
                <Badge variant={getScoreBadgeVariant(analysis.sections.content.score)}>
                  {analysis.sections.content.score}/100
                </Badge>
              </div>
              <Progress value={analysis.sections.content.score} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {analysis.sections.content.feedback.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {analysis.sections.content.suggestions.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Keywords Tab */}
            <TabsContent value="keywords" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Keywords & ATS Optimization</h3>
                <Badge variant={getScoreBadgeVariant(analysis.sections.keywords.score)}>
                  {analysis.sections.keywords.score}/100
                </Badge>
              </div>
              <Progress value={analysis.sections.keywords.score} className="h-2" />
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Current Strengths</h4>
                    <ul className="space-y-1">
                      {analysis.sections.keywords.feedback.map((item, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">Optimization Tips</h4>
                    <ul className="space-y-1">
                      {analysis.sections.keywords.suggestions.map((item, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.sections.keywords.missingKeywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Missing Important Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.sections.keywords.missingKeywords.map((keyword, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.sections.keywords.industryKeywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Industry Keywords Found</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.sections.keywords.industryKeywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Work Experience</h3>
                <Badge variant={getScoreBadgeVariant(analysis.sections.experience.score)}>
                  {analysis.sections.experience.score}/100
                </Badge>
              </div>
              <Progress value={analysis.sections.experience.score} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Strong Points</h4>
                  <ul className="space-y-1">
                    {analysis.sections.experience.feedback.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Enhancement Ideas</h4>
                  <ul className="space-y-1">
                    {analysis.sections.experience.suggestions.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Skills Section</h3>
                <Badge variant={getScoreBadgeVariant(analysis.sections.skills.score)}>
                  {analysis.sections.skills.score}/100
                </Badge>
              </div>
              <Progress value={analysis.sections.skills.score} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Well Done</h4>
                  <ul className="space-y-1">
                    {analysis.sections.skills.feedback.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Improvements</h4>
                  <ul className="space-y-1">
                    {analysis.sections.skills.suggestions.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detailed Feedback from Reviewer */}
      {analysis.sections.content.feedback && analysis.sections.content.feedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Detailed Feedback from Reviewer</span>
            </CardTitle>
            <CardDescription>
              Personalized feedback from your resume reviewer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border-l-4 border-l-blue-500 p-4 rounded">
              <p className="text-gray-700 whitespace-pre-wrap">
                {analysis.sections.content.feedback[0]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Recommendations</span>
          </CardTitle>
          <CardDescription>
            Focus on these changes for maximum impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Custom Recommendations */}
            {analysis.recommendations && analysis.recommendations.some(rec => rec.category === 'Custom') && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Custom Feedback from Reviewer</h3>
                <div className="space-y-3">
                  {analysis.recommendations
                    .filter(rec => rec.category === 'Custom')
                    .map((rec, index) => (
                      <Alert key={`custom-${index}`} className="border-l-4 border-l-green-500 bg-green-50">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-800">{rec.title}</h4>
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{rec.description}</p>
                            <p className="text-xs text-green-600 font-medium mt-2">
                              💡 {rec.impact}
                            </p>
                          </div>
                        </div>
                      </Alert>
                    ))}
                </div>
              </div>
            )}

            {/* Priority Recommendations */}
            {analysis.recommendations && analysis.recommendations.some(rec => rec.category !== 'Custom') && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Priority Recommendations</h3>
                <div className="space-y-4">
                  {analysis.recommendations
                    .filter(rec => rec.category !== 'Custom')
                    .map((rec, index) => (
                      <Alert key={index} className="border-l-4 border-l-blue-500">
                        <div className="flex items-start space-x-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge 
                                variant={rec.priority === 'high' ? 'destructive' : 
                                        rec.priority === 'medium' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {rec.priority.toUpperCase()} PRIORITY
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                            <p className="text-xs text-blue-600 font-medium">
                              💡 Impact: {rec.impact}
                            </p>
                          </div>
                        </div>
                      </Alert>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-700">
              Based on this analysis, here's what we recommend you do next:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Focus on the high-priority recommendations first</li>
              <li>Update your resume with the suggested improvements</li>
              <li>Consider requesting another critique after making changes</li>
              <li>Tailor your resume for specific job applications</li>
            </ol>
            <div className="flex space-x-3 pt-4">
              <Button onClick={() => setActiveTab('request')}>Request Another Critique</Button>
              <Button onClick={handleDownloadReport} variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download Detailed Report</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
