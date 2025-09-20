// Advanced design mock generator using Google's Nano Banana (Gemini 2.5 Flash Image)
class DesignGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.generationHistory = []
    this.templates = {
      logo: {
        prompts: [
          "Create a modern, minimalist logo design",
          "Design a professional business logo with clean typography",
          "Generate a creative brand mark with geometric elements",
        ],
        dimensions: ["500x500", "1000x1000", "2000x2000"],
        formats: ["PNG", "SVG", "AI", "EPS"],
      },
      socialMedia: {
        prompts: [
          "Design an engaging social media post with modern typography",
          "Create a professional Instagram story template",
          "Generate a Facebook cover design with brand elements",
        ],
        dimensions: ["1080x1080", "1080x1920", "1200x630"],
        formats: ["PNG", "JPG", "PSD"],
      },
      businessCard: {
        prompts: [
          "Design a professional business card with clean layout",
          "Create an elegant business card with modern typography",
          "Generate a creative business card with unique elements",
        ],
        dimensions: ["3.5x2", "89x51mm", "1050x600"],
        formats: ["PDF", "AI", "PSD", "PNG"],
      },
      flyer: {
        prompts: [
          "Create a professional flyer design with clear hierarchy",
          "Design an event flyer with engaging visuals",
          "Generate a promotional flyer with modern layout",
        ],
        dimensions: ["8.5x11", "A4", "1275x1650"],
        formats: ["PDF", "AI", "PSD", "PNG"],
      },
    }
    this.chrome = window.chrome // Declare the chrome variable
  }

  async generateDesignMockup(designBrief, category = "general", options = {}) {
    try {
      const mockupData = await this.createVisualMockup(designBrief, category, options)
      const designSpecs = await this.generateTechnicalSpecs(designBrief, category)

      const result = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        category: category,
        brief: designBrief,
        mockup: mockupData,
        specifications: designSpecs,
        options: options,
        status: "completed",
      }

      this.generationHistory.push(result)
      return result
    } catch (error) {
      console.error("Design generation failed:", error)
      throw new Error(`Design generation failed: ${error.message}`)
    }
  }

  async createVisualMockup(designBrief, category, options) {
    const template = this.templates[category] || this.templates.logo
    const basePrompt = template.prompts[0]

    const enhancedPrompt = this.buildEnhancedPrompt(designBrief, basePrompt, options)

    // In a real implementation, this would call Nano Banana for actual image generation
    // For now, we'll create a detailed mockup description
    const mockupDescription = await this.generateMockupDescription(enhancedPrompt)

    return {
      type: "visual_mockup",
      description: mockupDescription,
      prompt: enhancedPrompt,
      category: category,
      suggestedDimensions: template.dimensions,
      recommendedFormats: template.formats,
      colorPalette: this.extractColorPalette(designBrief),
      typography: this.suggestTypography(designBrief, category),
      layoutStructure: this.generateLayoutStructure(category),
    }
  }

  buildEnhancedPrompt(designBrief, basePrompt, options) {
    let prompt = `${basePrompt} based on this design brief: "${designBrief}"`

    if (options.style) {
      prompt += `\nStyle: ${options.style}`
    }

    if (options.colors) {
      prompt += `\nColor palette: ${options.colors.join(", ")}`
    }

    if (options.mood) {
      prompt += `\nMood: ${options.mood}`
    }

    prompt += `\nRequirements:
    - Professional, high-quality design
    - Clean, modern aesthetic
    - Appropriate for business use
    - Scalable and versatile
    - Print and digital ready`

    return prompt
  }

  async generateMockupDescription(prompt) {
    try {
      const response = await this.chrome.runtime.sendMessage({
        type: "GENERATE_VISUAL_MOCKUP",
        designBrief: prompt,
        apiKey: this.apiKey,
      })

      if (response.success) {
        return response.data.description || response.data
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error("Mockup generation failed:", error)
      return this.generateFallbackDescription(prompt)
    }
  }

  generateFallbackDescription(prompt) {
    return `Design Mockup Concept:

Based on the provided brief, here's a detailed visual concept:

LAYOUT & COMPOSITION:
- Clean, balanced composition with strategic white space
- Clear visual hierarchy with primary and secondary elements
- Grid-based layout ensuring professional alignment

VISUAL ELEMENTS:
- Modern typography with excellent readability
- Cohesive color scheme supporting brand identity
- Strategic use of imagery or iconography
- Consistent spacing and proportions

TECHNICAL CONSIDERATIONS:
- High resolution suitable for both print and digital
- Scalable design elements for various applications
- Professional color profile (CMYK for print, RGB for digital)
- Multiple format deliverables as specified

This concept provides a solid foundation for the final design execution.`
  }

  async generateTechnicalSpecs(designBrief, category) {
    const template = this.templates[category] || this.templates.logo

    return {
      dimensions: {
        primary: template.dimensions[0],
        alternatives: template.dimensions.slice(1),
        custom: this.suggestCustomDimensions(designBrief),
      },
      formats: {
        deliverables: template.formats,
        workingFiles: ["PSD", "AI"],
        finalFiles: ["PNG", "PDF", "SVG"],
      },
      colorSpecs: {
        profile: category === "print" ? "CMYK" : "RGB",
        resolution: category === "print" ? "300 DPI" : "72 DPI",
        colorSpace: "sRGB",
      },
      typography: this.suggestTypography(designBrief, category),
      deliveryTimeline: this.estimateTimeline(category),
      revisionRounds: this.suggestRevisions(category),
    }
  }

  extractColorPalette(designBrief) {
    const colorKeywords = {
      blue: "#2563eb",
      red: "#dc2626",
      green: "#16a34a",
      purple: "#9333ea",
      orange: "#ea580c",
      yellow: "#ca8a04",
      pink: "#db2777",
      gray: "#6b7280",
      black: "#000000",
      white: "#ffffff",
    }

    const detectedColors = []
    const lowerBrief = designBrief.toLowerCase()

    Object.entries(colorKeywords).forEach(([color, hex]) => {
      if (lowerBrief.includes(color)) {
        detectedColors.push({ name: color, hex: hex })
      }
    })

    // Add complementary colors if none detected
    if (detectedColors.length === 0) {
      detectedColors.push(
        { name: "primary", hex: "#2563eb" },
        { name: "secondary", hex: "#64748b" },
        { name: "accent", hex: "#f59e0b" },
      )
    }

    return detectedColors
  }

  suggestTypography(designBrief, category) {
    const fontSuggestions = {
      logo: {
        primary: ["Montserrat", "Poppins", "Inter"],
        secondary: ["Open Sans", "Lato", "Source Sans Pro"],
      },
      socialMedia: {
        primary: ["Roboto", "Nunito", "Raleway"],
        secondary: ["Open Sans", "Lato", "PT Sans"],
      },
      businessCard: {
        primary: ["Helvetica", "Futura", "Avenir"],
        secondary: ["Times New Roman", "Georgia", "Minion Pro"],
      },
      flyer: {
        primary: ["Oswald", "Bebas Neue", "Montserrat"],
        secondary: ["Open Sans", "Lato", "Roboto"],
      },
    }

    const categoryFonts = fontSuggestions[category] || fontSuggestions.logo

    return {
      heading: categoryFonts.primary[0],
      body: categoryFonts.secondary[0],
      alternatives: {
        heading: categoryFonts.primary.slice(1),
        body: categoryFonts.secondary.slice(1),
      },
      sizes: this.generateFontSizes(category),
      weights: ["400", "500", "600", "700"],
    }
  }

  generateFontSizes(category) {
    const sizeMaps = {
      logo: { primary: "48px", secondary: "24px", body: "16px" },
      socialMedia: { primary: "36px", secondary: "20px", body: "14px" },
      businessCard: { primary: "18px", secondary: "12px", body: "10px" },
      flyer: { primary: "42px", secondary: "24px", body: "16px" },
    }

    return sizeMaps[category] || sizeMaps.logo
  }

  generateLayoutStructure(category) {
    const layouts = {
      logo: {
        type: "centered",
        elements: ["logo mark", "company name", "tagline"],
        hierarchy: "logo > name > tagline",
      },
      socialMedia: {
        type: "grid",
        elements: ["header", "main content", "call to action"],
        hierarchy: "visual > headline > description > CTA",
      },
      businessCard: {
        type: "split",
        elements: ["name", "title", "contact info", "logo"],
        hierarchy: "name > title > contact > logo",
      },
      flyer: {
        type: "hierarchical",
        elements: ["headline", "subheading", "body", "CTA", "footer"],
        hierarchy: "headline > visual > body > CTA > details",
      },
    }

    return layouts[category] || layouts.logo
  }

  suggestCustomDimensions(designBrief) {
    const brief = designBrief.toLowerCase()
    const customDimensions = []

    // Look for dimension mentions
    const dimensionPatterns = [/(\d+)\s*x\s*(\d+)/g, /(\d+)\s*(width|height|w|h)/g]

    dimensionPatterns.forEach((pattern) => {
      const matches = brief.match(pattern)
      if (matches) {
        customDimensions.push(...matches)
      }
    })

    return customDimensions.length > 0 ? customDimensions : ["Custom dimensions as specified"]
  }

  estimateTimeline(category) {
    const timelines = {
      logo: "2-3 business days",
      socialMedia: "1-2 business days",
      businessCard: "1-2 business days",
      flyer: "2-4 business days",
      general: "2-3 business days",
    }

    return timelines[category] || timelines.general
  }

  suggestRevisions(category) {
    const revisionCounts = {
      logo: 3,
      socialMedia: 2,
      businessCard: 2,
      flyer: 3,
      general: 2,
    }

    return revisionCounts[category] || revisionCounts.general
  }

  generateId() {
    return "design_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  async generateMultipleVariations(designBrief, category, count = 3) {
    const variations = []

    for (let i = 0; i < count; i++) {
      const options = {
        style: this.getRandomStyle(),
        mood: this.getRandomMood(),
        variation: i + 1,
      }

      try {
        const variation = await this.generateDesignMockup(designBrief, category, options)
        variations.push(variation)
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error)
      }
    }

    return variations
  }

  getRandomStyle() {
    const styles = ["modern", "minimalist", "bold", "elegant", "creative", "professional"]
    return styles[Math.floor(Math.random() * styles.length)]
  }

  getRandomMood() {
    const moods = ["professional", "friendly", "energetic", "sophisticated", "playful", "trustworthy"]
    return moods[Math.floor(Math.random() * moods.length)]
  }

  getGenerationHistory() {
    return this.generationHistory
  }

  clearHistory() {
    this.generationHistory = []
  }

  exportDesignSpecs(designId) {
    const design = this.generationHistory.find((d) => d.id === designId)
    if (!design) {
      throw new Error("Design not found")
    }

    return {
      projectName: `Design_${designId}`,
      brief: design.brief,
      specifications: design.specifications,
      mockup: design.mockup,
      exportDate: new Date().toISOString(),
      format: "JSON",
    }
  }
}

// Export for use in content script
window.DesignGenerator = DesignGenerator
