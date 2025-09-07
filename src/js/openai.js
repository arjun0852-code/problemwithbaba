 
// openai.js - Updated to use Perplexity API
const PERPLEXITY_API_KEY = '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'
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

export async function getPerplexityAnswer(problem, format, personality) {
    try {
        // Create personality-specific prompt
        let systemPrompt = getPersonalityPrompt(personality)
        let userPrompt = createUserPrompt(problem, format)
        
        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar-pro', // Use Perplexity's Sonar model
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9,
                stream: false
            })
        })

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`)
        }

        const data = await response.json()
        const aiResponse = data.choices[0].message.content

        // Process response based on format
        return await processResponse(aiResponse, format, problem)

    } catch (error) {
        console.error('Error calling Perplexity API:', error)
        return {
            text: "Oops! I'm having trouble connecting to my brain right now. Please try again in a moment! 🤖💭",
            data: null
        }
    }
}

function getPersonalityPrompt(personality) {
    const prompts = {
        funny: `You are a hilarious problem-solver who gives practical advice with jokes, puns, and funny analogies. 
                Be helpful but make the user laugh. Use emojis and keep things light-hearted. 
                Always end with a funny comment or joke related to the problem.`,
        
        serious: `You are a wise and experienced advisor who provides thoughtful, well-researched solutions. 
                 Give detailed, practical advice with step-by-step instructions. 
                 Be professional but caring. Include relevant facts or statistics when helpful.`,
        
        motivational: `You are an enthusiastic life coach who inspires and motivates people to overcome challenges. 
                      Be energetic, positive, and encouraging. Use powerful words and motivational phrases. 
                      Always end with an inspiring call to action or affirmation.`
    }
    return prompts[personality] || prompts.funny
}

function createUserPrompt(problem, format) {
    let basePrompt = `Please help me solve this problem: "${problem}"`
    
    switch (format) {
        case 'meme':
            basePrompt += '\n\nPlease provide a solution and also suggest a funny meme caption that relates to this problem. Format your response as: SOLUTION: [your solution] | MEME: [funny meme text]'
            break
        case 'photo':
            basePrompt += '\n\nProvide a solution and describe what kind of helpful image or infographic would illustrate this solution best.'
            break
        case 'video':
            basePrompt += '\n\nProvide a solution and suggest what type of video tutorial or explanation would be most helpful for this problem.'
            break
        default:
            basePrompt += '\n\nProvide a clear, practical solution.'
    }
    
    return basePrompt
}

async function processResponse(aiResponse, format, originalProblem) {
    let processedResponse = aiResponse
    let extraData = {}

    switch (format) {
        case 'meme':
            const memeMatch = aiResponse.match(/MEME:\s*(.+?)(?:\||$)/i)
            if (memeMatch) {
                extraData.meme_text = memeMatch[1].trim()
                processedResponse = aiResponse.replace(/MEME:\s*(.+?)(?:\||$)/i, '').replace('SOLUTION:', '').trim()
                
                // Try to get a meme image from a meme API
                try {
                    const memeImage = await generateMemeImage(memeMatch[1].trim())
                    if (memeImage) {
                        extraData.image = memeImage
                    }
                } catch (error) {
                    console.error('Error generating meme:', error)
                }
            }
            break
            
        case 'photo':
            extraData.suggested_search = `${originalProblem} infographic tutorial`
            break
            
        case 'video':
            extraData.video_search = `${originalProblem} tutorial`
            // You could integrate with YouTube API to find actual videos
            extraData.youtube_query = encodeURIComponent(`${originalProblem} how to solve`)
            processedResponse += `\n\n🎥 Search YouTube for: "${originalProblem} tutorial"`
            break
    }

    // Add sharing capability
    extraData.share_text = `Problem: ${originalProblem}\nSolution: ${processedResponse.substring(0, 100)}...`

    return {
        text: processedResponse,
        data: extraData
    }
}

// Meme generation using a free meme API (you can replace this with any meme service)
async function generateMemeImage(text) {
    try {
        // Using ImgFlip API as an example (you'll need to sign up for a free account)
        // This is just a placeholder - you can integrate with any meme generation service
        
        const memeTemplates = [
            { id: '181913649', name: 'Drake' },
            { id: '87743020', name: 'Two Buttons' },
            { id: '112126428', name: 'Distracted Boyfriend' },
            { id: '131087935', name: 'Running Away Balloon' }
        ]
        
        const randomTemplate = memeTemplates[Math.floor(Math.random() * memeTemplates.length)]
        
        // For demo purposes, return a placeholder
        // In production, you would call the actual meme API
        return `https://imgflip.com/s/meme/${randomTemplate.id}.jpg`
        
    } catch (error) {
        console.error('Error generating meme image:', error)
        return null
    }
}

// Utility function to search for related videos/tutorials
export function searchRelatedContent(problem) {
    const searchQuery = encodeURIComponent(problem + " solution tutorial")
    return {
        youtube: `https://www.youtube.com/results?search_query=${searchQuery}`,
        google: `https://www.google.com/search?q=${searchQuery}`,
        reddit: `https://www.reddit.com/search?q=${searchQuery}`
    }
}

// Function to get problem-solving tips based on category
export function getProblemCategory(problem) {
    const categories = {
        work: ['productivity', 'career', 'job', 'workplace', 'office', 'boss'],
        health: ['diet', 'exercise', 'sleep', 'stress', 'mental health', 'fitness'],
        relationship: ['dating', 'marriage', 'friends', 'family', 'social'],
        money: ['budget', 'savings', 'debt', 'investment', 'finance'],
        education: ['study', 'learn', 'school', 'college', 'exam'],
        technology: ['computer', 'phone', 'app', 'software', 'internet']
    }
    
    const problemLower = problem.toLowerCase()
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => problemLower.includes(keyword))) {
            return category
        }
    }
    
    return 'general'
}
