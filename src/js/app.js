 
// app.js
import { supabase, dbHelpers } from './supabase.js'

let isSignUp = true

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('auth-form')
    const switchMode = document.getElementById('switch-mode')
    const submitBtn = document.getElementById('auth-submit')
    const errorBox = document.getElementById('errorBox')
    const loadingBox = document.getElementById('loadingBox')
    
    // Switch between signup and login
    switchMode.addEventListener('click', function() {
        isSignUp = !isSignUp
        if (isSignUp) {
            submitBtn.textContent = 'Start Free Trial 🚀'
            switchMode.textContent = 'Login instead'
            document.querySelector('.auth-header p').textContent = 'Start your 30-day free trial now'
        } else {
            submitBtn.textContent = 'Login 🔐'
            switchMode.textContent = 'Create new account'
            document.querySelector('.auth-header p').textContent = 'Welcome back to ProblemBaba!'
        }
    })
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault()
        
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value
        
        errorBox.textContent = ''
        loadingBox.style.display = 'block'
        submitBtn.disabled = true
        
        try {
            if (isSignUp) {
                // Sign up new user
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            trial_start: new Date().toISOString()
                        }
                    }
                })
                
                if (error) throw error
                
                if (data.user) {
                    // Create user profile in database
                    await dbHelpers.createUserProfile(data.user)
                    showSuccess('Account created successfully! Redirecting to chat...')
                    setTimeout(() => {
                        window.location.href = 'chat.html'
                    }, 2000)
                } else {
                    showError('Please check your email to confirm your account!')
                }
            } else {
                // Login existing user
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                
                if (error) throw error
                
                showSuccess('Login successful! Redirecting...')
                setTimeout(() => {
                    window.location.href = 'chat.html'
                }, 1000)
            }
        } catch (error) {
            showError(error.message)
        } finally {
            loadingBox.style.display = 'none'
            submitBtn.disabled = false
        }
    })
    
    function showError(message) {
        errorBox.textContent = message
        errorBox.style.color = '#f44336'
    }
    
    function showSuccess(message) {
        errorBox.textContent = message
        errorBox.style.color = '#4caf50'
    }
    
    // Check if user is already logged in
    checkAuthStatus()
})

async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        window.location.href = 'chat.html'
    }
}
