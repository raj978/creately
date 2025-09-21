document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey")
  const showAssistantToggle = document.getElementById("showAssistantToggle")
  const autoToggle = document.getElementById("autoToggle")
  const saveButton = document.getElementById("saveSettings")
  const testButton = document.getElementById("testConnection")
  const generateImageButton = document.getElementById("generateImage")
  const openPanelButton = document.getElementById("openPanel")
  const statusText = document.getElementById("statusText")
  const messageCount = document.getElementById("messageCount")
  const imageContainer = document.getElementById("imageContainer")
  const generatedImage = document.getElementById("generatedImage")
  const imageStatus = document.getElementById("imageStatus")

  // Declare chrome variable
  const chrome = window.chrome

  // Load saved settings
  const settings = await chrome.storage.sync.get(["apiKey", "autoGenerate", "showAssistant", "messageCount"])
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey
  }
  if (settings.autoGenerate) {
    autoToggle.classList.add("active")
  }
  // Show assistant toggle - default to true if not set
  if (settings.showAssistant !== false) {
    showAssistantToggle.classList.add("active")
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

  // Toggle show assistant with instant update
  showAssistantToggle.addEventListener("click", async () => {
    showAssistantToggle.classList.toggle("active")

    // Get current state and save instantly
    const showAssistant = showAssistantToggle.classList.contains("active")

    // Save to storage
    await chrome.storage.sync.set({ showAssistant: showAssistant })

    // Send instant update to content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SETTINGS_UPDATED",
        settings: {
          ...settings, // Keep existing settings
          showAssistant: showAssistant
        },
      })

      // Update local settings object
      settings.showAssistant = showAssistant

      console.log("Widget visibility toggled:", showAssistant ? "shown" : "hidden")
    } catch (error) {
      console.log("Could not send message to content script:", error)
    }
  })

  // Toggle auto-generate
  autoToggle.addEventListener("click", () => {
    autoToggle.classList.toggle("active")
  })

  // Save settings
  saveButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    const showAssistant = showAssistantToggle.classList.contains("active")
    const autoGenerate = autoToggle.classList.contains("active")

    if (!apiKey) {
      alert("Please enter your Google Gemini API key")
      return
    }

    await chrome.storage.sync.set({
      apiKey: apiKey,
      showAssistant: showAssistant,
      autoGenerate: autoGenerate,
    })

    // Send settings to content script
    chrome.tabs.sendMessage(tab.id, {
      type: "SETTINGS_UPDATED",
      settings: { apiKey, showAssistant, autoGenerate },
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

  // Generate image with nano banana model
  generateImageButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim()
    if (!apiKey) {
      alert("Please enter your API key first")
      return
    }

    generateImageButton.textContent = "Generating..."
    generateImageButton.disabled = true
    imageStatus.textContent = "Creating your pink dragon..."
    imageContainer.style.display = "block"

    try {
      // Using Google's Imagen 4 model for image generation
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          instances: [{
            prompt: "A cute pink dragon breathing out streams of clear blue water from its mouth. Fantasy art style, vibrant colors, magical atmosphere, detailed digital illustration, friendly expression, shimmering scales, crystal clear water streams, whimsical charm"
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

    generateImageButton.textContent = "🐉 Generate Pink Dragon"
    generateImageButton.disabled = false
  })

  // Open design panel
  openPanelButton.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" })
    window.close()
  })
})
