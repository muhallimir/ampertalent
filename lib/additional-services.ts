/**
 * Additional Services Configuration
 *
 * Central catalog for all one-time purchase services offered to job seekers and employers.
 * Services are purchased through WordPress or in-app checkout and fulfilled by the admin team.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ServiceCategory = 'career_coaching' | 'resume_writing' | 'interview_prep' | 'bundle' | 'concierge_addon' | 'marketing';

export type UserType = 'seeker' | 'employer';

export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface AdditionalServiceConfig {
  id: string; // Unique service identifier (e.g., 'career_jumpstart')
  name: string; // Display name
  description: string; // Full description
  shortDescription: string; // One-line summary for cards
  price: number; // Price in USD
  category: ServiceCategory;
  userType: UserType;
  isActive: boolean;
  popular?: boolean; // Mark as popular/featured service
  features: string[]; // Bullet points of what's included
  icon: string; // Icon filename (e.g., 'Seeker-career-jumpstart-session.png')
  wordPressLink?: string; // Original WordPress product link (for reference)
}

// ============================================================================
// Job Seeker Services
// ============================================================================

export const SEEKER_SERVICES: AdditionalServiceConfig[] = [
  {
    id: 'career_jumpstart',
    name: 'Career Jumpstart Session',
    shortDescription: 'A focused boost to get your job search moving in the right direction.',
    description: `Feeling stuck or unsure about your next step? In this one-on-one session, you'll meet with a trusted HireMyMom HR expert for personalized guidance that brings clarity and confidence to your job search.

Perfect for moms re-entering the workforce, career changers, or anyone ready to move forward with purpose.`,
    price: 99.0,
    category: 'career_coaching',
    userType: 'seeker',
    isActive: true,
    features: [
      'Actionable feedback on your resume and/or cover letter',
      'Insight on which types of jobs best align with your background, skills, and interests',
      'Strategies to make your applications stand out',
      'Clarity on your next steps, so you can apply with clarity, purpose and confidence',
    ],
    icon: 'Seeker-career-jumpstart-session.png',
    wordPressLink: 'https://www.hiremymom.com/product/jobseeker-advisor-service/',
  },
  {
    id: 'interview_success_training',
    name: 'Interview Success Training',
    shortDescription: 'Master your interview and land a job worth loving!',
    description: `If you don't interview well, even the best written resume and cover letter may not be enough. Allow our HR Specialist to give you some quick tips and guidance to help you SHINE in your interview.

They provide guidance on how to answer questions, what to do before, during and after the interview. Your chances for getting hired can go up exponentially!`,
    price: 100.0,
    category: 'interview_prep',
    userType: 'seeker',
    isActive: true,
    features: [
      'One-on-one session with HR Specialist',
      'Guidance on how to answer interview questions',
      'What to do before, during, and after the interview',
      'Tips to help you shine and stand out',
    ],
    icon: 'Seeker-interview success-training.png',
    wordPressLink: 'https://www.hiremymom.com/product/interview-prep-1-session/',
  },
  {
    id: 'personal_career_strategist',
    name: 'Personal Career Strategist',
    shortDescription: 'The ultimate 1-on-1 support to help you get hired—faster, smarter, and with confidence.',
    description: `Our Personal Career Strategist gives you personalized, ongoing access to a dedicated HireMyMom HR Consultant for 30 days of hands-on support tailored to your unique career goals.

If you're re-entering the workforce, pivoting careers, or ready to find flexible, high-quality remote work you'll love—this is the personalized support that gets results.`,
    price: 299.0,
    category: 'career_coaching',
    userType: 'seeker',
    isActive: true,
    popular: true,
    features: [
      'A detailed review of your resume and cover letter with expert recommendations',
      'Strategic job search guidance to help you land the right remote role',
      'Insights on which skills or certifications could strengthen your profile',
      'Personalized advice on jobs that best match your background, interests, and goals',
      'Up-to-date market research on fair salary and hourly wage expectations',
      'Proven interview preparation tips to boost confidence and performance',
      "Daily job matching—we'll send you listings that fit your goals",
      "Proactive employer outreach—we'll follow up with companies you've applied to",
    ],
    icon: 'Seeker-personal-career-strategist.png',
    wordPressLink: 'https://www.hiremymom.com/product/elite-career-concierge-service/',
  },
  {
    id: 'resume_refresh',
    name: 'Resume Refresh',
    shortDescription: 'Make your resume STAND OUT and help you GET HIRED!',
    description: `We will have your resume reflecting your most relevant and valuable skills, experiences and qualifications to help you stand out!

This service includes a review of your resume with initial questions and edits, then your resume updated and enhanced to increase your chances of getting interviewed and hired!`,
    price: 149.0,
    category: 'resume_writing',
    userType: 'seeker',
    isActive: true,
    popular: true,
    features: [
      'Comprehensive review of your existing resume',
      'Initial questions and detailed edits',
      'Resume updated and enhanced by HR experts',
      'Optimized to increase interview and hiring chances',
    ],
    icon: 'Seeker-Resume-refresh.png',
    wordPressLink: 'https://www.hiremymom.com/product/resume-review/',
  },
  {
    id: 'create_new_resume',
    name: 'Create New Resume',
    shortDescription: 'Get a professionally written resume that showcases your best self!',
    description: `We will have your resume reflecting your most relevant and valuable skills, experiences and qualifications to help you stand out!

This service includes initial questions and acquiring a list of skills, talents and experience, then we will create a resume that increases your chances of getting hired!`,
    price: 249.0,
    category: 'resume_writing',
    userType: 'seeker',
    isActive: true,
    features: [
      'Initial consultation to gather your skills, talents, and experience',
      'Professional resume created from scratch by HR experts',
      'Tailored to highlight your most relevant qualifications',
      'Optimized for applicant tracking systems (ATS)',
    ],
    icon: 'Seeker-create-new-resume.png',
    wordPressLink: 'https://www.hiremymom.com/product/create-new-resume/',
  },
  {
    id: 'cover_letter_service',
    name: 'Cover Letter Service',
    shortDescription: 'Make your cover letter SIZZLE with expertly-written content!',
    description: `This service includes a thorough review of your cover letter with initial questions and edits emailed back to you.

After you make the first round of revisions, we will review your revised cover letter and give any further feedback or revisions.`,
    price: 75.0,
    category: 'resume_writing',
    userType: 'seeker',
    isActive: true,
    features: [
      'Thorough review of your cover letter',
      'Initial questions and detailed edits',
      'Second round of review after your revisions',
      'Expert feedback from HR Specialists',
    ],
    icon: 'Seeker-cover-letter-services.png',
    wordPressLink: 'https://www.hiremymom.com/product/cover-letter-review/',
  },
  {
    id: 'the_works',
    name: 'The Works',
    shortDescription: 'Job Seeker Success package offering ALL THREE services in one package!',
    description: `The ultimate addition to your personal development journey! A complete overhaul of your resume, cover letter, and interview skills.

Get everything you need to succeed in your job search at a discounted bundle price.`,
    price: 349.0,
    category: 'bundle',
    userType: 'seeker',
    isActive: true,
    features: [
      'Complete resume refresh or creation',
      'Cover letter review and enhancement',
      'Interview success training session',
      'All three services bundled at a savings',
    ],
    icon: 'Seeker-the-works.png',
    wordPressLink: 'https://www.hiremymom.com/product/the-works/',
  },
];

// ============================================================================
// Employer Services
// ============================================================================

export const EMPLOYER_SERVICES: AdditionalServiceConfig[] = [
  {
    id: 'concierge_rush_service',
    name: 'Concierge Rush Service',
    shortDescription: '$349.00',
    description: `If you need your project completed within two weeks, you can select our RUSH service.`,
    price: 349.0,
    category: 'concierge_addon',
    userType: 'employer',
    isActive: true,
    features: [
      '2-week project completion',
      'Priority handling of your concierge request',
      'Expedited candidate screening and shortlisting',
      'Dedicated rush service coordinator',
    ],
    icon: 'Employer-concierge-rush-service.png',
  },
  {
    id: 'onboarding_new_hire',
    name: 'Onboarding Your New Hire',
    shortDescription: '$195.00',
    description: `Allow our HR Specialist to help you onboard your new hire. Service includes:`,
    price: 195.0,
    category: 'concierge_addon',
    userType: 'employer',
    isActive: true,
    features: [
      'Reference checks – reach out to references for feedback on candidate',
      'Draft an offer letter',
      'Have candidate complete and sign contracts, agreements and/or tax and payroll forms provided by the client',
      'Create next steps for your new hire',
      'Help create first 30 day goals and expectations for your new hire',
    ],
    icon: 'Employer-onboarding-new-hire.png',
  },
  {
    id: 'reference_checks',
    name: 'Reference Checks',
    shortDescription: '$95.00',
    description: `Check this off your busy to-do list!\nAllow our HR Specialist to check references for you!`,
    price: 95.0,
    category: 'concierge_addon',
    userType: 'employer',
    isActive: true,
    features: [
      'HR Specialist checks references for you',
      'Professional reference interviews',
      'Verification of candidate background',
      'Save time on reference checking process',
    ],
    icon: 'Employer-reference-checks.png',
  },
  {
    id: 'weekly_newsletter_ad',
    name: 'Weekly Newsletter Ad',
    shortDescription: 'Feature your job in our weekly newsletter sent to thousands of job seekers.',
    description: `Get your job in front of thousands of active job seekers! Your job will be featured prominently in our weekly HireMyMom newsletter.

Increase visibility and attract more qualified candidates for your open position.`,
    price: 79.0,
    category: 'marketing',
    userType: 'employer',
    isActive: true,
    features: [
      'Featured placement in weekly newsletter',
      'Sent to thousands of job seekers',
      'Includes job title, company, and description',
      'Direct link to your job posting',
    ],
    icon: 'Employer-weekly-newsletter-ad.png',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all services (both seeker and employer)
 */
export function getAllServices(): AdditionalServiceConfig[] {
  return [...SEEKER_SERVICES, ...EMPLOYER_SERVICES];
}

/**
 * Get a service by its ID
 */
export function getServiceById(serviceId: string): AdditionalServiceConfig | undefined {
  return getAllServices().find((service) => service.id === serviceId);
}

/**
 * Get services by user type (seeker or employer)
 */
export function getServicesByUserType(userType: UserType): AdditionalServiceConfig[] {
  return getAllServices().filter((service) => service.userType === userType);
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: ServiceCategory): AdditionalServiceConfig[] {
  return getAllServices().filter((service) => service.category === category);
}

/**
 * Get only active services
 */
export function getActiveServices(): AdditionalServiceConfig[] {
  return getAllServices().filter((service) => service.isActive);
}

/**
 * Get active services by user type
 */
export function getActiveServicesByUserType(userType: UserType): AdditionalServiceConfig[] {
  return getActiveServices().filter((service) => service.userType === userType);
}

/**
 * Format price for display
 */
export function formatServicePrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Convert service config to Prisma-compatible format
 * Note: price is returned as number - Prisma will convert to Decimal automatically
 */
export function serviceConfigToPrismaData(service: AdditionalServiceConfig) {
  return {
    serviceId: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    category: service.category,
    userType: service.userType,
    isActive: service.isActive,
    features: service.features,
  };
}

/**
 * Validate service ID exists in catalog
 */
export function isValidServiceId(serviceId: string): boolean {
  return getServiceById(serviceId) !== undefined;
}

/**
 * Get service icon path for frontend
 */
export function getServiceIconPath(service: AdditionalServiceConfig): string {
  return `/images/services/${service.icon}`;
}

// ============================================================================
// Constants
// ============================================================================

export const SERVICE_CATEGORIES = {
  career_coaching: 'Career Coaching',
  resume_writing: 'Resume Writing',
  interview_prep: 'Interview Preparation',
  bundle: 'Bundle Package',
  concierge_addon: 'Concierge Add-on',
  marketing: 'Marketing',
} as const;

export const USER_TYPES = {
  seeker: 'Job Seeker',
  employer: 'Employer',
} as const;

export const SERVICE_STATUSES = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;
