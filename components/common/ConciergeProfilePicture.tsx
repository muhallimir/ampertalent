'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface ConciergeProfilePictureProps {
    conciergeId: string
    conciergeName: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function ConciergeProfilePicture({
    conciergeId,
    conciergeName,
    size = 'md',
    className = ''
}: ConciergeProfilePictureProps) {
    const [presignedUrl, setPresignedUrl] = useState<string | undefined>()
    const [imageLoadError, setImageLoadError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    }

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-8 w-8'
    }

    useEffect(() => {
        const fetchConciergeProfilePicture = async () => {
            if (!conciergeId) return

            setIsLoading(true)

            console.log('🔍 ConciergeProfilePicture: Fetching for concierge', {
                conciergeId,
                conciergeName
            })

            try {
                const response = await fetch(`/api/concierge/profile-picture/${conciergeId}`)

                if (response.ok) {
                    const data = await response.json()
                    if (data.profilePictureUrl) {
                        console.log('✅ ConciergeProfilePicture: Got presigned URL')
                        setPresignedUrl(data.profilePictureUrl)
                        setImageLoadError(false)
                    } else {
                        console.log('❌ ConciergeProfilePicture: No profile picture URL in response')
                        setImageLoadError(true)
                    }
                } else {
                    console.error('❌ ConciergeProfilePicture: API error', response.status, response.statusText)
                    setImageLoadError(true)
                }
            } catch (error) {
                console.error('❌ ConciergeProfilePicture: Fetch error', error)
                setImageLoadError(true)
            } finally {
                setIsLoading(false)
            }
        }

        fetchConciergeProfilePicture()
    }, [conciergeId, conciergeName])

    const handleImageError = () => {
        console.log('❌ ConciergeProfilePicture: Image failed to load')
        setImageLoadError(true)
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (isLoading) {
        return (
            <div className={`${sizeClasses[size]} ${className} bg-gray-200 rounded-full flex items-center justify-center animate-pulse`}>
                <User className={`${iconSizes[size]} text-gray-400`} />
            </div>
        )
    }

    if (presignedUrl && !imageLoadError) {
        return (
            <img
                src={presignedUrl}
                alt={conciergeName}
                className={`${sizeClasses[size]} ${className} rounded-full object-cover`}
                onError={handleImageError}
            />
        )
    }

    // Fallback to initials
    return (
        <div className={`${sizeClasses[size]} ${className} bg-blue-100 rounded-full flex items-center justify-center`}>
            <span className="text-blue-600 font-medium text-sm">
                {getInitials(conciergeName)}
            </span>
        </div>
    )
}