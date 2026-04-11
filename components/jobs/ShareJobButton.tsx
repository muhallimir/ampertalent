'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface ShareJobButtonProps {
  jobId: string;
  jobTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function ShareJobButton({
  jobId,
  jobTitle,
  variant = 'outline',
  size = 'default',
  showText = true,
}: ShareJobButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleShare = async () => {
    try {
      setIsLoading(true);

      // Create a direct link to the job in our system
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/seeker/jobs/${jobId}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      setCopied(true);
      addToast({
        title: 'Job link copied to clipboard!',
        description: 'Share this link with anyone - no login required',
        variant: 'success',
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error sharing job:', error);
      addToast({
        title: 'Failed to copy share link',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isLoading}
      variant={variant}
      size={size}
      className="gap-2"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {showText && (
        <span>
          {isLoading ? 'Getting link...' : copied ? 'Copied!' : 'Share Job'}
        </span>
      )}
    </Button>
  );
}

// Alternative compact version for tight spaces
export function ShareJobIconButton({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  return (
    <ShareJobButton
      jobId={jobId}
      jobTitle={jobTitle}
      variant="ghost"
      size="sm"
      showText={false}
    />
  );
}
