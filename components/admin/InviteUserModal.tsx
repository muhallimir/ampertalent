'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { UserPlus, Mail, User, Shield, Building2, Users, Search, ChevronDown, Package, Construction } from 'lucide-react'

// Feature flag - reads from environment variable
const TEAM_MEMBER_FEATURE_ENABLED = process.env.NEXT_PUBLIC_TEAM_MEMBER_INVITE_ENABLED === 'true'

// Available employer packages for invitation
const EMPLOYER_PACKAGES = [
  {
    value: 'none',
    label: 'No Package',
    description: 'Invite without a pre-assigned package',
    packageType: null,
    billingCycles: null,
    amountCents: null,
  },
  {
    value: 'gold_plus_recurring_6mo',
    label: 'Gold Plus Small Business (6-Month Recurring)',
    description: '1 job posting (active for 6 months) • $97/month × 6 months',
    packageType: 'gold_plus_recurring_6mo',
    billingCycles: 6,
    amountCents: 9700,
  },
] as const;

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    name: '',
    message: '',
    invitationType: 'new_user', // 'new_user' or 'team_member'
    employerId: '', // For team member invitations
    packageSelection: 'none', // For employer package invitations
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employers, setEmployers] = useState<Array<{ id: string, name: string, companyName: string }>>([])
  const [loadingEmployers, setLoadingEmployers] = useState(false)
  const [employerSearch, setEmployerSearch] = useState('')
  const [filteredEmployers, setFilteredEmployers] = useState<Array<{ id: string, name: string, companyName: string }>>([])
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false)
  const [selectedEmployer, setSelectedEmployer] = useState<{ id: string, name: string, companyName: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load employers when invitation type changes to team_member
  useEffect(() => {
    if (formData.invitationType === 'team_member' && isOpen) {
      loadEmployers()
    }
  }, [formData.invitationType, isOpen])

  const loadEmployers = async () => {
    setLoadingEmployers(true)
    try {
      const response = await fetch('/api/admin/users?role=employer&limit=1000')
      if (response.ok) {
        const data = await response.json()
        const employerList = data.users
          .filter((user: any) => user.role === 'employer') // Ensure we only get employers
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            companyName: user.companyName || user.name
          }))
        setEmployers(employerList)
        setFilteredEmployers(employerList)
      }
    } catch (error) {
      console.error('Error loading employers:', error)
    } finally {
      setLoadingEmployers(false)
    }
  }

  // Filter employers based on search
  useEffect(() => {
    if (!employerSearch) {
      setFilteredEmployers(employers)
    } else {
      const filtered = employers.filter(employer =>
        employer.name.toLowerCase().includes(employerSearch.toLowerCase()) ||
        employer.companyName.toLowerCase().includes(employerSearch.toLowerCase())
      )
      setFilteredEmployers(filtered)
    }
  }, [employerSearch, employers])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmployerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email) {
      setError('Email is required')
      return
    }

    if (formData.invitationType === 'new_user' && !formData.role) {
      setError('Role is required for new user invitations')
      return
    }

    if (formData.invitationType === 'team_member' && !formData.employerId) {
      setError('Please select an employer for team member invitations')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // For new user invitations, send via API
      if (formData.invitationType === 'new_user') {
        // Build package info if an employer package is selected
        let packageInfo = null;
        if (formData.role === 'employer' && formData.packageSelection && formData.packageSelection !== 'none') {
          const selectedPkg = EMPLOYER_PACKAGES.find(p => p.value === formData.packageSelection);
          if (selectedPkg && selectedPkg.packageType) {
            packageInfo = {
              packageType: selectedPkg.packageType,
              packageName: selectedPkg.label,
              billingCycles: selectedPkg.billingCycles,
              amountCents: selectedPkg.amountCents,
            };
          }
        }

        const response = await fetch('/api/admin/users/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            allowResend: true,
            packageInfo, // Include package info for employer invitations
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send invitation')
        }

        console.log('✅ Invitation sent:', data.message)

        // Reset form only after successful invitation
        setFormData({
          email: '',
          role: '',
          name: '',
          message: '',
          invitationType: 'new_user',
          employerId: '',
          packageSelection: 'none',
        })
        setSelectedEmployer(null)
        setEmployerSearch('')
        setShowEmployerDropdown(false)

        onSuccess()
        onClose()
      }
      // For team member invitations, send via team member API
      else if (formData.invitationType === 'team_member') {
        const response = await fetch('/api/admin/users/invite-team-member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            allowResend: true
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send team member invitation')
        }

        console.log('✅ Team member invitation sent:', data.message)

        // Reset form only after successful invitation
        setFormData({
          email: '',
          role: '',
          name: '',
          message: '',
          invitationType: 'new_user',
          employerId: '',
          packageSelection: 'none',
        })
        setSelectedEmployer(null)
        setEmployerSearch('')
        setShowEmployerDropdown(false)

        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
      // Do not call onSuccess() or onClose() here - let the user see and fix the error
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        email: '',
        role: '',
        name: '',
        message: '',
        invitationType: 'new_user',
        employerId: '',
        packageSelection: 'none',
      })
      setSelectedEmployer(null)
      setEmployerSearch('')
      setShowEmployerDropdown(false)
      setError(null)
      onClose()
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'seeker':
        return 'Can search and apply for jobs, manage profile and resume'
      case 'employer':
        return 'Can post jobs, manage applications, and access employer dashboard'
      case 'admin':
        return 'Full administrative access to all platform features'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Invite New User</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to create a new platform account or join an existing employer team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              Error: {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invitationType">Invitation Type *</Label>
            <Select
              value={formData.invitationType}
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, invitationType: value, role: '', employerId: '' }))}
              disabled={isLoading}
            >
              <SelectTrigger className="text-left">
                <SelectValue placeholder="Select invitation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_user" className="group">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4 text-blue-600 group-hover:text-white" />
                    <div className="text-left">
                      <div className="font-medium group-hover:text-white">New Platform User</div>
                      <div className="text-xs text-gray-500 group-hover:text-white">Create a new account on the platform</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="team_member" className="group" disabled={!TEAM_MEMBER_FEATURE_ENABLED}>
                  <div className="flex items-center space-x-2">
                    {TEAM_MEMBER_FEATURE_ENABLED ? (
                      <Users className="h-4 w-4 text-green-600 group-hover:text-white" />
                    ) : (
                      <Construction className="h-4 w-4 text-amber-500" />
                    )}
                    <div className="text-left">
                      <div className="font-medium group-hover:text-white flex items-center gap-2">
                        Team Member
                        {!TEAM_MEMBER_FEATURE_ENABLED && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Coming Soon</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-white">
                        {TEAM_MEMBER_FEATURE_ENABLED
                          ? `Add to existing employer's team`
                          : 'This feature is under development'}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          {/* Conditional fields based on invitation type */}
          {formData.invitationType === 'team_member' && (
            <div className="space-y-2">
              <Label htmlFor="employer">Select Employer *</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={loadingEmployers ? "Loading employers..." : "Search employers..."}
                    value={selectedEmployer ? selectedEmployer.companyName : employerSearch}
                    onChange={(e) => {
                      setEmployerSearch(e.target.value)
                      setSelectedEmployer(null)
                      setFormData(prev => ({ ...prev, employerId: '' }))
                      setShowEmployerDropdown(true)
                    }}
                    onFocus={() => setShowEmployerDropdown(true)}
                    className="pl-10 pr-10"
                    disabled={isLoading || loadingEmployers}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>

                {showEmployerDropdown && !loadingEmployers && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredEmployers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No employers found</p>
                      </div>
                    ) : (
                      filteredEmployers.map((employer) => (
                        <div
                          key={employer.id}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-800 cursor-pointer transition-colors group"
                          onClick={() => {
                            setSelectedEmployer(employer)
                            setFormData(prev => ({ ...prev, employerId: employer.id }))
                            setEmployerSearch('')
                            setShowEmployerDropdown(false)
                          }}
                        >
                          <Building2 className="h-4 w-4 text-blue-600 group-hover:text-white" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 group-hover:text-white">
                              {employer.companyName}
                            </div>
                            <div className="text-xs text-gray-500 group-hover:text-white">
                              {employer.name}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {loadingEmployers && (
                <p className="text-xs text-gray-500">Loading employers...</p>
              )}
            </div>
          )}

          {formData.invitationType === 'new_user' && (
            <div className="space-y-2">
              <Label htmlFor="role">User Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}
                disabled={isLoading}
              >
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeker" className="group">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-green-600 group-hover:text-white" />
                      <div className="text-left">
                        <div className="font-medium group-hover:text-white">Job Seeker</div>
                        <div className="text-xs text-gray-500 group-hover:text-white">Search and apply for jobs</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="employer" className="group">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-blue-600 group-hover:text-white" />
                      <div className="text-left">
                        <div className="font-medium group-hover:text-white">Employer</div>
                        <div className="text-xs text-gray-500 group-hover:text-white">Post jobs and manage applications</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" className="group">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-orange-600 group-hover:text-white" />
                      <div className="text-left">
                        <div className="font-medium group-hover:text-white">Administrator</div>
                        <div className="text-xs text-gray-500 group-hover:text-white">Full platform access</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.role && (
                <p className="text-xs text-gray-600 mt-1">
                  {getRoleDescription(formData.role)}
                </p>
              )}
            </div>
          )}

          {/* Package Selection - shows when role is employer */}
          {formData.invitationType === 'new_user' && formData.role === 'employer' && (
            <div className="space-y-2">
              <Label htmlFor="packageSelection">Assign Package (Optional)</Label>
              <Select
                value={formData.packageSelection}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, packageSelection: value }))}
                disabled={isLoading}
              >
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYER_PACKAGES.map((pkg) => (
                    <SelectItem key={pkg.value} value={pkg.value} className="group">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-purple-600 group-hover:text-white" />
                        <div className="text-left">
                          <div className="font-medium group-hover:text-white">{pkg.label}</div>
                          <div className="text-xs text-gray-500 group-hover:text-white">{pkg.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.packageSelection && formData.packageSelection !== 'none' && (
                <p className="text-xs text-purple-600 mt-1">
                  📦 Package details will be included in the invitation email
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.email ||
                (formData.invitationType === 'new_user' && !formData.role) ||
                (formData.invitationType === 'team_member' && !formData.employerId)
              }
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}