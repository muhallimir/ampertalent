import Bugsnag from '@bugsnag/js'
import BugsnagPluginReact from '@bugsnag/plugin-react'
import BugsnagPerformance from '@bugsnag/browser-performance'

// Initialize Bugsnag only on the client side
if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY

    if (!apiKey) {
        console.warn('NEXT_PUBLIC_BUGSNAG_API_KEY is not defined. Bugsnag will not be initialized.')
    } else {
        // Start Bugsnag error monitoring
        Bugsnag.start({
            apiKey,
            plugins: [new BugsnagPluginReact()],
            enabledReleaseStages: ['production', 'staging'],
            releaseStage: process.env.NODE_ENV
        })

        // Start Bugsnag performance monitoring
        BugsnagPerformance.start({
            apiKey,
            enabledReleaseStages: ['production', 'staging']
        })

        console.log('Bugsnag initialized successfully')
    }
}

export default Bugsnag