import { expect, test } from '@playwright/test'
import { gotoPublic, waitForHydration } from './support/helpers'

test.describe('smoke: public surfaces render', () => {
  test('landing page renders with a document title', async ({ page }) => {
    const response = await gotoPublic(page, '/')
    expect(response!.status()).toBeLessThan(500)
    await waitForHydration(page)
    await expect(page).toHaveTitle(/.+/)
  })

  test('sign-in page is reachable', async ({ page }) => {
    const response = await gotoPublic(page, '/sign-in')
    expect(response!.status()).toBeLessThan(500)
  })

  test('sign-up page is reachable', async ({ page }) => {
    const response = await gotoPublic(page, '/sign-up')
    expect(response!.status()).toBeLessThan(500)
  })
})
