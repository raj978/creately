document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey")
  const autoToggle = document.getElementById("autoToggle")
  const saveButton = document.getElementById("saveSettings")
  const testButton = document.getElementById("testConnection")
  const messagesPreview = document.getElementById("messagesPreview")
  const generateImageButton = document.getElementById("generateImage")
  const pasteImageButton = document.getElementById("pasteImageToChat")
  const openPanelButton = document.getElementById("openPanel")
  const statusText = document.getElementById("statusText")
  const messageCount = document.getElementById("messageCount")
  const imageContainer = document.getElementById("imageContainer")
  const generatedImage = document.getElementById("generatedImage")
  const imageStatus = document.getElementById("imageStatus")

  // Store for chat messages and generation memory
  let chatMessages = []
  let imageGenerationHistory = []
  let currentProject = ""
  let messagePollingInterval = null
  let pollingAttempts = 0
  const maxPollingAttempts = 20 // Stop after 20 attempts (about 1 minute)

  // Declare chrome variable
  const chrome = window.chrome

  // Function to get messages from content script
  async function getChatMessages(showPollingStatus = false) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      console.log("Current tab URL:", tab.url)
      
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_MESSAGES" })
      console.log("Response from content script:", response)
      
      if (response && response.messages) {
        chatMessages = response.messages
        console.log("Received messages:", chatMessages.length)
        
        // Stop polling if we found messages
        if (messagePollingInterval) {
          clearInterval(messagePollingInterval)
          messagePollingInterval = null
          pollingAttempts = 0
        }
        
        updateMessagesPreview()
        return chatMessages
      } else {
        if (showPollingStatus) {
          messagesPreview.textContent = "Content script not responding - try refreshing the page"
        }
        return []
      }
    } catch (error) {
      console.error("Error getting chat messages:", error)
      if (error.message.includes("Could not establish connection")) {
        if (showPollingStatus) {
          messagesPreview.textContent = "Content script not loaded - refresh the page"
        }
      } else {
        if (showPollingStatus) {
          messagesPreview.textContent = `Error: ${error.message}`
        }
      }
    }
    return []
  }

  // Function to start polling for messages
  function startMessagePolling() {
    if (messagePollingInterval) {
      return // Already polling
    }
    
    pollingAttempts = 0
    messagesPreview.textContent = "Looking for messages..."
    generateImageButton.textContent = "🎨 Searching for Messages..."
    
    messagePollingInterval = setInterval(async () => {
      pollingAttempts++
      console.log(`Polling attempt ${pollingAttempts}/${maxPollingAttempts}`)
      
      if (pollingAttempts >= maxPollingAttempts) {
        clearInterval(messagePollingInterval)
        messagePollingInterval = null
        messagesPreview.textContent = "No messages found after searching"
        generateImageButton.textContent = "🎨 No Messages to Generate From"
        return
      }
      
      // Update status text
      messagesPreview.textContent = `Looking for messages... (${pollingAttempts}/${maxPollingAttempts})`
      
      // Try to get messages
      await getChatMessages(false) // Don't show error messages during polling
      
    }, 3000) // Poll every 3 seconds
  }

  // Function to update messages preview
  function updateMessagesPreview() {
    if (chatMessages.length === 0) {
      // Start polling if we haven't found messages yet
      startMessagePolling()
      return
    }

    const recentMessages = chatMessages.slice(-3) // Show last 3 messages
    const preview = recentMessages.map(msg => {
      const name = msg.sender || msg.name || 'Unknown'
      const content = msg.content || ''
      return content.trim() ? `${name}: ${content.substring(0, 50)}...` : null
    }).filter(Boolean).join('\n')
    
    messagesPreview.textContent = preview || "Loading messages..."
    
    // Enable the generate button when messages are available
    generateImageButton.disabled = false
    generateImageButton.textContent = "🎨 Generate Image from Chat"
  }

  // Function to analyze chat messages for image context
  function analyzeMessagesForImageContext(messages) {
    const recentMessages = messages.slice(-10) // Last 10 messages for context
    const conversationText = recentMessages.map(msg => {
      const name = msg.sender || msg.name || 'Unknown'
      const content = msg.content || ''
      return content.trim() ? `${name}: ${content}` : null
    }).filter(Boolean).join('\n')

    return {
      conversationContext: conversationText,
      messageCount: recentMessages.length,
      participants: [...new Set(recentMessages.map(msg => msg.sender || msg.name))],
      hasImageRequests: conversationText.toLowerCase().includes('image') || 
                       conversationText.toLowerCase().includes('picture') ||
                       conversationText.toLowerCase().includes('design') ||
                       conversationText.toLowerCase().includes('draw')
    }
  }

  // Function to enhance prompt using chat context and generation memory
  async function enhancePromptWithContext(chatContext, apiKey) {
    try {
      // Build memory context from previous generations
      const memoryContext = imageGenerationHistory.length > 0 
        ? `\n\nPrevious image generations in this session:\n${imageGenerationHistory.map((gen, i) => 
            `${i + 1}. ${gen.originalPrompt} -> Generated: ${gen.enhancedPrompt.substring(0, 100)}...`
          ).join('\n')}\n\nUse this context to make the new image generation coherent with previous requests.`
        : ""

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI assistant that analyzes Discord chat conversations and creates detailed image generation prompts based on the context and suggestions in the chat.

Discord Conversation Context:
${chatContext.conversationContext}

${memoryContext}

Instructions:
1. Analyze the conversation for any image requests, suggestions, or creative ideas
2. Look for descriptive elements, themes, styles, colors, or moods mentioned
3. Create a detailed image generation prompt that captures the essence of what's being discussed
4. If there are multiple suggestions, synthesize them into a cohesive concept
5. Include artistic style, composition, lighting, and quality descriptors
6. Bias the output to be skewed towards the most recent messages in the conversation
7. If there are mentions of a format (etc. Youtube thumbnail, Twitter post, Instagram post, etc.), research the format to include the dimensions, and also make sure to include the format name.

Requirements:
- Create a prompt that reflects the conversation context
- Make it detailed enough for high-quality image generation
- If no clear image idea is present, create something inspired by the general conversation theme
- Keep it under 200 words
- Only return the enhanced prompt, nothing else

Generate the image prompt now:`
            }]
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts[0].text.trim()
        }
      }
      
      // Fallback prompt based on conversation themes
      return "A creative digital artwork inspired by online conversation themes, modern style, vibrant colors, high quality illustration"
    } catch (error) {
      console.error("Prompt enhancement error:", error)
      return "A creative digital artwork inspired by conversation themes, modern style, vibrant colors"
    }
  }

  // Load saved settings
  const settings = await chrome.storage.sync.get(["apiKey", "autoGenerate", "messageCount"])
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey
  }
  if (settings.autoGenerate) {
    autoToggle.classList.add("active")
  }
  if (settings.messageCount) {
    messageCount.textContent = settings.messageCount
  }

  // Load messages from current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  statusText.textContent = "Active"
  statusText.style.color = "#4CAF50"
  
  // Set initial button state (disabled until messages are loaded)
  generateImageButton.disabled = true
  generateImageButton.textContent = "🎨 Loading Messages..."
  
  // Load chat messages (this will start polling if no messages found)
  await getChatMessages(true)

  // Toggle auto-generate
  autoToggle.addEventListener("click", () => {
    autoToggle.classList.toggle("active")
  })

  // Save settings
  saveButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    const autoGenerate = autoToggle.classList.contains("active")

    if (!apiKey) {
      alert("Please enter your Google Gemini API key")
      return
    }

    await chrome.storage.sync.set({
      apiKey: apiKey,
      autoGenerate: autoGenerate,
    })

    // Send settings to content script
    chrome.tabs.sendMessage(tab.id, {
      type: "SETTINGS_UPDATED",
      settings: { apiKey, autoGenerate },
    })

    alert("Settings saved successfully!")
  })

  // Test API connection
  testButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    if (!apiKey) {
      alert("Please enter your API key first")
      return
    }

    testButton.textContent = "Testing..."
    testButton.disabled = true

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (response.ok) {
        alert("✅ API connection successful!")
      } else {
        alert("❌ API connection failed. Please check your key.")
      }
    } catch (error) {
      alert("❌ Connection error: " + error.message)
    }

    testButton.textContent = "Test API Connection"
    testButton.disabled = false
  })

  // Generate image using chat messages and memory
  generateImageButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    
    if (!apiKey) {
      alert("Please enter your API key first")
      return
    }

    // Get fresh messages
    await getChatMessages()
    
    if (chatMessages.length === 0) {
      alert("No chat messages found. Make sure the content script is loaded and messages are being collected.")
      return
    }

    generateImageButton.textContent = "Analyzing..."
    generateImageButton.disabled = true
    imageStatus.textContent = "Analyzing chat messages..."
    imageContainer.style.display = "block"

    try {
      // Step 1: Analyze chat messages for context
      const chatContext = analyzeMessagesForImageContext(chatMessages)
      console.log("Chat context:", chatContext)
      
      // Step 2: Enhance prompt using chat context and memory
      imageStatus.textContent = "Creating image prompt from conversation..."
      const enhancedPrompt = await enhancePromptWithContext(chatContext, apiKey)
      console.log("Chat messages analyzed:", chatContext.messageCount)
      console.log("Enhanced prompt:", enhancedPrompt)
      
      // Store in memory
      const generationEntry = {
        timestamp: Date.now(),
        originalPrompt: `Chat context with ${chatContext.messageCount} messages`,
        enhancedPrompt: enhancedPrompt,
        chatContext: chatContext
      }
      imageGenerationHistory.push(generationEntry)
      
      // Keep only last 5 generations in memory
      if (imageGenerationHistory.length > 5) {
        imageGenerationHistory.shift()
      }
      
      // Step 2: Generate image using enhanced prompt with Imagen 4
      imageStatus.textContent = "Generating your image..."
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          instances: [{
            prompt: enhancedPrompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "BLOCK_ONLY_HIGH",
            personGeneration: "DONT_ALLOW"
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log("API Response:", data) // Debug log
        
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
          // Imagen API returns image in bytesBase64Encoded field
          const imageData = data.predictions[0].bytesBase64Encoded
          const imageUrl = `data:image/png;base64,${imageData}`
          
          generatedImage.src = imageUrl
          imageStatus.textContent = "✨ Pink dragon generated successfully!"
          imageStatus.style.color = "#4CAF50"
          
          // Show the paste button
          pasteImageButton.style.display = "block"
        } else if (data.predictions && data.predictions[0] && data.predictions[0].image) {
          // Alternative format - some responses may have 'image' field
          const imageData = data.predictions[0].image.bytesBase64Encoded || data.predictions[0].image
          const imageUrl = `data:image/png;base64,${imageData}`
          
          generatedImage.src = imageUrl
          imageStatus.textContent = "✨ Pink dragon generated successfully!"
          imageStatus.style.color = "#4CAF50"
          
          // Show the paste button
          pasteImageButton.style.display = "block"
        } else {
          console.error("Unexpected response structure:", data)
          throw new Error("No image data found in response. Check console for details.")
        }
      } else {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        let errorMessage = "Failed to generate image"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error?.message || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${errorText.slice(0, 100)}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Image generation error:", error)
      imageStatus.textContent = "❌ Failed to generate image: " + error.message
      imageStatus.style.color = "#ff6b6b"
      
      // Hide image container if generation failed
      setTimeout(() => {
        imageContainer.style.display = "none"
      }, 3000)
    }

    generateImageButton.textContent = "🎨 Generate Image"
    generateImageButton.disabled = false
  })

  // Paste generated image to Discord
  pasteImageButton.addEventListener("click", async () => {
    try {
      console.log("Pasting generated image to Discord...")
      
      // Get the current image data
      const imageSrc = generatedImage.src
      if (!imageSrc || imageSrc === '') {
        alert('❌ No image to paste. Generate an image first.')
        return
      }
      
      // Extract base64 data from the data URL
      const base64Data = imageSrc.split(',')[1] // Remove "data:image/png;base64," prefix
      
      // Send the image to the content script to paste into Discord
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const result = await chrome.tabs.sendMessage(tab.id, { 
        type: "PASTE_IMAGE_TO_CHAT",
        base64Data: base64Data,
        fileName: 'generated-image.png',
        mimeType: 'image/png'
      })
      
      
    } catch (error) {
      console.error("Error pasting image:", error)
      alert('❌ Error: ' + error.message)
    }
  })

  // Open design panel
  openPanelButton.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" })
    window.close()
  })

  // Cleanup polling when popup is closed
  window.addEventListener("beforeunload", () => {
    if (messagePollingInterval) {
      clearInterval(messagePollingInterval)
      messagePollingInterval = null
    }
  })
})
