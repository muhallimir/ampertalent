# 🎯 Implementation Quick Start (TDD Checklist)

## Phase 1-3 Status: 52% Complete (59/114 tasks done)

---

## 🔴 RED → 🟢 GREEN Process

For EACH missing task:

1. **WRITE TEST** (RED ❌)

   ```bash
   touch __tests__/unit/[feature].test.ts
   # or
   touch __tests__/integration/api/[endpoint].test.ts
   ```

   - Define expected behavior
   - Import function/route
   - Write assertions

2. **RUN TEST** (RED ❌)

   ```bash
   npm test -- [feature].test.ts
   # Should FAIL
   ```

3. **IMPLEMENT** (add code)

   ```bash
   # Edit lib/[feature].ts or app/api/[route]/route.ts
   # Write code to satisfy test
   ```

4. **RUN TEST** (GREEN ✅)

   ```bash
   npm test -- [feature].test.ts
   # Should PASS
   ```

5. **BUILD & COMMIT**

   ```bash
   yarn build
   git add -A
   git commit -m "feat: implement [feature]"
   ```

6. **MARK DOCS**
   - Update `docs/03-PHASE-1-FOUNDATION.md` (or Phase 2/3)
   - Change `[ ]` to `[x]`

---

## 📋 Phase 1: Do First (5 Critical Tasks)

### 1️⃣ `lib/utils.ts` — Utility Functions

**File**: `lib/utils.ts`
**Test**: `__tests__/unit/utils.test.ts`
**Functions needed**:

- `cn(...classes)` — merge Tailwind classes
- `formatCurrency(amount)` — "$99.99"
- `formatDate(date)` — "Jan 15, 2024"
- `truncateText(text, len)` — "Lorem..."
- `validateEmail(email)` — true/false
- `slugify(text)` — "hello-world"
- `generateToken(length)` — random token
- `formatPhoneNumber(phone)` — "(123) 456-7890"

**Example test**:

```typescript
it("should format currency as USD", () => {
	expect(formatCurrency(99.99)).toBe("$99.99");
	expect(formatCurrency(1000)).toBe("$1,000.00");
});
```

---

### 2️⃣ `lib/job-constants.ts` — Constants

**File**: `lib/job-constants.ts`
**Test**: `__tests__/unit/job-constants.test.ts`
**Exports needed**:

```typescript
export const JOB_CATEGORIES = [
	"IT",
	"Finance",
	"HR",
	"Marketing",
	"Sales",
	"Design",
	"Operations",
	"Legal",
	"Healthcare",
	"Education",
	// + 18 more = 28 total
];

export const JOB_TYPES = [
	"Full-time",
	"Part-time",
	"Freelance",
	"Contract",
	"Temporary",
];

export const EXPERIENCE_LEVELS = [
	"Entry-level",
	"Mid-level",
	"Senior",
	"Executive",
];

export const BENEFITS = [
	"Health Insurance",
	"401k",
	"Remote",
	"Flexible Hours",
	"PTO",
	"Stock Options",
	"Bonus",
	"Professional Development",
];
```

**Example test**:

```typescript
it("should export 28 job categories", () => {
	expect(JOB_CATEGORIES.length).toBe(28);
	expect(JOB_CATEGORIES).toContain("IT");
});
```

---

### 3️⃣ `lib/storage.ts` — Supabase File Storage

**File**: `lib/storage.ts`
**Test**: `__tests__/unit/storage.test.ts`
**Functions needed**:

```typescript
export async function generatePresignedUploadUrl(
	bucket: string,
	key: string,
	expiresIn?: number,
): Promise<string>;

export async function uploadFile(
	bucket: string,
	key: string,
	file: Buffer | Blob,
): Promise<{ path: string; url: string }>;

export async function deleteFile(bucket: string, key: string): Promise<void>;

export async function generatePresignedDownloadUrl(
	bucket: string,
	key: string,
	expiresIn?: number,
): Promise<string>;
```

**Example test**:

```typescript
it("should generate presigned upload URL", async () => {
	const url = await generatePresignedUploadUrl(
		"resumes",
		"user-123/resume.pdf",
	);
	expect(url).toContain("supabase");
	expect(url).toContain("token");
	expect(url.length).toBeGreaterThan(50);
});
```

---

### 4️⃣ `lib/error-handler.ts` — Error Handling

**File**: `lib/error-handler.ts`
**Test**: `__tests__/unit/error-handler.test.ts`
**Exports needed**:

```typescript
export class AppError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export function handleApiError(error: any) {
	// Transform to Response
	return Response.json(
		{ error: error.message },
		{ status: error.statusCode || 500 },
	);
}

export function handleValidationError(errors: Record<string, string>) {
	return Response.json({ errors }, { status: 400 });
}
```

---

### 5️⃣ `prisma/seed.ts` — Demo Data

**File**: `prisma/seed.ts`
**Test**: `__tests__/integration/seed.test.ts`
**Creates**:

- 5 demo seekers (various profiles/subscriptions)
- 5 demo employers (various company sizes)
- 20 demo jobs (various categories, statuses)
- 10 demo applications (various statuses)

**Run**:

```bash
npx prisma db seed
```

---

## 📚 Phase 3: Critical APIs (8 High-Priority Tasks)

### 🔵 Job Detail API

**File**: `app/api/jobs/[id]/route.ts`
**Test**: `__tests__/integration/api/jobs-detail.test.ts`

```typescript
export async function GET(
	request: Request,
	{ params }: { params: { id: string } },
) {
	const job = await db.job.findUnique({
		where: { id: params.id },
		include: {
			employer: true,
			applications: { select: { id: true } },
		},
	});
	return Response.json(job);
}
```

---

### 🔵 Submit Application API

**File**: `app/api/applicant/route.ts`
**Test**: `__tests__/integration/api/applicant.test.ts`

```typescript
export async function POST(request: Request) {
	const currentUser = await getCurrentUser(request);
	const { jobId, resumeId, coverLetter } = await request.json();

	const application = await db.application.create({
		data: { jobId, seekerId: currentUser.jobSeeker.id, resumeId, coverLetter },
	});
	return Response.json(application);
}
```

---

### 🔵 Saved Jobs API

**File**: `app/api/seeker/saved-jobs/route.ts`
**Test**: `__tests__/integration/api/saved-jobs.test.ts`

```typescript
// GET: List saved jobs
export async function GET(request: Request) {
	const currentUser = await getCurrentUser(request);
	const savedJobs = await db.savedJob.findMany({
		where: { seekerId: currentUser.jobSeeker.id },
		include: { job: true },
	});
	return Response.json(savedJobs);
}

// POST: Save job
export async function POST(request: Request) {
	const currentUser = await getCurrentUser(request);
	const { jobId } = await request.json();
	const saved = await db.savedJob.create({
		data: { jobId, seekerId: currentUser.jobSeeker.id },
	});
	return Response.json(saved);
}

// DELETE: Unsave job (with ?jobId=123)
export async function DELETE(request: Request) {
	const currentUser = await getCurrentUser(request);
	const url = new URL(request.url);
	const jobId = url.searchParams.get("jobId");

	await db.savedJob.delete({
		where: {
			seekerId_jobId: {
				seekerId: currentUser.jobSeeker.id,
				jobId: jobId!,
			},
		},
	});
	return Response.json({ success: true });
}
```

---

### 🔵 Resume Upload (Presigned URL)

**File**: `app/api/upload/presigned-url/route.ts`
**Test**: `__tests__/integration/api/upload-presigned.test.ts`

```typescript
export async function POST(request: Request) {
	const currentUser = await getCurrentUser(request);
	const { fileName, fileType } = await request.json();

	const key = `resumes/${currentUser.id}/${fileName}`;
	const url = await generatePresignedUploadUrl("resumes", key);

	return Response.json({ uploadUrl: url, key });
}
```

---

### 🔵 Resume Upload Confirm

**File**: `app/api/upload/confirm/route.ts`
**Test**: `__tests__/integration/api/upload-confirm.test.ts`

```typescript
export async function POST(request: Request) {
	const currentUser = await getCurrentUser(request);
	const { key, fileName } = await request.json();

	const resume = await db.resume.create({
		data: {
			seekerId: currentUser.jobSeeker.id,
			fileName,
			fileKey: key,
			uploadedAt: new Date(),
		},
	});
	return Response.json(resume);
}
```

---

### 🔵 Subscription Plans Config

**File**: `lib/subscription-plans.ts`
**Test**: `__tests__/unit/subscription-plans.test.ts`

```typescript
export const SUBSCRIPTION_PLANS = [
	{
		id: "trial",
		name: "Trial",
		price: 0,
		resumeLimit: 1,
		trialDays: 7,
		stripePrice: process.env.STRIPE_TRIAL_PRICE_ID,
	},
	{
		id: "gold",
		name: "Gold",
		price: 99,
		resumeLimit: 3,
		trialDays: 0,
		stripePrice: process.env.STRIPE_GOLD_PRICE_ID,
	},
	{
		id: "vip",
		name: "VIP",
		price: 199,
		resumeLimit: 10,
		trialDays: 0,
		stripePrice: process.env.STRIPE_VIP_PRICE_ID,
	},
	{
		id: "annual",
		name: "Annual",
		price: 999,
		resumeLimit: 999,
		trialDays: 0,
		stripePrice: process.env.STRIPE_ANNUAL_PRICE_ID,
	},
];
```

---

### 🔵 Subscription Management API

**File**: `app/api/seeker/subscription/route.ts`
**Test**: `__tests__/integration/api/subscription.test.ts`

```typescript
export async function GET(request: Request) {
	const currentUser = await getCurrentUser(request);
	const sub = await db.subscription.findFirst({
		where: { seekerId: currentUser.jobSeeker.id },
	});
	return Response.json(sub);
}

export async function POST(request: Request) {
	const currentUser = await getCurrentUser(request);
	const { planId } = await request.json();

	const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
	// Create Stripe subscription
	// Save to DB
}
```

---

### 🔵 Seeker Profile API

**File**: `app/api/seeker/profile/route.ts`
**Test**: `__tests__/integration/api/seeker-profile.test.ts`

```typescript
export async function GET(request: Request) {
	const currentUser = await getCurrentUser(request);
	const profile = await db.jobSeeker.findUnique({
		where: { id: currentUser.jobSeeker.id },
		include: { userProfile: true },
	});
	return Response.json(profile);
}

export async function PATCH(request: Request) {
	const currentUser = await getCurrentUser(request);
	const data = await request.json();

	const updated = await db.jobSeeker.update({
		where: { id: currentUser.jobSeeker.id },
		data,
	});
	return Response.json(updated);
}
```

---

### 🔵 Billing History API

**File**: `app/api/seeker/billing-history/route.ts`
**Test**: `__tests__/integration/api/billing.test.ts`

```typescript
export async function GET(request: Request) {
	const currentUser = await getCurrentUser(request);
	const transactions = await db.transaction.findMany({
		where: { seekerId: currentUser.jobSeeker.id },
		orderBy: { createdAt: "desc" },
		take: 50,
	});
	return Response.json(transactions);
}
```

---

## ⚡ Quick Copy-Paste Snippets

### Test Template

```typescript
import { describe, it, expect } from "@jest/globals";

describe("[Feature Name]", () => {
	it("should [expected behavior]", async () => {
		// Arrange
		const input = "test";

		// Act
		const result = await someFunction(input);

		// Assert
		expect(result).toBe("expected");
	});
});
```

### API Route Template

```typescript
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
	try {
		const currentUser = await getCurrentUser(request);
		if (!currentUser)
			return Response.json({ error: "Unauthorized" }, { status: 401 });

		// Your logic here

		return Response.json(data);
	} catch (error) {
		console.error("[ENDPOINT]:", error);
		return Response.json({ error: "Internal error" }, { status: 500 });
	}
}
```

---

## ✅ Checklist: Before Phase 4

```
Utilities & Constants (Phase 1)
- [ ] lib/utils.ts implemented & tested
- [ ] lib/job-constants.ts implemented & tested
- [ ] lib/storage.ts implemented & tested
- [ ] lib/error-handler.ts implemented & tested
- [ ] prisma/seed.ts implemented & tested
- [ ] All Phase 1 [ ] items marked [x]

Critical APIs (Phase 3)
- [ ] GET /api/jobs/[id] implemented & tested
- [ ] POST /api/applicant implemented & tested
- [ ] /api/seeker/saved-jobs/* implemented & tested
- [ ] /api/upload/presigned-url implemented & tested
- [ ] /api/upload/confirm implemented & tested
- [ ] lib/subscription-plans.ts implemented & tested
- [ ] /api/seeker/subscription/* implemented & tested
- [ ] /api/seeker/profile/* implemented & tested
- [ ] /api/seeker/billing-history implemented & tested
- [ ] All Phase 3 [ ] items marked [x]

Build & Tests
- [ ] yarn build passes
- [ ] npm test passes (all tests)
- [ ] No TypeScript errors
- [ ] All 15 existing routes still working
- [ ] E2E flow works: Sign up → Dashboard → Browse → Save → Apply → Check apps

Documentation
- [ ] docs/03-PHASE-1-FOUNDATION.md all [x]
- [ ] docs/04-PHASE-2-AUTH-AND-ONBOARDING.md all [x]
- [ ] docs/05-PHASE-3-SEEKER-PORTAL.md all [x]
- [ ] No extra markdown files created (NO BLOAT)
```

---

## 🚀 Ready?

Start with `lib/utils.ts`:

1. Create `__tests__/unit/utils.test.ts`
2. Write tests for `cn()`, `formatCurrency()`, `formatDate()`, etc.
3. Run tests (RED ❌)
4. Create `lib/utils.ts` with implementations
5. Run tests (GREEN ✅)
6. Commit: `feat: implement utility functions`
7. Update `docs/03-PHASE-1-FOUNDATION.md` mark Core Utilities section `[x]`
8. Move to next task

Go go go! 🎯
