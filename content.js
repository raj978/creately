// Content script that runs on Discord pages
console.log("[HACKATHON] Content script loaded!")

let isActive = false
let settings = {}
let messageCount = 0
let designPanel = null
let designGenerator = null
let messagesList = []

class MessageProcessor {
  analyzeMessage(messageText, messageElement) {
    // Placeholder for message analysis logic
    return {
      isDesignRequest: true,
      text: messageText,
      category: [{ name: "general" }],
      urgency: { level: "medium" },
      budget: { level: "medium", estimated: "$100-$200" },
      sentiment: { sentiment: "positive" },
      requirements: {
        colors: [],
        style: [],
        deliverables: ["Standard files"],
      },
    }
  }

  generateAnalysisReport(analysis) {
    // Placeholder for generating analysis report logic
    return JSON.stringify(analysis, null, 2)
  }
}

class DesignGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey
  }

  async generateDesignMockup(prompt, category, options) {
    // Placeholder for design mockup generation logic
    return {
      category: category,
      timestamp: Date.now(),
      status: "Completed",
      mockup: {
        description: "A modern and professional design mockup.",
        colorPalette: [
          { hex: "#FF5733", name: "Red" },
          { hex: "#33FF57", name: "Green" },
          { hex: "#3357FF", name: "Blue" },
        ],
        typography: {
          heading: "Arial",
          body: "Times New Roman",
        },
        layoutStructure: {
          type: "Grid",
        },
      },
      specifications: {
        dimensions: {
          primary: "1920x1080",
          alternatives: ["1280x720", "2560x1440"],
        },
        formats: {
          deliverables: ["JPEG", "PNG"],
          workingFiles: ["AI", "PSD"],
        },
        deliveryTimeline: "2 weeks",
        revisionRounds: 2,
      },
    }
  }

  async generateMultipleVariations(brief, category, count) {
    // Placeholder for generating multiple design variations logic
    const variations = []
    for (let i = 0; i < count; i++) {
      variations.push({
        options: {
          style: "Minimalist",
          mood: "Serious",
        },
        mockup: {
          description: `Variation ${i + 1} description goes here.`,
        },
      })
    }
    return variations
  }

  exportDesignSpecs(mockupId) {
    // Placeholder for exporting design specifications logic
    return {
      projectName: "Sample Project",
      id: mockupId,
      specifications: {
        dimensions: "1920x1080",
        formats: ["JPEG", "PNG"],
        typography: {
          heading: "Arial",
          body: "Times New Roman",
        },
        layoutStructure: "Grid",
        deliveryTimeline: "2 weeks",
        revisionRounds: 2,
      },
    }
  }
}

let messageProcessor = null

// Initialize the extension
async function init() {
  console.log("[HACKATHON] Discord Design Assistant: Initializing...")

  messageProcessor = new MessageProcessor()

  // Load settings
  settings = await chrome.storage.sync.get(["apiKey", "autoGenerate"])

  // Initialize design generator if API key is available
  if (settings.apiKey) {
    designGenerator = new DesignGenerator(settings.apiKey)
  }

  // Always activate and start monitoring
  isActive = true
  startMonitoring()
  createFloatingButton()
}

function startMonitoring() {
  console.log("[HACKATHON] Starting message monitoring...")
  
  // Wait for page to load, then start monitoring
  setTimeout(() => {
    setupMessageObserver()
    startPeriodicMessageProcessing()
    processExistingMessages()
  }, 2000) // Wait 2 seconds for Discord to load
}

function setupMessageObserver() {
  console.log("[HACKATHON] Setting up message observer...")
  
  // Monitor for new messages using MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Look for new Discord message elements
            const messages = node.querySelectorAll('[class*="messageListItem"]')
            if (messages.length > 0) {
              console.log("[HACKATHON] Found", messages.length, "new message(s)")
              messages.forEach(processMessage)
            }
          }
        })
      }
    })
  })

  // Start observing the Discord chat container
  const chatContainer = document.querySelector('[class*="messagesWrapper"]');
  if (chatContainer) {
    console.log("[HACKATHON] Found chat container, starting observer")
    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
    })
  } else {
    console.log("[HACKATHON] Chat container not found, retrying in 1 second...")
    setTimeout(setupMessageObserver, 1000)
  }
}

function printNode(messageElement) {
  console.log("[HACKATHON] === PRINTING NODE ===")
  console.log("[HACKATHON] Node tag:", messageElement.tagName)
  console.log("[HACKATHON] Node id:", messageElement.id)
  console.log("[HACKATHON] Node classes:", messageElement.className)
  
  // Get Discord message content using the correct selector
  const messageContentElement = messageElement.querySelector('[class*="messageContent"]')
  let messageText = ""
  
  if (messageContentElement) {
    messageText = messageContentElement.textContent || messageContentElement.innerText || ""
    console.log("[HACKATHON] Message content found:", messageText)
  } else {
    // Fallback: try to get text from the entire message element
    messageText = messageElement.textContent || messageElement.innerText || ""
    console.log("[HACKATHON] No messageContent element found, using full text:", messageText)
  }

  // Extract username
  const usernameElement = messageElement.querySelector('[class*="username"]')
  let username = ""
  if (usernameElement) {
    username = usernameElement.textContent || usernameElement.getAttribute('data-text') || ""
    console.log("[HACKATHON] Username:", username)
  }

  // Log timestamp if available
  const timestampElement = messageElement.querySelector('time')
  if (timestampElement) {
    const timestamp = timestampElement.getAttribute('datetime') || timestampElement.textContent || ""
    console.log("[HACKATHON] Timestamp:", timestamp)
  }

  // Add to messages list if we have both name and content
  console.log("[HACKATHON] Checking if message should be added:")
  console.log("[HACKATHON] Username found:", username)
  console.log("[HACKATHON] Message text found:", messageText.trim())
  console.log("[HACKATHON] Username length:", username.length)
  console.log("[HACKATHON] Message text length:", messageText.trim().length)
  
  if (username && messageText.trim()) {
    const messageObj = {
      name: username.trim(),
      content: messageText.trim()
    }
    messagesList.push(messageObj)
    console.log("[HACKATHON] Added to messages list:", messageObj)
    console.log("[HACKATHON] Total messages in list now:", messagesList.length)
  } else {
    console.log("[HACKATHON] Skipping message - missing username or content")
  }

  console.log("[HACKATHON] Full text content:", messageText.trim())
  console.log("[HACKATHON] === END NODE PRINT ===")
}

function processExistingMessages() {
  const existingMessages = document.querySelectorAll('[class*="messageListItem"]');
  messagesList = Array.from(existingMessages).map(extractMessageData)
  displayMessagesList()
}

function startPeriodicMessageProcessing() {
  console.log("[HACKATHON] Starting periodic message processing every 3 seconds...")
  
  // Run immediately
  processExistingMessages()
  
  // Then run every 3 seconds
  setInterval(() => {
    console.log("[HACKATHON] Running periodic message processing...")
    processExistingMessages()
  }, 3000)
}

function extractMessageData(messageElement) {
  console.log("[HACKATHON] === EXTRACTING MESSAGE DATA ===")
  
  // Extract sender/username
  let sender = ""
  const usernameElement = messageElement.querySelector('[class*="username"]')
  if (usernameElement) {
    sender = usernameElement.textContent || usernameElement.getAttribute('data-text') || ""
    console.log("[HACKATHON] Sender found:", sender)
  } else {
    console.log("[HACKATHON] No username element found")
  }
  
  // Extract content
  let content = ""
  const messageContentElement = messageElement.querySelector('[class*="messageContent"]')
  if (messageContentElement) {
    content = messageContentElement.textContent || messageContentElement.innerText || ""
    console.log("[HACKATHON] Content found:", content)
  } else {
    // Fallback: try to get text from the entire message element
    content = messageElement.textContent || messageElement.innerText || ""
    console.log("[HACKATHON] No messageContent element found, using full text:", content)
  }
  
  // Extract timestamp if needed
  let timestamp = ""
  const timestampElement = messageElement.querySelector('time')
  if (timestampElement) {
    timestamp = timestampElement.getAttribute('datetime') || timestampElement.textContent || ""
    console.log("[HACKATHON] Timestamp found:", timestamp)
  }
  
  // Create the message object
  const messageData = {
    sender: sender.trim(),
    content: content.trim(),
    timestamp: timestamp.trim()
  }
  
  console.log("[HACKATHON] Extracted message data:", messageData)
  console.log("[HACKATHON] === END EXTRACTION ===")
  
  return messageData
}

function displayMessagesList() {
  console.log("[HACKATHON] === MESSAGES LIST ===")
  console.log("[HACKATHON] Total messages collected:", messagesList.length)
  messagesList.forEach((message, index) => {
    console.log(`[HACKATHON] Message ${index + 1}:`)
    console.log(`[HACKATHON]   Name: ${message.name}`)
    console.log(`[HACKATHON]   Content: ${message.content}`)
  })
  console.log("[HACKATHON] === END MESSAGES LIST ===")
  
  // Also log the full array for easy copying
  console.log("[HACKATHON] Messages array:", JSON.stringify(messagesList, null, 2))
}

function processMessage(messageElement) {
  console.log("[HACKATHON] -Received message");
  // Skip if already processed
  if (messageElement.dataset.processed) return
  messageElement.dataset.processed = "true"

  // Get Discord message content more specifically
  const messageContentElement = messageElement.querySelector('[class*="messageContent-"], [class*="markup-"]')
  const messageText = messageContentElement ? (messageContentElement.textContent || messageContentElement.innerText) : (messageElement.textContent || messageElement.innerText)

  // Skip if no meaningful text content
  if (!messageText || messageText.trim().length < 5) return

  const analysis = messageProcessor.analyzeMessage(messageText, messageElement)

  if (analysis.isDesignRequest) {
    messageCount++
    updateMessageCount()

    addEnhancedDesignButton(messageElement, analysis)

    // Auto-generate if enabled
    if (settings.autoGenerate && settings.apiKey) {
      generateDesignBrief(analysis.text, analysis)
    }
  }
}

function addEnhancedDesignButton(messageElement, analysis) {
  const buttonContainer = document.createElement("div")
  buttonContainer.className = "design-assistant-container"
  buttonContainer.style.cssText = `
    margin-top: 8px;
    padding: 8px;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 6px;
    border-left: 3px solid #667eea;
  `

  const analysisPreview = document.createElement("div")
  analysisPreview.style.cssText = `
    font-size: 11px;
    color: #666;
    margin-bottom: 6px;
    line-height: 1.3;
  `

  const category = analysis.category.length > 0 ? analysis.category[0].name : "general"
  const confidence = Math.round(analysis.confidence * 100)

  analysisPreview.innerHTML = `
    📊 ${category} design • ⚡ ${analysis.urgency.level} urgency • 💰 ${analysis.budget.level} budget • 🎯 ${confidence}% confidence
  `

  const buttonGroup = document.createElement("div")
  buttonGroup.style.cssText = `
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `

  const briefButton = document.createElement("button")
  briefButton.innerHTML = "📝 Design Brief"
  briefButton.className = "design-assistant-btn"
  briefButton.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `

  const mockupButton = document.createElement("button")
  mockupButton.innerHTML = "🎨 Visual Mockup"
  mockupButton.className = "mockup-btn"
  mockupButton.style.cssText = `
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `

  const analyzeButton = document.createElement("button")
  analyzeButton.innerHTML = "📊 Analysis"
  analyzeButton.className = "analysis-btn"
  analyzeButton.style.cssText = `
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
    border: 1px solid #667eea;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `

  briefButton.addEventListener("click", () => {
    generateDesignBrief(analysis.text, analysis)
  })

  mockupButton.addEventListener("click", () => {
    generateVisualMockup(analysis.text, category, analysis)
  })

  analyzeButton
    .addEventListener("click", () => {
      showAnalysisModal(analysis)
    })

    [
      // Add hover effects
      (briefButton, mockupButton, analyzeButton)
    ].forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.05)"
      })
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "scale(1)"
      })
    })

  buttonContainer.appendChild(analysisPreview)
  buttonGroup.appendChild(briefButton)
  buttonGroup.appendChild(mockupButton)
  buttonGroup.appendChild(analyzeButton)
  buttonContainer.appendChild(buttonGroup)
  messageElement.appendChild(buttonContainer)
}

async function generateVisualMockup(prompt, category, analysis) {
  if (!settings.apiKey) {
    alert("Please set your Google Gemini API key in the extension popup first.")
    return
  }

  if (!designGenerator) {
    designGenerator = new DesignGenerator(settings.apiKey)
  }

  // Show loading notification
  const loadingNotification = showNotification("Generating Visual Mockup", "Creating design mockup using AI...", 0)

  try {
    const mockupResult = await designGenerator.generateDesignMockup(prompt, category, {
      urgency: analysis.urgency.level,
      budget: analysis.budget.level,
      style: analysis.requirements.style.join(", ") || "professional",
      colors: analysis.requirements.colors,
    })

    // Remove loading notification
    if (loadingNotification) {
      loadingNotification.remove()
    }

    // Show mockup result
    showMockupModal(mockupResult)
  } catch (error) {
    console.error("Error generating visual mockup:", error)

    // Remove loading notification
    if (loadingNotification) {
      loadingNotification.remove()
    }

    showNotification("Mockup Generation Failed", error.message, 5000)
  }
}

function showMockupModal(mockupResult) {
  const modal = document.createElement("div")
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10003;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  const content = document.createElement("div")
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  const colorPalette = mockupResult.mockup.colorPalette
    .map(
      (color) =>
        `<span style="display: inline-block; width: 20px; height: 20px; background: ${color.hex}; border-radius: 3px; margin-right: 5px; vertical-align: middle;"></span>${color.name}`,
    )
    .join(" ")

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333;">🎨 Visual Design Mockup</h2>
      <button id="closeMockupModal" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
    </div>
    
    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #667eea;">📋 Project Overview</h3>
      <p><strong>Category:</strong> ${mockupResult.category}</p>
      <p><strong>Generated:</strong> ${new Date(mockupResult.timestamp).toLocaleString()}</p>
      <p><strong>Status:</strong> <span style="color: #16a34a;">✅ ${mockupResult.status}</span></p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #667eea;">🎨 Design Concept</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap; line-height: 1.5;">
${mockupResult.mockup.description}
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #667eea;">🎯 Technical Specifications</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0;">📐 Dimensions</h4>
          <p><strong>Primary:</strong> ${mockupResult.specifications.dimensions.primary}</p>
          <p><strong>Alternatives:</strong> ${mockupResult.specifications.dimensions.alternatives.join(", ")}</p>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0;">📁 Formats</h4>
          <p><strong>Deliverables:</strong> ${mockupResult.specifications.formats.deliverables.join(", ")}</p>
          <p><strong>Working Files:</strong> ${mockupResult.specifications.formats.workingFiles.join(", ")}</p>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #667eea;">🎨 Design Elements</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
        <p><strong>Color Palette:</strong><br>${colorPalette}</p>
        <p><strong>Primary Font:</strong> ${mockupResult.mockup.typography.heading}</p>
        <p><strong>Body Font:</strong> ${mockupResult.mockup.typography.body}</p>
        <p><strong>Layout Type:</strong> ${mockupResult.mockup.layoutStructure.type}</p>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #667eea;">⏱️ Project Timeline</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
        <p><strong>Estimated Delivery:</strong> ${mockupResult.specifications.deliveryTimeline}</p>
        <p><strong>Revision Rounds:</strong> ${mockupResult.specifications.revisionRounds}</p>
      </div>
    </div>

    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button id="generateVariations" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        flex: 1;
      ">Generate Variations</button>
      <button id="exportSpecs" style="
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        flex: 1;
      ">Export Specs</button>
    </div>
  `

  modal.appendChild(content)
  document.body.appendChild(modal)

  // Event listeners
  content.querySelector("#closeMockupModal").addEventListener("click", () => {
    modal.remove()
  })

  content.querySelector("#generateVariations").addEventListener("click", async () => {
    modal.remove()
    await generateDesignVariations(mockupResult)
  })

  content.querySelector("#exportSpecs").addEventListener("click", () => {
    exportDesignSpecs(mockupResult)
  })

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

async function generateDesignVariations(originalMockup) {
  if (!designGenerator) {
    designGenerator = new DesignGenerator(settings.apiKey)
  }

  const loadingNotification = showNotification("Generating Variations", "Creating 3 design variations...", 0)

  try {
    const variations = await designGenerator.generateMultipleVariations(
      originalMockup.brief,
      originalMockup.category,
      3,
    )

    if (loadingNotification) {
      loadingNotification.remove()
    }

    showVariationsModal(variations)
  } catch (error) {
    console.error("Error generating variations:", error)

    if (loadingNotification) {
      loadingNotification.remove()
    }

    showNotification("Variation Generation Failed", error.message, 5000)
  }
}

function showVariationsModal(variations) {
  const modal = document.createElement("div")
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10003;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  const content = document.createElement("div")
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  const variationCards = variations
    .map(
      (variation, index) => `
    <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; color: #667eea;">Variation ${index + 1}</h4>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        Style: ${variation.options.style} • Mood: ${variation.options.mood}
      </p>
      <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 13px; line-height: 1.4;">
        ${variation.mockup.description.substring(0, 200)}...
      </div>
      <button onclick="showMockupModal(${JSON.stringify(variation).replace(/"/g, "&quot;")})" 
              style="margin-top: 10px; background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
        View Details
      </button>
    </div>
  `,
    )
    .join("")

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333;">🎨 Design Variations</h2>
      <button id="closeVariationsModal" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
    </div>
    
    <p style="color: #666; margin-bottom: 20px;">Here are 3 different design approaches for your project:</p>
    
    ${variationCards}
  `

  modal.appendChild(content)
  document.body.appendChild(modal)

  content.querySelector("#closeVariationsModal").addEventListener("click", () => {
    modal.remove()
  })

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

function exportDesignSpecs(mockupResult) {
  if (!designGenerator) {
    designGenerator = new DesignGenerator(settings.apiKey)
  }

  try {
    const exportData = designGenerator.exportDesignSpecs(mockupResult.id)

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(dataBlob)
    link.download = `${exportData.projectName}_specs.json`
    link.click()

    showNotification("Export Complete", "Design specifications downloaded successfully!", 3000)
  } catch (error) {
    console.error("Export failed:", error)
    showNotification("Export Failed", error.message, 5000)
  }
}

function showNotification(title, message, timeout = 5000) {
  const notification = document.createElement("div")
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-left: 4px solid #667eea;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10002;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
    <div style="font-size: 14px; color: #666;">${message}</div>
  `

  document.body.appendChild(notification)

  if (timeout > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, timeout)
  }

  return notification
}

function createFloatingButton() {
  const floatingBtn = document.createElement("div")
  floatingBtn.innerHTML = "🎨"
  floatingBtn.id = "design-assistant-float"
  floatingBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: all 0.3s;
  `

  floatingBtn.addEventListener("click", toggleDesignPanel)
  floatingBtn.addEventListener("mouseenter", () => {
    floatingBtn.style.transform = "scale(1.1)"
  })
  floatingBtn.addEventListener("mouseleave", () => {
    floatingBtn.style.transform = "scale(1)"
  })

  document.body.appendChild(floatingBtn)
}

function toggleDesignPanel() {
  if (designPanel) {
    designPanel.remove()
    designPanel = null
  } else {
    createDesignPanel()
  }
}

function createDesignPanel() {
  designPanel = document.createElement("div")
  designPanel.id = "design-assistant-panel"
  designPanel.innerHTML = `
    <div class="panel-header">
      <h3>🎨 Design Assistant</h3>
      <button class="close-btn">×</button>
    </div>
    <div class="panel-content">
      <div class="input-section">
        <label>Design Request:</label>
        <textarea id="designPrompt" placeholder="Describe the design you need..."></textarea>
        <button id="generateBtn">Generate Design Brief</button>
      </div>
      <div class="output-section">
        <label>Generated Brief:</label>
        <div id="designOutput">Click "Generate Design Brief" to create a detailed design specification...</div>
      </div>
    </div>
  `

  designPanel.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    width: 400px;
    max-height: 80vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `

  // Add styles for panel content
  const style = document.createElement("style")
  style.textContent = `
    #design-assistant-panel .panel-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    #design-assistant-panel .panel-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    #design-assistant-panel .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #design-assistant-panel .panel-content {
      padding: 20px;
      max-height: calc(80vh - 60px);
      overflow-y: auto;
    }
    
    #design-assistant-panel .input-section,
    #design-assistant-panel .output-section {
      margin-bottom: 20px;
    }
    
    #design-assistant-panel label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    
    #design-assistant-panel textarea {
      width: 100%;
      height: 80px;
      padding: 10px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      box-sizing: border-box;
    }
    
    #design-assistant-panel button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      transition: all 0.2s;
    }
    
    #design-assistant-panel button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    #design-assistant-panel #designOutput {
      background: #f8f9fa;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      padding: 15px;
      min-height: 200px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  `
  document.head.appendChild(style)

  document.body.appendChild(designPanel)

  // Add event listeners
  designPanel.querySelector(".close-btn").addEventListener("click", toggleDesignPanel)
  designPanel.querySelector("#generateBtn").addEventListener("click", () => {
    const prompt = designPanel.querySelector("#designPrompt").value
    if (prompt.trim()) {
      generateDesignBrief(prompt)
    }
  })
}

async function generateDesignBrief(prompt, analysis = null) {
  if (!settings.apiKey) {
    alert("Please set your Google Gemini API key in the extension popup first.")
    return
  }

  const outputElement = document.getElementById("designOutput")
  if (outputElement) {
    outputElement.textContent = "Generating enhanced design brief..."
  }

  try {
    let enhancedPrompt = prompt
    if (analysis) {
      const contextInfo = `
Context Analysis:
- Design Category: ${analysis.category.length > 0 ? analysis.category[0].name : "general"}
- Urgency Level: ${analysis.urgency.level}
- Budget Range: ${analysis.budget.estimated}
- Client Sentiment: ${analysis.sentiment.sentiment}
- Detected Colors: ${analysis.requirements.colors.join(", ") || "None specified"}
- Style Preferences: ${analysis.requirements.style.join(", ") || "None specified"}
- Deliverables: ${analysis.requirements.deliverables.join(", ") || "Standard files"}

Original Request: "${prompt}"
      `
      enhancedPrompt = contextInfo
    }

    const response = await chrome.runtime.sendMessage({
      type: "GENERATE_DESIGN",
      prompt: enhancedPrompt,
      apiKey: settings.apiKey,
      analysis: analysis,
    })

    if (response.success) {
      if (outputElement) {
        outputElement.textContent = response.data
      } else {
        // Show in a notification if panel is not open
        showNotification("Enhanced Design Brief Generated", response.data.substring(0, 100) + "...")
      }
    } else {
      throw new Error(response.error)
    }
  } catch (error) {
    console.error("Error generating design brief:", error)
    if (outputElement) {
      outputElement.textContent = "Error generating design brief: " + error.message
    }
  }
}

function showAnalysisModal(analysis) {
  const modal = document.createElement("div")
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10003;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  const content = document.createElement("div")
  content.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  const report = messageProcessor.generateAnalysisReport(analysis)

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333;">Message Analysis</h2>
      <button id="closeModal" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
    </div>
    <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.5; color: #555;">${report}</pre>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <button id="generateFromAnalysis" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        width: 100%;
      ">Generate Design Brief from Analysis</button>
    </div>
  `

  modal.appendChild(content)
  document.body.appendChild(modal)

  // Event listeners
  content.querySelector("#closeModal").addEventListener("click", () => {
    modal.remove()
  })

  content.querySelector("#generateFromAnalysis").addEventListener("click", () => {
    modal.remove()
    generateDesignBrief(analysis.text, analysis)
  })

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

function updateMessageCount() {
  chrome.storage.sync.set({ messageCount: messageCount })
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SETTINGS_UPDATED") {
    settings = request.settings
    if (settings.apiKey) {
      designGenerator = new DesignGenerator(settings.apiKey)
    }
  } else if (request.type === "OPEN_PANEL") {
    if (!designPanel) {
      createDesignPanel()
    }
  } else if (request.type === "GET_MESSAGES") {
    // Return current messages list
    console.log("[HACKATHON] Popup requested messages, returning:", messagesList.length, "messages")
    
    // If no messages found, add some test messages for development
    if (messagesList.length === 0) {
      messagesList = [
        { sender: "Alice", content: "I need a logo design for my bakery" },
        { sender: "Bob", content: "Can you make it colorful and fun?" },
        { sender: "Charlie", content: "Maybe add some cute pastry illustrations" }
      ]
      console.log("[HACKATHON] Added test messages for development")
    }
    
    sendResponse({ messages: messagesList })
    return true // Keep message channel open for async response
  } else if (request.type === "PASTE_IMAGE_TO_CHAT") {
    console.log("[HACKATHON] Received request to paste image to chat")
    
    try {
      // Find the file input
      const fileInput = document.querySelector('.file-input')
      if (!fileInput) {
        sendResponse({ success: false, error: "File input not found" })
        return
      }
      
      // Convert base64 to blob
      const byteCharacters = atob(request.base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: request.mimeType })
      
      // Create a file from the blob
      const file = new File([blob], request.fileName, { 
        type: request.mimeType 
      })
      
      // Create a new FileList with our file
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInput.files = dataTransfer.files
      
      // Trigger the change event
      const changeEvent = new Event('change', { bubbles: true })
      fileInput.dispatchEvent(changeEvent)
      
      console.log("[HACKATHON] Image pasted to Discord successfully")
      sendResponse({ success: true })
      
    } catch (error) {
      console.error("[HACKATHON] Error pasting image:", error)
      sendResponse({ success: false, error: error.message })
    }
    return true
  }
})

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
