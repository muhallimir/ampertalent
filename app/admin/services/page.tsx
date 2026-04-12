'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  userType: string;
  userId: string;
  userName: string;
  userEmail: string;
  amountPaid: number;
  status: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  fulfillmentNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminServicesPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSortOrder, setAuditSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch service requests
  useEffect(() => {
    fetchRequests();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    if (userTypeFilter !== 'all') {
      filtered = filtered.filter((req) => req.userType === userTypeFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, userTypeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/services');
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load service requests',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const viewRequestDetails = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/services/${requestId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedRequest(data.request);
        setDetailDialogOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load request details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request details',
        variant: 'destructive',
      });
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/services/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        const statusDisplayName = newStatus.replace('_', ' ').toUpperCase();
        // Show toast for employer add-ons (those with packageContext)
        if (selectedRequest?.packageContext) {
          toast({
            title: '✅ Status Updated',
            description: `Employer add-on status changed to ${statusDisplayName}`,
          });
        }
        await fetchRequests();
        if (selectedRequest?.id === requestId) {
          await viewRequestDetails(requestId);
        }
      } else {
        toast({
          title: '❌ Update Failed',
          description: data.error || 'Failed to update request status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: '❌ Error',
        description: 'An error occurred while updating the request status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateRequestNotes = async (requestId: string, notes: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/services/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentNotes: notes }),
      });

      const data = await response.json();

      if (data.success) {
        // Show toast for employer add-ons (those with packageContext)
        if (selectedRequest?.packageContext) {
          toast({
            title: '✅ Notes Saved',
            description: 'Fulfillment notes have been saved successfully for this employer add-on',
          });
        }
        await fetchRequests();
        if (selectedRequest?.id === requestId) {
          await viewRequestDetails(requestId);
        }
      } else {
        toast({
          title: '❌ Save Failed',
          description: data.error || 'Failed to save fulfillment notes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: '❌ Error',
        description: 'An error occurred while saving the notes',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      in_progress: 'secondary',
      completed: 'default',
      cancelled: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const fetchAuditTrail = async (requestId: string) => {
    try {
      setLoadingAudit(true);
      const response = await fetch(`/api/admin/services/${requestId}/audit-trail`);
      const data = await response.json();

      if (data.success) {
        setAuditTrail(data.auditTrail || []);
        setAuditDialogOpen(true);
        console.log('✅ Audit trail loaded:', data.auditTrail);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load audit trail',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit trail',
        variant: 'destructive',
      });
    } finally {
      setLoadingAudit(false);
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    inProgress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
        <p className="text-muted-foreground">
          Manage additional service purchases and fulfillment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>User Type</Label>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seeker">Job Seekers</SelectItem>
                <SelectItem value="employer">Employers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>Click on a request to view details and manage fulfillment</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No service requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.serviceName}</div>
                        <div className="text-sm text-muted-foreground">{request.serviceCategory}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-sm text-muted-foreground">{request.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.userType}</Badge>
                      </TableCell>
                      <TableCell>${request.amountPaid.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => viewRequestDetails(request.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
            <DialogDescription>Manage fulfillment and update status</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Service Info */}
              <div>
                <h3 className="font-semibold mb-2">Service Information</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div><strong>Service:</strong> {selectedRequest.service.name}</div>
                  <div><strong>Category:</strong> {selectedRequest.service.category}</div>
                  <div><strong>Price:</strong> ${selectedRequest.service.price.toFixed(2)}</div>
                  <div><strong>Amount Paid:</strong> ${selectedRequest.amountPaid.toFixed(2)}</div>
                </div>
              </div>

              {/* Package Context for Employer Add-Ons */}
              {selectedRequest.packageContext && (
                <div>
                  <h3 className="font-semibold mb-2">Package Context</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                    <div><strong>Package Type:</strong> <Badge className="ml-2">{selectedRequest.packageContext.packageType}</Badge></div>
                    <div><strong>Package ID:</strong> <code className="bg-white px-2 py-1 rounded text-xs">{selectedRequest.packageContext.id}</code></div>
                    <div><strong>Purchased:</strong> {new Date(selectedRequest.packageContext.purchasedAt).toLocaleDateString()}</div>
                    {selectedRequest.packageContext.expiresAt && (
                      <div><strong>Expires:</strong> {new Date(selectedRequest.packageContext.expiresAt).toLocaleDateString()}</div>
                    )}
                    <div className="mt-3 p-2 bg-white border border-blue-100 rounded text-sm">
                      <strong>What to do:</strong> This is an add-on service request for the employer&apos;s package.
                      {selectedRequest.service.name.includes('Rush') && ' Prioritize this and expedite processing.'}
                      {selectedRequest.service.name.includes('Onboarding') && ' Schedule onboarding call with employer and assist with new hire setup.'}
                      {selectedRequest.service.name.includes('Reference') && ' Contact provided references and compile reference report.'}
                    </div>
                  </div>
                </div>
              )}

              {/* User Info */}
              <div>
                <h3 className="font-semibold mb-2">User Information</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div><strong>Name:</strong> {selectedRequest.user.name}</div>
                  <div><strong>Email:</strong> {selectedRequest.user.email}</div>
                  {selectedRequest.user.phone && (
                    <div><strong>Phone:</strong> {selectedRequest.user.phone}</div>
                  )}
                </div>
              </div>

              {/* Status Management */}
              <div>
                <h3 className="font-semibold mb-2">Status Management</h3>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'pending' ? 'default' : 'outline'}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'pending')}
                    disabled={updating}
                  >
                    Pending
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}
                    disabled={updating}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'completed' ? 'default' : 'outline'}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}
                    disabled={updating}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedRequest.status === 'cancelled' ? 'destructive' : 'outline'}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancelled
                  </Button>

                  {/* View Status History button for employer add-ons only */}
                  {selectedRequest.packageContext && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchAuditTrail(selectedRequest.id)}
                      disabled={loadingAudit}
                    >
                      {loadingAudit ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View Status History
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Fulfillment Notes */}
              <div>
                <Label htmlFor="notes">Fulfillment Notes</Label>
                <Textarea
                  id="notes"
                  value={selectedRequest.fulfillmentNotes || ''}
                  onChange={(e) => {
                    setSelectedRequest({
                      ...selectedRequest,
                      fulfillmentNotes: e.target.value,
                    });
                  }}
                  rows={4}
                  placeholder="Add notes about fulfillment progress, next steps, etc."
                  className="mt-2"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => updateRequestNotes(selectedRequest.id, selectedRequest.fulfillmentNotes || '')}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Notes
                </Button>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-muted-foreground space-y-1">
                <div><strong>Created:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</div>
                <div><strong>Updated:</strong> {new Date(selectedRequest.updatedAt).toLocaleString()}</div>
                {selectedRequest.completedAt && (
                  <div><strong>Completed:</strong> {new Date(selectedRequest.completedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Status Change History</DialogTitle>
            <DialogDescription>Audit trail for this employer add-on service request</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Label htmlFor="audit-sort" className="text-sm font-medium">Sort by:</Label>
              <Select value={auditSortOrder} onValueChange={(value) => setAuditSortOrder(value as 'newest' | 'oldest')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Latest to Oldest</SelectItem>
                  <SelectItem value="oldest">Oldest to Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {auditTrail && auditTrail.length > 0 ? (
              <div className="space-y-4">
                {auditTrail
                  .slice()
                  .sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return auditSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                  })
                  .map((audit) => (
                    <div key={audit.id} className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge className="mb-2">
                            {audit.changeType === 'status' && 'Status Change'}
                            {audit.changeType === 'notes' && 'Notes Updated'}
                            {audit.changeType === 'assignment' && 'Assignment Changed'}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            By: <strong>{audit.changedBy.name}</strong> ({audit.changedBy.role})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(audit.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {audit.changeType === 'status' && (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                                FROM: {audit.previousValue?.toUpperCase()}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                TO: {audit.newValue?.toUpperCase()}
                              </span>
                            </div>
                          </>
                        )}

                        {audit.changeType === 'notes' && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Previous Notes:</strong>
                              <div className="bg-white p-2 rounded text-xs mt-1 border border-red-200 text-gray-700">
                                {audit.previousValue || '(empty)'}
                              </div>
                            </div>
                            <div className="text-sm">
                              <strong>Updated Notes:</strong>
                              <div className="bg-white p-2 rounded text-xs mt-1 border border-green-200 text-gray-700">
                                {audit.newValue || '(empty)'}
                              </div>
                            </div>
                          </div>
                        )}

                        {audit.changeType === 'assignment' && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              FROM: {audit.previousValue || 'unassigned'}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              TO: {audit.newValue || 'unassigned'}
                            </span>
                          </div>
                        )}

                        {audit.description && (
                          <p className="text-sm text-muted-foreground italic">{audit.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No status changes yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
