 
// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔥 REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const supabaseUrl = 'https://wfuqvkxwocgctpchauvi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdXF2a3h3b2NnY3RwY2hhdXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTE2NjYsImV4cCI6MjA3MjgyNzY2Nn0.zvPQx5xYt_ww_a_b94m8UCHECCDdfWq43Hp3giUmrwY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database helper functions
export const dbHelpers = {
    // Create user profile
    async createUserProfile(user) {
        const { data, error } = await supabase
            .from('users')
            .insert({
                id: user.id,
                email: user.email,
                subscription_status: 'trial',
                trial_start: new Date().toISOString(),
                trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                streak_count: 0,
                last_login: new Date().toISOString()
            })
        return { data, error }
    },
    
    // Save question and answer
    async saveQA(userId, question, answer, format, personality) {
        const { data, error } = await supabase
            .from('questions')
            .insert({
                user_id: userId,
                question,
                answer,
                format,
                personality,
                timestamp: new Date().toISOString()
            })
        return { data, error }
    },
    
    // Get user's questions
    async getUserQuestions(userId, limit = 10) {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(limit)
        return { data, error }
    },
    
    // Update user streak
    async updateStreak(userId) {
        const today = new Date().toDateString()
        const { data: user } = await supabase
            .from('users')
            .select('last_login, streak_count')
            .eq('id', userId)
            .single()
        
        if (user) {
            const lastLogin = new Date(user.last_login).toDateString()
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
            
            let newStreak = user.streak_count || 0
            
            if (lastLogin === yesterday) {
                newStreak += 1
            } else if (lastLogin !== today) {
                newStreak = 1
            }
            
            const { error } = await supabase
                .from('users')
                .update({
                    last_login: new Date().toISOString(),
                    streak_count: newStreak
                })
                .eq('id', userId)
                
            return { streak: newStreak, error }
        }
        return { streak: 0, error: 'User not found' }
    },
    
    // Save payment record
    async savePayment(userId, amount, paymentId, status) {
        const { data, error } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                amount,
                payment_id: paymentId,
                status,
                created_at: new Date().toISOString()
            })
        return { data, error }
    }
}
