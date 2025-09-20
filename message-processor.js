// Advanced message processing system for design request analysis
class MessageProcessor {
  constructor() {
    this.designCategories = {
      logo: {
        keywords: ["logo", "brand mark", "company logo", "business logo", "logomark", "logotype"],
        urgencyWords: ["asap", "urgent", "rush", "quick", "fast"],
        complexity: "medium",
      },
      socialMedia: {
        keywords: ["instagram", "facebook", "twitter", "linkedin", "social media", "post", "story", "cover"],
        urgencyWords: ["today", "tonight", "this evening"],
        complexity: "low",
      },
      printDesign: {
        keywords: ["flyer", "brochure", "poster", "business card", "letterhead", "print", "branding"],
        urgencyWords: ["print deadline", "printing", "tomorrow"],
        complexity: "high",
      },
      webDesign: {
        keywords: ["website", "web design", "landing page", "banner", "header", "ui", "ux"],
        urgencyWords: ["launch", "go live", "deadline"],
        complexity: "high",
      },
      packaging: {
        keywords: ["packaging", "label", "product design", "box design", "bottle"],
        urgencyWords: ["production", "manufacturing"],
        complexity: "high",
      },
    }

    this.budgetIndicators = {
      low: ["cheap", "budget", "affordable", "low cost", "$5", "$10", "$15", "$20"],
      medium: ["reasonable", "fair price", "$25", "$30", "$40", "$50"],
      high: ["premium", "high quality", "professional", "$75", "$100", "$150", "$200+"],
    }

    this.urgencyLevels = {
      low: ["whenever", "no rush", "take your time", "flexible"],
      medium: ["soon", "this week", "few days"],
      high: ["asap", "urgent", "rush", "today", "tomorrow", "deadline"],
    }
  }

  analyzeMessage(messageText, messageElement) {
    const analysis = {
      text: messageText,
      category: this.detectDesignCategory(messageText),
      urgency: this.detectUrgency(messageText),
      budget: this.detectBudget(messageText),
      sentiment: this.analyzeSentiment(messageText),
      requirements: this.extractRequirements(messageText),
      isDesignRequest: false,
      confidence: 0,
      timestamp: new Date().toISOString(),
      messageElement: messageElement,
    }

    // Calculate confidence score
    analysis.confidence = this.calculateConfidence(analysis)
    analysis.isDesignRequest = analysis.confidence > 0.3

    return analysis
  }

  detectDesignCategory(text) {
    const lowerText = text.toLowerCase()
    const categories = []

    for (const [category, data] of Object.entries(this.designCategories)) {
      const matches = data.keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase())).length

      if (matches > 0) {
        categories.push({
          name: category,
          matches: matches,
          complexity: data.complexity,
          keywords: data.keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase())),
        })
      }
    }

    return categories.sort((a, b) => b.matches - a.matches)
  }

  detectUrgency(text) {
    const lowerText = text.toLowerCase()

    for (const [level, indicators] of Object.entries(this.urgencyLevels)) {
      const matches = indicators.filter((indicator) => lowerText.includes(indicator.toLowerCase()))

      if (matches.length > 0) {
        return {
          level: level,
          indicators: matches,
          score: level === "high" ? 0.9 : level === "medium" ? 0.6 : 0.3,
        }
      }
    }

    // Check for specific time mentions
    const timePatterns = [/in (\d+) (hour|day|week)s?/i, /by (tomorrow|today|tonight)/i, /deadline.*(\d+)/i]

    for (const pattern of timePatterns) {
      if (pattern.test(text)) {
        return {
          level: "high",
          indicators: [pattern.exec(text)[0]],
          score: 0.8,
        }
      }
    }

    return {
      level: "medium",
      indicators: [],
      score: 0.5,
    }
  }

  detectBudget(text) {
    const lowerText = text.toLowerCase()

    for (const [level, indicators] of Object.entries(this.budgetIndicators)) {
      const matches = indicators.filter((indicator) => lowerText.includes(indicator.toLowerCase()))

      if (matches.length > 0) {
        return {
          level: level,
          indicators: matches,
          estimated: this.estimateBudgetRange(level),
        }
      }
    }

    // Look for dollar amounts
    const dollarMatch = text.match(/\$(\d+)/)
    if (dollarMatch) {
      const amount = Number.parseInt(dollarMatch[1])
      let level = "medium"
      if (amount < 25) level = "low"
      else if (amount > 75) level = "high"

      return {
        level: level,
        indicators: [dollarMatch[0]],
        estimated: `$${amount}`,
      }
    }

    return {
      level: "unknown",
      indicators: [],
      estimated: "Not specified",
    }
  }

  estimateBudgetRange(level) {
    const ranges = {
      low: "$5-$25",
      medium: "$25-$75",
      high: "$75-$200+",
    }
    return ranges[level] || "Unknown"
  }

  analyzeSentiment(text) {
    const positiveWords = ["great", "awesome", "love", "perfect", "excellent", "amazing", "fantastic"]
    const negativeWords = ["bad", "terrible", "hate", "awful", "horrible", "disappointed"]
    const urgentWords = ["need", "must", "have to", "required", "important"]

    const lowerText = text.toLowerCase()

    const positiveCount = positiveWords.filter((word) => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length
    const urgentCount = urgentWords.filter((word) => lowerText.includes(word)).length

    let sentiment = "neutral"
    if (positiveCount > negativeCount) sentiment = "positive"
    else if (negativeCount > positiveCount) sentiment = "negative"

    return {
      sentiment: sentiment,
      urgency: urgentCount > 2 ? "high" : urgentCount > 0 ? "medium" : "low",
      positiveWords: positiveWords.filter((word) => lowerText.includes(word)),
      negativeWords: negativeWords.filter((word) => lowerText.includes(word)),
      urgentWords: urgentWords.filter((word) => lowerText.includes(word)),
    }
  }

  extractRequirements(text) {
    const requirements = {
      colors: this.extractColors(text),
      dimensions: this.extractDimensions(text),
      style: this.extractStyle(text),
      deliverables: this.extractDeliverables(text),
      revisions: this.extractRevisions(text),
    }

    return requirements
  }

  extractColors(text) {
    const colorPatterns = [
      /\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)\b/gi,
      /#[0-9a-f]{6}/gi,
      /rgb$$\s*\d+\s*,\s*\d+\s*,\s*\d+\s*$$/gi,
    ]

    const colors = []
    colorPatterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) colors.push(...matches)
    })

    return [...new Set(colors)] // Remove duplicates
  }

  extractDimensions(text) {
    const dimensionPatterns = [
      /(\d+)\s*x\s*(\d+)\s*(px|pixels|inches?|in|cm|mm)/gi,
      /(\d+)\s*(width|height|w|h)\s*(\d+)/gi,
      /(square|rectangular|portrait|landscape)/gi,
    ]

    const dimensions = []
    dimensionPatterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) dimensions.push(...matches)
    })

    return dimensions
  }

  extractStyle(text) {
    const styleKeywords = [
      "modern",
      "vintage",
      "minimalist",
      "bold",
      "elegant",
      "playful",
      "professional",
      "creative",
      "clean",
      "artistic",
      "corporate",
      "fun",
      "serious",
      "luxury",
      "casual",
      "formal",
    ]

    const lowerText = text.toLowerCase()
    return styleKeywords.filter((style) => lowerText.includes(style))
  }

  extractDeliverables(text) {
    const deliverableKeywords = [
      "psd",
      "ai",
      "eps",
      "pdf",
      "png",
      "jpg",
      "jpeg",
      "svg",
      "source files",
      "editable",
      "vector",
      "high resolution",
      "print ready",
      "web ready",
    ]

    const lowerText = text.toLowerCase()
    return deliverableKeywords.filter((deliverable) => lowerText.includes(deliverable))
  }

  extractRevisions(text) {
    const revisionPatterns = [
      /(\d+)\s*(revision|revisions|changes|edits)/gi,
      /(unlimited|infinite)\s*(revision|revisions|changes)/gi,
    ]

    const revisions = []
    revisionPatterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) revisions.push(...matches)
    })

    return revisions
  }

  calculateConfidence(analysis) {
    let confidence = 0

    // Category detection confidence
    if (analysis.category.length > 0) {
      confidence += 0.4 * (analysis.category[0].matches / 3) // Max 0.4 for category
    }

    // Requirements confidence
    const reqCount = Object.values(analysis.requirements).flat().length
    confidence += Math.min(0.3, reqCount * 0.05) // Max 0.3 for requirements

    // Urgency confidence
    confidence += analysis.urgency.score * 0.2 // Max 0.2 for urgency

    // Budget confidence
    if (analysis.budget.level !== "unknown") {
      confidence += 0.1
    }

    return Math.min(1, confidence)
  }

  generateAnalysisReport(analysis) {
    let report = `📊 Message Analysis Report\n\n`

    report += `🎯 Design Category: ${analysis.category.length > 0 ? analysis.category[0].name : "General"}\n`
    report += `⚡ Urgency: ${analysis.urgency.level} (${Math.round(analysis.urgency.score * 100)}%)\n`
    report += `💰 Budget: ${analysis.budget.level} (${analysis.budget.estimated})\n`
    report += `😊 Sentiment: ${analysis.sentiment.sentiment}\n`
    report += `🎯 Confidence: ${Math.round(analysis.confidence * 100)}%\n\n`

    if (analysis.requirements.colors.length > 0) {
      report += `🎨 Colors: ${analysis.requirements.colors.join(", ")}\n`
    }

    if (analysis.requirements.style.length > 0) {
      report += `✨ Style: ${analysis.requirements.style.join(", ")}\n`
    }

    if (analysis.requirements.dimensions.length > 0) {
      report += `📐 Dimensions: ${analysis.requirements.dimensions.join(", ")}\n`
    }

    if (analysis.requirements.deliverables.length > 0) {
      report += `📁 Deliverables: ${analysis.requirements.deliverables.join(", ")}\n`
    }

    return report
  }
}

// Export for use in content script
window.MessageProcessor = MessageProcessor
