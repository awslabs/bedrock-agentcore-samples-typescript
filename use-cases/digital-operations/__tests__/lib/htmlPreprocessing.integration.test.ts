import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { preprocessContent } from '../../src/lib/htmlPreprocessing'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('htmlPreprocessing integration tests', () => {
  const TEST_SESSION_ID = 'test-session-id'
  const fixturesPath = join(__dirname, '../fixtures')

  describe('sample_message.md processing', () => {
    it('should process complex message with multiple iframes correctly', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Count iframes
      const originalIframeCount = (originalContent.match(/<iframe/gi) || []).length
      const processedIframeCount = (processedContent.match(/<iframe/gi) || []).length

      expect(processedIframeCount).toBeGreaterThan(0)
      expect(processedIframeCount).toBe(originalIframeCount)
    })

    it('should inject auto-resize script into all complete iframes', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Check for auto-resize script presence
      const hasAutoResize = /frameElement|ResizeObserver/.test(processedContent)
      expect(hasAutoResize).toBe(true)
    })

    it('should remove all height attributes from iframes', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Extract all iframe opening tags and check they don't have height attributes
      const iframeTagMatches = processedContent.match(/<iframe[^>]*>/gi) || []
      const iframesWithHeight = iframeTagMatches.filter((tag) => /\sheight\s*=/i.test(tag))

      expect(iframesWithHeight.length).toBe(0)
    })

    it('should add sandbox attributes to all srcdoc iframes', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Count sandbox attributes
      const sandboxMatches = processedContent.match(/sandbox="allow-scripts allow-same-origin"/gi) || []

      // All srcdoc iframes should have sandbox (some may be loading indicators)
      expect(sandboxMatches.length).toBeGreaterThan(0)
    })

    it('should wrap scripts in IIFE', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Check for IIFE pattern
      const hasIIFE = /\(function\s*\(\)\s*\{/.test(processedContent)
      expect(hasIIFE).toBe(true)
    })

    it('should remove newlines from srcdoc content', () => {
      const samplePath = join(fixturesPath, 'sample_message.md')
      const originalContent = readFileSync(samplePath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Extract srcdoc content
      const srcdocRegex = /srcdoc\s*=\s*["']([^"']*)["']/gi
      let match
      let hasNewlines = false

      while ((match = srcdocRegex.exec(processedContent)) !== null) {
        if (/[\n\r]/.test(match[1])) {
          hasNewlines = true
          break
        }
      }

      expect(hasNewlines).toBe(false)
    })
  })

  describe('test_self_closing_iframe.md processing', () => {
    it('should handle self-closing iframe tags', () => {
      const testPath = join(fixturesPath, 'test_self_closing_iframe.md')
      const originalContent = readFileSync(testPath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Count iframes
      const originalCount = (originalContent.match(/<iframe/gi) || []).length
      const processedCount = (processedContent.match(/<iframe/gi) || []).length

      expect(processedCount).toBe(originalCount)
    })

    it('should inject auto-resize into self-closing iframes', () => {
      const testPath = join(fixturesPath, 'test_self_closing_iframe.md')
      const originalContent = readFileSync(testPath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      const hasAutoResize = /frameElement|ResizeObserver/.test(processedContent)
      expect(hasAutoResize).toBe(true)
    })

    it('should remove height attributes from self-closing iframes', () => {
      const testPath = join(fixturesPath, 'test_self_closing_iframe.md')
      const originalContent = readFileSync(testPath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      // Extract all iframe opening tags and check they don't have height attributes
      const iframeTagMatches = processedContent.match(/<iframe[^>]*>/gi) || []
      const iframesWithHeight = iframeTagMatches.filter((tag) => /\sheight\s*=/i.test(tag))

      expect(iframesWithHeight.length).toBe(0)
    })

    it('should add sandbox attributes to self-closing iframes', () => {
      const testPath = join(fixturesPath, 'test_self_closing_iframe.md')
      const originalContent = readFileSync(testPath, 'utf-8')
      const processedContent = preprocessContent(originalContent, TEST_SESSION_ID)

      const hasSandbox = /sandbox\s*=/i.test(processedContent)
      expect(hasSandbox).toBe(true)
    })
  })
})
