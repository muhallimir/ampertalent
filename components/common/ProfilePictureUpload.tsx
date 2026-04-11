'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImpersonationSession } from '@/lib/admin-impersonation';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  userName: string;
  onImageUpdate?: (imageUrl: string | null) => void;
  className?: string;
}

export function ProfilePictureUpload({
  currentImageUrl,
  userName,
  onImageUpdate,
  className,
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState<
    string | undefined
  >(currentImageUrl);
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>();
  const [imageLoadError, setImageLoadError] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // Key to force re-render
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get impersonation headers
  const getImpersonationHeaders = (): HeadersInit => {
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

  // Fetch presigned URL when currentImageUrl changes
  React.useEffect(() => {
    const fetchPresignedUrl = async () => {
      if (currentImageUrl) {
        try {
          const headers = getImpersonationHeaders();
          const response = await fetch('/api/user/profile-picture', {
            headers,
          });
          if (response.ok) {
            const data = await response.json();
            setPresignedUrl(data.profilePictureUrl);
            setImageLoadError(false);
          } else {
            // If presigned URL fails, fall back to direct URL
            setPresignedUrl(currentImageUrl);
          }
        } catch (error) {
          console.error('Error fetching presigned URL:', error);
          // Fall back to direct URL
          setPresignedUrl(currentImageUrl);
        }
      } else {
        setPresignedUrl(undefined);
      }
    };

    setCurrentDisplayUrl(currentImageUrl);
    setImageLoadError(false);
    fetchPresignedUrl();
  }, [currentImageUrl]);

  // Auto-clear messages after 5 seconds
  React.useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Handle image load errors
  const handleImageError = () => {
    console.error('Failed to load profile image:', currentDisplayUrl);
    setImageLoadError(true);
  };

  const handleImageLoad = () => {
    setImageLoadError(false);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setError(null);
    setSuccess(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get presigned URL
      const impersonationHeaders = getImpersonationHeaders();
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...impersonationHeaders },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadType: 'avatar',
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = await presignedResponse.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setUploadProgress(50);

      // Confirm upload and update profile
      const confirmResponse = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...impersonationHeaders },
        body: JSON.stringify({
          uploadId: fileKey,
          fileUrl: `https://${
            process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'amper-talent-files'
          }.s3.${
            process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2'
          }.amazonaws.com/${fileKey}`,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const { file: uploadedFile } = await confirmResponse.json();
      setUploadProgress(100);

      // Update user profile with new avatar URL
      const profileHeaders = {
        'Content-Type': 'application/json',
        ...getImpersonationHeaders(),
      };
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: profileHeaders,
        body: JSON.stringify({
          profilePictureUrl: uploadedFile.fileUrl,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Update local display URL immediately
      setCurrentDisplayUrl(uploadedFile.fileUrl);
      setPreviewUrl(null); // Clear preview since we now have the real URL

      // Reset file input for next upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileInputKey((prev) => prev + 1); // Force re-render of file input

      setSuccess('Profile picture updated successfully!');
      onImageUpdate?.(uploadedFile.fileUrl);

      // Dispatch custom event to notify all useUserProfile hooks
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    } catch (error) {
      console.error('Upload error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to upload profile picture'
      );
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setIsUploading(true);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileInputKey((prev) => prev + 1); // Force re-render of file input

      const headers = {
        'Content-Type': 'application/json',
        ...getImpersonationHeaders(),
      };
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          profilePictureUrl: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove profile picture');
      }

      setPreviewUrl(null);
      setCurrentDisplayUrl(undefined);
      setSuccess('Profile picture removed successfully!');
      onImageUpdate?.(null);

      // Dispatch custom event to notify all useUserProfile hooks
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    } catch (error) {
      console.error('Remove error:', error);
      setError('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const displayImageUrl = (() => {
    const url = previewUrl || presignedUrl || currentDisplayUrl;
    return url && url.trim() !== '' ? url : undefined;
  })();
  const userInitials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-2 border-gray-200 shadow-sm p-0.5">
            <Avatar className="h-full w-full rounded-full overflow-hidden">
              {/* make sure displayImageUrl is not empty string because it will the browser to download the whole page again over the network */}
              <AvatarImage
                src={displayImageUrl}
                alt={'Profile Image'}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className="rounded-full"
              />
              <AvatarFallback className="text-lg font-semibold rounded-full bg-gray-50">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <LoadingSpinner size="sm" className="text-white" />
            </div>
          )}

          {displayImageUrl && !isUploading && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {displayImageUrl ? 'Change Picture' : 'Upload Picture'}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Upload a profile picture. Max size 5MB. Supports JPEG, PNG, GIF,
            WebP.
          </p>

          {isUploading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {imageLoadError && currentDisplayUrl && (
        <Alert className="border-yellow-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-yellow-700">
            Unable to load profile picture. The image may be processing or
            temporarily unavailable.
          </AlertDescription>
        </Alert>
      )}

      <input
        key={fileInputKey}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
