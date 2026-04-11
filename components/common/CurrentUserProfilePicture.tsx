'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface CurrentUserProfilePictureProps {
    name?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const CurrentUserProfilePicture: React.FC<CurrentUserProfilePictureProps> = ({
    name = '',
    size = 'md',
    className = ''
}) => {
    const [presignedUrl, setPresignedUrl] = useState<string | undefined>(undefined)
    const [imageLoadError, setImageLoadError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Fetch the current user's profile picture using the user endpoint
    useEffect(() => {
        const fetchUserProfilePicture = async () => {
            console.log('🖼️ CurrentUserProfilePicture: Fetching current user profile picture')
            setIsLoading(true)

            try {
                const response = await fetch('/api/user/profile-picture', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })

                console.log('🖼️ CurrentUserProfilePicture: API response status', response.status)

                if (response.ok) {
                    const data = await response.json()
                    console.log('🖼️ CurrentUserProfilePicture: Got profile picture URL', !!data.profilePictureUrl)
                    setPresignedUrl(data.profilePictureUrl)
                    setImageLoadError(false)
                } else {
                    console.log('🖼️ CurrentUserProfilePicture: No profile picture found or access denied', response.status)
                    setPresignedUrl(undefined)
                    setImageLoadError(true)
                }
            } catch (error) {
                console.error('🖼️ CurrentUserProfilePicture: Error fetching profile picture:', error)
                setPresignedUrl(undefined)
                setImageLoadError(true)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserProfilePicture()
    }, [])

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'w-8 h-8'
            case 'md':
                return 'w-12 h-12'
            case 'lg':
                return 'w-16 h-16'
            default:
                return 'w-12 h-12'
        }
    }

    const getIconSize = () => {
        switch (size) {
            case 'sm':
                return 'h-4 w-4'
            case 'md':
                return 'h-6 w-6'
            case 'lg':
                return 'h-8 w-8'
            default:
                return 'h-6 w-6'
        }
    }

    const getInitials = (name: string) => {
        if (!name) return 'U' // Default to 'U' for User
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className={`${getSizeClasses()} ${className} bg-gray-200 rounded-full flex items-center justify-center animate-pulse`}>
                <User className={`${getIconSize()} text-gray-400`} />
            </div>
        )
    }

    // Show profile picture if available and not errored
    if (presignedUrl && !imageLoadError) {
        return (
            <Avatar className={`${getSizeClasses()} ${className}`}>
                <AvatarImage
                    src={presignedUrl}
                    alt={name}
                    onError={() => {
                        console.log('🖼️ CurrentUserProfilePicture: Image failed to load, showing initials')
                        setImageLoadError(true)
                    }}
                />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                    {getInitials(name)}
                </AvatarFallback>
            </Avatar>
        )
    }

    // Fallback to initials
    return (
        <div className={`${getSizeClasses()} ${className} bg-blue-100 rounded-full flex items-center justify-center`}>
            <span className="text-blue-600 font-medium text-xs">
                {getInitials(name)}
            </span>
        </div>
    )
}

export default CurrentUserProfilePicture