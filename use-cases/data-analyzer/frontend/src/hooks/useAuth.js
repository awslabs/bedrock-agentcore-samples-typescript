import { useEffect, useRef, useState } from 'react'

const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/callback`
const PENDING_SIGN_IN_KEY = 'data-analyzer-pending-sign-in'

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function randomString() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
}

// Authorization code flow with PKCE: the verifier and state live in sessionStorage only until the redirect returns.
async function redirectToSignIn() {
  const verifier = randomString()
  const state = randomString()
  sessionStorage.setItem(PENDING_SIGN_IN_KEY, JSON.stringify({ verifier, state }))
  const challenge = base64UrlEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${COGNITO_DOMAIN}/oauth2/authorize?${params}`)
}

async function requestTokens(grant) {
  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...grant }),
  })
  if (!response.ok) throw new Error(`Sign-in failed: ${await response.text()}`)
  const tokens = await response.json()
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? grant.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }
}

async function exchangeCode(params) {
  const pending = JSON.parse(sessionStorage.getItem(PENDING_SIGN_IN_KEY) ?? 'null')
  sessionStorage.removeItem(PENDING_SIGN_IN_KEY)
  if (!pending || params.get('state') !== pending.state) {
    throw new Error('This sign-in response does not belong to this browser tab. Please sign in again.')
  }
  return requestTokens({
    grant_type: 'authorization_code',
    code: params.get('code'),
    redirect_uri: REDIRECT_URI,
    code_verifier: pending.verifier,
  })
}

// Tokens are kept in memory only, never in localStorage: a reload signs in again through Cognito's session cookie.
export default function useAuth(enabled) {
  const tokens = useRef(null)
  const started = useRef(false)
  const [status, setStatus] = useState(enabled ? 'signing-in' : 'disabled')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || started.current) return
    started.current = true

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search)
      if (params.has('error')) throw new Error(params.get('error_description') ?? params.get('error'))
      if (!params.has('code')) {
        await redirectToSignIn()
        return
      }
      tokens.current = await exchangeCode(params)
      window.history.replaceState({}, document.title, '/')
      setStatus('signed-in')
    }

    const run = async () => {
      try {
        await completeSignIn()
      } catch (err) {
        window.history.replaceState({}, document.title, '/')
        setError(err.message)
        setStatus('error')
      }
    }
    run()
  }, [enabled])

  const getAccessToken = async () => {
    if (!tokens.current) {
      await redirectToSignIn()
      return null
    }
    if (tokens.current.expiresAt - 60_000 < Date.now()) {
      try {
        tokens.current = await requestTokens({
          grant_type: 'refresh_token',
          refresh_token: tokens.current.refreshToken,
        })
      } catch {
        await redirectToSignIn()
        return null
      }
    }
    return tokens.current.accessToken
  }

  const signIn = async () => {
    setError(null)
    await redirectToSignIn()
  }

  const signOut = () => {
    tokens.current = null
    const params = new URLSearchParams({ client_id: CLIENT_ID, logout_uri: window.location.origin })
    window.location.assign(`${COGNITO_DOMAIN}/logout?${params}`)
  }

  return { status, error, getAccessToken, signIn, signOut }
}
