/**
 * Profile completion calculation utility
 * Calculates the completion percentage of a user's profile based on filled fields
 */

interface UserProfile {
  name?: string
  email?: string
  phone?: string
  profileImageUrl?: string
  location?: string
}

interface JobSeekerProfile {
  headline?: string
  aboutMe?: string
  skills?: string[]
  availability?: string
  portfolioUrls?: string[]
  resumeUrl?: string
}

interface ProfileCompletionResult {
  percentage: number
  completedFields: number
  totalFields: number
  missingFields: string[]
  suggestions: string[]
}

/**
 * Calculate profile completion percentage
 */
export function calculateProfileCompletion(
  userProfile: UserProfile,
  jobSeekerProfile: JobSeekerProfile | null
): ProfileCompletionResult {
  const missingFields: string[] = []
  const suggestions: string[] = []
  let completedFields = 0
  let totalFields = 0

  // Required fields (higher weight - 2 points each)
  const requiredFields = [
    {
      field: userProfile.name,
      name: 'Full Name',
      weight: 2,
      suggestion: 'Add your full name to help employers identify you'
    },
    {
      field: userProfile.email,
      name: 'Email Address',
      weight: 2,
      suggestion: 'Verify your email address for important notifications'
    },
    {
      field: jobSeekerProfile?.headline,
      name: 'Professional Headline',
      weight: 2,
      suggestion: 'Write a compelling headline that summarizes your expertise'
    },
    {
      field: jobSeekerProfile?.aboutMe,
      name: 'About Me',
      weight: 2,
      suggestion: 'Tell employers about your background and what makes you unique'
    }
  ]

  // Optional fields (lower weight - 1 point each)
  const optionalFields = [
    {
      field: userProfile.profileImageUrl,
      name: 'Profile Photo',
      weight: 1,
      suggestion: 'Upload a professional photo to make your profile more personal'
    },
    {
      field: userProfile.phone,
      name: 'Phone Number',
      weight: 1,
      suggestion: 'Add your phone number for faster communication'
    },
    {
      field: userProfile.location,
      name: 'Location',
      weight: 1,
      suggestion: 'Specify your location for location-based job matching'
    },
    {
      field: jobSeekerProfile?.skills && jobSeekerProfile.skills.length > 0,
      name: 'Skills',
      weight: 1,
      suggestion: 'List your key skills to match with relevant job opportunities'
    },
    {
      field: jobSeekerProfile?.availability,
      name: 'Availability',
      weight: 1,
      suggestion: 'Specify your availability to help employers understand your schedule'
    },
    {
      field: jobSeekerProfile?.portfolioUrls && jobSeekerProfile.portfolioUrls.length > 0,
      name: 'Portfolio',
      weight: 1,
      suggestion: 'Add portfolio links to showcase your work'
    },
    {
      field: jobSeekerProfile?.resumeUrl,
      name: 'Resume',
      weight: 1,
      suggestion: 'Upload your resume to make it easy for employers to review your experience'
    }
  ]

  // Calculate completion for required fields
  requiredFields.forEach(({ field, name, weight, suggestion }) => {
    totalFields += weight
    if (field && field.toString().trim().length > 0) {
      completedFields += weight
    } else {
      missingFields.push(name)
      suggestions.push(suggestion)
    }
  })

  // Calculate completion for optional fields
  optionalFields.forEach(({ field, name, weight, suggestion }) => {
    totalFields += weight
    if (field && (typeof field === 'boolean' ? field : field.toString().trim().length > 0)) {
      completedFields += weight
    } else {
      missingFields.push(name)
      suggestions.push(suggestion)
    }
  })

  const percentage = Math.round((completedFields / totalFields) * 100)

  return {
    percentage: Math.min(percentage, 100), // Cap at 100%
    completedFields,
    totalFields,
    missingFields,
    suggestions: suggestions.slice(0, 3) // Return top 3 suggestions
  }
}

/**
 * Get profile completion status with descriptive text
 */
export function getProfileCompletionStatus(percentage: number): {
  status: 'incomplete' | 'good' | 'excellent'
  message: string
  color: string
} {
  if (percentage < 50) {
    return {
      status: 'incomplete',
      message: 'Your profile needs attention',
      color: 'text-red-600'
    }
  } else if (percentage < 80) {
    return {
      status: 'good',
      message: 'Your profile is looking good',
      color: 'text-yellow-600'
    }
  } else {
    return {
      status: 'excellent',
      message: 'Your profile is excellent',
      color: 'text-green-600'
    }
  }
}

/**
 * Get next steps for profile completion
 */
export function getProfileCompletionNextSteps(
  missingFields: string[],
  suggestions: string[]
): Array<{
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}> {
  const nextSteps: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  // High priority items (required fields)
  const highPriorityFields = ['Full Name', 'Email Address', 'Professional Headline', 'About Me']
  const missingHighPriority = missingFields.filter(field => highPriorityFields.includes(field))

  missingHighPriority.forEach((field, index) => {
    if (suggestions[index]) {
      nextSteps.push({
        title: `Complete ${field}`,
        description: suggestions[index],
        priority: 'high'
      })
    }
  })

  // Medium priority items
  const mediumPriorityFields = ['Skills', 'Resume', 'Availability']
  const missingMediumPriority = missingFields.filter(field => mediumPriorityFields.includes(field))

  missingMediumPriority.forEach((field, index) => {
    const suggestionIndex = missingFields.indexOf(field)
    if (suggestions[suggestionIndex]) {
      nextSteps.push({
        title: `Add ${field}`,
        description: suggestions[suggestionIndex],
        priority: 'medium'
      })
    }
  })

  // Low priority items
  const lowPriorityFields = ['Profile Photo', 'Phone Number', 'Location', 'Portfolio']
  const missingLowPriority = missingFields.filter(field => lowPriorityFields.includes(field))

  missingLowPriority.forEach((field, index) => {
    const suggestionIndex = missingFields.indexOf(field)
    if (suggestions[suggestionIndex]) {
      nextSteps.push({
        title: `Add ${field}`,
        description: suggestions[suggestionIndex],
        priority: 'low'
      })
    }
  })

  return nextSteps.slice(0, 5) // Return top 5 next steps
}