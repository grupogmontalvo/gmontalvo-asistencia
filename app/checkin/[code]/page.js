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
function fmtTime(d, tz) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || 'America/Cancun' })
}

function SalesModal({ onConfirm, onSkip }) {
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState('')
  function handleConfirm() {
    const val = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(val) || val < 0) { setErr('Ingresa un monto valido'); return }
    onConfirm(val)
  }
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(6px)', padding: '0 16px' }}>
      <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 18, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>💰</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Cierre del Dia</div>
        <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 22 }}>¿Cuanto vendiste hoy?<br /><span style={{ fontSize: 11, color: '#4a5568' }}>Puedes omitirlo si no aplica.</span></div>
        <div style={{ position: 'relative', marginBottom: err ? 8 : 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#4a5568', pointerEvents: 'none' }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => { setAmount(e.target.value); setErr('') }} onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }} autoFocus style={{ width: '100%', background: '#0d1220', border: '1px solid ' + (err ? '#ef4444' : '#1e2a45'), color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, padding: '16px 16px 16px 36px', borderRadius: 12, outline: 'none', textAlign: 'right', boxSizing: 'border-box' }} />
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

export default function CheckinPage({ params }) {
  const siteCode = params.code
  const [site, setSite] = useState(null)
  const [emp, setEmp] = useState(null)
  const [step, setStep] = useState('loading')
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
  const [schedule, setSchedule] = useState(null)
  const [showSalesModal, setShowSalesModal] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  async function loadSchedule(empId) {
    const dayNum = new Date().getDay()
    const { data } = await supabase.from('schedules').select('*').eq('employee_id', empId).eq('day_of_week', dayNum).maybeSingle()
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
          await loadSchedule(device.employees.id)
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
      if (data.check_in && !data.check_out) {
        setIsIn(true)
        setCiTime(fmtTime(new Date(data.check_in), tz))
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
    const token = crypto.randomUUID()
    localStorage.setItem('gm-device-token', token)
    await supabase.from('devices').insert({ device_token: token, employee_id: empData.id, user_agent: navigator.userAgent })
    setEmp(empData)
    await loadTodayRecord(empData.id, site.id, site.timezone)
    await loadSchedule(empData.id)
    checkGPS(site)
    setStep('checkin')
  }

  async function calcStatus(checkInTime) {
    const tz = site?.timezone || 'America/Cancun'
    const dayNum = new Date(checkInTime.toLocaleDateString('en-CA', { timeZone: tz })).getDay()
    const grace = site?.grace_mins || 15
    const { data: sched } = await supabase.from('schedules').select('*').eq('employee_id', emp.id).eq('day_of_week', dayNum).maybeSingle()
    if (!sched) return null
    const [schedH, schedM] = sched.start_time.split(':').map(Number)
    const schedDate = new Date(checkInTime)
    schedDate.setHours(schedH, schedM, 0, 0)
    const diffMins = (checkInTime - schedDate) / 60000
    if (diffMins <= 0) return 'on_time'
    if (diffMins <= grace) return 'tolerancia'
    return 'late'
  }

  async function doCheckin() {
    const checkIn = new Date()
    const tz = site?.timezone || 'America/Cancun'
    const today = checkIn.toLocaleDateString('en-CA', { timeZone: tz })
    const status = await calcStatus(checkIn)
    const record = {
      employee_id: emp.id,
      site_id: site.id,
      date: today,
      status,
      check_in: checkIn.toISOString(),
      gps_lat: gps.lat || null,
      gps_lng: gps.lng || null,
      gps_distance_m: gps.dist || null,
    }
    const { data, error } = await supabase.from('attendance').insert(record).select().single()
    if (!error && data) {
      setTodayRecord(data)
      setIsIn(true)
      setCiTime(fmtTime(checkIn, tz))
      setEvents(prev => [...prev, { type: 'ci', time: fmtTime(checkIn, tz) }])
    }
  }

  function doCheckout() { setShowSalesModal(true) }

  async function finishCheckout(salesAmount) {
    setShowSalesModal(false)
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'
    const checkOut = new Date()
    const ciDate = new Date(todayRecord.check_in)
    const lunchMins = todayRecord.lunch_start && todayRecord.lunch_end
      ? (new Date(todayRecord.lunch_end) - new Date(todayRecord.lunch_start)) / 60000 : 0
    const hrs = ((checkOut - ciDate) / 3600000 - lunchMins / 60).toFixed(1)
    await supabase.from('attendance').update({
      check_out: checkOut.toISOString(),
      hours_worked: parseFloat(hrs),
      ...(salesAmount !== null ? { sales_amount: salesAmount } : {})
    }).eq('id', todayRecord.id)
    setIsIn(false); setOnLunch(false); setOnBreak(false)
    setEvents(prev => [...prev, { type: 'co', time: fmtTime(checkOut, tz) }])
    if (salesAmount !== null && salesAmount > 0) {
      setEvents(prev => [...prev, { type: 'sale', time: fmtTime(checkOut, tz), amount: salesAmount }])
    }
  }

  async function doLunch(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'
    const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ lunch_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(true)
      setEvents(prev => [...prev, { type: 'ls', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ lunch_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnLunch(false)
      setEvents(prev => [...prev, { type: 'le', time: fmtTime(t, tz) }])
    }
    setTodayRecord(prev => ({ ...prev, [start ? 'lunch_start' : 'lunch_end']: t.toISOString() }))
  }

  async function doBreak(start) {
    if (!todayRecord) return
    const tz = site?.timezone || 'America/Cancun'
    const t = new Date()
    if (start) {
      await supabase.from('attendance').update({ break_start: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(true)
      setEvents(prev => [...prev, { type: 'bs', time: fmtTime(t, tz) }])
    } else {
      await supabase.from('attendance').update({ break_end: t.toISOString() }).eq('id', todayRecord.id)
      setOnBreak(false)
      setEvents(prev => [...prev, { type: 'be', time: fmtTime(t, tz) }])
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
    bs: ['#3b82f6', 'Inicio Descanso'], be: ['#3b82f6', 'Fin Descanso'],
    sale: ['#10b981', 'Venta del dia'],
  }

  const tz = site?.timezone || 'America/Cancun'

  if (step === 'loading') return (
    <div style={S.page}><div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}><p style={S.sub}>Cargando...</p></div>
    </div>
  )

  if (step === 'error') return (
    <div style={S.page}><div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>G.Montalvo</span></div>
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={S.err}>Codigo de sitio no encontrado: <strong>{siteCode}</strong></div>
      </div>
    </div>
  )

  if (step === 'email') return (
    <div style={S.page}>
      <div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name || 'G.Montalvo'}</span></div>
      <div style={S.container}>
        <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Bienvenido</div>
          <p style={S.sub}>Ingresa el email con el que te registraron. Solo se pide una vez en este dispositivo.</p>
        </div>
        <input style={S.input} type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailErr('') }} onKeyDown={e => { if (e.key === 'Enter') tryEmail() }} placeholder="tu@email.com" autoFocus />
        {emailErr && <div style={S.err}>{emailErr}</div>}
        <button style={S.btnP} onClick={tryEmail}>Continuar</button>
        <p style={{ ...S.muted, textAlign: 'center' }}>Si no conoces tu email, pregunta a tu administrador.</p>
      </div>
    </div>
  )

  const gpsOk = gps.status === 'ok'
  return (
    <div style={S.page}>
      {showSalesModal && <SalesModal onConfirm={(amt) => finishCheckout(amt)} onSkip={() => finishCheckout(null)} />}
      <div style={S.bar}><img src="/logo.jpeg" style={S.logo} alt="GM" /><span style={{ fontSize: 13, fontWeight: 600 }}>{site?.name}</span></div>
      <div style={S.container}>
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{emp?.name}</div>
          <div style={S.sub}>{emp?.role}</div>
          <div style={{ ...S.muted, marginTop: 2 }}>{site?.name}</div>
          <div style={S.clock}>{fmtTime(now, tz)}</div>
          <div style={S.muted}>{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })}</div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2a45', display: 'flex', justifyContent: 'center', gap: 20 }}>
            {schedule && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Horario</div>
              <div style={{ marginTop: 2, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{schedule.start_time?.slice(0,5)} - {schedule.end_time?.slice(0,5)}</div>
            </div>}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Estado</div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: isIn ? (onLunch ? '#f59e0b' : onBreak ? '#3b82f6' : '#10b981') : '#4a5568' }}>
                {!isIn ? 'Sin registrar' : onLunch ? 'En comida' : onBreak ? 'En descanso' : 'Trabajando'}
              </div>
            </div>
            {ciTime && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Entrada</div>
              <div style={{ marginTop: 2, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{ciTime}</div>
            </div>}
            {todayRecord?.status && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.6px' }}>Registro</div>
              <div style={{ marginTop: 2 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: todayRecord.status === 'on_time' ? '#10b981' : todayRecord.status === 'tolerancia' ? '#06b6d4' : '#f59e0b', background: todayRecord.status === 'on_time' ? 'rgba(16,185,129,.12)' : todayRecord.status === 'tolerancia' ? 'rgba(6,182,212,.12)' : 'rgba(245,158,11,.12)' }}>
                  {todayRecord.status === 'on_time' ? 'Puntual' : todayRecord.status === 'tolerancia' ? 'Tolerancia' : 'Retardo'}
                </span>
              </div>
            </div>}
          </div>
        </div>

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

        {events.length > 0 && <div style={S.timeline}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Registro del Dia</div>
          {events.map((e, i) => (
            <div key={i} style={S.tItem}>
              <span style={S.dot(evMeta[e.type]?.[0] || '#4a5568')} />
              <span style={{ width: 44, color: '#8892a8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{e.time}</span>
              <span style={{ color: '#8892a8', flex: 1 }}>{evMeta[e.type]?.[1] || 'Accion'}</span>
              {e.type === 'sale' && <span style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>${Number(e.amount).toLocaleString('es-MX')}</span>}
            </div>
          ))}
        </div>}

        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textAlign: 'center', padding: 8, fontFamily: "'DM Sans'" }}>
          Cerrar sesion (cambiar dispositivo)
        </button>
      </div>
    </div>
  )
}
