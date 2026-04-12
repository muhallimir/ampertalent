'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import { ProfilePictureUpload } from '@/components/common/ProfilePictureUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Save,
  User,
  Award,
  Clock,
  Star,
  CheckCircle
} from '@/components/icons';

interface ConciergeProfile {
  conciergeBio: string;
  conciergeTitle: string;
  conciergeSpecialties: string[];
  conciergeExperience: number;
  isActiveConcierge: boolean;
  name: string;
  email: string;
  profilePictureUrl?: string;
  presignedProfilePictureUrl?: string;
}

const SPECIALTY_OPTIONS = [
  'Executive Hiring',
  'Technical Recruiting',
  'Healthcare Staffing',
  'Sales & Marketing',
  'Customer Service',
  'Operations Management',
  'Finance & Accounting',
  'Human Resources',
  'Project Management',
  'Software Development',
  'Data & Analytics',
  'Creative Services'
];

export default function AdminConciergeBioPage() {
  const [profile, setProfile] = useState<ConciergeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [presignedProfileUrl, setPresignedProfileUrl] = useState<string | undefined>();

  useEffect(() => {
    loadConciergeProfile();
  }, []);

  const loadConciergeProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/concierge/bio');

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        
        // Get presigned URL if profile picture exists
        if (data.profile.profilePictureUrl) {
          try {
            const presignedResponse = await fetch('/api/user/profile-picture');
            if (presignedResponse.ok) {
              const presignedData = await presignedResponse.json();
              setPresignedProfileUrl(presignedData.profilePictureUrl);
            }
          } catch (error) {
            console.error('Error fetching presigned URL:', error);
          }
        } else {
          setPresignedProfileUrl(undefined);
        }
      }
    } catch (error) {
      console.error('Error loading concierge profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/concierge/bio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conciergeBio: profile.conciergeBio,
          conciergeTitle: profile.conciergeTitle,
          conciergeSpecialties: profile.conciergeSpecialties,
          conciergeExperience: profile.conciergeExperience,
          isActiveConcierge: profile.isActiveConcierge
        })
      });

      if (response.ok) {
        // Show success message
        alert('Concierge profile updated successfully!');
        loadConciergeProfile(); // Reload to get updated data
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving concierge profile:', error);
      alert('Failed to save concierge profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpdate = async (imageUrl: string | null) => {
    if (profile) {
      setProfile({
        ...profile,
        profilePictureUrl: imageUrl || undefined
      });
    }
    
    // Update presigned URL for immediate preview
    if (imageUrl) {
      try {
        const presignedResponse = await fetch('/api/user/profile-picture');
        if (presignedResponse.ok) {
          const presignedData = await presignedResponse.json();
          setPresignedProfileUrl(presignedData.profilePictureUrl);
        }
      } catch (error) {
        console.error('Error fetching updated presigned URL:', error);
      }
    } else {
      setPresignedProfileUrl(undefined);
    }
    
    // Also reload the profile to get the updated data
    loadConciergeProfile();
  };

  const handleAddSpecialty = (specialty: string) => {
    if (!profile || profile.conciergeSpecialties.includes(specialty)) return;

    setProfile({
      ...profile,
      conciergeSpecialties: [...profile.conciergeSpecialties, specialty]
    });
  };

  const handleRemoveSpecialty = (specialty: string) => {
    if (!profile) return;

    setProfile({
      ...profile,
      conciergeSpecialties: profile.conciergeSpecialties.filter(s => s !== specialty)
    });
  };

  const handleAddCustomSpecialty = () => {
    if (!profile || !newSpecialty.trim()) return;

    const specialty = newSpecialty.trim();
    if (!profile.conciergeSpecialties.includes(specialty)) {
      setProfile({
        ...profile,
        conciergeSpecialties: [...profile.conciergeSpecialties, specialty]
      });
    }
    setNewSpecialty('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <a href="/admin/concierge">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Concierge
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concierge Profile</h1>
          <p className="text-gray-600">Set up your concierge bio and specialties</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={presignedProfileUrl || profile.profilePictureUrl}
                  alt={profile.name}
                />
                <AvatarFallback className="text-lg font-semibold">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{profile.name}</h3>
                <p className="text-sm text-gray-600">{profile.conciergeTitle || 'Concierge Specialist'}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {profile.isActiveConcierge ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {profile.conciergeBio && (
              <div>
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-sm text-gray-600">{profile.conciergeBio}</p>
              </div>
            )}

            {profile.conciergeExperience && (
              <div>
                <h4 className="font-medium mb-2">Experience</h4>
                <p className="text-sm text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {profile.conciergeExperience} years in recruiting
                </p>
              </div>
            )}

            {profile.conciergeSpecialties.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.conciergeSpecialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePictureUpload
                currentImageUrl={profile.profilePictureUrl}
                onImageUpdate={handleImageUpdate}
                userName={profile.name}
              />
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="conciergeTitle">Concierge Title</Label>
                <Input
                  id="conciergeTitle"
                  value={profile.conciergeTitle || ''}
                  onChange={(e) => setProfile({ ...profile, conciergeTitle: e.target.value })}
                  placeholder="e.g., Senior Concierge Specialist"
                />
              </div>

              <div>
                <Label htmlFor="conciergeBio">Bio</Label>
                <Textarea
                  id="conciergeBio"
                  value={profile.conciergeBio || ''}
                  onChange={(e) => setProfile({ ...profile, conciergeBio: e.target.value })}
                  placeholder="Tell employers about your experience and approach to concierge recruiting..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="conciergeExperience">Years of Experience</Label>
                <Input
                  id="conciergeExperience"
                  type="number"
                  value={profile.conciergeExperience || ''}
                  onChange={(e) => setProfile({ ...profile, conciergeExperience: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={profile.isActiveConcierge}
                  onCheckedChange={(checked) => setProfile({ ...profile, isActiveConcierge: checked })}
                />
                <Label>Active Concierge (available for assignment)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Available Specialties</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {SPECIALTY_OPTIONS.map((specialty) => (
                    <Button
                      key={specialty}
                      variant={profile.conciergeSpecialties.includes(specialty) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (profile.conciergeSpecialties.includes(specialty)) {
                          handleRemoveSpecialty(specialty);
                        } else {
                          handleAddSpecialty(specialty);
                        }
                      }}
                    >
                      {specialty}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Add Custom Specialty</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="e.g., Remote Team Building"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSpecialty();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddCustomSpecialty}
                    disabled={!newSpecialty.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {profile.conciergeSpecialties.length > 0 && (
                <div>
                  <Label>Selected Specialties</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.conciergeSpecialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveSpecialty(specialty)}>
                        {specialty} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}