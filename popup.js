document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey")
  const autoToggle = document.getElementById("autoToggle")
  const saveButton = document.getElementById("saveSettings")
  const testButton = document.getElementById("testConnection")
  const imagePrompt = document.getElementById("imagePrompt")
  const generateImageButton = document.getElementById("generateImage")
  const openPanelButton = document.getElementById("openPanel")
  const statusText = document.getElementById("statusText")
  const messageCount = document.getElementById("messageCount")
  const imageContainer = document.getElementById("imageContainer")
  const generatedImage = document.getElementById("generatedImage")
  const imageStatus = document.getElementById("imageStatus")

  // Declare chrome variable
  const chrome = window.chrome

  // Function to enhance user prompt using Gemini LLM
  async function enhancePrompt(userPrompt, apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert at writing detailed, clear image generation prompts. Take the user's simple description and enhance it into a detailed, artistic prompt that will generate high-quality images.

User's description: "${userPrompt}"

Transform this into a detailed image generation prompt that includes:
- Artistic style and medium
- Lighting and atmosphere
- Color palette and mood  
- Composition and details
- Quality descriptors

Keep it concise but descriptive (under 200 words). Only return the enhanced prompt, nothing else.`
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
      
      // Fallback to original prompt if enhancement fails
      return userPrompt
    } catch (error) {
      console.error("Prompt enhancement error:", error)
      return userPrompt
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

  // Check if extension is active on current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab.url.includes("discord.com")) {
    statusText.textContent = "Active"
    statusText.style.color = "#4CAF50"
  }

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

  // Generate image using enhanced prompt pipeline
  generateImageButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    const userPrompt = imagePrompt.value.trim()
    
    if (!apiKey) {
      alert("Please enter your API key first")
      return
    }
    
    if (!userPrompt) {
      alert("Please enter an image description")
      return
    }

    generateImageButton.textContent = "Generating..."
    generateImageButton.disabled = true
    imageStatus.textContent = "Enhancing your prompt..."
    imageContainer.style.display = "block"

    try {
      // Step 1: Enhance the user's prompt using Gemini LLM
      imageStatus.textContent = "Enhancing your prompt..."
      const enhancedPrompt = await enhancePrompt(userPrompt, apiKey)
      console.log("Original prompt:", userPrompt)
      console.log("Enhanced prompt:", enhancedPrompt)
      
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
        } else if (data.predictions && data.predictions[0] && data.predictions[0].image) {
          // Alternative format - some responses may have 'image' field
          const imageData = data.predictions[0].image.bytesBase64Encoded || data.predictions[0].image
          const imageUrl = `data:image/png;base64,${imageData}`
          
          generatedImage.src = imageUrl
          imageStatus.textContent = "✨ Pink dragon generated successfully!"
          imageStatus.style.color = "#4CAF50"
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

  // Open design panel
  openPanelButton.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" })
    window.close()
  })
})
