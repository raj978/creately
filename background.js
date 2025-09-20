// Background script for handling API calls and storage

chrome.runtime.onInstalled.addListener(() => {
  console.log("Discord Design Assistant installed")
})

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GENERATE_DESIGN") {
    generateDesignMock(request.prompt, request.apiKey, request.analysis)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep message channel open for async response
  } else if (request.type === "GENERATE_VISUAL_MOCKUP") {
    generateVisualMockup(request.designBrief, request.apiKey)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  } else if (request.type === "ANALYZE_IMAGE") {
    analyzeReferenceImage(request.imageData, request.apiKey)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

async function generateDesignMock(prompt, apiKey, analysis = null) {
  let enhancedPrompt = `Create a comprehensive graphic design brief based on this client request: "${prompt}".`

  if (analysis) {
    enhancedPrompt += `\n\nClient Analysis Context:
    - Design Category: ${analysis.category.length > 0 ? analysis.category[0].name : "general"}
    - Urgency Level: ${analysis.urgency.level}
    - Budget Range: ${analysis.budget.estimated}
    - Client Sentiment: ${analysis.sentiment.sentiment}
    - Detected Requirements: ${JSON.stringify(analysis.requirements, null, 2)}
    - Confidence Score: ${Math.round(analysis.confidence * 100)}%`
  }

  enhancedPrompt += `\n\nPlease provide a detailed design brief including:

  🎯 DESIGN CONCEPT & STRATEGY
  - Core design concept and creative direction
  - Target audience and brand positioning
  - Key messaging and communication goals

  🎨 VISUAL IDENTITY
  - Color palette (3-5 colors with hex codes and psychology)
  - Typography recommendations (primary and secondary fonts)
  - Visual style and aesthetic direction
  - Mood and tone guidelines

  📐 TECHNICAL SPECIFICATIONS
  - Recommended dimensions and formats
  - File deliverables (PSD, AI, PNG, etc.)
  - Print vs digital considerations
  - Resolution and quality requirements

  🔧 LAYOUT & COMPOSITION
  - Grid system and layout structure
  - Hierarchy and information architecture
  - Key visual elements and their placement
  - White space and balance considerations

  💡 CREATIVE ELEMENTS
  - Imagery style and photography direction
  - Iconography and graphic elements
  - Patterns, textures, or decorative elements
  - Interactive or motion considerations (if applicable)

  📋 PROJECT DELIVERABLES
  - Primary deliverable specifications
  - Additional format variations needed
  - Revision rounds and approval process
  - Timeline and milestone recommendations

  🚀 IMPLEMENTATION NOTES
  - Technical constraints or considerations
  - Brand guidelines compliance
  - Scalability and future applications
  - Success metrics and evaluation criteria

  Format this as a professional design brief that can be used immediately for design execution.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: enhancedPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function generateVisualMockup(designBrief, apiKey) {
  // Extract key visual elements from the design brief for image generation
  const imagePrompt = `Create a professional graphic design mockup based on this brief: "${designBrief.substring(0, 500)}..."
  
  Generate a high-quality, professional design that incorporates:
  - Clean, modern aesthetic
  - Appropriate color scheme
  - Professional typography
  - Balanced composition
  - Industry-standard design principles
  
  Style: Professional, clean, modern, suitable for business use
  Quality: High resolution, print-ready quality
  Format: Suitable for presentation to clients`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate a visual design mockup: ${imagePrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Visual mockup generation failed: ${response.status}`)
  }

  const data = await response.json()

  // Note: Nano Banana would return image data, but for now we return descriptive text
  // In a real implementation, you'd handle the image response differently
  return {
    type: "mockup_description",
    description: data.candidates[0].content.parts[0].text,
    timestamp: new Date().toISOString(),
  }
}

async function analyzeReferenceImage(imageData, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analyze this reference image for design elements. Provide detailed analysis of colors, typography, layout, style, and design principles used. Suggest how to recreate or adapt these elements for a new design.",
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Image analysis failed: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function batchProcessDesigns(requests, apiKey) {
  const results = []

  for (const request of requests) {
    try {
      const result = await generateDesignMock(request.prompt, apiKey, request.analysis)
      results.push({
        id: request.id,
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      results.push({
        id: request.id,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }

    // Add delay to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return results
}

async function makeAPIRequest(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)

      if (response.status === 429) {
        // Rate limited, wait and retry
        const waitTime = Math.pow(2, i) * 1000 // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error

      // Wait before retry
      const waitTime = Math.pow(2, i) * 1000
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}

async function validateAPIKey(apiKey) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    return response.ok
  } catch (error) {
    return false
  }
}

async function getAvailableModels(apiKey) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error("Error fetching models:", error)
    return []
  }
}
