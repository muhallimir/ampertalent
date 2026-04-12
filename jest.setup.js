import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
    }),
    useSearchParams: () => ({
        get: jest.fn(),
    }),
    usePathname: () => '/',
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
    ClerkProvider: ({ children }) => children,
    useUser: () => ({
        user: null,
        isLoaded: true,
    }),
    useClerk: () => ({
        signOut: jest.fn(),
    }),
}))

// Mock @clerk/nextjs/server
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn().mockResolvedValue({ userId: null }),
    clerkMiddleware: (fn) => fn,
}))
