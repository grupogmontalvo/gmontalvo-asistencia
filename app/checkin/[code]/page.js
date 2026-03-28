'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { InstallButton } from '../../components/PWAInstall'

const S = {
  page: { minHeight: '100vh', background: '#0c1022', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  bar: { width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1e2a45', background: '#111827', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 6 },
  container: { width: '100%', maxWidth: 400, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1c2641', border: '1px solid #243154', borderRadius: 14, padding: 22, textAlign: 'center' },
  clock: { fontFamily: "'JetBrains Mono', monospace", fontSize: 42, fontWeight: 700, letterSpacing: -2, margin: '14px 0 4px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  input: { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif", fontSize: 16, padding: '14px 16px', borderRadius: 10, outline: 'none', textAlign: 'center' },
  btnP: { width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  actBtn: (disabled) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 10px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, border: '1px solid #1e2a45', background: '#1a2035', color: '#f1f5f9', opacity: disabled ? 0.3 : 1 }),
  actIcon: (bg, color) => ({ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }),
  err: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', textAlign: 'center' },
  gps: (ok) => ({ padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid', borderColor: ok ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)', background: ok ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', color: ok ? '#10b981' : '#f59e0b' }),
  timeline: { background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 16 },
  tItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 12 },
  dot: (c) => ({ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }),
  sub: { fontSize: 13, color: '#8892a8' },
  muted: { fontSize: 12, color: '#4a5568' },
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371e3, toR = n => n * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtTime(d, tz) {
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || 'America/Cancun' })
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
}

function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const toStr = x => x.toLocaleDateString('en-CA')
  return { start: toStr(mon), end: toStr(sun) }
}

function KpiCarousel({ empId, siteId, thisWeekSales, lastWeekSales, weeklyGoal }) {
  const [cards, setCards] = useState([])
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!empId || !siteId) return
    loadCards()
  }, [empId, siteId, thisWeekSales])

  async function loadCards() {
    const tz = 'America/Cancun'
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
    const { start: weekStart, end: weekEnd } = getWeekBounds(today)
    const monthStr = today.slice(0, 7)
    const built = []

    // Card: week sales + goal
    if (thisWeekSales > 0 || weeklyGoal > 0) {
      const pct = weeklyGoal > 0 ? Math.round(thisWeekSales / weeklyGoal * 100) : null
      built.push({
        icon: '💰', title: 'Ventas esta semana',
        value: '$' + Number(thisWeekSales).toLocaleString('es-MX'),
        sub: pct !== null ? `${pct}% de tu meta semanal` : 'Sin meta configurada',
        color: '#10b981', progress: pct ? Math.min(100, pct) : null
      })
    }

    // Cards: active competitions
    const { data: compSites } = await supabase.from('competition_sites').select('competition_id, competitions(*)').eq('site_id', siteId)
    const activeComps = (compSites || []).map(cs => cs.competitions).filter(c => c && c.active)
    for (const comp of activeComps.slice(0, 3)) {
      let dateStart, dateEnd
      if (comp.type === 'auto_week')  { dateStart = weekStart; dateEnd = weekEnd }
      else if (comp.type === 'auto_month') { dateStart = monthStr + '-01'; dateEnd = today }
      else { dateStart = comp.start_date; dateEnd = comp.end_date || today }
      if (dateStart > today) continue
      const { data: cSites } = await supabase.from('competition_sites').select('site_id').eq('competition_id', comp.id)
      const siteIds = (cSites || []).map(cs => cs.site_id)
      const { data: cAtt } = await supabase.from('attendance').select('employee_id, sales_amount, status').in('site_id', siteIds).gte('date', dateStart).lte('date', dateEnd)
      if (!cAtt) continue
      const scores = {}
      cAtt.forEach(r => {
        if (!scores[r.employee_id]) scores[r.employee_id] = 0
        if (comp.metric === 'sales')       scores[r.employee_id] += parseFloat(r.sales_amount) || 0
        else if (comp.metric === 'attendance') scores[r.employee_id] += 1
        else if (comp.metric === 'punctuality') scores[r.employee_id] += r.status === 'on_time' ? 1 : 0
        else scores[r.employee_id] += parseFloat(r.sales_amount) || 0
      })
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
      const rank = sorted.findIndex(([id]) => id === empId) + 1
      if (rank < 1) continue
      const myScore = scores[empId] || 0
      const ahead = rank > 1 ? sorted[rank - 2] : null
      const diff = ahead ? ahead[1] - myScore : 0
      let organizerName = null
      if (comp.created_by) {
        const { data: creator } = await supabase.from('admin_users').select('name').eq('id', comp.created_by).maybeSingle()
        organizerName = creator?.name || null
      }
      built.push({
        icon: rank === 1 ? '🏆' : '🎯', title: comp.name,
        value: `#${rank} de ${sorted.length}`,
        sub: rank === 1 ? '¡Vas ganando la competencia!' : comp.metric === 'sales' ? `Faltan $${Number(diff).toLocaleString('es-MX')} para el #${rank - 1}` : `${diff} pts para el #${rank - 1}`,
        color: rank === 1 ? '#f59e0b' : '#8b5cf6',
        isComp: true, prize: comp.prize_text, organizer: organizerName
      })
    }

    setCards(built)
    setLoaded(true)
  }

  useEffect(() => {
    if (paused || cards.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % cards.length), 4000)
    return () => clearInterval(t)
  }, [paused, cards.length])

  if (!loaded || cards.length === 0) return null
  const card = cards[idx]

  return (
    <div style={{ background: '#1a2035', border: `1px solid ${card.isComp ? 'rgba(245,158,11,.4)' : '#1e2a45'}`, borderRadius: 14, padding: '18px 20px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', transition: 'border-color .3s' }}
      onClick={() => setPaused(p => !p)}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{card.icon}</div>
      <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 4 }}>{card.title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: card.color, lineHeight: 1.2 }}>{card.value}</div>
      {card.sub && <div style={{ fontSize: 11, color: '#8892a8', marginTop: 4 }}>{card.sub}</div>}
      {card.progress != null && (
        <div style={{ marginTop: 10, height: 4, background: 'rgba(30,42,69,.8)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: card.progress + '%', background: card.color, borderRadius: 2, transition: 'width .6s ease' }} />
        </div>
      )}
      {card.prize && <div style={{ marginTop: 6, fontSize: 10, color: '#f59e0b' }}>🎁 {card.prize}</div>}
      {card.organizer && <div style={{ marginTop: 4, fontSize: 10, color: '#4a5568' }}>Organizado por {card.organizer}</div>}
      {cards.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12 }}>
          {cards.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); setPaused(true) }}
              style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? card.color : '#1e2a45', transition: 'all .3s', cursor: 'pointer' }} />
          ))}
        </div>
      )}
      {paused && <div style={{ fontSize: 9, color: '#4a5568', marginTop: 6 }}>Toca para continuar ▶</div>}
    </div>
  )
}

function SalesModal({ onConfirm, onSkip }) {
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState('')

  function handleConfirm() {
    const val = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(val) || val < 0) { setErr('Ingresa un monto válido'); return }
    if (val > 9999999) { setErr('El monto máximo es $9,999,999'); return }
    onConfirm(val)
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(6px)', padding: '0 16px' }}>
      <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 18, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>💰</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Cierre del Día</div>
        <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 22 }}>¿Cuánto vendiste hoy?<br /><span style={{ fontSize: 11, color: '#4a5568' }}>Puedes omitirlo si no aplica.</span></div>
        <div style={{ position: 'relative', marginBottom: err ? 8 : 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#4a5568', pointerEvents: 'none' }}>$</span>
          <input type='number' inputMode='decimal' placeholder='0' value={amount}
            onChange={e => { setAmount(e.target.value); setErr('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            autoFocus
            style={{ width: '100%', background: '#0d1220', border: '1px solid ' + (err ? '#ef4444' : '#1e2a45'), color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, padding: '16px 16px 16px 36px', borderRadius: 12, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
          />
        </div>
        {err && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 16, fontWeight: 600 }}>⚠ {err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleConfirm} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Confirmar y Salir</button>
          <button onClick={onSkip} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #1e2a45', background: 'transparent', color: '#4a5568', fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer' }}>Omitir</button>
        </div>
      </div>
    </div>
  )
}

async function detectFaceCount(blob) {
  if (typeof window === 'undefined' || !('FaceDetector' in window)) return null
  try {
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 })
    const img = await createImageBitmap(blob)
    const faces = await fd.detect(img)
    return faces.length
  } catch { return null }
}

function CameraModal({ onCapture, onClose, title = '📸 Foto de entrada' }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [blob, setBlob]       = useState(null)
  const [err, setErr]         = useState('')
  const [faceErr, setFaceErr] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => setCamReady(true) }
      } catch (e) { setErr('No se pudo acceder a la cámara. Verifica los permisos del navegador.') }
    }
    startCam()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  function capture() {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setValidating(true); setFaceErr('')
    canvas.toBlob(async b => {
      if (!b) { setValidating(false); return }
      streamRef.current?.getTracks().forEach(t => t.stop())
      const previewUrl = URL.createObjectURL(b)
      // Face validation — warning only, never blocks
      const faceCount = await detectFaceCount(b)
      setValidating(false)
      if (faceCount !== null && faceCount === 0) {
        setFaceErr('No se detectó ningún rostro. Verifica que tu cara esté bien iluminada.')
      } else if (faceCount !== null && faceCount > 1) {
        setFaceErr('Se detectaron varios rostros. Solo debe aparecer una persona.')
      }
      // Always set blob — user can proceed even with face warning
      setBlob(b); setPreview(previewUrl)
    }, 'image/jpeg', 0.85)
  }

  function retake() {
    setPreview(null); setBlob(null); setFaceErr('')
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(stream => {
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; setCamReady(true) }
    }).catch(() => setErr('No se pudo reiniciar la cámara.'))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8892a8', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          {err ? (
            <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 10, padding: 16, textAlign: 'center', fontSize: 13, color: '#ef4444', marginBottom: 14 }}>
              {err}
              <div style={{ marginTop: 12 }}>
                <button onClick={() => onCapture(null)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Continuar sin foto</button>
              </div>
            </div>
          ) : preview ? (
            <>
              <img src={preview} alt='preview' style={{ width: '100%', borderRadius: 12, display: 'block', marginBottom: faceErr ? 8 : 14 }} />
              {faceErr && (
                <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#f59e0b', marginBottom: 12, textAlign: 'center' }}>
                  ⚠ {faceErr}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={retake} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>Repetir</button>
                <button onClick={() => onCapture(blob)} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Usar esta foto</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0d1220', aspectRatio: '4/3', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
                {!camReady && !validating && <div style={{ position: 'absolute', color: '#4a5568', fontSize: 13 }}>Iniciando cámara...</div>}
                {validating && <div style={{ position: 'absolute', color: '#3b82f6', fontSize: 13 }}>Validando foto...</div>}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button onClick={capture} disabled={!camReady || validating} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: (camReady && !validating) ? '#10b981' : '#1e2a45', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: (camReady && !validating) ? 'pointer' : 'not-allowed' }}>
                {validating ? 'Verificando...' : '📷 Tomar foto'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function WeekSalesBlock({ thisWeekSales, lastWeekSales, goal, isDone }) {
  const hasThis  = thisWeekSales > 0
  const hasLast  = lastWeekSales > 0
  const hasGoal  = goal > 0
  if (!hasThis && !hasGoal) return null

  const pct = hasGoal ? Math.min(100, Math.round((thisWeekSales / goal) * 100)) : null
  const diff = hasThis && hasLast ? thisWeekSales - lastWeekSales : null
  const diffPct = diff !== null && lastWeekSales > 0 ? Math.round((diff / lastWeekSales) * 100) : null
  const isUp = diff !== null && diff >= 0

  return (
    <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', marginBottom: 12 }}>Ventas esta semana</div>
      {hasThis && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: hasGoal || hasLast ? 12 : 0 }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}>{fmtMoney(thisWeekSales)}</span>
          {!isDone && <span style={{ fontSize: 11, color: '#4a5568' }}>acumulado</span>}
        </div>
      )}
      {hasGoal && (
        <div style={{ marginBottom: hasLast ? 12 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#8892a8' }}>Meta: <span style={{ fontFamily: "'JetBrains Mono'", color: '#f1f5f9', fontWeight: 600 }}>{fmtMoney(goal)}</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#8892a8', fontFamily: "'JetBrains Mono'" }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: '#0d1220', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#3b82f6', transition: 'width .4s ease' }} />
          </div>
          {pct >= 100 && <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 6, textAlign: 'center' }}>🎉 ¡Meta alcanzada!</div>}
        </div>
      )}
      {hasLast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#0d1220' }}>
          <span style={{ fontSize: 18 }}>{isUp ? '📈' : '📉'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#4a5568' }}>Semana anterior: <span style={{ fontFamily: "'JetBrains Mono'", color: '#8892a8' }}>{fmtMoney(lastWeekSales)}</span></div>
            {diffPct !== null && (
              <div style={{ fontSize: 13, fontWeight: 700, color: isUp ? '#10b981' : '#ef4444', fontFamily: "'JetBrains Mono'" }}>
                {isUp ? '+' : ''}{diffPct}% {isUp ? 'más' : 'menos'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckinPage({ params }) {
  const siteCode = params.code
  const [site, setSite]               = useState(null)
  const [emp, setEmp]                 = useState(null)
  const [step, setStep]               = useState('loading')
  const [email, setEmail]             = useState('')
  const [emailErr, setEmailErr]       = useState('')
  const [gps, setGps]                 = useState({ status: 'idle' })
  const [now, setNow]                 = useState(new Date())
  const [isIn, setIsIn]               = useState(false)
  const [isDone, setIsDone]           = useState(false)
  const [onLunch, setOnLunch]         = useState(false)
  const [onBreak, setOnBreak]         = useState(false)
  const [ciTime, setCiTime]           = useState(null)
  const [coTime, setCoTime]           = useState(null)
  const [events, setEvents]           = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [schedule, setSchedule]       = useState(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [checkoutErr, setCheckoutErr] = useState('')
  const [checkinErr, setCheckinErr]   = useState('')
  const [showCamera, setShowCamera]   = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [checkoutGpsWarn, setCheckoutGpsWarn] = useState(null)

  const [thisWeekSales, setThisWeekSales] = useState(0)
  const [lastWeekSales, setLastWeekSales] = useState(0)
  const [weeklyGoal,    setWeeklyGoal]    = useState(0)
  const [thisMonthSales, setThisMonthSales] = useState(0)
  const [salesView,     setSalesView]     = useState('week')
  const [feedbackOpen,  setFeedbackOpen]  = useState(false)
  const [fbType, setFbType] = useState('idea')
  const [fbMsg, setFbMsg] = useState('')
  const [fbStatus, setFbStatus] = useState('idle')
  const [fbScreenshot, setFbScreenshot] = useState(null)
  const fbFileRef = useRef(null)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  async function loadSchedule(empId, tz) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz || 'America/Cancun' })
    const { data } = await supabase.from('schedules').select('*').eq('employee_id', empId).eq('date', today).maybeSingle()
    setSchedule(data)
  }

  async function loadWeeklyData(empId, tz) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz || 'America/Cancun' })
    const thisWeek = getWeekBounds(today)
    const lastMonDate = new Date(thisWeek.start + 'T12:00:00')
    lastMonDate.setDate(lastMonDate.getDate() - 7)
    const lastWeek = getWeekBounds(lastMonDate.toLocaleDateString('en-CA'))

    const monthStart = today.slice(0, 7) + '-01'
    const [thisRes, lastRes, goalRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('sales_amount').eq('employee_id', empId).gte('date', thisWeek.start).lte('date', thisWeek.end),
      supabase.from('attendance').select('sales_amount').eq('employee_id', empId).gte('date', lastWeek.start).lte('date', lastWeek.end),
      supabase.from('employee_goals').select('weekly_goal').eq('employee_id', empId).maybeSingle(),
      supabase.from('attendance').select('sales_amount').eq('employee_id', empId).gte('date', monthStart).lte('date', today),
    ])

    setThisWeekSales((thisRes.data || []).reduce((s, r) => s + (parseFloat(r.sales_amount) || 0), 0))
    setLastWeekSales((lastRes.data || []).reduce((s, r) => s + (parseFloat(r.sales_amount) || 0), 0))
    setWeeklyGoal(parseFloat(goalRes.data?.weekly_goal) || 0)
    setThisMonthSales((monthRes.data || []).reduce((s, r) => s + (parseFloat(r.sales_amount) || 0), 0))
  }

  useEffect(() => {
    async function init() {
      const { data: siteData } = await supabase.from('sites').select('*').eq('code', siteCode).eq('active', true).single()
      if (!siteData) { setStep('error'); return }
      setSite(siteData)
      const token = localStorage.getItem('gm-device-token')
      if (token) {
        const { data: device } = await supabase.from('devices').select('*, employees(*)').eq('device_token', token).single()
        if (device?.employees) {
          setEmp(device.employees)
          await loadTodayRecord(device.employees.id, siteData.id, siteData.timezone)
          await loadSchedule(device.employees.id, siteData.timezone)
          await loadWeeklyData(device.employees.id, siteData.timezone)
          checkGPS(siteData)
          setStep('checkin')
          await supabase.from('devices').update({ last_used: new Date().toISOString() }).eq('device_token', token)
          return
        }
      }
      setStep('email')
    }
    init()
  }, [siteCode])

  async function loadTodayRecord(empId, siteId, tz) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz || 'America/Cancun' })
    const { data } = await supabase.from('attendance').select('*').eq('employee_id', empId).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data) {
      setTodayRecord(data)
      if (data.check_in) setCiTime(fmtTime(new Date(data.check_in), tz))
      if (data.check_out) {
        setIsDone(true); setIsIn(false)
        setCoTime(fmtTime(new Date(data.check_out), tz))
        const evs = []
        if (data.check_in)    evs.push({ type: 'ci', time: fmtTime(new Date(data.check_in), tz) })
        if (data.lunch_start) evs.push({ type: 'ls', time: fmtTime(new Date(data.lunch_start), tz) })
        if (data.lunch_end)   evs.push({ type: 'le', time: fmtTime(new Date(data.lunch_end), tz) })
        if (data.break_start) evs.push({ type: 'bs', time: fmtTime(new Date(data.break_start), tz) })
        if (data.break_end)   evs.push({ type: 'be', time: fmtTime(new Date(data.break_end), tz) })
        evs.push({ type: 'co', time: fmtTime(new Date(data.check_out), tz) })
        if (data.sales_amount > 0) evs.push({ type: 'sale', time: fmtTime(new Date(data.check_out), tz), amount: data.sales_amount })
        setEvents(evs)
      } else if (data.check_in) {
        setIsIn(true)
        if (data.lunch_start && !data.lunch_end) setOnLunch(true)
        if (data.break_start && !data.break_end) setOnBreak(true)
        const evs = [{ type: 'ci', time: fmtTime(new Date(data.check_in), tz) }]
        if (data.lunch_start) evs.push({ type: 'ls', time: fmtTime(new Date(data.lunch_start), tz) })
        if (data.lunch_end)   evs.push({ type: 'le', time: fmtTime(new Date(data.lunch_end), tz) })
        if (data.break_start) evs.push({ type: 'bs', time: fmtTime(new Date(data.break_start), tz) })
        if (data.break_end)   evs.push({ type: 'be', time: fmtTime(new Date(data.break_end), tz) })
        setEvents(evs)
      }
    }
  }

  function checkGPS(s) {
    const noSiteGps = !s?.lat || s.lat === 0
    setGps({ status: 'loading' })
    if (!navigator.geolocation) {
      // Sin geolocation: si tampoco hay GPS del sitio, permitir; si hay, denegar
      setGps(noSiteGps ? { status: 'ok', dist: 0 } : { status: 'denied' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude
        if (noSiteGps) {
          // Sitio sin GPS configurado: guardar coordenadas del empleado pero no bloquear
          setGps({ status: 'ok', dist: 0, lat, lng })
        } else {
          const dist = haversine(lat, lng, s.lat, s.lng)
          setGps({ status: dist <= s.radius_m ? 'ok' : 'far', dist: Math.round(dist), max: s.radius_m, lat, lng })
        }
      },
      () => setGps(noSiteGps ? { status: 'ok', dist: 0 } : { status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function tryEmail() {
    const e = email.trim().toLowerCase()
    if (!e) { setEmailErr('Ingresa tu email'); return }

    // 1. Buscar en empleados activos
    let { data: empData } = await supabase.from('employees').select('*').eq('email', e).eq('active', true).single()

    // 2. Si no está como empleado, checar si es admin/gerente
    if (!empData) {
      const { data: adminData } = await supabase.from('admin_users').select('*').eq('email', e).single()
      if (adminData) {
        // Crear automáticamente perfil de empleado para el admin
        const { data: newEmp } = await supabase.from('employees').insert({
          name: adminData.name,
          email: adminData.email,
          role: adminData.role === 'superadmin' ? 'Administrador' : 'Gerente',
          company_id: adminData.company_id,
          active: true,
          skip_sales: true,
          skip_photo: false,
        }).select().single()
        empData = newEmp
      }
    }

    if (!empData) { setEmailErr('Email no registrado. Contacta a tu administrador.'); return }

    const token = crypto.randomUUID()
    localStorage.setItem('gm-device-token', token)
    await supabase.from('devices').insert({ device_token: token, employee_id: empData.id, user_agent: navigator.userAgent })
    setEmp(empData)
    await loadTodayRecord(empData.id, site.id, site.timezone)
    await loadSchedule(empData.id, site.timezone)
    await loadWeeklyData(empData.id, site.timezone)
    checkGPS(site)
    setStep('checkin')
  }

  async function calcStatus(checkInTime) {
    const tz    = site?.timezone || 'America/Cancun'
    const today = checkInTime.toLocaleDateString('en-CA', { timeZone: tz })
    const grace = site?.grace_mins || 15
    const { data: sched } = await supabase.from('schedules').select('*').eq('employee_id', emp.id).eq('date', today).maybeSingle()
    if (!sched) return null
    const [schedH, schedM] = sched.start_time.split(':').map(Number)
    const schedDate = new Date(checkInTime)
    schedDate.setHours(schedH, schedM, 0, 0)
    const diffMins = Math.floor((checkInTime - schedDate) / 60000)
    if (diffMins <= 0)     return 'on_time'
    if (diffMins <= grace) return 'tolerancia'
    return 'late'
  }

  async function uploadPhoto(blob, suffix) {
    if (!blob) return null
    try {
      const tz    = site?.timezone || 'America/Cancun'
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
      const fileName = `${emp.id}_${today}_${suffix}_${Date.now()}.jpg`
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('checkin-photos').upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('checkin-photos').getPublicUrl(fileName)
        return urlData?.publicUrl || null
      }
    } catch (e) { console.warn('Photo upload failed:', e) }
    return null
  }

  function doCheckin() {
    if (isIn || isDone || loading) return
    emp?.skip_photo ? doCheckinWithPhoto(null) : setShowCamera('in')
  }

  async function doCheckinWithPhoto(blob) {
    setShowCamera(null); setLoading(true); setCheckinErr('')
    const checkIn = new Date()
    const tz      = site?.timezone || 'America/Cancun'
    const today   = checkIn.toLocaleDateString('en-CA', { timeZone: tz })
    const status  = await calcStatus(checkIn)
    const photoUrl = await uploadPhoto(blob, 'in')
    const record = { employee_id: emp.id, site_id: site.id, company_id: site.company_id || emp.company_id || null, date: today, status, check_in: checkIn.toISOString(), gps_lat: gps.lat || null, gps_lng: gps.lng || null, gps_distance_m: gps.dist || null, ...(photoUrl ? { photo_url: photoUrl } : {}) }
    const { data, error } = await supabase.from('attendance').insert(record).select().single()
    if (!error && data) {
      setTodayRecord(data); setIsIn(true)
      setCiTime(fmtTime(checkIn, tz))
      setEvents(prev => [...prev, { type: 'ci', time: fmtTime(checkIn, tz) }])
      // Fire alert (non-blocking)
      fetch('/api/alerts/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_id: data.id }) }).catch(() => {})
    } else if (error) {
      setCheckinErr('No se pudo registrar la entrada. Intenta de nuevo.')
      console.error('Check-in error:', error.message)
    }
    setLoading(false)
  }

  function proceedToCheckoutConfirm() {
    setConfirmAction({
      label: 'Registrar Salida', desc: '¿Confirmas que estás terminando tu turno?', icon: '✕', color: '#ef4444',
      onConfirm: () => { setConfirmAction(null); emp?.skip_photo ? proceedCheckout() : setShowCamera('out') }
    })
  }

  function doCheckout() {
    const hasSiteGps = site?.lat && site.lat !== 0
    if (!hasSiteGps || !navigator.geolocation) { proceedToCheckoutConfirm(); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const dist = haversine(pos.coords.latitude, pos.coords.longitude, site.lat, site.lng)
        if (dist > site.radius_m) {
          setCheckoutGpsWarn({ dist: Math.round(dist), max: site.radius_m })
        } else {
          proceedToCheckoutConfirm()
        }
      },
      () => proceedToCheckoutConfirm(),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function proceedCheckout() {
    setShowCamera(null)
    emp?.skip_sales ? finishCheckout(null, null) : setShowSalesModal(true)
  }

  async function handleCheckoutPhoto(blob) {
    setShowCamera(null)
    if (emp?.skip_sales) { await finishCheckout(null, blob) }
    else { pendingCheckoutPhotoRef.current = blob; setShowSalesModal(true) }
  }

  const pendingCheckoutPhotoRef = useRef(null)

  async function finishCheckout(salesAmount, photoBlob) {
    setShowSalesModal(false)
    if (!todayRecord) { setCheckoutErr('Error: no se encontró el registro de entrada. Contacta a tu administrador.'); return }
    setLoading(true); setCheckoutErr('')

    const tz       = site?.timezone || 'America/Cancun'
    const checkOut = new Date()
    const ciDate   = new Date(todayRecord.check_in)
    const lunchMins = todayRecord.lunch_start && todayRecord.lunch_end
      ? (new Date(todayRecord.lunch_end) - new Date(todayRecord.lunch_start)) / 60000 : 0
    const hrs = ((checkOut - ciDate) / 3600000 - lunchMins / 60).toFixed(1)

    const blob = photoBlob ?? pendingCheckoutPhotoRef.current
    pendingCheckoutPhotoRef.current = null
    const photoUrlOut = await uploadPhoto(blob, 'out')

    const { data: updatedRecord, error } = await supabase
      .from('attendance')
      .update({ check_out: checkOut.toISOString(), hours_worked: parseFloat(hrs), ...(salesAmount !== null ? { sales_amount: salesAmount } : {}), ...(photoUrlOut ? { photo_url_out: photoUrlOut } : {}) })
      .eq('id', todayRecord.id)
      .select()
      .single()

    if (error) {
      console.error('Check-out error:', error)
      setCheckoutErr('No se pudo registrar la salida. Intenta de nuevo.')
      setLoading(false); return
    }

    if (salesAmount > 0) setThisWeekSales(prev => prev + salesAmount)

    setTodayRecord(updatedRecord); setIsIn(false); setIsDone(true); setOnLunch(false); setOnBreak(false)
    setCoTime(fmtTime(checkOut, tz))
    const newEvs = [{ type: 'co', time: fmtTime(checkOut, tz) }]
    if (salesAmount !== null && salesAmount > 0) newEvs.push({ type: 'sale', time: fmtTime(checkOut, tz), amount: salesAmount })
    setEvents(prev => [...prev, ...newEvs])
    setLoading(false)
    fetch('/api/alerts/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_id: updatedRecord.id }) }).catch(() => {})
  }

  function requestLunch(start) {
    setConfirmAction({
      label: start ? 'Inicio de Comida' : 'Regreso de Comida',
      desc: start ? '¿Vas a tomar tu tiempo de comida?' : '¿Confirmas que regresas de la comida?',
      icon: '☕', color: '#f59e0b',
      onConfirm: () => { setConfirmAction(null); doLunch(start) }
    })
  }

  function requestBreak(start) {
    setConfirmAction({
      label: start ? 'Inicio de Descanso' : 'Regreso de Descanso',
      desc: start ? '¿Vas a tomar un descanso?' : '¿Confirmas que regresas del descanso?',
      icon: '⏸', color: '#3b82f6',
      onConfirm: () => { setConfirmAction(null); doBreak(start) }
    })
  }

  async function doLunch(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'; const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ lunch_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(true); setEvents(prev => [...prev, { type: 'ls', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ lunch_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(false); setEvents(prev => [...prev, { type: 'le', time: fmtTime(t, tz) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'lunch_start' : 'lunch_end']: t.toISOString() }))
    fetch('/api/alerts/movement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_id: todayRecord.id, type: start ? 'lunch_start' : 'lunch_end' }) }).catch(() => {})
  }

  async function doBreak(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'; const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ break_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(true); setEvents(prev => [...prev, { type: 'bs', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ break_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(false); setEvents(prev => [...prev, { type: 'be', time: fmtTime(t, tz) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'break_start' : 'break_end']: t.toISOString() }))
    fetch('/api/alerts/movement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_id: todayRecord.id, type: start ? 'break_start' : 'break_end' }) }).catch(() => {})
  }

  function handleFbFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFbScreenshot({ name: file.name, base64: ev.target.result.split(',')[1], preview: ev.target.result })
    reader.readAsDataURL(file)
  }

  async function sendFeedback() {
    if (!fbMsg.trim()) return
    setFbStatus('loading')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: fbType, message: fbMsg, userName: emp?.name, page: '/checkin', screenshot: fbScreenshot?.base64 || null, screenshotName: fbScreenshot?.name || null }),
      })
      if (res.ok) { setFbStatus('done'); setFbMsg(''); setFbScreenshot(null) }
      else setFbStatus('error')
    } catch { setFbStatus('error') }
  }

  function closeFeedback() { setFeedbackOpen(false); setFbStatus('idle'); setFbMsg(''); setFbScreenshot(null) }

  async function logout() {
    const token = localStorage.getItem('gm-device-token')
    if (token) await supabase.from('devices').delete().eq('device_token', token)
    localStorage.removeItem('gm-device-token')
    setEmp(null); setStep('email')
  }

  const evMeta = {
    ci:   ['#10b981', 'Check In'],
    co:   ['#ef4444', 'Check Out'],
    ls:   ['#f59e0b', 'Inicio Comida'],
    le:   ['#f59e0b', 'Fin Comida'],
    bs:   ['#3b82f6', 'Inicio Descanso'],
    be:   ['#3b82f6', 'Fin Descanso'],
    sale: ['#10b981', 'Venta del día'],
  }

  const tz    = site?.timezone || 'America/Cancun'
  const gpsOk = gps.status === 'ok'

  const FeedbackBtn = () => (
    <>
      <InstallButton style={{ position: 'fixed', bottom: 76, right: 12, zIndex: 100, width: 'auto' }} />
      <button onClick={() => { setFeedbackOpen(true); setFbStatus('idle') }}
        style={{ position: 'fixed', bottom: 22, right: 18, width: 46, height: 46, borderRadius: '50%', background: '#1c2641', border: '1px solid rgba(139,92,246,.35)', color: '#a78bfa', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, boxShadow: '0 2px 14px rgba(0,0,0,.5)' }}>
        💡
      </button>
      {feedbackOpen && (
        <div onClick={closeFeedback} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500, padding: '0 0 24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 440 }}>
            {fbStatus === 'done' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🙌</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>¡Gracias!</div>
                <div style={{ fontSize: 13, color: '#8892a8', marginBottom: 20 }}>Tu mensaje nos ayuda a mejorar Worktic.</div>
                <button onClick={closeFeedback} style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cerrar</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>💬 Cuéntanos</div>
                    <div style={{ fontSize: 11, color: '#8892a8', marginTop: 2 }}>Tu opinión hace que Worktic mejore</div>
                  </div>
                  <button onClick={closeFeedback} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 6, color: '#8892a8', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[['error','🐛','Reportar error'],['idea','💡','Tengo una idea'],['other','💬','Comentario']].map(([id,emoji,label]) => (
                    <button key={id} onClick={() => setFbType(id)}
                      style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `1.5px solid ${fbType === id ? '#10b981' : '#1e2a45'}`, background: fbType === id ? 'rgba(16,185,129,.1)' : '#0d1220', color: fbType === id ? '#10b981' : '#8892a8', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.4 }}>
                      <div style={{ fontSize: 18 }}>{emoji}</div>
                      <div>{label}</div>
                    </button>
                  ))}
                </div>
                <textarea value={fbMsg} onChange={e => setFbMsg(e.target.value)}
                  placeholder={fbType === 'error' ? '¿Qué pasó? ¿Qué esperabas que pasara?' : fbType === 'idea' ? '¿Qué te gustaría que tuviera Worktic?' : '¿Algo que quieras decirnos?'}
                  rows={4}
                  style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', borderRadius: 9, color: '#f1f5f9', fontSize: 13, padding: '11px 13px', resize: 'none', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                />
                <input ref={fbFileRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFbFile} />
                {fbScreenshot ? (
                  <div style={{ marginBottom: 12, position: 'relative' }}>
                    <img src={fbScreenshot.preview} alt='captura' style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #1e2a45' }} />
                    <button onClick={() => { setFbScreenshot(null); if (fbFileRef.current) fbFileRef.current.value = '' }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                    <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>{fbScreenshot.name}</div>
                  </div>
                ) : (
                  <button onClick={() => fbFileRef.current?.click()}
                    style={{ width: '100%', marginBottom: 10, padding: '8px', borderRadius: 8, border: '1px dashed #1e2a45', background: 'transparent', color: '#4a5568', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    📎 Adjuntar captura de pantalla
                  </button>
                )}
                {fbStatus === 'error' && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>Error al enviar. Intenta de nuevo.</div>}
                <button onClick={sendFeedback} disabled={!fbMsg.trim() || fbStatus === 'loading'}
                  style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: !fbMsg.trim() || fbStatus === 'loading' ? '#1e2a45' : '#10b981', color: !fbMsg.trim() || fbStatus === 'loading' ? '#4a5568' : '#fff', fontSize: 13, fontWeight: 700, cursor: !fbMsg.trim() || fbStatus === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background .2s' }}>
                  {fbStatus === 'loading' ? 'Enviando...' : 'Enviar →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )

  if (step === 'loading') return (
    <div style={S.page}>
      <div style={S.bar}><img src='/logo.jpeg' style={S.logo} alt='GM' /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}><p style={S.sub}>Cargando...</p></div>
    </div>
  )

  if (step === 'error') return (
    <div style={S.page}>
      <div style={S.bar}><img src='/logo.jpeg' style={S.logo} alt='GM' /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={S.err}>Código de sitio no encontrado: <strong>{siteCode}</strong></div>
      </div>
    </div>
  )

  if (step === 'email') return (
    <div style={S.page}>
      <div style={S.bar}><img src='/logo.jpeg' style={S.logo} alt='GM' /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name || 'G.Montalvo'}</span></div>
      <div style={S.container}>
        <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Bienvenido</div>
          <p style={S.sub}>Ingresa el email con el que te registraron. Solo se pide una vez en este dispositivo.</p>
        </div>
        <input style={S.input} type='email' value={email} onChange={e => { setEmail(e.target.value); setEmailErr('') }} onKeyDown={e => { if (e.key === 'Enter') tryEmail() }} placeholder='tu@email.com' autoFocus />
        {emailErr && <div style={S.err}>{emailErr}</div>}
        <button style={S.btnP} onClick={tryEmail}>Continuar</button>
        <p style={{ ...S.muted, textAlign: 'center' }}>Si no conoces tu email, pregunta a tu administrador.</p>
      </div>
    </div>
  )

  if (isDone) return (
    <div style={S.page}>
      <FeedbackBtn />
      <div style={S.bar}><img src='/logo.jpeg' style={S.logo} alt='GM' /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name}</span></div>
      <div style={S.container}>
        <div style={{ ...S.card, paddingTop: 28, paddingBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{emp?.name}</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>Turno completado</div>
          <div style={{ fontSize: 11, color: '#8892a8', marginBottom: 16 }}>
            Entrada: <span style={{ fontFamily: "'JetBrains Mono'", color: '#f1f5f9' }}>{ciTime}</span>
            {coTime && <> · Salida: <span style={{ fontFamily: "'JetBrains Mono'", color: '#f1f5f9' }}>{coTime}</span></>}
          </div>
          {todayRecord?.hours_worked > 0 && (
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#3b82f6', marginBottom: 8 }}>
              {todayRecord.hours_worked}h trabajadas
            </div>
          )}
          {todayRecord?.sales_amount > 0 && (
            <div style={{ fontSize: 14, color: '#10b981', fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>
              {fmtMoney(todayRecord.sales_amount)} hoy
            </div>
          )}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2a45', fontSize: 11, color: '#4a5568' }}>¿Saliste y regresaste? Puedes registrar un nuevo turno.</div>
          <button
            onClick={() => { setIsDone(false); setTodayRecord(null); setIsIn(false); setCiTime(null); setCoTime(null); setEvents([]); setOnLunch(false); setOnBreak(false) }}
            style={{ marginTop: 12, width: '100%', padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(59,130,246,.3)', background: 'rgba(59,130,246,.08)', color: '#3b82f6', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Nuevo Check-In
          </button>
        </div>
        <KpiCarousel empId={emp?.id} siteId={site?.id} thisWeekSales={thisWeekSales} lastWeekSales={lastWeekSales} weeklyGoal={weeklyGoal} />
        {events.length > 0 && (
          <div style={S.timeline}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registro del Día</div>
            {events.map((e, i) => (
              <div key={i} style={S.tItem}>
                <span style={S.dot(evMeta[e.type]?.[0] || '#4a5568')} />
                <span style={{ width: 44, color: '#8892a8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{e.time}</span>
                <span style={{ color: '#8892a8', flex: 1 }}>{evMeta[e.type]?.[1] || 'Acción'}</span>
                {e.type === 'sale' && <span style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>{fmtMoney(e.amount)}</span>}
              </div>
            ))}
          </div>
        )}
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textAlign: 'center', padding: 8, fontFamily: "'DM Sans'" }}>
          Cerrar sesión (cambiar dispositivo)
        </button>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      {showCamera === 'in'  && <CameraModal title='📸 Foto de entrada' onCapture={doCheckinWithPhoto} onClose={() => setShowCamera(null)} />}
      {showCamera === 'out' && <CameraModal title='📸 Foto de salida'  onCapture={handleCheckoutPhoto} onClose={() => setShowCamera(null)} />}

      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 18, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{confirmAction.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{confirmAction.label}</div>
            <div style={{ fontSize: 13, color: '#8892a8', marginBottom: 24 }}>{confirmAction.desc}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmAction.onConfirm} style={{ flex: 1, padding: '13px', borderRadius: 10, border: 'none', background: confirmAction.color, color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showSalesModal && <SalesModal onConfirm={(amt) => finishCheckout(amt, null)} onSkip={() => finishCheckout(null, null)} />}

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 14, padding: '28px 36px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #1e2a45', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: '#8892a8' }}>Procesando...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      )}

      <div style={S.bar}><img src='/logo.jpeg' style={S.logo} alt='GM' /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name}</span></div>
      <div style={S.container}>
        <div style={S.card}>
          {/* Nombre con badge y ventas en los extremos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, flexShrink: 0, textAlign: 'center' }}>
              {todayRecord?.status && (
                <span style={{ padding: '3px 6px', borderRadius: 5, fontSize: 10, fontWeight: 700, color: todayRecord.status === 'on_time' ? '#10b981' : todayRecord.status === 'tolerancia' ? '#06b6d4' : '#f59e0b', background: todayRecord.status === 'on_time' ? 'rgba(16,185,129,.12)' : todayRecord.status === 'tolerancia' ? 'rgba(6,182,212,.12)' : 'rgba(245,158,11,.12)', display: 'inline-block' }}>
                  {todayRecord.status === 'on_time' ? 'Puntual' : todayRecord.status === 'tolerancia' ? 'Tolerancia' : 'Retardo'}
                </span>
              )}
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{emp?.name}</div>
              <div style={S.sub}>{emp?.role}</div>
              <div style={{ ...S.muted, marginTop: 1 }}>{site?.name}</div>
            </div>
            <div style={{ width: 56, flexShrink: 0, textAlign: 'center' }}>
              {(thisWeekSales > 0 || thisMonthSales > 0) && (
                <button onClick={() => setSalesView(v => v === 'week' ? 'month' : 'week')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '.5px', animation: 'pulse-label 2s ease-in-out infinite' }}>{salesView === 'week' ? 'Semana' : 'Mes'}</div>
                  <style>{`@keyframes pulse-label { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
                  <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono'", color: '#10b981', fontWeight: 700, marginTop: 1 }}>{fmtMoney(salesView === 'week' ? thisWeekSales : thisMonthSales)}</div>
                </button>
              )}
            </div>
          </div>

          {/* Reloj + confirmación en horizontal */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, letterSpacing: -1, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fmtTime(now, tz)}</div>
              <div style={S.muted}>{now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })}</div>
            </div>
            {isIn && !isDone && (
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>✅ Entrada registrada</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{ciTime}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2a45', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {schedule && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Horario</div>
                <div style={{ marginTop: 2, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{schedule.start_time?.slice(0,5)} – {schedule.end_time?.slice(0,5)}</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Estado</div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: isIn ? (onLunch ? '#f59e0b' : onBreak ? '#3b82f6' : '#10b981') : '#4a5568' }}>
                {!isIn ? 'Sin registrar' : onLunch ? 'En comida' : onBreak ? 'En descanso' : 'Trabajando'}
              </div>
            </div>
            {ciTime && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Entrada</div>
                <div style={{ marginTop: 2, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{ciTime}</div>
              </div>
            )}
          </div>
        </div>

        <KpiCarousel empId={emp?.id} siteId={site?.id} thisWeekSales={thisWeekSales} lastWeekSales={lastWeekSales} weeklyGoal={weeklyGoal} />

        {checkinErr  && <div style={S.err}>{checkinErr}</div>}
        {checkoutErr && <div style={S.err}>{checkoutErr}</div>}

        <div style={S.gps(gpsOk)}>
          <span>📍</span>
          <span style={{ flex: 1 }}>
            {gps.status === 'idle'    && 'Verificando ubicación...'}
            {gps.status === 'loading' && 'Obteniendo GPS...'}
            {gps.status === 'ok'      && `Ubicación verificada (${gps.dist || 0}m)`}
            {gps.status === 'far'     && `Fuera de rango: ${gps.dist}m (máx ${gps.max}m)`}
            {gps.status === 'denied'  && 'GPS no disponible'}
          </span>
          {(gps.status === 'denied' || gps.status === 'far') && (
            <button onClick={() => checkGPS(site)} style={{ background: 'none', border: '1px solid #1e2a45', color: '#f1f5f9', padding: '4px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Reintentar</button>
          )}
        </div>

        <div style={S.btnGrid}>
          <button
            style={{ ...S.actBtn(isIn || isDone || loading || (!gpsOk && gps.status !== 'idle')), ...(!isIn && !isDone && gpsOk ? { background: 'rgba(16,185,129,.08)', border: '2px solid rgba(16,185,129,.4)' } : {}) }}
            disabled={isIn || isDone || loading || (!gpsOk && gps.status !== 'idle')}
            onClick={doCheckin}
          >
            <div style={S.actIcon('rgba(16,185,129,.12)', '#10b981')}>✓</div>
            <span style={{ fontSize: !isIn && !isDone ? 13 : 12, fontWeight: !isIn && !isDone ? 700 : 600 }}>
              {isIn ? 'Check In ✓' : 'Hacer Check In'}
            </span>
          </button>
          <button style={S.actBtn(!isIn || onLunch || onBreak)} disabled={!isIn || onLunch || onBreak} onClick={doCheckout}>
            <div style={S.actIcon('rgba(239,68,68,.12)', '#ef4444')}>✕</div>Check Out
          </button>
          <button style={S.actBtn(!isIn || onBreak)} disabled={!isIn || onBreak} onClick={() => requestLunch(!onLunch)}>
            <div style={S.actIcon('rgba(245,158,11,.12)', '#f59e0b')}>☕</div>{onLunch ? 'Fin Comida' : 'Comida'}
          </button>
          <button style={S.actBtn(!isIn || onLunch)} disabled={!isIn || onLunch} onClick={() => requestBreak(!onBreak)}>
            <div style={S.actIcon('rgba(59,130,246,.12)', '#3b82f6')}>⏸</div>{onBreak ? 'Fin Descanso' : 'Descanso'}
          </button>
        </div>

        {events.length > 0 && (
          <div style={S.timeline}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registro del Día</div>
            {events.map((e, i) => (
              <div key={i} style={S.tItem}>
                <span style={S.dot(evMeta[e.type]?.[0] || '#4a5568')} />
                <span style={{ width: 44, color: '#8892a8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{e.time}</span>
                <span style={{ color: '#8892a8', flex: 1 }}>{evMeta[e.type]?.[1] || 'Acción'}</span>
                {e.type === 'sale' && <span style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>{fmtMoney(e.amount)}</span>}
              </div>
            ))}
          </div>
        )}

        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textAlign: 'center', padding: 8, fontFamily: "'DM Sans'" }}>
          Cerrar sesión (cambiar dispositivo)
        </button>
      </div>

    {checkoutGpsWarn && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '0 16px', backdropFilter: 'blur(4px)' }}>
        <div style={{ background: '#1c2641', border: '1px solid rgba(239,68,68,.35)', borderRadius: 16, padding: 26, maxWidth: 320, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Fuera de rango</div>
          <div style={{ fontSize: 13, color: '#8892a8', marginBottom: 20 }}>
            Estás a <strong style={{ color: '#f1f5f9' }}>{checkoutGpsWarn.dist}m</strong> del sitio (máximo {checkoutGpsWarn.max}m).<br />¿Registrar salida de todas formas?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setCheckoutGpsWarn(null); proceedToCheckoutConfirm() }} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Registrar salida</button>
            <button onClick={() => setCheckoutGpsWarn(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Cancelar</button>
          </div>
        </div>
      </div>
    )}

    <FeedbackBtn />
    </div>
  )
}
