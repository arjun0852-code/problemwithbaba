 
// pricing.js
import { supabase, dbHelpers } from './supabase.js'

let currentUser = null

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()
    currentUser = session?.user
    
    // Initialize payment button
    const payBtn = document.getElementById('pay-btn')
    if (payBtn) {
        payBtn.addEventListener('click', handlePayment)
    }
})

async function handlePayment() {
    if (!currentUser) {
        alert('Please login first!')
        window.location.href = 'signup.html'
        return
    }

    // Razorpay options
    const options = {
        key: "rzp_test_1234567890", // 🔥 REPLACE WITH YOUR RAZORPAY KEY
        amount: "5000", // ₹50.00 in paisa (50 * 100)
        currency: "INR",
        name: "ProblemBaba",
        description: "Monthly Subscription - Unlimited AI Solutions",
        image: "images/baba-avatar.png",
        order_id: "", // Will be generated from backend
        handler: function (response) {
            handlePaymentSuccess(response)
        },
        prefill: {
            name: currentUser.user_metadata?.full_name || "",
            email: currentUser.email,
            contact: ""
        },
        notes: {
            address: "ProblemBaba HQ, India"
        },
        theme: {
            color: "#ff9800"
        },
        modal: {
            ondismiss: function() {
                console.log('Payment modal closed')
            }
        }
    }

    try {
        // Create Razorpay order (in real app, this should be done via your backend)
        const rzp = new Razorpay(options)
        rzp.open()
    } catch (error) {
        console.error('Error initializing payment:', error)
        alert('Error initializing payment. Please try again.')
    }
}

async function handlePaymentSuccess(response) {
    try {
        // Save payment to database
        await dbHelpers.savePayment(
            currentUser.id,
            50, // Amount in rupees
            response.razorpay_payment_id,
            'completed'
        )

        // Update user subscription status
        const { error } = await supabase
            .from('users')
            .update({
                subscription_status: 'active',
                subscription_start: new Date().toISOString(),
                subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            })
            .eq('id', currentUser.id)

        if (error) throw error

        // Show success message
        showPaymentSuccess(response.razorpay_payment_id)

        // Redirect to chat after delay
        setTimeout(() => {
            window.location.href = 'chat.html'
        }, 3000)

    } catch (error) {
        console.error('Error processing payment:', error)
        alert('Payment successful but there was an error updating your account. Please contact support.')
    }
}

function showPaymentSuccess(paymentId) {
    // Create success overlay
    const overlay = document.createElement('div')
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `

    const successCard = document.createElement('div')
    successCard.style.cssText = `
        background: white;
        padding: 3rem;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        margin: 1rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `

    successCard.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
        <h2 style="color: #4caf50; margin-bottom: 1rem;">Payment Successful!</h2>
        <p>Welcome to ProblemBaba Pro!</p>
        <p>Payment ID: <code>${paymentId}</code></p>
        <p style="color: #666; margin-top: 2rem;">Redirecting to chat in 3 seconds...</p>
        <div style="width: 100%; height: 4px; background: #e0e0e0; border-radius: 2px; margin-top: 1rem;">
            <div id="progress-bar" style="width: 0%; height: 100%; background: #4caf50; border-radius: 2px; transition: width 0.1s;"></div>
        </div>
    `

    overlay.appendChild(successCard)
    document.body.appendChild(overlay)

    // Animate progress bar
    const progressBar = document.getElementById('progress-bar')
    let progress = 0
    const interval = setInterval(() => {
        progress += 1
        progressBar.style.width = `${(progress / 30) * 100}%`
        if (progress >= 30) {
            clearInterval(interval)
        }
    }, 100)
}

// Handle payment errors
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('razorpay')) {
        console.error('Razorpay error:', event.error)
        alert('Payment system error. Please try again or contact support.')
    }
})

// Check subscription status on page load
async function checkSubscriptionStatus() {
    if (!currentUser) return

    try {
        const { data: profile } = await supabase
            .from('users')
            .select('subscription_status, trial_end, subscription_end')
            .eq('id', currentUser.id)
            .single()

        if (profile) {
            const now = new Date()
            const trialEnd = new Date(profile.trial_end)
            const subEnd = profile.subscription_end ? new Date(profile.subscription_end) : null

            if (profile.subscription_status === 'active' && subEnd && now > subEnd) {
                // Subscription expired, redirect to pricing
                alert('Your subscription has expired. Please renew to continue using ProblemBaba Pro.')
            } else if (profile.subscription_status === 'trial' && now > trialEnd) {
                // Trial expired
                alert('Your free trial has expired. Subscribe now to continue using ProblemBaba!')
            } else if (profile.subscription_status === 'active') {
                // Already subscribed, redirect to chat
                window.location.href = 'chat.html'
            }
        }
    } catch (error) {
        console.error('Error checking subscription:', error)
    }
}

// Call check on page load
checkSubscriptionStatus()
