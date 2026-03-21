'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

const S = {
  page: { minHeight: '100vh', background: '#050810', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  bar: { width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1e2a45', background: '#111827', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 6 },
  container: { width: '100%', maxWidth: 400, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 14, padding: 22, textAlign: 'center' },
  clock: { fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 700, letterSpacing: -2, margin: '14px 0 4px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
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
  sub: { fontSize: 12, color: '#8892a8' },
  muted: { fontSize: 11, color: '#4a5568' },
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

function SalesModal({ onConfirm, onSkip }) {
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState('')
  function handleConfirm() {
    const val = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(val) || val < 0) { setErr('Ingresa un monto válido'); return }
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
          <input type='number' inputMode='decimal' placeholder='0' value={amount} onChange={e => { setAmount(e.target.value); setErr('') }} onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }} autoFocus style={{ width: '100%', background: '#0d1220', border: '1px solid ' + (err ? '#ef4444' : '#1e2a45'), color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, padding: '16px 16px 16px 36px', borderRadius: 12, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
        </div>
        {err && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 16 }}>{err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleConfirm} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Confirmar y Salir</button>
          <button onClick={onSkip} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #1e2a45', background: 'transparent', color: '#4a5568', fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer' }}>Omitir</button>
        </div>
      </div>
    </div>
  )
}

function CameraModal({ onCapture, onClose, title = '📸 Foto de entrada' }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [blob, setBlob]       = useState(null)
  const [err, setErr]         = useState('')
  const [camReady, setCamReady] = useState(false)

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCamReady(true)
        }
      } catch (e) {
        setErr('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
      }
    }
    startCam()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  function capture() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(b => {
      if (!b) return
      setBlob(b)
      setPreview(URL.createObjectURL(b))
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.85)
  }

  function retake() {
    setPreview(null)
    setBlob(null)
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; setCamReady(true) }
      } catch { setErr('No se pudo reiniciar la cámara.') }
    }
    startCam()
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
                <button onClick={() => onCapture(null)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Continuar sin foto
                </button>
              </div>
            </div>
          ) : preview ? (
            <>
              <img src={preview} alt='preview' style={{ width: '100%', borderRadius: 12, display: 'block', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={retake} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' }}>Repetir</button>
                <button onClick={() => onCapture(blob)} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Usar esta foto</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0d1220', aspectRatio: '4/3', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
                {!camReady && <div style={{ position: 'absolute', color: '#4a5568', fontSize: 13 }}>Iniciando cámara...</div>}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button onClick={capture} disabled={!camReady} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: camReady ? '#10b981' : '#1e2a45', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: camReady ? 'pointer' : 'not-allowed' }}>
                📷 Tomar foto
              </button>
            </>
          )}
        </div>
      </div>
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
  // Camera state — 'in' | 'out' | null
  const [showCamera, setShowCamera]   = useState(null)
  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  async function loadSchedule(empId, tz) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz || 'America/Cancun' })
    const { data } = await supabase.from('schedules').select('*').eq('employee_id', empId).eq('date', today).maybeSingle()
    setSchedule(data)
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
    if (!s?.lat || s.lat === 0) { setGps({ status: 'ok', dist: 0 }); return }
    setGps({ status: 'loading' })
    if (!navigator.geolocation) { setGps({ status: 'denied' }); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const dist = haversine(pos.coords.latitude, pos.coords.longitude, s.lat, s.lng)
        setGps({ status: dist <= s.radius_m ? 'ok' : 'far', dist: Math.round(dist), max: s.radius_m, lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setGps({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function tryEmail() {
    const e = email.trim().toLowerCase()
    if (!e) { setEmailErr('Ingresa tu email'); return }
    const { data: empData } = await supabase.from('employees').select('*').eq('email', e).eq('active', true).single()
    if (!empData) { setEmailErr('Email no registrado. Contacta a tu administrador.'); return }
    const token = crypto.randomUUID()
    localStorage.setItem('gm-device-token', token)
    await supabase.from('devices').insert({ device_token: token, employee_id: empData.id, user_agent: navigator.userAgent })
    setEmp(empData)
    await loadTodayRecord(empData.id, site.id, site.timezone)
    await loadSchedule(empData.id, site.timezone)
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
    const diffMins = (checkInTime - schedDate) / 60000
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
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('checkin-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('checkin-photos').getPublicUrl(fileName)
        return urlData?.publicUrl || null
      }
    } catch (e) {
      console.warn('Photo upload failed:', e)
    }
    return null
  }

  // ── Check In ──
  function doCheckin() {
    if (isIn || isDone || loading) return
    if (emp?.skip_photo) {
      doCheckinWithPhoto(null)
    } else {
      setShowCamera('in')
    }
  }

  async function doCheckinWithPhoto(blob) {
    setShowCamera(null)
    setLoading(true)
    const checkIn = new Date()
    const tz      = site?.timezone || 'America/Cancun'
    const today   = checkIn.toLocaleDateString('en-CA', { timeZone: tz })
    const status  = await calcStatus(checkIn)
    const photoUrl = await uploadPhoto(blob, 'in')

    const record = {
      employee_id: emp.id, site_id: site.id, date: today, status,
      check_in: checkIn.toISOString(),
      gps_lat: gps.lat || null, gps_lng: gps.lng || null, gps_distance_m: gps.dist || null,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    }
    const { data, error } = await supabase.from('attendance').insert(record).select().single()
    if (!error && data) {
      setTodayRecord(data)
      setIsIn(true)
      setCiTime(fmtTime(checkIn, tz))
      setEvents(prev => [...prev, { type: 'ci', time: fmtTime(checkIn, tz) }])
    }
    setLoading(false)
  }

  // ── Check Out ──
  function doCheckout() {
    setConfirmAction({
      label: 'Registrar Salida',
      desc: '¿Confirmas que estás terminando tu turno?',
      icon: '✕',
      color: '#ef4444',
      onConfirm: () => {
        setConfirmAction(null)
        if (emp?.skip_photo) {
          proceedCheckout()
        } else {
          setShowCamera('out')
        }
      }
    })
  }

  function proceedCheckout() {
    setShowCamera(null)
    if (emp?.skip_sales) {
      finishCheckout(null, null)
    } else {
      setShowSalesModal(true)
    }
  }

  // Called after camera modal for checkout
  async function handleCheckoutPhoto(blob) {
    setShowCamera(null)
    // Store blob temporarily, then show sales modal or finish
    if (emp?.skip_sales) {
      await finishCheckout(null, blob)
    } else {
      // Store blob so finishCheckout can use it
      pendingCheckoutPhotoRef.current = blob
      setShowSalesModal(true)
    }
  }

  const pendingCheckoutPhotoRef = useRef(null)

  async function finishCheckout(salesAmount, photoBlob) {
    setShowSalesModal(false)
    if (!todayRecord) return
    const tz       = site?.timezone || 'America/Cancun'
    const checkOut = new Date()
    const ciDate   = new Date(todayRecord.check_in)
    const lunchMins = todayRecord.lunch_start && todayRecord.lunch_end
      ? (new Date(todayRecord.lunch_end) - new Date(todayRecord.lunch_start)) / 60000 : 0
    const hrs = ((checkOut - ciDate) / 3600000 - lunchMins / 60).toFixed(1)

    // Upload checkout photo
    const blob = photoBlob ?? pendingCheckoutPhotoRef.current
    pendingCheckoutPhotoRef.current = null
    const photoUrlOut = await uploadPhoto(blob, 'out')

    await supabase.from('attendance').update({
      check_out: checkOut.toISOString(),
      hours_worked: parseFloat(hrs),
      ...(salesAmount !== null ? { sales_amount: salesAmount } : {}),
      ...(photoUrlOut ? { photo_url_out: photoUrlOut } : {}),
    }).eq('id', todayRecord.id)

    setIsIn(false); setIsDone(true); setOnLunch(false); setOnBreak(false)
    setCoTime(fmtTime(checkOut, tz))
    const newEvs = [{ type: 'co', time: fmtTime(checkOut, tz) }]
    if (salesAmount !== null && salesAmount > 0) newEvs.push({ type: 'sale', time: fmtTime(checkOut, tz), amount: salesAmount })
    setEvents(prev => [...prev, ...newEvs])
  }

  function requestLunch(start) {
    setConfirmAction({
      label: start ? 'Inicio de Comida' : 'Regreso de Comida',
      desc: start ? '¿Vas a tomar tu tiempo de comida?' : '¿Confirmas que regresas de la comida?',
      icon: '☕',
      color: '#f59e0b',
      onConfirm: () => { setConfirmAction(null); doLunch(start) }
    })
  }

  function requestBreak(start) {
    setConfirmAction({
      label: start ? 'Inicio de Descanso' : 'Regreso de Descanso',
      desc: start ? '¿Vas a tomar un descanso?' : '¿Confirmas que regresas del descanso?',
      icon: '⏸',
      color: '#3b82f6',
      onConfirm: () => { setConfirmAction(null); doBreak(start) }
    })
  }

  async function doLunch(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'
    const t  = new Date()
    if (start) {
      await supabase.from('attendance').update({ lunch_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(true); setEvents(prev => [...prev, { type: 'ls', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ lunch_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(false); setEvents(prev => [...prev, { type: 'le', time: fmtTime(t, tz) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'lunch_start' : 'lunch_end']: t.toISOString() }))
  }

  async function doBreak(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'
    const t  = new Date()
    if (start) {
      await supabase.from('attendance').update({ break_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(true); setEvents(prev => [...prev, { type: 'bs', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ break_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(false); setEvents(prev => [...prev, { type: 'be', time: fmtTime(t, tz) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'break_start' : 'break_end']: t.toISOString() }))
  }

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
              ${Number(todayRecord.sales_amount).toLocaleString('es-MX')} en ventas
            </div>
          )}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2a45', fontSize: 11, color: '#4a5568' }}>¡Hasta mañana!</div>
        </div>
        {events.length > 0 && (
          <div style={S.timeline}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registro del Día</div>
            {events.map((e, i) => (
              <div key={i} style={S.tItem}>
                <span style={S.dot(evMeta[e.type]?.[0] || '#4a5568')} />
                <span style={{ width: 44, color: '#8892a8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{e.time}</span>
                <span style={{ color: '#8892a8', flex: 1 }}>{evMeta[e.type]?.[1] || 'Acción'}</span>
                {e.type === 'sale' && <span style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>${Number(e.amount).toLocaleString('es-MX')}</span>}
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
      {/* Camera modal — 'in' or 'out' */}
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

        {/* ── Card principal ── */}
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{emp?.name}</div>
          <div style={S.sub}>{emp?.role}</div>
          <div style={{ ...S.muted, marginTop: 2 }}>{site?.name}</div>
          <div style={S.clock}>{fmtTime(now, tz)}</div>
          <div style={S.muted}>{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })}</div>

          {/* Banner "Ya registraste tu entrada" cuando isIn */}
          {isIn && !isDone && (
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Ya registraste tu entrada</div>
                <div style={{ fontSize: 11, color: '#8892a8', fontFamily: "'JetBrains Mono'" }}>a las {ciTime}</div>
              </div>
            </div>
          )}

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
            {todayRecord?.status && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Registro</div>
                <div style={{ marginTop: 2 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: todayRecord.status === 'on_time' ? '#10b981' : todayRecord.status === 'tolerancia' ? '#06b6d4' : '#f59e0b', background: todayRecord.status === 'on_time' ? 'rgba(16,185,129,.12)' : todayRecord.status === 'tolerancia' ? 'rgba(6,182,212,.12)' : 'rgba(245,158,11,.12)' }}>
                    {todayRecord.status === 'on_time' ? 'Puntual' : todayRecord.status === 'tolerancia' ? 'Tolerancia' : 'Retardo'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

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
            style={{
              ...S.actBtn(isIn || isDone || loading || (!gpsOk && gps.status !== 'idle')),
              ...(!isIn && !isDone && gpsOk ? { background: 'rgba(16,185,129,.08)', border: '2px solid rgba(16,185,129,.4)' } : {}),
            }}
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
                {e.type === 'sale' && <span style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>${Number(e.amount).toLocaleString('es-MX')}</span>}
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
}
