'use client'
import { useState, useEffect } from 'react'
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
  actBtn: (bg, color, disabled) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 10px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, border: '1px solid #1e2a45', background: '#1a2035', color: '#f1f5f9', opacity: disabled ? 0.3 : 1 }),
  actIcon: (bg, color) => ({ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }),
  err: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', textAlign: 'center' },
  gps: (ok) => ({ padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid', borderColor: ok ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)', background: ok ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', color: ok ? '#10b981' : '#f59e0b' }),
  timeline: { background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 16 },
  tItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 12 },
  dot: (c) => ({ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }),
  sub: { fontSize: 12, color: '#8892a8' },
  muted: { fontSize: 11, color: '#4a5568' },
  status: (c, bg) => ({ display: 'inline-flex', padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, color: c, background: bg }),
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371e3, toR = n => n * Math.PI / 180
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtTime(d) { return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) }

export default function CheckinPage({ params }) {
  const siteCode = params.code
  const [site, setSite] = useState(null)
  const [emp, setEmp] = useState(null)
  const [step, setStep] = useState('loading') // loading | email | checkin | error
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [gps, setGps] = useState({ status: 'idle' })
  const [now, setNow] = useState(new Date())
  const [isIn, setIsIn] = useState(false)
  const [onLunch, setOnLunch] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const [ciTime, setCiTime] = useState(null)
  const [events, setEvents] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  // Load site and check device
  useEffect(() => {
    async function init() {
      // Find site by code
      const { data: siteData } = await supabase.from('sites').select('*').eq('code', siteCode).eq('active', true).single()
      if (!siteData) { setStep('error'); return }
      setSite(siteData)

      // Check if device is registered
      const token = localStorage.getItem('gm-device-token')
      if (token) {
        const { data: device } = await supabase.from('devices').select('*, employees(*)').eq('device_token', token).single()
        if (device?.employees) {
          setEmp(device.employees)
          await loadTodayRecord(device.employees.id, siteData.id)
          checkGPS(siteData)
          setStep('checkin')
          // Update last used
          await supabase.from('devices').update({ last_used: new Date().toISOString() }).eq('device_token', token)
          return
        }
      }
      setStep('email')
    }
    init()
  }, [siteCode])

  async function loadTodayRecord(empId, siteId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('attendance').select('*').eq('employee_id', empId).eq('date', today).single()
    if (data) {
      setTodayRecord(data)
      if (data.check_in && !data.check_out) {
        setIsIn(true)
        setCiTime(new Date(data.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }))
      }
      if (data.lunch_start && !data.lunch_end) setOnLunch(true)
      if (data.break_start && !data.break_end) setOnBreak(true)
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
    
    // Register device
    const token = crypto.randomUUID()
    localStorage.setItem('gm-device-token', token)
    await supabase.from('devices').insert({ device_token: token, employee_id: empData.id, user_agent: navigator.userAgent })
    
    setEmp(empData)
    await loadTodayRecord(empData.id, site.id)
    checkGPS(site)
    setStep('checkin')
  }

  function calcStatus(checkInTime) {
    const dayNum = checkInTime.getDay()
    // Get schedule for today - we'll check against site grace
    const schedTime = null // Will be enhanced later
    const grace = site?.grace_mins || 5
    const absentMin = site?.absent_mins || 15
    // For now, calculate based on simple check-in time
    return 'on_time' // Will be calculated with schedule data
  }

  async function doCheckin() {
    const checkIn = new Date()
    const today = checkIn.toISOString().split('T')[0]
    
    const record = {
      employee_id: emp.id,
      site_id: site.id,
      date: today,
      status: 'on_time', // TODO: calculate with schedule
      check_in: checkIn.toISOString(),
      gps_lat: gps.lat || null,
      gps_lng: gps.lng || null,
      gps_distance_m: gps.dist || null,
    }

    const { data, error } = await supabase.from('attendance').upsert(record, { onConflict: 'employee_id,date' }).select().single()
    if (!error && data) {
      setTodayRecord(data)
      setIsIn(true)
      setCiTime(fmtTime(checkIn))
      setEvents(prev => [...prev, { type: 'ci', time: fmtTime(checkIn) }])
    }
  }

  async function doCheckout() {
    if (!todayRecord) return
    const checkOut = new Date()
    const ciDate = new Date(todayRecord.check_in)
    const lunchMins = todayRecord.lunch_start && todayRecord.lunch_end
      ? (new Date(todayRecord.lunch_end) - new Date(todayRecord.lunch_start)) / 60000
      : 0
    const hrs = ((checkOut - ciDate) / 3600000 - lunchMins / 60).toFixed(1)

    await supabase.from('attendance').update({ check_out: checkOut.toISOString(), hours_worked: parseFloat(hrs) }).eq('id', todayRecord.id)
    setIsIn(false); setOnLunch(false); setOnBreak(false)
    setEvents(prev => [...prev, { type: 'co', time: fmtTime(checkOut) }])
  }

  async function doLunch(start) {
    if (!todayRecord) return
    const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ lunch_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(true)
      setEvents(prev => [...prev, { type: 'ls', time: fmtTime(t) }])
    } else {
      await supabase.from('attendance').update({ lunch_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(false)
      setEvents(prev => [...prev, { type: 'le', time: fmtTime(t) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'lunch_start' : 'lunch_end']: t.toISOString() }))
  }

  async function doBreak(start) {
    if (!todayRecord) return
    const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ break_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(true)
      setEvents(prev => [...prev, { type: 'bs', time: fmtTime(t) }])
    } else {
      await supabase.from('attendance').update({ break_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(false)
      setEvents(prev => [...prev, { type: 'be', time: fmtTime(t) }])
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
    ci: ['#10b981', 'Check In'], co: ['#ef4444', 'Check Out'],
    ls: ['#f59e0b', 'Inicio Comida'], le: ['#f59e0b', 'Fin Comida'],
    bs: ['#3b82f6', 'Inicio Descanso'], be: ['#3b82f6', 'Fin Descanso']
  }

  // ─── Loading ───
  if (step === 'loading') return (
    <div style={S.page}><div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}><p style={S.sub}>Cargando...</p></div>
    </div>
  )

  // ─── Error ───
  if (step === 'error') return (
    <div style={S.page}><div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={S.err}>Codigo de sitio no encontrado: <strong>{siteCode}</strong></div>
      </div>
    </div>
  )

  // ─── Email Step ───
  if (step === 'email') return (
    <div style={S.page}>
      <div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name || 'G.Montalvo'}</span></div>
      <div style={S.container}>
        <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Bienvenido</div>
          <p style={S.sub}>Ingresa el email con el que te registraron. Solo se pide una vez en este dispositivo.</p>
        </div>
        <input
          style={S.input} type="email" value={email}
          onChange={e => { setEmail(e.target.value); setEmailErr('') }}
          onKeyDown={e => { if (e.key === 'Enter') tryEmail() }}
          placeholder="tu@email.com" autoFocus
        />
        {emailErr && <div style={S.err}>{emailErr}</div>}
        <button style={S.btnP} onClick={tryEmail}>Continuar</button>
        <p style={{ ...S.muted, textAlign: 'center' }}>Si no conoces tu email, pregunta a tu administrador.</p>
      </div>
    </div>
  )

  // ─── Check-in Step ───
  const gpsOk = gps.status === 'ok'
  return (
    <div style={S.page}>
      <div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name}</span></div>
      <div style={S.container}>
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{emp?.name}</div>
          <div style={S.sub}>{emp?.role}</div>
          <div style={{ ...S.muted, marginTop: 2 }}>{site?.name}</div>
          <div style={S.clock}>{fmtTime(now)}</div>
          <div style={S.muted}>{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2a45', display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Estado</div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: isIn ? (onLunch ? '#f59e0b' : onBreak ? '#3b82f6' : '#10b981') : '#4a5568' }}>
                {!isIn ? 'Sin registrar' : onLunch ? 'En comida' : onBreak ? 'En descanso' : 'Trabajando'}
              </div>
            </div>
            {ciTime && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Entrada</div>
              <div className="mono" style={{ marginTop: 2, fontSize: 13 }}>{ciTime}</div>
            </div>}
          </div>
        </div>

        {/* GPS */}
        <div style={S.gps(gpsOk)}>
          <span>📍</span>
          <span style={{ flex: 1 }}>
            {gps.status === 'idle' && 'Verificando ubicacion...'}
            {gps.status === 'loading' && 'Obteniendo GPS...'}
            {gps.status === 'ok' && `Ubicacion verificada (${gps.dist || 0}m)`}
            {gps.status === 'far' && `Fuera de rango: ${gps.dist}m (max ${gps.max}m)`}
            {gps.status === 'denied' && 'GPS no disponible'}
          </span>
          {(gps.status === 'denied' || gps.status === 'far') &&
            <button onClick={() => checkGPS(site)} style={{ background: 'none', border: '1px solid #1e2a45', color: '#f1f5f9', padding: '4px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Reintentar</button>}
        </div>

        {/* Action Buttons */}
        <div style={S.btnGrid}>
          <button style={S.actBtn('var(--gnb)', 'var(--gn)', isIn || (!gpsOk && gps.status !== 'idle'))} disabled={isIn || (!gpsOk && gps.status !== 'idle')} onClick={doCheckin}>
            <div style={S.actIcon('rgba(16,185,129,.12)', '#10b981')}>✓</div>Check In
          </button>
          <button style={S.actBtn('var(--rdb)', 'var(--rd)', !isIn || onLunch || onBreak)} disabled={!isIn || onLunch || onBreak} onClick={doCheckout}>
            <div style={S.actIcon('rgba(239,68,68,.12)', '#ef4444')}>✕</div>Check Out
          </button>
          <button style={S.actBtn('var(--amb2)', 'var(--am)', !isIn || onBreak)} disabled={!isIn || onBreak} onClick={() => doLunch(!onLunch)}>
            <div style={S.actIcon('rgba(245,158,11,.12)', '#f59e0b')}>☕</div>{onLunch ? 'Fin Comida' : 'Comida'}
          </button>
          <button style={S.actBtn('var(--blb)', 'var(--ac)', !isIn || onLunch)} disabled={!isIn || onLunch} onClick={() => doBreak(!onBreak)}>
            <div style={S.actIcon('rgba(59,130,246,.12)', '#3b82f6')}>⏸</div>{onBreak ? 'Fin Descanso' : 'Descanso'}
          </button>
        </div>

        {/* Timeline */}
        {events.length > 0 && <div style={S.timeline}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registro del Dia</div>
          {events.map((e, i) => (
            <div key={i} style={S.tItem}>
              <span style={S.dot(evMeta[e.type]?.[0] || '#4a5568')} />
              <span className="mono" style={{ width: 44, color: '#8892a8', fontSize: 11 }}>{e.time}</span>
              <span style={{ color: '#8892a8' }}>{evMeta[e.type]?.[1] || 'Accion'}</span>
            </div>
          ))}
        </div>}

        {/* Logout */}
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textAlign: 'center', padding: 8, fontFamily: "'DM Sans'" }}>
          Cerrar sesion (cambiar dispositivo)
        </button>
      </div>
    </div>
  )
}
