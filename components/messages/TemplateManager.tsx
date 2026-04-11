'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    FileText,
    Plus,
    Star,
    Clock,
    MessageSquare,
    Briefcase
} from 'lucide-react'

interface Template {
    id: string
    name: string
    category: string
    content: string
    isDefault: boolean
    usageCount: number
    createdAt: string
}

interface TemplateManagerProps {
    onSelectTemplate: (template: Template) => void
    onCreateTemplate?: (template: Omit<Template, 'id' | 'usageCount' | 'createdAt' | 'isDefault'>) => void
}

const TEMPLATE_CATEGORIES = [
    { value: 'interview', label: 'Interview', icon: MessageSquare },
    { value: 'offer', label: 'Job Offer', icon: Star },
    { value: 'follow-up', label: 'Follow-up', icon: Clock },
    { value: 'status', label: 'Status Update', icon: FileText },
    { value: 'meeting', label: 'Meeting', icon: Briefcase },
    { value: 'general', label: 'General', icon: MessageSquare }
]

export function TemplateManager({ onSelectTemplate, onCreateTemplate }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<{
        custom: Template[]
        default: Template[]
    }>({ custom: [], default: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        category: 'general',
        content: ''
    })

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        try {
            const response = await fetch('/api/messages/templates')
            if (!response.ok) {
                throw new Error('Failed to fetch templates')
            }
            const data = await response.json()
            setTemplates(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load templates')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTemplate = async () => {
        if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
            setError('Name and content are required')
            return
        }

        try {
            const response = await fetch('/api/messages/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTemplate)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create template')
            }

            const data = await response.json()

            // Add to custom templates
            setTemplates(prev => ({
                ...prev,
                custom: [data.template, ...prev.custom]
            }))

            // Call callback if provided
            if (onCreateTemplate) {
                onCreateTemplate(newTemplate)
            }

            // Reset form and close modal
            setNewTemplate({ name: '', category: 'general', content: '' })
            setShowCreateModal(false)
            setError(null)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create template')
        }
    }

    const filteredTemplates = () => {
        const allTemplates = [...templates.default, ...templates.custom]
        if (selectedCategory === 'all') {
            return allTemplates
        }
        return allTemplates.filter(t => t.category === selectedCategory)
    }

    const getCategoryIcon = (category: string) => {
        const categoryData = TEMPLATE_CATEGORIES.find(c => c.value === category)
        return categoryData?.icon || MessageSquare
    }

    const getCategoryLabel = (category: string) => {
        const categoryData = TEMPLATE_CATEGORIES.find(c => c.value === category)
        return categoryData?.label || category
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Message Templates
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Message Templates
                    </CardTitle>
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Create
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Template</DialogTitle>
                                <DialogDescription>
                                    Create a reusable message template for future use.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="template-name">Template Name</Label>
                                        <Input
                                            id="template-name"
                                            value={newTemplate.name}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Interview Follow-up"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="template-category">Category</Label>
                                        <Select
                                            value={newTemplate.category}
                                            onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TEMPLATE_CATEGORIES.map(category => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="template-content">Content</Label>
                                    <Textarea
                                        id="template-content"
                                        value={newTemplate.content}
                                        onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Enter your template content..."
                                        className="min-h-[200px]"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Tip: Use variables like {'{{candidateName}}'}, {'{{jobTitle}}'}, {'{{companyName}}'} for personalization
                                    </p>
                                </div>
                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateTemplate}>
                                        Create Template
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="mt-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {TEMPLATE_CATEGORIES.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {filteredTemplates().length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                            No templates found for selected category
                        </p>
                    ) : (
                        filteredTemplates().map((template) => {
                            const IconComponent = getCategoryIcon(template.category)
                            return (
                                <div
                                    key={template.id}
                                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => onSelectTemplate(template)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-2 flex-1">
                                            <IconComponent className="h-4 w-4 mt-1 text-muted-foreground" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-sm">{template.name}</h4>
                                                    {template.isDefault && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {getCategoryLabel(template.category)}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {template.content.substring(0, 100)}...
                                                </p>
                                            </div>
                                        </div>
                                        {template.usageCount > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                {template.usageCount} uses
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}