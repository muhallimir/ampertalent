'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { CoverLetterTemplateCard } from './CoverLetterTemplateCard';
import { CoverLetterTemplateForm } from './CoverLetterTemplateForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, FileText } from 'lucide-react';
import { getImpersonationSession } from '@/lib/admin-impersonation';

interface CoverLetterTemplate {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function CoverLetterTemplates() {
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<CoverLetterTemplate | null>(null);
  const { addToast } = useToast();
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [defaultingTemplateId, setDefaultingTemplateId] = useState<string | null>(null);

  // Helper function to get impersonation headers
  const getHeaders = () => {
    const headers: HeadersInit = {};

    if (typeof window !== 'undefined') {
      const impersonationSession = getImpersonationSession();
      if (impersonationSession) {
        headers['x-impersonated-user-id'] =
          impersonationSession.impersonatedUser.id;
        headers['x-admin-user-id'] = impersonationSession.adminId;
      }
    }

    return headers;
  };

  const fetchTemplates = async (showFullScreen = false) => {
    if (showFullScreen) {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/seeker/cover-letter-templates', {
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load cover letter templates',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      if (showFullScreen) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchTemplates(true);
  }, []);

  // this is to ensure the scroll lock is cleared when the dialog is closed to fix scroll issue after submitting template form
  useEffect(() => {
    if (!isFormOpen) {
      // Ensure Radix scroll lock is cleared
      document.body.style.overflow = '';
    }
  }, [isFormOpen]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEditTemplate = (template: CoverLetterTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: {
    title: string;
    content: string;
    isDefault?: boolean;
  }) => {
    try {
      const url = editingTemplate
        ? `/api/seeker/cover-letter-templates/${editingTemplate.id}`
        : '/api/seeker/cover-letter-templates';

      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        addToast({
          title: 'Success!',
          description: `Template ${
            editingTemplate ? 'updated' : 'created'
          } successfully`,
          variant: 'success',
          duration: 4000,
        });
        setIsFormOpen(false);
        setEditingTemplate(null);
        fetchTemplates(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      addToast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save template',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setDeletingTemplateId(templateId);
    try {
      const response = await fetch(
        `/api/seeker/cover-letter-templates/${templateId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );

      if (response.ok) {
        addToast({
          title: 'Success!',
          description: 'Template deleted successfully',
          variant: 'success',
          duration: 4000,
        });
        fetchTemplates(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete template',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setDeletingTemplateId((current) =>
        current === templateId ? null : current
      );
    }
  };

  const handleSetDefault = async (templateId: string) => {
    setDefaultingTemplateId(templateId);
    try {
      const response = await fetch(
        `/api/seeker/cover-letter-templates/${templateId}/set-default`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      if (response.ok) {
        addToast({
          title: 'Success!',
          description: 'Default template updated',
          variant: 'success',
          duration: 4000,
        });
        fetchTemplates(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default template');
      }
    } catch (error) {
      console.error('Error setting default template:', error);
      addToast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to set default template',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setDefaultingTemplateId((current) =>
        current === templateId ? null : current
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">
            Loading your cover letter templates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Cover Letter Templates
          </h2>
          <p className="text-gray-600 mt-1">
            Create and manage reusable cover letter templates for your job
            applications
          </p>
        </div>
        <Button
          onClick={handleCreateTemplate}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create your first cover letter template to save time when applying
              for jobs. You can customize each template for specific
              applications.
            </p>
            <Button
              onClick={handleCreateTemplate}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Template</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <CoverLetterTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onSetDefault={handleSetDefault}
              isDeleting={deletingTemplateId === template.id}
              isSettingDefault={defaultingTemplateId === template.id}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <CoverLetterTemplateForm
            initialData={editingTemplate}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
