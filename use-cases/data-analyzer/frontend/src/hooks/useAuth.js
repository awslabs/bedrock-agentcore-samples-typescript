import { useState, useEffect, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'

// These will be injected at build time or read from runtime config
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID
const AWS_REGION = import.meta.env.VITE_AWS_REGION
const CALLBACK_URL = `${window.location.origin}/callback`
const LOGOUT_URL = window.location.origin

export default function useAuth() {
  const [token, setToken] = useState(null) // ID token for API Gateway
  const [accessToken, setAccessToken] = useState(null) // Access token for AgentCore
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const codeExchangeAttempted = useRef(false) // Prevent double exchange in StrictMode

  // Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token)
      // Add 30 second buffer to account for clock skew
      return decoded.exp * 1000 < Date.now() + 30000
    } catch (err) {
      console.error('Failed to decode token:', err)
      return true
    }
  }

  // Get user ID from ID token
  const getUserId = () => {
    try {
      const storedToken = localStorage.getItem('id_token')
      if (!storedToken) return null

      const decoded = jwtDecode(storedToken)
      return decoded.sub // Cognito user ID
    } catch (err) {
      console.error('Failed to decode token for user ID:', err)
      return null
    }
  }

  // Refresh tokens using Cognito OAuth2
  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refresh_token')
      if (!storedRefreshToken) {
        throw new Error('No refresh token available')
      }

      const tokenUrl = `https://${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com/oauth2/token`

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: storedRefreshToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()

      // Update stored tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('id_token', data.id_token)
      // Note: Cognito may or may not return a new refresh token
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }

      setToken(data.id_token)
      setAccessToken(data.access_token)
      return { idToken: data.id_token, accessToken: data.access_token }
    } catch (err) {
      console.error('Token refresh error:', err)
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('id_token')
      redirectToLogin()
      throw err
    }
  }

  // Get valid ID token for API Gateway (refresh if needed)
  const getValidIdToken = async () => {
    const storedToken = localStorage.getItem('id_token')

    if (!storedToken) {
      redirectToLogin()
      return null
    }

    if (isTokenExpired(storedToken)) {
      console.log('Token expired, refreshing...')
      const tokens = await refreshToken()
      return tokens.idToken
    }

    return storedToken
  }

  // Get valid access token for AgentCore (refresh if needed)
  const getValidAccessToken = async () => {
    const storedToken = localStorage.getItem('access_token')

    if (!storedToken) {
      redirectToLogin()
      return null
    }

    if (isTokenExpired(storedToken)) {
      console.log('Token expired, refreshing...')
      const tokens = await refreshToken()
      return tokens.accessToken
    }

    return storedToken
  }

  useEffect(() => {
    initAuth()
  }, [])

  const initAuth = async () => {
    try {
      // Check if we're on the callback page
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        // Prevent double exchange in React StrictMode
        if (codeExchangeAttempted.current) return
        codeExchangeAttempted.current = true

        // Exchange authorization code for tokens
        await exchangeCodeForToken(code)
        return
      }

      // Check for existing tokens in localStorage
      const storedIdToken = localStorage.getItem('id_token')
      const storedAccessToken = localStorage.getItem('access_token')

      if (storedIdToken && storedAccessToken) {
        // Validate tokens and refresh if expired
        if (isTokenExpired(storedIdToken)) {
          console.log('Stored tokens expired, attempting refresh...')
          try {
            await refreshToken()
            setLoading(false)
            return
          } catch (_err) {
            // refreshToken already handles redirect to login
            return
          }
        }

        setToken(storedIdToken)
        setAccessToken(storedAccessToken)
        setLoading(false)
        return
      }

      // No auth code and no stored token - redirect to login
      redirectToLogin()
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const redirectToLogin = () => {
    const loginUrl =
      `https://${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com/oauth2/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('email openid profile')}` +
      `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}`

    window.location.href = loginUrl
  }

  const exchangeCodeForToken = async (code) => {
    try {
      const tokenUrl = `https://${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com/oauth2/token`

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code: code,
          redirect_uri: CALLBACK_URL,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Token exchange failed: ${errorBody}`)
      }

      const data = await response.json()

      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('id_token', data.id_token)

      setToken(data.id_token)
      setAccessToken(data.access_token)
      setLoading(false)

      // Clean up URL
      window.history.replaceState({}, document.title, '/')
    } catch (err) {
      console.error('Token exchange error:', err)
      throw err
    }
  }

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id_token')

    // Redirect to Cognito logout
    const logoutUrl =
      `https://${COGNITO_DOMAIN}.auth.${AWS_REGION}.amazoncognito.com/logout` +
      `?client_id=${CLIENT_ID}` +
      `&logout_uri=${encodeURIComponent(LOGOUT_URL)}`

    window.location.href = logoutUrl
  }

  return {
    token, // ID token for API Gateway
    accessToken, // Access token for AgentCore
    loading,
    error,
    logout,
    isAuthenticated: !!token,
    getValidIdToken,
    getValidAccessToken,
    getUserId,
  }
}
