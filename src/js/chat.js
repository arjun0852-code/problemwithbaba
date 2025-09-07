 
// chat.js
import { supabase, dbHelpers } from './supabase.js'
import { getPerplexityAnswer } from './openai.js'

let currentUser = null
let isTyping = false

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    await checkAuth()
    
    // Initialize chat
    initializeChat()
    
    // Load user data
    await loadUserData()
    
    // Load recent questions
    await loadRecentQuestions()
})

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        window.location.href = 'signup.html'
        return
    }
    currentUser = session.user
}

function initializeChat() {
    const sendBtn = document.getElementById('send-btn')
    const problemInput = document.getElementById('problem-input')
    const toggleSidebar = document.getElementById('toggle-sidebar')
    const logoutBtn = document.getElementById('logout-btn')
    const streakBtn = document.getElementById('streak-btn')
    
    // Send button handler
    sendBtn.addEventListener('click', handleSendMessage)
    
    // Enter key handler
    problemInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    })
    
    // Sidebar toggle for mobile
    toggleSidebar.addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar')
        sidebar.classList.toggle('mobile-open')
    })
    
    // Logout handler
    logoutBtn.addEventListener('click', async function() {
        await supabase.auth.signOut()
        window.location.href = 'signup.html'
    })
    
    // Streak handler
    streakBtn.addEventListener('click', handleDailyCheckIn)
}

async function loadUserData() {
    if (!currentUser) return
    
    // Display user email
    document.getElementById('user-email').textContent = currentUser.email
    
    // Get user profile
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()
    
    if (profile) {
        // Update subscription status
        const statusEl = document.getElementById('subscription-status')
        const trialEnd = new Date(profile.trial_end)
        const now = new Date()
        
        if (profile.subscription_status === 'trial' && now > trialEnd) {
            statusEl.textContent = 'Trial Expired'
            statusEl.className = 'status-expired'
        } else if (profile.subscription_status === 'active') {
            statusEl.textContent = 'Pro Member'
            statusEl.className = 'status-pro'
        } else {
            const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
            statusEl.textContent = `Trial: ${daysLeft} days left`
            statusEl.className = 'status-free'
        }
        
        // Update streak counter
        document.getElementById('streak-counter').textContent = `${profile.streak_count || 0} days`
    }
}

async function loadRecentQuestions() {
    if (!currentUser) return
    
    const { data: questions } = await dbHelpers.getUserQuestions(currentUser.id, 5)
    const questionsList = document.getElementById('questions-list')
    
    if (questions && questions.length > 0) {
        questionsList.innerHTML = questions.map(q => `
            <div class="question-item" onclick="loadQuestion('${q.question}')">
                <div class="question-preview">${q.question.substring(0, 50)}...</div>
                <div class="question-time">${formatTime(q.timestamp)}</div>
            </div>
        `).join('')
    } else {
        questionsList.innerHTML = '<p class="no-questions">No questions yet. Start chatting!</p>'
    }
}

async function handleSendMessage() {
    const problemInput = document.getElementById('problem-input')
    const sendBtn = document.getElementById('send-btn')
    const problem = problemInput.value.trim()
    
    if (!problem || isTyping) return
    
    // Get selected options
    const personality = document.getElementById('ai-personality').value
    const format = document.getElementById('solution-format').value
    
    // Clear input and disable button
    problemInput.value = ''
    sendBtn.disabled = true
    isTyping = true
    
    // Add user message to chat
    addChatBubble(problem, 'user')
    
    // Show typing indicator
    const typingId = addTypingIndicator()
    
    try {
        // Get AI response
        const answer = await getPerplexityAnswer(problem, format, personality)
        
        // Remove typing indicator
        removeTypingIndicator(typingId)
        
        // Add AI response to chat
        addChatBubble(answer.text, 'assistant', answer.data)
        
        // Save to database
        await dbHelpers.saveQA(currentUser.id, problem, answer.text, format, personality)
        
        // Show meme generator if format is meme
        if (format === 'meme') {
            showMemeGenerator(answer.text)
        }
        
        // Reload recent questions
        await loadRecentQuestions()
        
    } catch (error) {
        removeTypingIndicator(typingId)
        addChatBubble('Sorry, I encountered an error. Please try again! 😅', 'assistant')
        console.error('Error getting AI response:', error)
    } finally {
        sendBtn.disabled = false
        isTyping = false
    }
}

function addChatBubble(message, type, extraData = null) {
    const chatBubbles = document.getElementById('chat-bubbles')
    const bubbleId = 'bubble-' + Date.now()
    
    const bubbleDiv = document.createElement('div')
    bubbleDiv.id = bubbleId
    bubbleDiv.className = `chat-bubble ${type}-bubble`
    
    const avatar = type === 'user' ? '👤' : '🤓'
    const content = extraData && extraData.image ? `${message}<br><img src="${extraData.image}" style="max-width: 100%; margin-top: 10px; border-radius: 10px;">` : message
    
    bubbleDiv.innerHTML = `
        <div class="bubble-avatar">${avatar}</div>
        <div class="bubble-content">
            ${type === 'assistant' ? '<strong>ProblemBaba:</strong><br>' : ''}
            ${content}
            ${extraData && extraData.share_text ? `<br><button onclick="shareResponse('${extraData.share_text}')" class="share-btn">Share 📱</button>` : ''}
        </div>
    `
    
    chatBubbles.appendChild(bubbleDiv)
    chatBubbles.scrollTop = chatBubbles.scrollHeight
    
    return bubbleId
}

function addTypingIndicator() {
    const chatBubbles = document.getElementById('chat-bubbles')
    const typingId = 'typing-' + Date.now()
    
    const typingDiv = document.createElement('div')
    typingDiv.id = typingId
    typingDiv.className = 'chat-bubble assistant-bubble'
    typingDiv.innerHTML = `
        <div class="bubble-avatar">🤓</div>
        <div class="bubble-content typing-indicator">
            ProblemBaba is thinking
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `
    
    chatBubbles.appendChild(typingDiv)
    chatBubbles.scrollTop = chatBubbles.scrollHeight
    
    return typingId
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId)
    if (typingDiv) {
        typingDiv.remove()
    }
}

async function handleDailyCheckIn() {
    if (!currentUser) return
    
    try {
        const { streak, error } = await dbHelpers.updateStreak(currentUser.id)
        if (!error) {
            document.getElementById('streak-counter').textContent = `${streak} days`
            addChatBubble(`🔥 Daily check-in complete! Your streak is now ${streak} days! Keep it up!`, 'assistant')
        }
    } catch (error) {
        console.error('Error updating streak:', error)
    }
}

function showMemeGenerator(text) {
    const memeGenerator = document.getElementById('meme-generator')
    memeGenerator.style.display = 'block'
    
    // Auto-fill top text with AI response
    document.getElementById('topText').value = text.substring(0, 50)
    
    // Scroll to meme generator
    memeGenerator.scrollIntoView({ behavior: 'smooth' })
}

function loadQuestion(question) {
    document.getElementById('problem-input').value = question
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('mobile-open')
}

function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
}

// Problem of the Day functionality
window.loadProblemOfDay = async function() {
    const problems = [
        "How to stay motivated while working from home?",
        "What's the best way to learn a new skill quickly?",
        "How to manage time effectively?",
        "How to deal with social media addiction?",
        "What to do when feeling overwhelmed?"
    ]
    
    const randomProblem = problems[Math.floor(Math.random() * problems.length)]
    document.getElementById('problem-input').value = randomProblem
    await handleSendMessage()
}

// Share functionality
window.shareResponse = function(text) {
    if (navigator.share) {
        navigator.share({
            title: 'ProblemBaba Solution',
            text: text,
            url: window.location.origin
        })
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${text}\n\nGenerated by ProblemBaba - ${window.location.origin}`)
        addChatBubble('Solution copied to clipboard! 📋', 'assistant')
    }
}
