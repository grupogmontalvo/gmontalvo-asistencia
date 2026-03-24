export const metadata = {
  title: 'Worktic — Control de asistencia reinventado',
  description: 'Plataforma de gestión de asistencia diseñada para equipos en campo. Sin apps complejas. Entra, marca, listo.',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --negro: #1A1A18;
    --verde: #1D9E75;
    --verde-medio: #5DCAA5;
    --verde-fondo: #E1F5EE;
    --verde-claro: #C0E8D8;
    --gris: #6B6A65;
    --blanco: #FAFAF8;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--negro);
    color: var(--blanco);
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 0;
    opacity: 0.6;
  }

  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 20px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    backdrop-filter: blur(20px);
    background: rgba(26,26,24,0.85);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: var(--negro);
    border: 1.5px solid var(--verde);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 18px;
    color: var(--verde);
    position: relative;
  }

  .logo-icon::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 4px; right: 4px;
    height: 2px;
    background: var(--verde);
    border-radius: 2px;
  }

  .logo-text {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 18px;
    color: var(--blanco);
    letter-spacing: -0.3px;
  }

  .nav-cta {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .nav-link {
    color: rgba(250,250,248,0.55);
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    transition: color 0.2s;
  }
  .nav-link:hover { color: var(--blanco); }

  .btn-nav {
    background: var(--verde);
    color: var(--negro);
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s;
  }
  .btn-nav:hover { background: var(--verde-medio); transform: translateY(-1px); }

  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 120px 24px 80px;
    position: relative;
  }

  .hero-glow {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(29,158,117,0.18) 0%, transparent 70%);
    pointer-events: none;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(29,158,117,0.12);
    border: 1px solid rgba(29,158,117,0.3);
    color: var(--verde-medio);
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 32px;
    animation: fadeUp 0.6s ease both;
  }

  .badge-dot {
    width: 6px; height: 6px;
    background: var(--verde);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(48px, 7vw, 88px);
    line-height: 1.05;
    letter-spacing: -2px;
    max-width: 800px;
    margin-bottom: 24px;
    animation: fadeUp 0.6s 0.1s ease both;
  }

  .hero h1 em {
    font-style: italic;
    color: var(--verde);
  }

  .hero p {
    font-size: clamp(16px, 2vw, 20px);
    color: rgba(250,250,248,0.6);
    max-width: 520px;
    line-height: 1.6;
    font-weight: 300;
    margin-bottom: 48px;
    animation: fadeUp 0.6s 0.2s ease both;
  }

  .hero-actions {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    animation: fadeUp 0.6s 0.3s ease both;
  }

  .btn-primary {
    background: var(--verde);
    color: var(--negro);
    padding: 14px 32px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  .btn-primary:hover { background: var(--verde-medio); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(29,158,117,0.3); }

  .btn-secondary {
    color: rgba(250,250,248,0.7);
    padding: 14px 24px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 400;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: color 0.2s;
  }
  .btn-secondary:hover { color: var(--blanco); }

  .hero-visual {
    margin-top: 80px;
    width: 100%;
    max-width: 900px;
    position: relative;
    animation: fadeUp 0.8s 0.4s ease both;
  }

  .mockup-frame {
    background: #111110;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,158,117,0.1);
  }

  .mockup-topbar {
    background: #1A1A18;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #FF5F57; }
  .dot-y { background: #FFBD2E; }
  .dot-g { background: #28CA41; }

  .mockup-url {
    margin-left: 12px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    padding: 4px 16px;
    font-size: 12px;
    color: rgba(250,250,248,0.3);
  }

  .mockup-body {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 340px;
  }

  .mockup-sidebar {
    background: #161614;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 20px 16px;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    margin-bottom: 24px;
  }

  .sidebar-logo-icon {
    width: 28px; height: 28px;
    background: var(--verde);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 14px;
    color: var(--negro);
    font-weight: bold;
  }

  .sidebar-logo-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--blanco);
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: rgba(250,250,248,0.45);
    margin-bottom: 2px;
  }

  .sidebar-item.active {
    background: rgba(29,158,117,0.12);
    color: var(--verde-medio);
  }

  .sidebar-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .mockup-content { padding: 20px 24px; }

  .content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .content-title { font-size: 15px; font-weight: 600; color: var(--blanco); }
  .content-date  { font-size: 12px; color: var(--gris); }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 14px;
  }

  .stat-label { font-size: 11px; color: var(--gris); margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 600; font-family: 'DM Serif Display', serif; }
  .stat-value.green  { color: var(--verde); }
  .stat-value.yellow { color: #F5A623; }
  .stat-value.red    { color: #E05252; }

  .table-header {
    display: grid;
    grid-template-columns: 1fr 80px 80px 70px;
    gap: 8px;
    padding: 0 12px 8px;
    font-size: 11px;
    color: var(--gris);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 8px;
  }

  .table-row {
    display: grid;
    grid-template-columns: 1fr 80px 80px 70px;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    align-items: center;
    font-size: 13px;
  }
  .table-row:hover { background: rgba(255,255,255,0.03); }

  .employee-name { display: flex; align-items: center; gap: 8px; }

  .avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .pill { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 500; }
  .pill-green  { background: rgba(29,158,117,0.15); color: var(--verde-medio); }
  .pill-yellow { background: rgba(245,166,35,0.15);  color: #F5A623; }
  .pill-red    { background: rgba(224,82,82,0.15);   color: #E05252; }

  .features {
    padding: 120px 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .section-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--verde);
    margin-bottom: 16px;
  }

  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(36px, 4vw, 52px);
    line-height: 1.1;
    letter-spacing: -1.5px;
    max-width: 560px;
    margin-bottom: 64px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    background: rgba(255,255,255,0.06);
    border-radius: 16px;
    overflow: hidden;
  }

  .feature-card { background: var(--negro); padding: 40px 32px; transition: background 0.2s; }
  .feature-card:hover { background: #1f1f1d; }

  .feature-icon {
    width: 44px; height: 44px;
    background: rgba(29,158,117,0.12);
    border: 1px solid rgba(29,158,117,0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 20px;
  }

  .feature-title { font-size: 17px; font-weight: 600; margin-bottom: 10px; color: var(--blanco); }
  .feature-desc  { font-size: 14px; color: rgba(250,250,248,0.5); line-height: 1.6; font-weight: 300; }

  .divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 0 48px; }

  .contact {
    padding: 120px 48px;
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
  }

  .contact-left h2 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(36px, 4vw, 52px);
    line-height: 1.1;
    letter-spacing: -1.5px;
    margin-bottom: 20px;
  }

  .contact-left p {
    font-size: 16px;
    color: rgba(250,250,248,0.5);
    line-height: 1.65;
    font-weight: 300;
    margin-bottom: 40px;
  }

  .contact-details { display: flex; flex-direction: column; gap: 16px; }

  .contact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    color: rgba(250,250,248,0.7);
  }

  .contact-item-icon {
    width: 36px; height: 36px;
    background: rgba(29,158,117,0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .contact-form {
    background: #111110;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    padding: 40px;
  }

  .form-title    { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
  .form-subtitle { font-size: 14px; color: var(--gris); margin-bottom: 32px; }
  .form-group    { margin-bottom: 20px; }

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: rgba(250,250,248,0.6);
    margin-bottom: 8px;
  }

  .form-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 14px;
    color: var(--blanco);
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s;
    outline: none;
  }
  .form-input::placeholder { color: rgba(250,250,248,0.25); }
  .form-input:focus { border-color: var(--verde); }

  textarea.form-input { resize: vertical; min-height: 100px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .btn-submit {
    width: 100%;
    background: var(--verde);
    color: var(--negro);
    border: none;
    padding: 14px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    margin-top: 8px;
    transition: all 0.2s;
  }
  .btn-submit:hover { background: var(--verde-medio); transform: translateY(-1px); }

  footer {
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 40px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-copy  { font-size: 13px; color: rgba(250,250,248,0.3); }
  .footer-links { display: flex; gap: 24px; }
  .footer-link  { font-size: 13px; color: rgba(250,250,248,0.3); text-decoration: none; transition: color 0.2s; }
  .footer-link:hover { color: rgba(250,250,248,0.7); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    nav { padding: 16px 20px; }
    .nav-cta .nav-link { display: none; }
    .features { padding: 80px 20px; }
    .features-grid { grid-template-columns: 1fr; }
    .contact { grid-template-columns: 1fr; padding: 80px 20px; gap: 48px; }
    footer { flex-direction: column; gap: 16px; text-align: center; padding: 32px 20px; }
    .mockup-body { grid-template-columns: 1fr; }
    .mockup-sidebar { display: none; }
    .form-grid { grid-template-columns: 1fr; }
  }
`

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-icon">W</div>
          <span className="logo-text">Worktic</span>
        </a>
        <div className="nav-cta">
          <a href="#caracteristicas" className="nav-link">Características</a>
          <a href="#contacto" className="nav-link">Contacto</a>
          <a href="https://gmontalvo-asistencia.vercel.app/admin" className="btn-nav">Iniciar sesión →</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="badge">
          <span className="badge-dot"></span>
          Control de asistencia para negocios reales
        </div>
        <h1>Sabe quién trabaja,<br /><em>cuándo y dónde.</em></h1>
        <p>Worktic es la plataforma de gestión de asistencia diseñada para equipos en campo. Sin apps complejas. Entra, marca, listo.</p>
        <div className="hero-actions">
          <a href="#contacto" className="btn-primary">
            Solicitar demo
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#caracteristicas" className="btn-secondary">
            Ver características
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* MOCKUP */}
        <div className="hero-visual">
          <div className="mockup-frame">
            <div className="mockup-topbar">
              <div className="dot dot-r"></div>
              <div className="dot dot-y"></div>
              <div className="dot dot-g"></div>
              <div className="mockup-url">worktic.app/admin</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="sidebar-logo">
                  <div className="sidebar-logo-icon">W</div>
                  <span className="sidebar-logo-text">Worktic</span>
                </div>
                <div className="sidebar-item active"><span className="sidebar-dot"></span> Asistencia</div>
                <div className="sidebar-item"><span className="sidebar-dot"></span> Empleados</div>
                <div className="sidebar-item"><span className="sidebar-dot"></span> Sitios</div>
                <div className="sidebar-item"><span className="sidebar-dot"></span> Horarios</div>
                <div className="sidebar-item"><span className="sidebar-dot"></span> Reportes</div>
              </div>
              <div className="mockup-content">
                <div className="content-header">
                  <span className="content-title">Hoy — Semana 12</span>
                  <span className="content-date">Martes 24 mar 2026</span>
                </div>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-label">A tiempo</div>
                    <div className="stat-value green">14</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Tardanza</div>
                    <div className="stat-value yellow">2</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Ausentes</div>
                    <div className="stat-value red">1</div>
                  </div>
                </div>
                <div className="table-header">
                  <span>Empleado</span><span>Entrada</span><span>Salida</span><span>Estado</span>
                </div>
                <div className="table-row">
                  <div className="employee-name">
                    <div className="avatar" style={{ background: 'rgba(29,158,117,0.2)', color: '#5DCAA5' }}>JL</div>
                    Juan López
                  </div>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>09:01</span>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>18:58</span>
                  <span className="pill pill-green">✓ OK</span>
                </div>
                <div className="table-row">
                  <div className="employee-name">
                    <div className="avatar" style={{ background: 'rgba(245,166,35,0.2)', color: '#F5A623' }}>AG</div>
                    Ana García
                  </div>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>09:18</span>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>—</span>
                  <span className="pill pill-yellow">⚠ Tarde</span>
                </div>
                <div className="table-row">
                  <div className="employee-name">
                    <div className="avatar" style={{ background: 'rgba(224,82,82,0.2)', color: '#E05252' }}>MR</div>
                    Mario Ruiz
                  </div>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>—</span>
                  <span style={{ color: 'rgba(250,250,248,.6)' }}>—</span>
                  <span className="pill pill-red">✕ Ausente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="caracteristicas">
        <div className="section-label">Características</div>
        <h2 className="section-title">Todo lo que necesitas.<br />Nada que no.</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <div className="feature-title">Check-in por QR + GPS</div>
            <div className="feature-desc">El empleado escanea el QR de su sucursal. El sistema valida que esté físicamente en el lugar. Sin trampa posible.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <div className="feature-title">Selfie de entrada y salida</div>
            <div className="feature-desc">Foto automática en cada check-in y check-out. Registro visual inalterable, guardado en la nube.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <div className="feature-title">Horarios flexibles</div>
            <div className="feature-desc">Cada empleado puede tener sitio y horario diferente cada día. Sin plantillas rígidas. Ideal para equipos rotativos.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏪</div>
            <div className="feature-title">Multi-sucursal</div>
            <div className="feature-desc">Administra todas tus tiendas desde un solo panel. Los gerentes solo ven sus ubicaciones asignadas.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <div className="feature-title">Reportes en tiempo real</div>
            <div className="feature-desc">Quién está presente, quién llegó tarde, quién no se presentó. Todo visible al instante, filtrable por semana y sucursal.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <div className="feature-title">Sin apps que instalar</div>
            <div className="feature-desc">Funciona desde el navegador del teléfono. El empleado solo necesita su correo la primera vez. Después, entra solo.</div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* CONTACT */}
      <section className="contact" id="contacto">
        <div className="contact-left">
          <div className="section-label">Contacto</div>
          <h2>¿Listo para<br /><em style={{ fontStyle: 'italic', color: 'var(--verde)' }}>probarlo?</em></h2>
          <p>Cuéntanos sobre tu negocio. Te mostramos cómo Worktic se adapta a tu operación y te damos acceso a una demo en vivo.</p>
          <div className="contact-details">
            <div className="contact-item">
              <div className="contact-item-icon">✉️</div>
              hola@worktic.app
            </div>
            <div className="contact-item">
              <div className="contact-item-icon">📱</div>
              WhatsApp disponible
            </div>
            <div className="contact-item">
              <div className="contact-item-icon">⚡</div>
              Respuesta en menos de 24 hrs
            </div>
          </div>
        </div>
        <div className="contact-form">
          <div className="form-title">Solicitar demo</div>
          <div className="form-subtitle">Sin compromisos. Te contactamos nosotros.</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" type="text" placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <input className="form-input" type="text" placeholder="Nombre del negocio" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input className="form-input" type="email" placeholder="tu@empresa.com" />
          </div>
          <div className="form-group">
            <label className="form-label">¿Cuántos empleados tienes?</label>
            <input className="form-input" type="text" placeholder="Ej. 15 empleados en 3 sucursales" />
          </div>
          <div className="form-group">
            <label className="form-label">Mensaje (opcional)</label>
            <textarea className="form-input" placeholder="Cuéntanos sobre tu operación..."></textarea>
          </div>
          <button className="btn-submit">Enviar solicitud →</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-copy">© 2026 Worktic. Todos los derechos reservados.</div>
        <div className="footer-links">
          <a href="#" className="footer-link">Privacidad</a>
          <a href="#" className="footer-link">Términos</a>
          <a href="https://gmontalvo-asistencia.vercel.app/admin" className="footer-link">Admin →</a>
        </div>
      </footer>
    </>
  )
}
