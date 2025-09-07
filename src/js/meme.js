 
// meme.js
let canvas, ctx, uploadedImage = null

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById("memeCanvas")
    if (canvas) {
        ctx = canvas.getContext("2d")
        initializeMemeGenerator()
    }
})

function initializeMemeGenerator() {
    const imageInput = document.getElementById("imageInput")
    const topText = document.getElementById("topText")
    const bottomText = document.getElementById("bottomText")
    const downloadBtn = document.getElementById("downloadMeme")
    const shareBtn = document.getElementById("shareMeme")

    // Load default meme template
    loadDefaultTemplate()

    // Image upload handler
    if (imageInput) {
        imageInput.addEventListener("change", handleImageUpload)
    }

    // Text input handlers
    if (topText) {
        topText.addEventListener("input", drawMeme)
    }
    if (bottomText) {
        bottomText.addEventListener("input", drawMeme)
    }

    // Button handlers
    if (downloadBtn) {
        downloadBtn.addEventListener("click", downloadMeme)
    }
    if (shareBtn) {
        shareBtn.addEventListener("click", shareMeme)
    }
}

function loadDefaultTemplate() {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = "https://i.imgflip.com/30b1gx.jpg" // Drake meme template
    img.onload = function() {
        uploadedImage = img
        drawMeme()
    }
    img.onerror = function() {
        // Fallback: create a simple colored background
        createDefaultBackground()
    }
}

function createDefaultBackground() {
    ctx.fillStyle = "#ff9800"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add ProblemBaba logo/text
    ctx.fillStyle = "white"
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    ctx.fillText("ProblemBaba", canvas.width / 2, canvas.height / 2)
    
    uploadedImage = canvas
    drawMeme()
}

function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = function(e) {
        const img = new Image()
        img.onload = function() {
            uploadedImage = img
            drawMeme()
        }
        img.src = e.target.result
    }
    reader.readAsDataURL(file)
}

function drawMeme() {
    if (!uploadedImage || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height)

    // Get text values
    const topText = document.getElementById("topText")?.value || ""
    const bottomText = document.getElementById("bottomText")?.value || ""

    // Set text style
    ctx.font = "bold 30px Impact, Arial"
    ctx.fillStyle = "white"
    ctx.strokeStyle = "black"
    ctx.lineWidth = 3
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Draw top text
    if (topText) {
        const lines = wrapText(topText, canvas.width - 40)
        lines.forEach((line, index) => {
            const y = 50 + (index * 35)
            ctx.strokeText(line, canvas.width / 2, y)
            ctx.fillText(line, canvas.width / 2, y)
        })
    }

    // Draw bottom text
    if (bottomText) {
        const lines = wrapText(bottomText, canvas.width - 40)
        lines.forEach((line, index) => {
            const y = canvas.height - 50 - ((lines.length - 1 - index) * 35)
            ctx.strokeText(line, canvas.width / 2, y)
            ctx.fillText(line, canvas.width / 2, y)
        })
    }

    // Add watermark
    ctx.font = "12px Arial"
    ctx.fillStyle = "rgba(255, 152, 0, 0.7)"
    ctx.textAlign = "right"
    ctx.fillText("ProblemBaba.com", canvas.width - 10, canvas.height - 10)
}

function wrapText(text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let currentLine = words[0] || ''

    for (let i = 1; i < words.length; i++) {
        const word = words[i]
        const testLine = currentLine + ' ' + word
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && i > 0) {
            lines.push(currentLine)
            currentLine = word
        } else {
            currentLine = testLine
        }
    }
    lines.push(currentLine)
    return lines
}

function downloadMeme() {
    if (!canvas) return

    try {
        const link = document.createElement("a")
        link.download = `problem-baba-meme-${Date.now()}.png`
        link.href = canvas.toDataURL("image/png")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Show success message
        showMemeMessage("Meme downloaded successfully! 📥", "success")
    } catch (error) {
        showMemeMessage("Error downloading meme. Please try again.", "error")
    }
}

function shareMeme() {
    if (!canvas) return

    try {
        canvas.toBlob(function(blob) {
            const file = new File([blob], "problem-baba-meme.png", { type: "image/png" })
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: "Check out this ProblemBaba meme!",
                    text: "Funny solution from ProblemBaba AI",
                    files: [file]
                })
            } else {
                // Fallback: copy image data URL to clipboard
                canvas.toBlob(function(blob) {
                    const item = new ClipboardItem({ "image/png": blob })
                    navigator.clipboard.write([item]).then(function() {
                        showMemeMessage("Meme copied to clipboard! 📋", "success")
                    }).catch(function() {
                        showMemeMessage("Sharing not supported. Meme saved instead!", "info")
                        downloadMeme()
                    })
                })
            }
        }, "image/png")
    } catch (error) {
        showMemeMessage("Error sharing meme. Please try downloading instead.", "error")
    }
}

function showMemeMessage(message, type) {
    // Create a temporary message element
    const messageDiv = document.createElement("div")
    messageDiv.textContent = message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `

    document.body.appendChild(messageDiv)

    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = "slideOut 0.3s ease-out"
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv)
            }
        }, 300)
    }, 3000)
}

// Auto-generate meme from AI response
window.generateMemeFromAI = function(aiText) {
    const topTextEl = document.getElementById("topText")
    const bottomTextEl = document.getElementById("bottomText")
    
    if (topTextEl && bottomTextEl) {
        // Split AI text into two parts for top and bottom
        const sentences = aiText.split('. ')
        if (sentences.length >= 2) {
            topTextEl.value = sentences[0]
            bottomTextEl.value = sentences[1]
        } else {
            topTextEl.value = aiText.substring(0, 50)
            bottomTextEl.value = "Problem Solved! 😎"
        }
        drawMeme()
    }
}

// CSS for animations (added dynamically)
const style = document.createElement('style')
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`
document.head.appendChild(style)
