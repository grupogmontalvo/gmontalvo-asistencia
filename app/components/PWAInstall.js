'use client'
import { useState, useEffect } from 'react'

// ─── Hook: Install prompt ──────────────────────────────────────────────────────
export function usePWAInstall() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIos(ios)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true
    if (standalone) { setInstalled(true); return }

    function onBefore(e) { e.preventDefault(); setPrompt(e) }
    function onInstalled() { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (isIos) { setShowIosHint(h => !h); return }
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const canInstall = !installed && (!!prompt || isIos)
  return { install, installed, isIos, showIosHint, canInstall }
}

// ─── Botón instalar (compacto, para sidebar / checkin) ────────────────────────
export function InstallButton({ style = {} }) {
  const { install, installed, isIos, showIosHint, canInstall } = usePWAInstall()

  if (installed || !canInstall) return null

  return (
    <div style={style}>
      <button
        onClick={install}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
          fontSize: 12, fontWeight: 600,
          color: '#1D9E75', background: 'rgba(29,158,117,.08)',
          border: '1px solid rgba(29,158,117,.2)',
          width: '100%', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        📲 {isIos ? 'Cómo instalar' : 'Instalar Worktic'}
      </button>
      {showIosHint && isIos && (
        <div style={{
          marginTop: 8, padding: '10px 12px', background: '#0d1220',
          border: '1px solid rgba(29,158,117,.25)', borderRadius: 8,
          fontSize: 11, color: '#8892a8', lineHeight: 1.6,
        }}>
          En Safari, toca <strong style={{ color: '#f1f5f9' }}>Compartir</strong> (□↑) y luego
          {' '}<strong style={{ color: '#f1f5f9' }}>Añadir a pantalla de inicio</strong>.
        </div>
      )}
    </div>
  )
}

// ─── Hook: Push notifications ──────────────────────────────────────────────────
export function usePushNotifications(adminUserId) {
  const [permState, setPermState] = useState('idle') // idle | loading | granted | blocked | unsupported
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermState('unsupported'); return
    }
    const perm = Notification.permission
    if (perm === 'granted') {
      setPermState('granted')
      checkSubscription()
    } else if (perm === 'denied') {
      setPermState('blocked')
    }
  }, [adminUserId])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function activate() {
    if (!adminUserId) return
    setPermState('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPermState('blocked'); return }
      setPermState('granted')

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), admin_user_id: adminUserId }),
      })
      setSubscribed(true)
    } catch {
      setPermState('idle')
    }
  }

  return { permState, subscribed, activate }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
