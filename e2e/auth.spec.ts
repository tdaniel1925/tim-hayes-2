import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.locator('h1:has-text("AudiaPro")')).toBeVisible()
    await expect(page.locator('text=Sign in to your account')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should have working form inputs', async ({ page }) => {
    await page.goto('/login')

    // Fill in form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    // Verify inputs were filled
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com')
    await expect(page.locator('input[type="password"]')).toHaveValue('password123')
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.locator('input[id="password"]')
    const toggleButton = page.locator('button:near(input[id="password"])')

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Click toggle to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
