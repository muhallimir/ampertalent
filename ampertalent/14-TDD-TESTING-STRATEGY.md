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
