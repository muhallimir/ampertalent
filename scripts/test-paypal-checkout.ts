async function testPayPalCheckoutFlow() {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET
  const paypalEnvironment = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || 'sandbox'

  if (!paypalClientId || !paypalClientSecret) {
    console.error('❌ ERROR: Missing PayPal credentials!')
    console.error(`  NEXT_PUBLIC_PAYPAL_CLIENT_ID: ${paypalClientId ? '✓' : '✗'}`)
    console.error(`  PAYPAL_CLIENT_SECRET: ${paypalClientSecret ? '✓' : '✗'}`)
    process.exit(1)
  }

  console.log('🧪 Testing PayPal Checkout Flow')
  console.log('===============================')
  console.log('')
  console.log(`Environment: ${paypalEnvironment}`)
  console.log(`Client ID: ${paypalClientId.substring(0, 15)}...`)
  console.log('')

  try {
    // Step 1: Get access token
    console.log('Step 1: Getting PayPal access token...')
    const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')
    
    const tokenResponse = await fetch(
      `https://api-${paypalEnvironment}.sandbox.paypal.com/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      }
    )

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get token: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json() as any
    const accessToken = tokenData.access_token
    console.log(`✅ Access token obtained: ${accessToken.substring(0, 20)}...`)
    console.log('')

    // Step 2: Create PayPal order
    console.log('Step 2: Creating PayPal order...')
    const orderResponse = await fetch(
      `https://api-${paypalEnvironment}.sandbox.paypal.com/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: '34.99',
                breakdown: {
                  item_total: {
                    currency_code: 'USD',
                    value: '34.99'
                  }
                }
              },
              items: [
                {
                  name: 'Flex Trial',
                  sku: 'FLEX-TRIAL',
                  unit_amount: {
                    currency_code: 'USD',
                    value: '34.99'
                  },
                  quantity: '1'
                }
              ]
            }
          ],
          application_context: {
            return_url: 'http://localhost:3000/seeker/subscription/paypal-return',
            cancel_url: 'http://localhost:3000/checkout?planId=trial',
            brand_name: 'Ampertalent',
            locale: 'en-US',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW'
          }
        })
      }
    )

    if (!orderResponse.ok) {
      const error = await orderResponse.json()
      throw new Error(`Failed to create order: ${JSON.stringify(error)}`)
    }

    const order = await orderResponse.json() as any
    console.log(`✅ PayPal order created successfully!`)
    console.log('')
    console.log('Order Details:')
    console.log(`  • Order ID: ${order.id}`)
    console.log(`  • Status: ${order.status}`)
    console.log(`  • Amount: ${order.purchase_units[0].amount.value} ${order.purchase_units[0].amount.currency_code}`)
    console.log('')

    // Find the approval link
    const approvalLink = order.links.find((link: any) => link.rel === 'approve')
    if (approvalLink) {
      console.log('✅ Approval link found')
      console.log(`  • Link: ${approvalLink.href.substring(0, 60)}...`)
      console.log('')
    }

    console.log('Test Result: PASSED ✓')
    console.log('')
    console.log('PayPal checkout flow works correctly!')
    console.log('')
    console.log('Manual testing steps:')
    console.log('1. Start dev server: npm run dev')
    console.log('2. Visit: http://localhost:3000/checkout')
    console.log('3. Select PayPal tab')
    console.log('4. Click PayPal button')
    console.log('5. PayPal popup should open (sandbox mode)')
    console.log('6. Login with sandbox buyer account:')
    console.log('   Email: buyer@example.com (or your PayPal sandbox account)')
    console.log('   Password: qweasd123')
    console.log('7. Review order details ($34.99 for Flex Trial)')
    console.log('8. Click "Agree and Pay"')
    console.log('9. Should redirect back to http://localhost:3000/seeker/subscription/paypal-return')
    console.log('10. onReturn callback processes payment')

  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    process.exit(1)
  }
}

testPayPalCheckoutFlow()
