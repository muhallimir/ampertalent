# 🧪 TDD Testing Strategy — Ampertalent

> Master testing guide covering methodology, patterns, mocks, and coverage targets for every phase.

---

## Table of Contents

1. [TDD Philosophy](#1-tdd-philosophy)
2. [Test Structure & Conventions](#2-test-structure--conventions)
3. [Mock Strategy](#3-mock-strategy)
4. [Test Database Setup](#4-test-database-setup)
5. [Coverage Targets](#5-coverage-targets)
6. [Phase-by-Phase Test Breakdown](#6-phase-by-phase-test-breakdown)
7. [CI/CD Integration](#7-cicd-integration)
8. [Testing Utilities & Helpers](#8-testing-utilities--helpers)

---

## 1. TDD Philosophy

### Red → Green → Refactor

Every feature in Ampertalent follows strict Test-Driven Development:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up the code while keeping tests green

### Why TDD for This Project?

- **Portfolio Signal**: Demonstrates professional engineering discipline
- **Safety Net**: 42+ models with complex relationships need regression protection
- **Documentation**: Tests serve as executable specifications
- **Confidence**: Stripe + HubSpot integrations must be verifiably correct

---

## 2. Test Structure & Conventions

### Directory Layout

```
__tests__/
├── setup.ts                    # Global test setup (env vars, mocks)
├── globalTeardown.ts           # Cleanup after all test suites
├── helpers/
│   ├── db.ts                   # Database test utilities
│   ├── factories.ts            # Data factories for all models
│   ├── api.ts                  # Authenticated request helpers
│   ├── mock-clerk.ts           # Clerk auth mocking
│   └── cleanup.ts              # Per-test cleanup utilities
├── unit/
│   ├── config.test.ts
│   ├── db.test.ts
│   ├── utils.test.ts
│   ├── file-validation.test.ts
│   ├── storage.test.ts
│   ├── stripe.test.ts
│   ├── stripe-webhook.test.ts
│   ├── stripe-prices.test.ts
│   ├── hubspot.test.ts
│   ├── subscription-plans.test.ts
│   ├── employer-packages.test.ts
│   ├── additional-services.test.ts
│   ├── advanced-search.test.ts
│   ├── resume-upload.test.ts
│   ├── resume-credits.test.ts
│   ├── resume-critique.test.ts
│   ├── concierge-service.test.ts
│   ├── notification-service.test.ts
│   ├── notification-handlers.test.ts
│   ├── customer-payment-emails.test.ts
│   ├── email-templates.test.ts
│   ├── invoice-pdf.test.ts
│   ├── analytics.test.ts
│   ├── reporting.test.ts
│   ├── recurring-billing.test.ts
│   ├── employer-recurring-billing.test.ts
│   ├── external-webhook-service.test.ts
│   ├── admin-impersonation.test.ts
│   ├── middleware.test.ts
│   ├── user-invitations.test.ts
│   ├── team-invitations.test.ts
│   ├── auth.test.ts
│   └── profile-completion.test.ts
├── integration/
│   ├── database.test.ts
│   ├── onboarding.test.ts
│   ├── seed.test.ts
│   ├── webhooks/
│   │   └── clerk-webhook.test.ts
│   ├── seeker/
│   │   ├── applications.test.ts
│   │   ├── saved-jobs.test.ts
│   │   ├── resume.test.ts
│   │   ├── subscription.test.ts
│   │   ├── profile.test.ts
│   │   ├── cover-letters.test.ts
│   │   ├── billing.test.ts
│   │   └── services.test.ts
│   ├── employer/
│   │   ├── jobs.test.ts
│   │   ├── applications.test.ts
│   │   ├── talent.test.ts
│   │   ├── packages.test.ts
│   │   ├── featured-jobs.test.ts
│   │   ├── team.test.ts
│   │   ├── profile.test.ts
│   │   └── concierge.test.ts
│   ├── admin/
│   │   ├── job-vetting.test.ts
│   │   ├── user-management.test.ts
│   │   ├── subscriptions.test.ts
│   │   ├── billing.test.ts
│   │   ├── concierge-management.test.ts
│   │   ├── services.test.ts
│   │   ├── exclusive-offers.test.ts
│   │   ├── crm-sync.test.ts
│   │   ├── logs.test.ts
│   │   ├── action-logs.test.ts
│   │   └── sales.test.ts
│   ├── payments/
│   │   ├── seeker-subscription.test.ts
│   │   ├── employer-package.test.ts
│   │   ├── payment-methods.test.ts
│   │   └── services.test.ts
│   ├── messaging/
│   │   ├── messages.test.ts
│   │   ├── templates.test.ts
│   │   └── drafts.test.ts
│   ├── notifications/
│   │   └── realtime.test.ts
│   ├── concierge/
│   │   ├── employer-concierge.test.ts
│   │   └── seeker-chat.test.ts
│   ├── services/
│   │   ├── fulfillment.test.ts
│   │   ├── resume-critique.test.ts
│   │   ├── featured-jobs.test.ts
│   │   └── email-blasts.test.ts
│   ├── crm/
│   │   └── sync.test.ts
│   ├── cron/
│   │   ├── daily-tasks.test.ts
│   │   └── hourly-tasks.test.ts
│   ├── webhooks/
│   │   ├── clerk-webhook.test.ts
│   │   └── stripe-webhook.test.ts
│   ├── pending/
│   │   └── signups.test.ts
│   └── api/
│       └── health.test.ts
├── ui/
│   ├── layout.test.tsx
│   ├── hero.test.tsx
│   ├── seeker/
│   │   ├── dashboard.test.tsx
│   │   ├── job-search.test.tsx
│   │   └── application-form.test.tsx
│   ├── employer/
│   │   ├── dashboard.test.tsx
│   │   ├── job-form.test.tsx
│   │   ├── interview-pipeline.test.tsx
│   │   └── talent.test.tsx
│   ├── admin/
│   │   ├── dashboard.test.tsx
│   │   └── analytics.test.tsx
│   ├── messaging/
│   │   ├── inbox.test.tsx
│   │   └── thread.test.tsx
│   └── notifications/
│       └── notification-panel.test.tsx
└── e2e/
    └── (optional: Playwright tests)
```

### Naming Conventions

- Test files: `<module>.test.ts` or `<module>.test.tsx`
- Describe blocks: Match module/component name
- Test names: `should <expected behavior>` or `it('<action>', ...)`
- Factory functions: `create<Model>()` — returns a complete test entity
- Cleanup functions: `cleanup<Model>()` — removes test data

### Example Pattern

```typescript
// __tests__/unit/subscription-plans.test.ts
import {
	getSeekerPlans,
	getPlanById,
	calculateProratedAmount,
} from "@/lib/subscription-plans";

describe("Subscription Plans", () => {
	describe("getSeekerPlans", () => {
		it("should return all 4 seeker plans", () => {
			const plans = getSeekerPlans();
			expect(plans).toHaveLength(4);
		});

		it("should include Trial, Gold, VIP, and Annual plans", () => {
			const plans = getSeekerPlans();
			const names = plans.map((p) => p.name);
			expect(names).toEqual(
				expect.arrayContaining(["Trial", "Gold", "VIP", "Annual"]),
			);
		});

		it("should have correct pricing for each plan", () => {
			const plans = getSeekerPlans();
			const trial = plans.find((p) => p.name === "Trial");
			expect(trial?.price).toBe(34.99);
			expect(trial?.interval).toBe("MONTHLY");
		});
	});

	describe("getPlanById", () => {
		it("should return plan by ID", () => {
			const plan = getPlanById("TRIAL_MONTHLY");
			expect(plan).toBeDefined();
			expect(plan?.name).toBe("Trial");
		});

		it("should return undefined for unknown ID", () => {
			expect(getPlanById("NONEXISTENT")).toBeUndefined();
		});
	});

	describe("calculateProratedAmount", () => {
		it("should calculate correct prorated amount for mid-cycle upgrade", () => {
			const amount = calculateProratedAmount(49.99, 15, 30);
			expect(amount).toBeCloseTo(25.0, 0);
		});
	});
});
```

---

## 3. Mock Strategy

### 3.1 Stripe Test Mode Mocking

**Replaces**: Authorize.net (`lib/authorize-net.ts`) + PayPal (`lib/paypal.ts`) → Stripe (`lib/stripe.ts`)

> In Ampertalent, Stripe handles all payments. For **unit tests**, we mock the Stripe SDK. For **integration tests** against real Stripe test mode, we use Stripe's test API keys.

```typescript
// __tests__/helpers/mock-stripe.ts — Mock Stripe SDK for unit tests
import { jest } from "@jest/globals";

export function mockStripe() {
	const mockCustomers = new Map<string, any>();
	const mockSubscriptions = new Map<string, any>();
	const mockPaymentIntents = new Map<string, any>();
	const mockPaymentMethods = new Map<string, any>();

	jest.mock("stripe", () => {
		return jest.fn().mockImplementation(() => ({
			customers: {
				create: jest.fn(async (params: any) => {
					const id = `cus_test_${Date.now()}`;
					mockCustomers.set(id, { id, ...params });
					return { id, ...params };
				}),
				retrieve: jest.fn(async (id: string) => mockCustomers.get(id)),
			},
			subscriptions: {
				create: jest.fn(async (params: any) => {
					const id = `sub_test_${Date.now()}`;
					const sub = { id, status: "active", ...params };
					mockSubscriptions.set(id, sub);
					return sub;
				}),
				update: jest.fn(async (id: string, params: any) => {
					const sub = mockSubscriptions.get(id);
					return { ...sub, ...params };
				}),
				cancel: jest.fn(async (id: string) => {
					return { id, status: "canceled" };
				}),
				retrieve: jest.fn(async (id: string) => mockSubscriptions.get(id)),
			},
			paymentIntents: {
				create: jest.fn(async (params: any) => {
					const id = `pi_test_${Date.now()}`;
					mockPaymentIntents.set(id, { id, status: "succeeded", ...params });
					return { id, status: "succeeded", ...params };
				}),
				retrieve: jest.fn(async (id: string) => mockPaymentIntents.get(id)),
			},
			paymentMethods: {
				list: jest.fn(async () => ({
					data: [...mockPaymentMethods.values()],
				})),
				detach: jest.fn(async (id: string) => {
					mockPaymentMethods.delete(id);
					return { id, deleted: true };
				}),
			},
			setupIntents: {
				create: jest.fn(async (params: any) => ({
					id: `seti_test_${Date.now()}`,
					client_secret: `seti_test_secret_${Date.now()}`,
					...params,
				})),
			},
			refunds: {
				create: jest.fn(async (params: any) => ({
					id: `re_test_${Date.now()}`,
					status: "succeeded",
					...params,
				})),
			},
			webhooks: {
				constructEvent: jest.fn((body, sig, secret) => JSON.parse(body)),
			},
		}));
	});

	return {
		mockCustomers,
		mockSubscriptions,
		mockPaymentIntents,
		mockPaymentMethods,
	};
}

export function resetStripeMocks() {
	jest.clearAllMocks();
}
```

**Testing Pattern**:

```typescript
import { mockStripe, resetStripeMocks } from "@/tests/helpers/mock-stripe";

beforeEach(() => {
	resetStripeMocks();
});

describe("StripeService", () => {
	it("should create a customer and subscription", async () => {
		const { mockCustomers } = mockStripe();
		const customer = await StripeService.createCustomer(
			"test@example.com",
			"Test User",
		);
		expect(customer.id).toMatch(/^cus_test_/);

		const subscription = await StripeService.createSubscription(
			customer.id,
			"price_trial_monthly",
			3, // 3-day trial
		);
		expect(subscription.status).toBe("active");
	});
});
```

---

### 3.2 HubSpot CRM Mocking

**Replaces**: GoHighLevel (`lib/gohighlevel.ts`) → HubSpot (`lib/hubspot.ts`)

> In Ampertalent, HubSpot handles CRM. For **unit tests**, we mock the HubSpot SDK. For **integration tests**, we use the real HubSpot free API.

```typescript
// __tests__/helpers/mock-hubspot.ts — Mock HubSpot SDK for unit tests
import { jest } from "@jest/globals";

const mockContacts = new Map<string, any>();

export function mockHubSpot() {
	jest.mock("@hubspot/api-client", () => ({
		Client: jest.fn().mockImplementation(() => ({
			crm: {
				contacts: {
					basicApi: {
						create: jest.fn(async (params: any) => {
							const id = `hs_${Date.now()}`;
							mockContacts.set(id, { id, properties: params.properties });
							return { id, properties: params.properties };
						}),
						update: jest.fn(async (id: string, params: any) => {
							const contact = mockContacts.get(id);
							return {
								...contact,
								properties: { ...contact?.properties, ...params.properties },
							};
						}),
						getById: jest.fn(async (id: string) => mockContacts.get(id)),
					},
					searchApi: {
						doSearch: jest.fn(async (params: any) => ({
							results: [...mockContacts.values()].filter((c) =>
								JSON.stringify(c).includes(
									params.filterGroups?.[0]?.filters?.[0]?.value || "",
								),
							),
							total: 0,
						})),
					},
				},
				properties: {
					coreApi: {
						getAll: jest.fn(async () => ({
							results: [
								{ name: "email", type: "string" },
								{ name: "firstname", type: "string" },
								{ name: "lastname", type: "string" },
								{ name: "Ampertalent_role", type: "enumeration" },
								{ name: "Ampertalent_plan", type: "enumeration" },
							],
						})),
						create: jest.fn(async (objectType: string, params: any) => ({
							name: params.name,
							type: params.type,
						})),
					},
				},
			},
		})),
	}));

	return { mockContacts };
}

export function resetHubSpotMocks() {
	mockContacts.clear();
	jest.clearAllMocks();
}
```

---

### 3.3 Clerk Auth Mocking

```typescript
// __tests__/helpers/mock-clerk.ts
import { jest } from "@jest/globals";

export function mockClerkAuth(overrides: Partial<AuthObject> = {}) {
	const defaultAuth = {
		userId: "user_test_123",
		sessionId: "sess_test_123",
		orgId: null,
		...overrides,
	};

	jest.mock("@clerk/nextjs/server", () => ({
		auth: () => defaultAuth,
		currentUser: () => ({
			id: defaultAuth.userId,
			emailAddresses: [{ emailAddress: "test@example.com" }],
			publicMetadata: { role: "seeker" },
			...overrides.user,
		}),
		clerkMiddleware: jest.fn(),
	}));

	return defaultAuth;
}

export function mockAdminAuth() {
	return mockClerkAuth({
		userId: "user_admin_123",
		user: { publicMetadata: { role: "admin" } },
	});
}

export function mockEmployerAuth() {
	return mockClerkAuth({
		userId: "user_employer_123",
		user: { publicMetadata: { role: "employer" } },
	});
}

export function mockSuperAdminAuth() {
	return mockClerkAuth({
		userId: "user_super_123",
		user: { publicMetadata: { role: "super_admin" } },
	});
}

export function mockTeamMemberAuth() {
	return mockClerkAuth({
		userId: "user_team_123",
		user: { publicMetadata: { role: "team_member" } },
	});
}

export function mockUnauthenticated() {
	return mockClerkAuth({
		userId: null,
		sessionId: null,
	});
}
```

---

### 3.4 Email Service Mocking

```typescript
// __tests__/helpers/mock-email.ts
import { jest } from "@jest/globals";

let sentEmails: SentEmail[] = [];

export function mockResend() {
	jest.mock("resend", () => ({
		Resend: jest.fn().mockImplementation(() => ({
			emails: {
				send: jest.fn().mockImplementation(async (params) => {
					sentEmails.push(params);
					return { data: { id: `mock_email_${Date.now()}` }, error: null };
				}),
			},
		})),
	}));
}

export function getSentEmails(): SentEmail[] {
	return sentEmails;
}

export function resetSentEmails(): void {
	sentEmails = [];
}

export function getLastSentEmail(): SentEmail | undefined {
	return sentEmails[sentEmails.length - 1];
}

export function findEmailsByRecipient(email: string): SentEmail[] {
	return sentEmails.filter((e) => e.to.includes(email));
}

export function findEmailsBySubject(subject: string): SentEmail[] {
	return sentEmails.filter((e) => e.subject.includes(subject));
}
```

---

### 3.5 Supabase Storage Mocking

```typescript
// __tests__/helpers/mock-storage.ts
const mockFiles: Map<string, Buffer> = new Map();

export function mockSupabaseStorage() {
	jest.mock("@/lib/storage", () => ({
		uploadFile: jest.fn().mockImplementation(async (bucket, path, file) => {
			mockFiles.set(`${bucket}/${path}`, file);
			return { url: `https://mock-storage.local/${bucket}/${path}` };
		}),
		getSignedUrl: jest.fn().mockImplementation(async (bucket, path) => {
			return `https://mock-storage.local/${bucket}/${path}?token=mock`;
		}),
		deleteFile: jest.fn().mockImplementation(async (bucket, path) => {
			mockFiles.delete(`${bucket}/${path}`);
		}),
		listFiles: jest.fn().mockImplementation(async (bucket, prefix) => {
			return [...mockFiles.keys()]
				.filter((k) => k.startsWith(`${bucket}/${prefix}`))
				.map((k) => ({ name: k.split("/").pop()!, path: k }));
		}),
	}));
}

export function resetMockStorage(): void {
	mockFiles.clear();
}
```

---

### 3.6 Redis Mocking

```typescript
// __tests__/helpers/mock-redis.ts
const mockStore: Map<string, { value: string; expiry?: number }> = new Map();

export function mockUpstashRedis() {
	jest.mock("@upstash/redis", () => ({
		Redis: jest.fn().mockImplementation(() => ({
			get: jest.fn((key) => {
				const entry = mockStore.get(key);
				if (!entry) return null;
				if (entry.expiry && Date.now() > entry.expiry) {
					mockStore.delete(key);
					return null;
				}
				return JSON.parse(entry.value);
			}),
			set: jest.fn((key, value, opts) => {
				mockStore.set(key, {
					value: JSON.stringify(value),
					expiry: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
				});
			}),
			del: jest.fn((key) => mockStore.delete(key)),
			incr: jest.fn((key) => {
				const curr = parseInt(mockStore.get(key)?.value || "0");
				mockStore.set(key, { value: String(curr + 1) });
				return curr + 1;
			}),
		})),
	}));
}

export function resetMockRedis(): void {
	mockStore.clear();
}
```

---

## 4. Test Database Setup

### Approach: Isolated Test Database

```typescript
// __tests__/setup.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
		},
	},
});

beforeAll(async () => {
	// Ensure clean slate
	await cleanDatabase(prisma);
});

afterAll(async () => {
	await prisma.$disconnect();
});

async function cleanDatabase(prisma: PrismaClient) {
	// Delete in reverse dependency order
	const tablenames = await prisma.$queryRaw<
		Array<{ tablename: string }>
	>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

	for (const { tablename } of tablenames) {
		if (tablename !== "_prisma_migrations") {
			await prisma.$executeRawUnsafe(
				`TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
			);
		}
	}
}

export { prisma };
```

### Supabase Test Database (Free Tier)

- Use the same Supabase project with a separate schema, or:
- Use `supabase start` locally for development (Docker-based, 100% free)
- Run migrations: `npx prisma migrate dev`

### Factory Pattern

```typescript
// __tests__/helpers/factories.ts
import { prisma } from "../setup";
import { faker } from "@faker-js/faker";

export async function createTestSeeker(overrides = {}) {
	const profile = await prisma.userProfile.create({
		data: {
			clerkId: `user_test_${faker.string.uuid()}`,
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			role: "SEEKER",
			onboardingComplete: true,
			...overrides,
		},
	});

	const seeker = await prisma.jobSeeker.create({
		data: {
			userId: profile.id,
			skills: [faker.person.jobTitle(), faker.person.jobTitle()],
			locationPreference: "REMOTE",
			experienceLevel: "MID",
			professionalTitle: faker.person.jobTitle(),
		},
	});

	return { profile, seeker };
}

export async function createTestEmployer(overrides = {}) {
	const profile = await prisma.userProfile.create({
		data: {
			clerkId: `user_test_${faker.string.uuid()}`,
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			role: "EMPLOYER",
			onboardingComplete: true,
			...overrides,
		},
	});

	const employer = await prisma.employer.create({
		data: {
			userId: profile.id,
			companyName: faker.company.name(),
			companyWebsite: faker.internet.url(),
			industry: faker.company.buzzPhrase(),
		},
	});

	return { profile, employer };
}

export async function createTestJob(employerId: string, overrides = {}) {
	return prisma.job.create({
		data: {
			employerId,
			title: faker.person.jobTitle(),
			description: faker.lorem.paragraphs(3),
			category: "VIRTUAL_ASSISTANT",
			jobType: "PART_TIME",
			locationType: "REMOTE",
			status: "APPROVED",
			payType: "HOURLY",
			payRangeMin: 20,
			payRangeMax: 40,
			...overrides,
		},
	});
}

export async function createTestApplication(
	seekerId: string,
	jobId: string,
	overrides = {},
) {
	return prisma.application.create({
		data: {
			seekerId,
			jobId,
			status: "PENDING",
			coverLetter: faker.lorem.paragraphs(2),
			...overrides,
		},
	});
}

export async function createTestSubscription(seekerId: string, overrides = {}) {
	return prisma.subscription.create({
		data: {
			seekerId,
			plan: "TRIAL_MONTHLY",
			status: "ACTIVE",
			startDate: new Date(),
			endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			amount: 34.99,
			paymentProfileId: "cus_test_123",
			subscriptionId: "sub_test_123",
			...overrides,
		},
	});
}

export async function createTestMessage(
	senderId: string,
	receiverId: string,
	overrides = {},
) {
	return prisma.message.create({
		data: {
			senderId,
			receiverId,
			content: faker.lorem.sentence(),
			...overrides,
		},
	});
}

export async function createTestConciergeRequest(
	employerId: string,
	overrides = {},
) {
	return prisma.conciergeRequest.create({
		data: {
			employerId,
			packageType: "CONCIERGE_SCREENING",
			status: "PENDING",
			details: faker.lorem.paragraph(),
			...overrides,
		},
	});
}

export async function createTestAdmin(overrides = {}) {
	return prisma.userProfile.create({
		data: {
			clerkId: `user_admin_${faker.string.uuid()}`,
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			role: "ADMIN",
			onboardingComplete: true,
			...overrides,
		},
	});
}

export async function createTestTeamMember(
	employerProfileId: string,
	overrides = {},
) {
	const profile = await prisma.userProfile.create({
		data: {
			clerkId: `user_team_${faker.string.uuid()}`,
			email: faker.internet.email(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			role: "TEAM_MEMBER",
			onboardingComplete: true,
		},
	});

	const teamMember = await prisma.teamMember.create({
		data: {
			employerId: employerProfileId,
			memberId: profile.id,
			role: "MEMBER",
			status: "ACTIVE",
			...overrides,
		},
	});

	return { profile, teamMember };
}
```

---

## 4.1 Test Data Cleanup & Garbage Collection

### ⚠️ CRITICAL REQUIREMENT: All Tests Must Clean Up Generated Data

**Problem**: Without proper cleanup, test data accumulates in the database, causing:

- Database bloat and slowdown
- False test failures (duplicate key errors, stale data)
- Cross-test contamination
- Production-like data pollution
- Expensive storage costs

**Solution**: Implement automatic cleanup at **multiple levels**:

### Strategy 1: Per-Test Cleanup (afterEach)

Every test file should clean up its own data immediately after execution:

```typescript
// __tests__/integration/seeker/applications.test.ts
import { prisma } from "../../setup";
import { createTestSeeker, createTestJob } from "../../helpers/factories";

describe("Seeker Applications", () => {
	let seekerId: string;
	let jobId: string;
	let employerId: string;

	// Track all IDs created during this test
	let createdIds = {
		profiles: [] as string[],
		seekers: [] as string[],
		employers: [] as string[],
		jobs: [] as string[],
		applications: [] as string[],
	};

	beforeEach(async () => {
		// Record IDs for cleanup
		createdIds = {
			profiles: [],
			seekers: [],
			employers: [],
			jobs: [],
			applications: [],
		};
	});

	afterEach(async () => {
		// DELETE IN REVERSE DEPENDENCY ORDER
		// (clean up children before parents to respect foreign keys)

		// 1. Delete applications first
		if (createdIds.applications.length > 0) {
			await prisma.application.deleteMany({
				where: { id: { in: createdIds.applications } },
			});
		}

		// 2. Delete jobs
		if (createdIds.jobs.length > 0) {
			await prisma.job.deleteMany({
				where: { id: { in: createdIds.jobs } },
			});
		}

		// 3. Delete seekers
		if (createdIds.seekers.length > 0) {
			await prisma.jobSeeker.deleteMany({
				where: { id: { in: createdIds.seekers } },
			});
		}

		// 4. Delete employers
		if (createdIds.employers.length > 0) {
			await prisma.employer.deleteMany({
				where: { id: { in: createdIds.employers } },
			});
		}

		// 5. Delete profiles last
		if (createdIds.profiles.length > 0) {
			await prisma.userProfile.deleteMany({
				where: { id: { in: createdIds.profiles } },
			});
		}

		console.log(`✅ Test cleanup completed. Deleted:`, createdIds);
	});

	it("should create an application", async () => {
		// Create test data
		const { profile: seekerProfile, seeker } = await createTestSeeker();
		createdIds.profiles.push(seekerProfile.id);
		createdIds.seekers.push(seeker.id);
		seekerId = seeker.id;

		const { profile: employerProfile, employer } = await createTestEmployer();
		createdIds.profiles.push(employerProfile.id);
		createdIds.employers.push(employer.id);
		employerId = employer.id;

		const job = await createTestJob(employer.id);
		createdIds.jobs.push(job.id);
		jobId = job.id;

		// Create application
		const application = await prisma.application.create({
			data: {
				seekerId: seeker.id,
				jobId: job.id,
				coverLetter: "Test cover letter",
			},
		});
		createdIds.applications.push(application.id);

		// Test assertions
		expect(application).toBeDefined();
		expect(application.seekerId).toBe(seeker.id);
		expect(application.jobId).toBe(job.id);

		// afterEach will automatically clean up all created records
	});
});
```

### Strategy 2: Cleanup Helper Functions

Create reusable cleanup utilities to simplify afterEach blocks:

```typescript
// __tests__/helpers/cleanup.ts
import { prisma } from "../setup";

export class TestDataTracker {
	private ids = {
		profiles: new Set<string>(),
		seekers: new Set<string>(),
		employers: new Set<string>(),
		jobs: new Set<string>(),
		applications: new Set<string>(),
		subscriptions: new Set<string>(),
		messages: new Set<string>(),
		conciergeRequests: new Set<string>(),
		teamMembers: new Set<string>(),
	};

	track(type: keyof typeof this.ids, id: string) {
		this.ids[type].add(id);
	}

	trackMultiple(type: keyof typeof this.ids, ids: string[]) {
		ids.forEach((id) => this.ids[type].add(id));
	}

	async cleanup() {
		console.log("🧹 Starting test data cleanup...");

		// DELETE IN REVERSE DEPENDENCY ORDER

		// 1. Messages
		if (this.ids.messages.size > 0) {
			const deleted = await prisma.message.deleteMany({
				where: { id: { in: Array.from(this.ids.messages) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} messages`);
		}

		// 2. Concierge requests
		if (this.ids.conciergeRequests.size > 0) {
			const deleted = await prisma.conciergeRequest.deleteMany({
				where: { id: { in: Array.from(this.ids.conciergeRequests) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} concierge requests`);
		}

		// 3. Subscriptions
		if (this.ids.subscriptions.size > 0) {
			const deleted = await prisma.subscription.deleteMany({
				where: { id: { in: Array.from(this.ids.subscriptions) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} subscriptions`);
		}

		// 4. Applications
		if (this.ids.applications.size > 0) {
			const deleted = await prisma.application.deleteMany({
				where: { id: { in: Array.from(this.ids.applications) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} applications`);
		}

		// 5. Jobs
		if (this.ids.jobs.size > 0) {
			const deleted = await prisma.job.deleteMany({
				where: { id: { in: Array.from(this.ids.jobs) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} jobs`);
		}

		// 6. Team members
		if (this.ids.teamMembers.size > 0) {
			const deleted = await prisma.teamMember.deleteMany({
				where: { id: { in: Array.from(this.ids.teamMembers) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} team members`);
		}

		// 7. Seekers
		if (this.ids.seekers.size > 0) {
			const deleted = await prisma.jobSeeker.deleteMany({
				where: { id: { in: Array.from(this.ids.seekers) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} seekers`);
		}

		// 8. Employers
		if (this.ids.employers.size > 0) {
			const deleted = await prisma.employer.deleteMany({
				where: { id: { in: Array.from(this.ids.employers) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} employers`);
		}

		// 9. Profiles (last, no dependencies)
		if (this.ids.profiles.size > 0) {
			const deleted = await prisma.userProfile.deleteMany({
				where: { id: { in: Array.from(this.ids.profiles) } },
			});
			console.log(`  ✅ Deleted ${deleted.count} user profiles`);
		}

		console.log("✨ Test cleanup completed");
	}
}

export function createTracker() {
	return new TestDataTracker();
}
```

**Usage in test files**:

```typescript
import { createTracker } from "../../helpers/cleanup";

describe("Employer Jobs", () => {
	const tracker = createTracker();

	afterEach(async () => {
		await tracker.cleanup();
	});

	it("should create a job", async () => {
		const { profile: empProfile, employer } = await createTestEmployer();
		tracker.track("profiles", empProfile.id);
		tracker.track("employers", employer.id);

		const job = await createTestJob(employer.id);
		tracker.track("jobs", job.id);

		expect(job).toBeDefined();
		// Cleanup happens automatically
	});
});
```

### Strategy 3: Global Cleanup (afterAll)

After **all tests** in the suite complete, perform a final cleanup pass:

```typescript
// __tests__/globalTeardown.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

module.exports = async () => {
	console.log("\n🧹 Running global teardown...");

	try {
		// Get all table names
		const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
			SELECT tablename FROM pg_tables 
			WHERE schemaname = 'public' 
			AND tablename NOT LIKE '_prisma_%'
		`;

		// Disable all foreign key constraints temporarily
		await prisma.$executeRaw`SET session_replication_role = replica;`;

		// Truncate all tables
		for (const { tablename } of tables) {
			try {
				await prisma.$executeRawUnsafe(
					`TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
				);
				console.log(`  ✅ Truncated ${tablename}`);
			} catch (err) {
				console.warn(`  ⚠️  Could not truncate ${tablename}:`, err);
			}
		}

		// Re-enable foreign key constraints
		await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

		console.log("✨ Global teardown completed\n");
	} catch (error) {
		console.error("❌ Global teardown failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
};
```

### Strategy 4: Factories Auto-Track

Enhance factories to automatically register created IDs:

```typescript
// __tests__/helpers/factories.ts (enhanced)
import { prisma } from "../setup";
import { TestDataTracker } from "./cleanup";

let activeTracker: TestDataTracker | null = null;

export function setActiveTracker(tracker: TestDataTracker) {
	activeTracker = tracker;
}

export async function createTestSeekerWithTracking(
	tracker: TestDataTracker,
	overrides = {},
) {
	const { profile, seeker } = await createTestSeeker(overrides);
	tracker.track("profiles", profile.id);
	tracker.track("seekers", seeker.id);
	return { profile, seeker };
}

export async function createTestJobWithTracking(
	tracker: TestDataTracker,
	employerId: string,
	overrides = {},
) {
	const job = await createTestJob(employerId, overrides);
	tracker.track("jobs", job.id);
	return job;
}

// Auto-tracking variant (uses active tracker)
export async function createTestSeekerAuto(overrides = {}) {
	const { profile, seeker } = await createTestSeeker(overrides);
	if (activeTracker) {
		activeTracker.track("profiles", profile.id);
		activeTracker.track("seekers", seeker.id);
	}
	return { profile, seeker };
}
```

**Usage**:

```typescript
describe("Seeker Subscriptions", () => {
	const tracker = createTracker();

	beforeEach(() => {
		setActiveTracker(tracker);
	});

	afterEach(async () => {
		await tracker.cleanup();
	});

	it("should create subscription", async () => {
		// No need to manually track — factory does it automatically
		const { profile, seeker } = await createTestSeekerAuto();
		const subscription = await createTestSubscriptionAuto(seeker.id);

		expect(subscription.status).toBe("ACTIVE");
		// All created data auto-tracked and cleaned up
	});
});
```

### Strategy 5: E2E Test Cleanup

For end-to-end tests (Playwright), implement API cleanup:

```typescript
// __tests__/e2e/cleanup.ts
import { test as base } from "@playwright/test";

type TestContext = {
	createdIds: {
		profiles: string[];
		jobs: string[];
		applications: string[];
	};
	cleanup: () => Promise<void>;
};

export const test = base.extend<TestContext>({
	createdIds: {
		profiles: [],
		jobs: [],
		applications: [],
	},
	cleanup: async ({ createdIds }, use) => {
		await use(async () => {
			// Call cleanup API endpoint
			const response = await fetch("/api/test/cleanup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(createdIds),
			});

			if (!response.ok) {
				throw new Error("Cleanup failed");
			}

			console.log("✅ E2E test data cleaned up");
		});
	},
});

// API endpoint for cleanup (development only)
// app/api/test/cleanup/route.ts
export async function POST(request: Request) {
	if (process.env.NODE_ENV !== "development" && !process.env.E2E_TEST) {
		return new Response("Not available in production", { status: 403 });
	}

	const { profiles, jobs, applications } = await request.json();

	// Delete in reverse dependency order
	await prisma.application.deleteMany({
		where: { id: { in: applications } },
	});
	await prisma.job.deleteMany({ where: { id: { in: jobs } } });
	await prisma.userProfile.deleteMany({ where: { id: { in: profiles } } });

	return Response.json({ success: true });
}
```

### Cleanup Verification Checklist

✅ **Every unit test** should have:

- `beforeEach()` to initialize tracker
- `afterEach()` to clean up tracked IDs
- Explicit tracking of each created resource

✅ **Every integration test** should have:

- `beforeEach()` to initialize tracker
- `afterEach()` to clean up tracked IDs
- Verification that cleanup completed successfully

✅ **Global teardown** should:

- Run `__tests__/globalTeardown.ts` after all tests
- Perform final truncation of all tables
- Log successful cleanup

✅ **CI/CD pipeline** should:

- Run `yarn test` with cleanup enabled
- Verify no orphaned test data in database
- Report cleanup statistics

### Package.json Scripts

```json
{
	"scripts": {
		"test": "jest --detectOpenHandles --forceExit --runInBand",
		"test:watch": "jest --watch --detectOpenHandles",
		"test:coverage": "jest --coverage --detectOpenHandles --forceExit",
		"test:cleanup-verify": "jest && npm run test:verify-no-orphans",
		"test:verify-no-orphans": "node scripts/verify-test-db.js"
	}
}
```

### Orphaned Data Detection Script

```javascript
// scripts/verify-test-db.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function verifyCleanDatabase() {
	console.log("\n📊 Verifying test database cleanup...\n");

	const tables = [
		"UserProfile",
		"JobSeeker",
		"Employer",
		"Job",
		"Application",
		"Subscription",
		"Message",
		"ConciergeRequest",
	];

	let totalOrphans = 0;

	for (const table of tables) {
		const count = await prisma[table].count();
		if (count > 0) {
			console.warn(`⚠️  WARNING: Found ${count} orphaned records in ${table}`);
			totalOrphans += count;
		}
	}

	await prisma.$disconnect();

	if (totalOrphans > 0) {
		console.error(
			`\n❌ Test database not clean! ${totalOrphans} orphaned records found.`,
		);
		console.error(
			"   Run: npx prisma db push --skip-generate && npx prisma db seed",
		);
		process.exit(1);
	} else {
		console.log("✅ Test database is clean!\n");
	}
}

verifyCleanDatabase().catch(console.error);
```

---

## 5. Coverage Targets

### Global Thresholds

| Metric     | Target | Minimum |
| ---------- | ------ | ------- |
| Statements | 85%    | 80%     |
| Branches   | 75%    | 70%     |
| Functions  | 80%    | 75%     |
| Lines      | 85%    | 80%     |

### Per-Module Targets

| Module                           | Coverage | Rationale                      |
| -------------------------------- | -------- | ------------------------------ |
| `lib/stripe.ts`                  | 95%      | Core payment integration       |
| `lib/stripe-webhook.ts`          | 95%      | Payment event handling         |
| `lib/hubspot.ts`                 | 90%      | CRM sync reliability           |
| `lib/subscription-plans.ts`      | 100%     | Pure functions, easy to test   |
| `lib/employer-packages.ts`       | 100%     | Pure functions, easy to test   |
| `lib/additional-services.ts`     | 100%     | Pure functions, easy to test   |
| `lib/notification-service.ts`    | 85%      | Complex dispatch logic         |
| `lib/email-templates.ts`         | 80%      | Template rendering             |
| `lib/customer-payment-emails.ts` | 95%      | Matches original 32-test suite |
| `lib/analytics.ts`               | 80%      | Complex aggregation queries    |
| `lib/advanced-search.ts`         | 85%      | Faceted search combinations    |
| `lib/concierge-service.ts`       | 85%      | Workflow state machine         |
| `lib/admin-impersonation.ts`     | 90%      | Security-critical              |
| `lib/recurring-billing.ts`       | 90%      | Financial accuracy             |
| `middleware.ts`                  | 90%      | Access control critical path   |
| API Routes                       | 80%      | Integration coverage           |
| Components                       | 60%      | UI rendering, less critical    |

---

## 6. Phase-by-Phase Test Breakdown

### Phase 1 — Foundation (~25 tests)

```
TDD Sequence:
1. ✅ Write config.test.ts → implement lib/config.ts
2. ✅ Write db.test.ts → implement lib/db.ts (Prisma client)
3. ✅ Write utils.test.ts → implement lib/utils.ts
4. ✅ Write file-validation.test.ts → implement lib/file-validation.ts
5. ✅ Write storage.test.ts → implement lib/storage.ts (Supabase adapter)
6. ✅ Write stripe.test.ts → implement lib/stripe.ts (Stripe test mode)
7. ✅ Write stripe-webhook.test.ts → implement lib/stripe-webhook.ts
8. ✅ Write hubspot.test.ts → implement lib/hubspot.ts (HubSpot CRM)
9. ✅ Write stripe-prices.test.ts → implement lib/stripe-prices.ts
```

### Phase 2 — Auth & Onboarding (~23 tests)

```
TDD Sequence:
1. ✅ Write auth.test.ts → implement lib/auth.ts
2. ✅ Write middleware.test.ts → implement middleware.ts
3. ✅ Write user-invitations.test.ts → implement lib/user-invitations.ts
4. ✅ Write onboarding.test.ts (integration) → implement onboarding API + pages
5. ✅ Write clerk-webhook.test.ts → implement webhook handler
6. ✅ Write user-invitation-flow.test.ts → implement invitation flow
```

### Phase 3 — Seeker Portal (~75 tests)

```
TDD Sequence:
1. ✅ Write advanced-search.test.ts → implement lib/advanced-search.ts
2. ✅ Write profile-completion.test.ts → implement lib/profile-completion.ts
3. ✅ Write subscription-plans.test.ts → implement lib/subscription-plans.ts
4. ✅ Write resume-upload.test.ts → implement lib/resume-upload.ts
5. ✅ Write resume-credits.test.ts → implement lib/resume-credits.ts
6. ✅ Write additional-services.test.ts → implement lib/additional-services.ts
7. ✅ Write seeker integration tests → implement all seeker API routes
8. ✅ Write seeker UI tests → implement seeker pages
```

### Phase 4 — Employer Portal (~60 tests)

```
TDD Sequence:
1. ✅ Write employer-packages.test.ts → implement lib/employer-packages.ts
2. ✅ Write team-invitations.test.ts → implement lib/team-invitations.ts
3. ✅ Write employer integration tests → implement all employer API routes
4. ✅ Write employer UI tests → implement employer pages
```

### Phase 5 — Admin Portal (~55 tests)

```
TDD Sequence:
1. ✅ Write admin-impersonation.test.ts → implement lib/admin-impersonation.ts
2. ✅ Write analytics.test.ts → implement lib/analytics.ts
3. ✅ Write reporting.test.ts → implement lib/reporting.ts
4. ✅ Write admin integration tests → implement all admin API routes
5. ✅ Write admin UI tests → implement admin pages
```

### Phase 6 — Payments (~35 tests)

```
TDD Sequence:
1. ✅ Write recurring-billing.test.ts → implement lib/recurring-billing.ts
2. ✅ Write employer-recurring-billing.test.ts → implement lib/employer-recurring-billing.ts
3. ✅ Write invoice-pdf.test.ts → implement lib/invoice-pdf.ts
4. ✅ Write payment integration tests → implement payment API routes
```

### Phase 7 — Messaging & Notifications (~30 tests)

```
TDD Sequence:
1. ✅ Write notification-service.test.ts → implement lib/notification-service.ts
2. ✅ Write notification-handlers.test.ts → implement lib/notification-handlers.ts
3. ✅ Write email-templates.test.ts → implement lib/email-templates.ts
4. ✅ Write customer-payment-emails.test.ts → implement lib/customer-payment-emails.ts
5. ✅ Write messaging integration tests → implement messaging API routes
6. ✅ Write notification UI tests → implement notification components
```

### Phase 8 — Concierge & Services (~25 tests)

```
TDD Sequence:
1. ✅ Write concierge-service.test.ts → implement lib/concierge-service.ts
2. ✅ Write resume-critique.test.ts → implement lib/resume-critique.ts
3. ✅ Write concierge integration tests → implement concierge API routes
4. ✅ Write service fulfillment integration tests → implement service APIs
```

### Phase 9 — Analytics (~15 tests)

```
TDD Sequence:
1. ✅ Write analytics integration tests → implement analytics API routes
2. ✅ Write analytics UI tests → implement analytics dashboard
```

### Phase 10 — CRM, Cron & Integrations (~25 tests)

```
TDD Sequence:
1. ✅ Write crm sync integration tests → implement HubSpot CRM sync API routes
2. ✅ Write cron integration tests → implement cron job handlers
3. ✅ Write external-webhook-service.test.ts → implement lib/external-webhook-service.ts
4. ✅ Write pending signups tests → implement pending signup flow
```

### Phase 11 — Testing & Deployment (~15 tests)

```
TDD Sequence:
1. ✅ Write seed.test.ts → implement prisma/seed.ts
2. ✅ Write health.test.ts → implement /api/health route
3. ✅ Verify all 500+ tests pass
4. ✅ Achieve coverage targets
5. ✅ Deploy to Vercel
```

---

## 7. CI/CD Integration

### GitHub Actions (Free)

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: Ampertalent_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci

      - name: Setup test database
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/Ampertalent_test
        run: npx prisma migrate deploy

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/Ampertalent_test
          STRIPE_SECRET_KEY: sk_test_mock
          RESEND_API_KEY: re_test_mock
          CLERK_SECRET_KEY: sk_test_mock
        run: npm run test:integration

      - name: Run UI tests
        run: npm run test:ui

      - name: Coverage report
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/Ampertalent_test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: [test, lint]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run build
        env:
          SKIP_ENV_VALIDATION: true
```

### package.json Scripts

```json
{
	"scripts": {
		"test": "jest",
		"test:unit": "jest --testPathPattern=__tests__/unit",
		"test:integration": "jest --testPathPattern=__tests__/integration",
		"test:ui": "jest --testPathPattern=__tests__/ui",
		"test:watch": "jest --watch",
		"test:coverage": "jest --coverage",
		"test:ci": "jest --ci --coverage --forceExit"
	}
}
```

---

## 8. Testing Utilities & Helpers

### API Route Testing Helper

```typescript
// __tests__/helpers/api.ts
import { NextRequest } from "next/server";

export function createMockRequest(
	url: string,
	options: {
		method?: string;
		body?: object;
		headers?: Record<string, string>;
		searchParams?: Record<string, string>;
	} = {},
): NextRequest {
	const { method = "GET", body, headers = {}, searchParams = {} } = options;
	const urlObj = new URL(url, "http://localhost:3000");

	Object.entries(searchParams).forEach(([key, value]) => {
		urlObj.searchParams.set(key, value);
	});

	return new NextRequest(urlObj.toString(), {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

export async function parseResponse<T>(response: Response): Promise<{
	status: number;
	data: T;
}> {
	const data = await response.json();
	return { status: response.status, data };
}
```

### SSE Testing Helper

```typescript
// __tests__/helpers/sse.ts
export function createSSEReader(response: Response) {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	const events: { event?: string; data: string }[] = [];

	return {
		async readNext() {
			const { value, done } = await reader.read();
			if (done) return null;
			const text = decoder.decode(value);
			const lines = text.split("\n").filter(Boolean);

			let event: string | undefined;
			let data = "";

			for (const line of lines) {
				if (line.startsWith("event: ")) event = line.slice(7);
				if (line.startsWith("data: ")) data = line.slice(6);
			}

			const parsed = { event, data: JSON.parse(data) };
			events.push({ event, data });
			return parsed;
		},
		getEvents: () => events,
		close: () => reader.cancel(),
	};
}
```

### Date/Time Testing Helper

```typescript
// __tests__/helpers/time.ts
export function mockDate(date: Date | string) {
	const mockNow = new Date(date).getTime();
	jest.spyOn(Date, "now").mockReturnValue(mockNow);
	jest
		.spyOn(global, "Date")
		.mockImplementation((...args) =>
			args.length
				? new (Function.prototype.bind.apply(Date, [null, ...args] as any))()
				: new Date(mockNow),
		);
}

export function advanceTime(ms: number) {
	const current = Date.now();
	jest.spyOn(Date, "now").mockReturnValue(current + ms);
}

export function restoreDate() {
	jest.restoreAllMocks();
}
```

---

## Quick Reference: Test Commands

```bash
# Run all tests
npm test

# Run specific test file
npx jest __tests__/unit/stripe.test.ts

# Run tests matching pattern
npx jest --testNamePattern="subscription"

# Run with verbose output
npx jest --verbose

# Run with coverage
npm run test:coverage

# Run in watch mode (TDD loop)
npm run test:watch

# Run only changed files
npx jest --onlyChanged

# Run specific phase tests
npx jest --testPathPattern="seeker"
npx jest --testPathPattern="employer"
npx jest --testPathPattern="admin"
npx jest --testPathPattern="payments"
```

---

## Summary: Testing by the Numbers

| Category          | Tests     | Coverage Target  |
| ----------------- | --------- | ---------------- |
| Unit Tests        | ~200      | 85%+             |
| Integration Tests | ~250      | 80%+             |
| UI Tests          | ~45       | 60%+             |
| **Grand Total**   | **~500+** | **80%+ overall** |

> 🎯 **Portfolio Impact**: 500+ tests with 80%+ coverage demonstrates professional-grade engineering practices. The comprehensive mock service layer (payments, CRM, storage) shows an understanding of clean architecture and dependency injection — exactly what hiring managers look for.
