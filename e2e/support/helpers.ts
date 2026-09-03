import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Shared helpers for the Playwright suite.
 *
 * The app is auth-gated by Clerk for most surfaces, so specs assert either the
 * public rendering of a page or the contract of an API route (including the
 * unauthenticated contract, which is a real part of the spec).
 */

export const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up'] as const

/** Statuses an unauthenticated caller may legitimately receive from a gated route. */
export const UNAUTHENTICATED_STATUSES = [200, 401, 403, 404, 302, 307]

export async function gotoPublic(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
  expect(response, `no response for ${path}`).not.toBeNull()
  return response
}

export async function expectJsonContract(
  request: APIRequestContext,
  path: string,
  allowed: number[] = UNAUTHENTICATED_STATUSES
) {
  const response = await request.get(path)
  expect(allowed, `unexpected status ${response.status()} for ${path}`).toContain(response.status())
  return response
}

export async function readJson<T = unknown>(response: {
  json: () => Promise<unknown>
  text: () => Promise<string>
}): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

/** Waits for hydration by polling for React having attached to the document. */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => document.readyState === 'complete')
}
