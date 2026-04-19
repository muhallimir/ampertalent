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

// Mock Next.js Request for API route tests
global.Request = class Request {
    constructor(url, options = {}) {
        Object.defineProperty(this, 'url', {
            value: url,
            writable: true,
            configurable: true,
        });
        this.method = options.method || 'GET';
        this.headers = new Map();
        this.body = options.body;
    }

    async json() {
        return JSON.parse(this.body || '{}');
    }

    async text() {
        return this.body || '';
    }
};

// Mock Headers for Response
global.Headers = class Headers {
    constructor(init = {}) {
        this._headers = new Map();
        if (init) {
            Object.entries(init).forEach(([key, value]) => {
                this._headers.set(key.toLowerCase(), value);
            });
        }
    }

    get(name) {
        return this._headers.get(name.toLowerCase()) || null;
    }

    set(name, value) {
        this._headers.set(name.toLowerCase(), value);
    }

    has(name) {
        return this._headers.has(name.toLowerCase());
    }

    delete(name) {
        return this._headers.delete(name.toLowerCase());
    }

    *entries() {
        for (const [key, value] of this._headers) {
            yield [key, value];
        }
    }

    forEach(callback) {
        for (const [key, value] of this._headers) {
            callback(value, key, this);
        }
    }
};

// Mock Next.js Response for API route tests
global.Response = class Response {
    constructor(body, options = {}) {
        this.body = body;
        this.status = options.status || 200;
        this.headers = new Headers(options.headers || {});
    }

    async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
};

// Mock NextResponse
global.NextResponse = {
    json: (data, options = {}) => {
        const response = new Response(JSON.stringify(data), {
            status: options.status || 200,
            headers: options.headers || {},
        });
        response.headers.set('Content-Type', 'application/json');
        return response;
    },
    redirect: (url, options = {}) => {
        const response = new Response(null, {
            status: options.status || 307,
            headers: options.headers || {},
        });
        response.headers.set('Location', typeof url === 'string' ? url : url.href);
        return response;
    },
};

// Mock URL for API route tests
global.URL = class URL {
    constructor(url) {
        // Handle both string and URL object inputs
        const urlString = typeof url === 'string' ? url : url.href;
        this.href = urlString;
        this.pathname = urlString.split('?')[0];
        this.search = urlString.includes('?') ? '?' + urlString.split('?')[1] : '';
        this.searchParams = new URLSearchParams(this.search, this);
    }

    toString() {
        return this.href;
    }

    updateSearch() {
        const searchString = Array.from(this.searchParams.params.entries())
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        this.search = searchString ? '?' + searchString : '';
        this.href = this.pathname + this.search;
    }
};

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
    constructor(search, url = null) {
        this.params = new Map();
        this.url = url; // Reference to parent URL
        if (search && search.startsWith('?')) {
            search = search.substring(1);
        }
        if (search) {
            search.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
            });
        }
    }

    get(key) {
        return this.params.get(key) || null;
    }

    set(key, value) {
        this.params.set(key, value);
        if (this.url) this.url.updateSearch();
    }

    entries() {
        return this.params.entries();
    }

    toString() {
        return Array.from(this.params.entries())
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }
};
