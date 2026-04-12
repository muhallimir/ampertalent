'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReportingService, ReportConfig, ReportData, ScheduledReport } from '@/lib/reporting'
import {
  FileText,
  Download,
  Calendar,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Eye,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign
} from '@/components/icons'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReports, setGeneratedReports] = useState<ReportData[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [reportTemplates, setReportTemplates] = useState<Array<{
    id: string
    name: string
    description: string
    config: Partial<ReportConfig>
  }>>([])

  // Report generation form state
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    type: 'user_activity',
    format: 'pdf',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    },
    includeCharts: true
  })

  // Scheduled report form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    schedule: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recipients: ['']
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [scheduled, templates] = await Promise.all([
        ReportingService.getScheduledReports(),
        ReportingService.getReportTemplates()
      ])
      
      setScheduledReports(scheduled)
      setReportTemplates(templates)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true)
      
      const validation = ReportingService.validateReportConfig(reportConfig as ReportConfig)
      if (!validation.isValid) {
        alert('Please fix the following errors:\n' + validation.errors.join('\n'))
        return
      }

      const report = await ReportingService.generateReport(reportConfig as ReportConfig)
      setGeneratedReports(prev => [report, ...prev])
      
      alert('Report generated successfully!')
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleScheduleReport = async () => {
    try {
      if (!scheduleForm.name.trim()) {
        alert('Please enter a report name')
        return
      }

      const scheduled = await ReportingService.scheduleReport(
        scheduleForm.name,
        reportConfig as ReportConfig,
        scheduleForm.schedule,
        scheduleForm.recipients.filter(email => email.trim())
      )

      setScheduledReports(prev => [scheduled, ...prev])
      setScheduleForm({ name: '', schedule: 'weekly', recipients: [''] })
      
      alert('Report scheduled successfully!')
    } catch (error) {
      console.error('Error scheduling report:', error)
      alert('Failed to schedule report. Please try again.')
    }
  }

  const handleExportReport = async (report: ReportData, format: string) => {
    try {
      const content = await ReportingService.exportReport(report, format)
      
      // Create download link
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'user_activity': return <Users className="h-4 w-4" />
      case 'revenue': return <DollarSign className="h-4 w-4" />
      case 'job_performance': return <BarChart3 className="h-4 w-4" />
      case 'application_trends': return <TrendingUp className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getScheduleColor = (schedule: string) => {
    switch (schedule) {
      case 'daily': return 'bg-blue-100 text-blue-800'
      case 'weekly': return 'bg-green-100 text-green-800'
      case 'monthly': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Coming Soon Badge */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Coming Soon</h2>
              <p className="text-blue-100 text-sm">
                Advanced reporting features are currently in development for demo purposes
              </p>
            </div>
            <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300">
              Demo Only
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">
          Generate, schedule, and manage comprehensive platform reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Configuration */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                  <CardDescription>
                    Configure the parameters for your custom report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Report Type */}
                  <div>
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select
                      value={reportConfig.type}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, type: value as 'user_activity' | 'revenue' | 'job_performance' | 'application_trends' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_activity">User Activity</SelectItem>
                        <SelectItem value="revenue">Revenue Analysis</SelectItem>
                        <SelectItem value="job_performance">Job Performance</SelectItem>
                        <SelectItem value="application_trends">Application Trends</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={reportConfig.dateRange?.start.toISOString().split('T')[0]}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange!,
                            start: new Date(e.target.value)
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={reportConfig.dateRange?.end.toISOString().split('T')[0]}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange!,
                            end: new Date(e.target.value)
                          }
                        }))}
                      />
                    </div>
                  </div>

                  {/* Export Format */}
                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <Select
                      value={reportConfig.format}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, format: value as 'pdf' | 'excel' | 'csv' | 'json' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filters */}
                  <div>
                    <Label>Filters (Optional)</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Select
                        value={reportConfig.filters?.userRole || 'all'}
                        onValueChange={(value) => setReportConfig(prev => ({
                          ...prev,
                          filters: { ...prev.filters, userRole: value === 'all' ? undefined : value as 'seeker' | 'employer' }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="User Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="seeker">Job Seekers</SelectItem>
                          <SelectItem value="employer">Employers</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Job Category"
                        value={reportConfig.filters?.jobCategory || ''}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          filters: { ...prev.filters, jobCategory: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button 
                    onClick={handleGenerateReport} 
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule This Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Save as Template
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Data
                  </Button>
                </CardContent>
              </Card>

              {/* Report Preview */}
              {reportConfig.type && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getReportTypeIcon(reportConfig.type)}
                      <span>Report Preview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">
                          {reportConfig.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period:</span>
                        <span className="font-medium">
                          {reportConfig.dateRange && 
                            `${formatDate(reportConfig.dateRange.start)} - ${formatDate(reportConfig.dateRange.end)}`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium uppercase">{reportConfig.format}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Schedule Report Section */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule This Report</CardTitle>
              <CardDescription>
                Set up automatic generation and delivery of this report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    placeholder="e.g., Weekly User Activity"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="schedule">Schedule</Label>
                  <Select
                    value={scheduleForm.schedule}
                    onValueChange={(value) => setScheduleForm(prev => ({ ...prev, schedule: value as 'daily' | 'weekly' | 'monthly' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="recipients">Email Recipients</Label>
                  <Input
                    id="recipients"
                    placeholder="admin@hiremymom.com"
                    value={scheduleForm.recipients[0]}
                    onChange={(e) => setScheduleForm(prev => ({ 
                      ...prev, 
                      recipients: [e.target.value] 
                    }))}
                  />
                </div>
              </div>
              <Button onClick={handleScheduleReport} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Scheduled Reports</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Scheduled Report
            </Button>
          </div>

          <div className="grid gap-4">
            {scheduledReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getReportTypeIcon(report.config.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{report.name}</h3>
                        <p className="text-sm text-gray-600">
                          {report.config.type.replace('_', ' ')} • {report.config.format.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getScheduleColor(report.schedule)}>
                        {report.schedule}
                      </Badge>
                      <div className="text-right text-sm">
                        <p className="text-gray-600">Next: {formatDate(report.nextGeneration)}</p>
                        {report.lastGenerated && (
                          <p className="text-gray-500">Last: {formatDate(report.lastGenerated)}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          {report.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                    <span>Recipients: {report.recipients.join(', ')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Report History</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {generatedReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        {getReportTypeIcon(report.config.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{report.title}</h3>
                        <p className="text-sm text-gray-600">{report.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Generated: {formatDate(report.generatedAt)} • {report.summary.totalRecords} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport(report, 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport(report, 'csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(report.summary.keyMetrics).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                        <div className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {generatedReports.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Generated</h3>
                <p className="text-gray-600 mb-4">
                  Generate your first report to see it appear here
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Report Templates</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getReportTypeIcon(template.config.type || 'user_activity')}
                      <span>{template.name}</span>
                    </CardTitle>
                    <Badge variant="outline">{template.config.format?.toUpperCase()}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Type: {template.config.type?.replace('_', ' ') || 'User Activity'}
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setReportConfig({ ...reportConfig, ...template.config })
                        setActiveTab('generate')
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}