import { describe, it, expect } from 'vitest'
import { preprocessContent } from '../../src/lib/htmlPreprocessing'

describe('htmlPreprocessing', () => {
  const TEST_SESSION_ID = 'test-session-123'

  describe('iframe srcdoc processing', () => {
    it('should process srcdoc iframes with auto-resize script', () => {
      const input = '<iframe srcdoc="<html><body><h1>Test</h1></body></html>"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('srcdoc=')
      expect(result).toContain('sandbox="allow-scripts allow-same-origin"')
      expect(result).toMatch(/frameElement|ResizeObserver/)
    })

    it('should remove newlines from srcdoc content', () => {
      const input = `<iframe srcdoc="<html>
<body>
<h1>Test</h1>
</body>
</html>"></iframe>`
      const result = preprocessContent(input, TEST_SESSION_ID)
      const srcdocMatch = result.match(/srcdoc="([^"]*)"/)

      expect(srcdocMatch).toBeTruthy()
      if (srcdocMatch) {
        expect(srcdocMatch[1]).not.toMatch(/[\n\r]/)
      }
    })

    it('should wrap inline scripts in IIFE', () => {
      const input = '<iframe srcdoc="<html><body><script>console.log(\'test\');</script></body></html>"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toMatch(/\(function\s*\(\)\s*\{/)
    })

    it('should remove height attributes from iframes', () => {
      const input = '<iframe width="100%" height="400px" srcdoc="<html><body>Test</body></html>"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      // Check that the iframe tag itself doesn't have a height attribute
      // (the auto-resize script contains "height" in its code, so we need to be specific)
      const iframeTagMatch = result.match(/<iframe[^>]*>/i)
      expect(iframeTagMatch).toBeTruthy()
      if (iframeTagMatch) {
        expect(iframeTagMatch[0]).not.toMatch(/\sheight\s*=/i)
      }
      expect(result).toContain('width="100%"')
    })

    it('should add sandbox attribute if not present', () => {
      const input = '<iframe srcdoc="<html><body>Test</body></html>"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('sandbox="allow-scripts allow-same-origin"')
    })

    it('should handle self-closing iframe tags', () => {
      const input = '<iframe width="100%" srcdoc="<html><body>Test</body></html>" />'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('srcdoc=')
      expect(result).toContain('sandbox="allow-scripts allow-same-origin"')
    })
  })

  describe('incomplete iframe handling', () => {
    it('should replace incomplete iframes with loading indicator', () => {
      const input = '<iframe srcdoc="<html><body>Incomplete'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('Loading...')
      expect(result).toMatch(/@keyframes spin/)
    })
  })

  describe('map iframe chat session ID injection', () => {
    it('should inject chatSessionId into map iframe without query params', () => {
      const input = '<iframe src="/map"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain(`src="/map?chatSessionId=${TEST_SESSION_ID}"`)
    })

    it('should append chatSessionId to existing query params', () => {
      const input = '<iframe src="/map?zoom=10"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain(`src="/map?zoom=10&chatSessionId=${TEST_SESSION_ID}"`)
    })

    it('should not modify map iframe if chatSessionId already present', () => {
      const input = '<iframe src="/map?chatSessionId=existing-id"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('chatSessionId=existing-id')
      expect(result).not.toContain(TEST_SESSION_ID)
    })

    it('should handle map iframe with single quotes', () => {
      const input = "<iframe src='/map'></iframe>"
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain(`chatSessionId=${TEST_SESSION_ID}`)
    })

    it('should not modify non-map iframes', () => {
      const input = '<iframe src="/other-page"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toBe(input)
    })

    it('should not modify external iframes', () => {
      const input = '<iframe src="https://example.com"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toBe(input)
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple iframe types in same content', () => {
      const input = `
        <iframe srcdoc="<html><body><h1>Chart</h1></body></html>"></iframe>
        <iframe src="/map" width="100%"></iframe>
        <iframe src="/map?zoom=5&lat=40"></iframe>
        <iframe src="https://example.com"></iframe>
      `
      const result = preprocessContent(input, TEST_SESSION_ID)

      // srcdoc iframe should be processed
      expect(result).toContain('sandbox="allow-scripts allow-same-origin"')

      // First map iframe should have chatSessionId
      expect(result).toContain(`src="/map?chatSessionId=${TEST_SESSION_ID}"`)

      // Second map iframe should have chatSessionId appended
      expect(result).toContain(`src="/map?zoom=5&lat=40&chatSessionId=${TEST_SESSION_ID}"`)

      // External iframe should not be modified
      expect(result).toContain('src="https://example.com"')
    })

    it('should handle iframes with attributes before and after src', () => {
      const input = '<iframe width="100%" src="/map" height="400"></iframe>'
      const result = preprocessContent(input, TEST_SESSION_ID)

      expect(result).toContain('width="100%"')
      expect(result).toContain(`chatSessionId=${TEST_SESSION_ID}`)
    })
  })
})
