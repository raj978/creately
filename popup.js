document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey")
  const autoToggle = document.getElementById("autoToggle")
  const saveButton = document.getElementById("saveSettings")
  const testButton = document.getElementById("testConnection")
  const openPanelButton = document.getElementById("openPanel")
  const statusText = document.getElementById("statusText")
  const messageCount = document.getElementById("messageCount")

  // Declare chrome variable
  const chrome = window.chrome

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

  // Open design panel
  openPanelButton.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" })
    window.close()
  })
})
