import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './test',
    fullyParallel: false, // WebRTC tests need to run sequentially
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Run tests sequentially to avoid port conflicts
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:1999',
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'npm run start:party',
        url: 'http://localhost:1999/parties/main/test',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
})
