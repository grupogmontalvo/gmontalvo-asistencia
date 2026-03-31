import ContactForm from './components/ContactForm'

export const metadata = {
  title: 'Worktic — Sabe quién trabaja, cuándo y dónde',
  description: 'Control de asistencia con QR + GPS para equipos en campo. Sin apps. Sin excusas. Notificaciones en tiempo real.',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --negro: #ffffff;
    --negro2: #f1f5f9;
    --negro3: #f8fafc;
    --verde: #1D9E75;
    --verde-medio: #5DCAA5;
    --verde-fondo: #E1F5EE;
    --gris: #6B7280;
    --gris-claro: #9CA3AF;
    --blanco: #0f172a;
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--negro);
    color: var(--blanco);
    overflow-x: hidden;
  }

  /* ── NAV ── */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 18px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    backdrop-filter: blur(20px);
    background: rgba(255,255,255,0.92);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .logo-icon {
    width: 34px; height: 34px;
    background: var(--verde);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 17px;
    color: #fff;
    font-weight: bold;
  }

  .logo-text {
    font-weight: 700;
    font-size: 17px;
    color: var(--blanco);
    letter-spacing: -0.3px;
  }

  .nav-cta {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .nav-link {
    color: rgba(15,23,42,0.5);
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    transition: color 0.2s;
  }
  .nav-link:hover { color: var(--blanco); }

  .btn-nav {
    background: transparent;
    color: rgba(15,23,42,0.75);
    border: 1px solid rgba(0,0,0,0.10);
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-nav:hover { border-color: rgba(0,0,0,0.20); color: var(--blanco); }

  .btn-nav-primary {
    background: var(--verde);
    color: #fff;
    border: 1px solid var(--verde);
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-nav-primary:hover { background: var(--verde-medio); border-color: var(--verde-medio); transform: translateY(-1px); }

  .btn-nav .txt-short { display: none; }
  .btn-nav-primary .txt-short { display: none; }

  /* ── HERO ── */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 120px 24px 80px;
    position: relative;
    overflow: hidden;
  }

  .hero-bg-glow {
    position: absolute;
    top: 0; left: 50%;
    transform: translateX(-50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse at center top, rgba(29,158,117,0.14) 0%, transparent 65%);
    pointer-events: none;
  }

  .hero-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(29,158,117,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(29,158,117,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse 80% 60% at center top, black 0%, transparent 70%);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(29,158,117,0.1);
    border: 1px solid rgba(29,158,117,0.25);
    color: var(--verde-medio);
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 12.5px;
    font-weight: 500;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.5s ease both;
  }

  .badge-dot {
    width: 6px; height: 6px;
    background: var(--verde);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.75); }
  }

  .hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(40px, 6.5vw, 80px);
    line-height: 1.06;
    letter-spacing: -2px;
    max-width: 780px;
    margin-bottom: 22px;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.5s 0.08s ease both;
  }

  .hero h1 em {
    font-style: italic;
    color: var(--verde);
  }

  .hero-sub {
    font-size: clamp(15px, 1.8vw, 19px);
    color: rgba(15,23,42,0.55);
    max-width: 500px;
    line-height: 1.65;
    font-weight: 300;
    margin-bottom: 44px;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.5s 0.16s ease both;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.5s 0.24s ease both;
  }

  .btn-primary {
    background: var(--verde);
    color: #fff;
    padding: 14px 28px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(29,158,117,0.25);
  }
  .btn-primary:hover { background: #18b584; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(29,158,117,0.35); }

  .btn-ghost {
    color: rgba(15,23,42,0.6);
    padding: 14px 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 400;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.2s;
  }
  .btn-ghost:hover { color: var(--blanco); }

  /* ── HERO VISUAL: split phone + browser ── */
  .hero-visual {
    margin-top: 72px;
    width: 100%;
    max-width: 960px;
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 24px;
    align-items: end;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.7s 0.32s ease both;
  }

  /* phone mockup */
  .phone-frame {
    background: #ffffff;
    border: 2px solid rgba(0,0,0,0.08);
    border-radius: 36px;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.08), 0 0 0 1px rgba(29,158,117,0.08);
    position: relative;
    padding-bottom: 16px;
  }

  .phone-notch {
    background: #ffffff;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .phone-notch-bar {
    width: 80px; height: 14px;
    background: #f1f5f9;
    border-radius: 0 0 10px 10px;
  }

  .phone-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 20px 8px;
    font-size: 10px;
    color: rgba(15,23,42,0.4);
  }

  .phone-body { padding: 0 16px 8px; }

  .phone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0 14px;
  }

  .phone-site-badge {
    background: rgba(29,158,117,0.15);
    border: 1px solid rgba(29,158,117,0.25);
    border-radius: 100px;
    padding: 3px 10px;
    font-size: 10px;
    color: var(--verde-medio);
    font-weight: 600;
  }

  .phone-gps {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--verde-medio);
  }
  .gps-dot {
    width: 6px; height: 6px;
    background: var(--verde);
    border-radius: 50%;
  }

  .phone-avatar-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 0 16px;
  }

  .phone-avatar {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(29,158,117,0.3), rgba(29,158,117,0.1));
    border: 2px solid rgba(29,158,117,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--verde-medio);
    overflow: hidden;
    position: relative;
  }

  .phone-avatar-img {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(29,158,117,0.15) 0%, rgba(255,255,255,0) 100%);
  }

  .phone-emp-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--blanco);
    text-align: center;
  }

  .phone-emp-role {
    font-size: 10px;
    color: var(--gris-claro);
    text-align: center;
  }

  .phone-kpis {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 14px;
  }

  .phone-kpi {
    background: rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 10px;
    padding: 10px;
    text-align: center;
  }

  .phone-kpi-val {
    font-size: 18px;
    font-weight: 700;
    color: var(--verde-medio);
    display: block;
    line-height: 1;
    margin-bottom: 4px;
  }

  .phone-kpi-label {
    font-size: 9px;
    color: var(--gris-claro);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .phone-btn-in {
    width: 100%;
    background: var(--verde);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 13px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: default;
  }

  .phone-btn-out {
    width: 100%;
    background: rgba(0,0,0,0.04);
    color: rgba(15,23,42,0.5);
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 12px;
    padding: 11px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: default;
  }

  /* browser mockup */
  .browser-frame {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.06), 0 0 0 1px rgba(29,158,117,0.06);
  }

  .browser-bar {
    background: #f8fafc;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .b-dot { width: 9px; height: 9px; border-radius: 50%; }
  .b-r { background: #FF5F57; }
  .b-y { background: #FFBD2E; }
  .b-g { background: #28CA41; }

  .browser-url {
    margin-left: 8px;
    background: rgba(0,0,0,0.04);
    border-radius: 5px;
    padding: 4px 14px;
    font-size: 11px;
    color: rgba(249,250,251,0.3);
    flex: 1;
    max-width: 200px;
  }

  .admin-body {
    display: grid;
    grid-template-columns: 180px 1fr;
    min-height: 280px;
  }

  .admin-sidebar {
    background: #0f1724;
    border-right: 1px solid rgba(0,0,0,0.05);
    padding: 16px 12px;
  }

  .admin-sidebar-logo {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 8px;
    margin-bottom: 20px;
  }

  .asl-icon {
    width: 24px; height: 24px;
    background: var(--verde);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #fff;
    font-weight: bold;
  }

  .asl-text { font-size: 12px; font-weight: 700; color: var(--blanco); }

  .admin-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 7px;
    font-size: 11.5px;
    color: rgba(15,23,42,0.4);
    margin-bottom: 1px;
  }

  .admin-nav-item.active {
    background: rgba(29,158,117,0.12);
    color: var(--verde-medio);
  }

  .admin-nav-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .admin-main { padding: 16px 20px; }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .admin-title { font-size: 13px; font-weight: 600; color: var(--blanco); }
  .admin-date  { font-size: 10.5px; color: var(--gris); }

  .admin-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  .a-stat {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .a-stat-lbl { font-size: 9.5px; color: var(--gris); margin-bottom: 4px; }
  .a-stat-val { font-size: 20px; font-weight: 700; font-family: 'DM Serif Display', serif; }
  .a-stat-val.g { color: var(--verde); }
  .a-stat-val.y { color: #F59E0B; }
  .a-stat-val.r { color: #EF4444; }

  .a-table-hdr {
    display: grid;
    grid-template-columns: 1fr 60px 60px 62px;
    gap: 6px;
    padding: 0 10px 6px;
    font-size: 9.5px;
    color: var(--gris);
    border-bottom: 1px solid rgba(0,0,0,0.05);
    margin-bottom: 4px;
  }

  .a-table-row {
    display: grid;
    grid-template-columns: 1fr 60px 60px 62px;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 6px;
    align-items: center;
    font-size: 11.5px;
  }
  .a-table-row:hover { background: rgba(255,255,255,0.02); }

  .a-emp { display: flex; align-items: center; gap: 6px; }

  .a-av {
    width: 20px; height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .a-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 9.5px;
    font-weight: 600;
  }
  .a-pill.g { background: rgba(29,158,117,0.15); color: var(--verde-medio); }
  .a-pill.y { background: rgba(245,158,11,0.15); color: #F59E0B; }
  .a-pill.r { background: rgba(239,68,68,0.15);  color: #EF4444; }

  /* ── SECTION SHARED ── */
  .section-label {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--verde);
    margin-bottom: 14px;
  }

  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(32px, 3.8vw, 50px);
    line-height: 1.08;
    letter-spacing: -1.5px;
  }

  .section-sub {
    font-size: 16px;
    color: rgba(15,23,42,0.5);
    line-height: 1.65;
    font-weight: 300;
    margin-top: 16px;
  }

  /* ── COMO FUNCIONA ── */
  .como {
    padding: 120px 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .como-header { max-width: 560px; margin-bottom: 72px; }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    position: relative;
  }

  .steps-grid::before {
    content: '';
    position: absolute;
    top: 30px;
    left: calc(16.66% + 20px);
    right: calc(16.66% + 20px);
    height: 1px;
    background: linear-gradient(90deg, var(--verde) 0%, rgba(29,158,117,0.15) 100%);
    pointer-events: none;
  }

  .step {
    position: relative;
  }

  .step-number {
    width: 48px; height: 48px;
    border-radius: 50%;
    background: rgba(29,158,117,0.1);
    border: 1.5px solid rgba(29,158,117,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 18px;
    color: var(--verde);
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }

  .step-icon {
    font-size: 22px;
    margin-bottom: 16px;
    display: block;
  }

  .step-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--blanco);
    margin-bottom: 10px;
    line-height: 1.3;
  }

  .step-desc {
    font-size: 14px;
    color: rgba(15,23,42,0.5);
    line-height: 1.65;
    font-weight: 300;
  }

  /* ── BENEFICIOS ── */
  .beneficios {
    padding: 0 48px 120px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .bene-header {
    max-width: 640px;
    margin-bottom: 60px;
  }

  .bene-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .bene-card {
    background: var(--negro2);
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 16px;
    padding: 32px;
    transition: border-color 0.2s, background 0.2s;
  }
  .bene-card:hover { border-color: rgba(29,158,117,0.2); background: #141e2f; }

  .bene-card.featured {
    background: linear-gradient(135deg, rgba(29,158,117,0.12) 0%, rgba(10,14,26,0) 60%);
    border-color: rgba(29,158,117,0.2);
  }

  .bene-icon {
    font-size: 28px;
    margin-bottom: 16px;
    display: block;
  }

  .bene-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--blanco);
    margin-bottom: 10px;
    line-height: 1.3;
  }

  .bene-desc {
    font-size: 14px;
    color: rgba(15,23,42,0.5);
    line-height: 1.65;
    font-weight: 300;
  }

  .bene-quote {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.05);
    font-size: 13px;
    color: var(--verde-medio);
    font-style: italic;
    font-weight: 400;
  }

  /* ── CTA BANNER ── */
  .cta-banner {
    margin: 0 48px 80px;
    max-width: 1004px;
    margin-left: auto;
    margin-right: auto;
    background: linear-gradient(135deg, rgba(29,158,117,0.15) 0%, rgba(10,14,26,0) 60%);
    border: 1px solid rgba(29,158,117,0.25);
    border-radius: 20px;
    padding: 64px 80px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-banner::before {
    content: '';
    position: absolute;
    top: -80px; left: 50%;
    transform: translateX(-50%);
    width: 400px; height: 300px;
    background: radial-gradient(ellipse, rgba(29,158,117,0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .cta-banner h2 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(28px, 4vw, 46px);
    line-height: 1.1;
    letter-spacing: -1.5px;
    max-width: 640px;
    margin: 0 auto 16px;
    position: relative;
    z-index: 1;
  }

  .cta-banner h2 em { font-style: italic; color: var(--verde); }

  .cta-banner p {
    font-size: 16px;
    color: rgba(15,23,42,0.55);
    max-width: 440px;
    margin: 0 auto 36px;
    line-height: 1.6;
    font-weight: 300;
    position: relative;
    z-index: 1;
  }

  .cta-banner-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  }

  .cta-detail {
    margin-top: 20px;
    font-size: 12.5px;
    color: rgba(249,250,251,0.3);
    position: relative;
    z-index: 1;
  }

  /* ── DIVIDER ── */
  .divider { border: none; border-top: 1px solid rgba(0,0,0,0.05); margin: 0 48px; }

  /* ── CONTACT ── */
  .contact {
    padding: 100px 48px;
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
  }

  .contact-left h2 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(32px, 3.8vw, 48px);
    line-height: 1.1;
    letter-spacing: -1.5px;
    margin-bottom: 18px;
  }

  .contact-left p {
    font-size: 15px;
    color: rgba(15,23,42,0.5);
    line-height: 1.65;
    font-weight: 300;
    margin-bottom: 36px;
  }

  .contact-details { display: flex; flex-direction: column; gap: 14px; }

  .contact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: rgba(249,250,251,0.65);
  }

  .contact-item-icon {
    width: 34px; height: 34px;
    background: rgba(29,158,117,0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
  }

  /* ── CONTACT FORM ── */
  .contact-form {
    background: var(--negro2);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    padding: 40px;
  }

  .form-title    { font-size: 17px; font-weight: 600; margin-bottom: 6px; }
  .form-subtitle { font-size: 13px; color: var(--gris); margin-bottom: 28px; }
  .form-group    { margin-bottom: 18px; }

  .form-label {
    display: block;
    font-size: 12.5px;
    font-weight: 500;
    color: rgba(15,23,42,0.55);
    margin-bottom: 7px;
  }

  .form-input {
    width: 100%;
    background: rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.07);
    border-radius: 8px;
    padding: 11px 14px;
    font-size: 14px;
    color: var(--blanco);
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s;
    outline: none;
  }
  .form-input::placeholder { color: rgba(249,250,251,0.2); }
  .form-input:focus { border-color: var(--verde); }

  textarea.form-input { resize: vertical; min-height: 90px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .btn-submit {
    width: 100%;
    background: var(--verde);
    color: #fff;
    border: none;
    padding: 13px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    margin-top: 6px;
    transition: all 0.2s;
  }
  .btn-submit:hover { background: #18b584; transform: translateY(-1px); }

  /* ── FOOTER ── */
  footer {
    border-top: 1px solid rgba(0,0,0,0.05);
    padding: 36px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-copy  { font-size: 12.5px; color: rgba(249,250,251,0.25); }
  .footer-links { display: flex; gap: 24px; }
  .footer-link  { font-size: 12.5px; color: rgba(249,250,251,0.25); text-decoration: none; transition: color 0.2s; }
  .footer-link:hover { color: rgba(15,23,42,0.6); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── MOBILE ── */
  @media (max-width: 768px) {
    nav { padding: 12px 16px; }
    .nav-cta { gap: 8px; }
    .nav-cta .nav-link { display: none; }
    .btn-nav { padding: 7px 12px; font-size: 12px; }
    .btn-nav-primary { padding: 7px 12px; font-size: 12px; }
    .btn-nav .txt-full { display: none; }
    .btn-nav .txt-short { display: inline; }
    .btn-nav-primary .txt-full { display: none; }
    .btn-nav-primary .txt-short { display: inline; }
  }

  @media (max-width: 400px) {
    nav { padding: 10px 12px; }
    .nav-cta { gap: 6px; }
    .btn-nav { padding: 6px 10px; font-size: 11px; }
    .btn-nav-primary { padding: 6px 10px; font-size: 11px; }
  }

  @media (max-width: 768px) {

    .hero { padding: 100px 20px 60px; }
    .hero h1 { letter-spacing: -1px; }

    .hero-visual { grid-template-columns: 1fr; max-width: 300px; }
    .phone-frame { max-width: 260px; margin: 0 auto; }
    .browser-frame { display: none; }

    .como { padding: 80px 20px; }
    .steps-grid { grid-template-columns: 1fr; gap: 40px; }
    .steps-grid::before { display: none; }

    .beneficios { padding: 0 20px 80px; }
    .bene-grid { grid-template-columns: 1fr; }

    .cta-banner { margin: 0 16px 60px; padding: 48px 28px; }

    .contact { grid-template-columns: 1fr; padding: 80px 20px; gap: 40px; }
    .form-grid { grid-template-columns: 1fr; }
    footer { flex-direction: column; gap: 14px; text-align: center; padding: 28px 20px; }
    .divider { margin: 0 20px; }
  }
`

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ── NAV ── */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-icon">W</div>
          <span className="logo-text">Worktic</span>
        </a>
        <div className="nav-cta">
          <a href="#como-funciona" className="nav-link">Cómo funciona</a>
          <a href="#contacto" className="nav-link">Contacto</a>
          <a href="/registro" className="btn-nav-primary">
            <span className="txt-full">Crear cuenta gratis</span>
            <span className="txt-short">Crear cuenta</span>
          </a>
          <a href="/admin/login" className="btn-nav">
            <span className="txt-full">Iniciar sesión →</span>
            <span className="txt-short">Entrar →</span>
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-glow"></div>
        <div className="hero-bg-grid"></div>

        <div className="badge">
          <span className="badge-dot"></span>
          Control de asistencia para negocios reales
        </div>

        <h1>Deja de adivinar<br /><em>quién vino a trabajar.</em></h1>

        <p className="hero-sub">
          Worktic registra entrada, salida y ubicación con QR + GPS.
          Sin apps que instalar. Sin excusas. Tú ves todo en tiempo real.
        </p>

        <div className="hero-actions">
          <a href="/registro" className="btn-primary">
            Empezar gratis
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#como-funciona" className="btn-ghost">
            Ver cómo funciona
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* HERO VISUAL */}
        <div className="hero-visual">

          {/* Phone: check-in screen */}
          <div className="phone-frame">
            <div className="phone-notch">
              <div className="phone-notch-bar"></div>
            </div>
            <div className="phone-status-bar">
              <span>9:41</span>
              <span>●●● 100%</span>
            </div>
            <div className="phone-body">
              <div className="phone-header">
                <div className="phone-site-badge">📍 Sucursal Centro</div>
                <div className="phone-gps">
                  <div className="gps-dot"></div>
                  GPS OK
                </div>
              </div>

              <div className="phone-avatar-area">
                <div className="phone-avatar">
                  JL
                  <div className="phone-avatar-img"></div>
                </div>
                <div className="phone-emp-name">Juan López</div>
                <div className="phone-emp-role">Vendedor • Turno matutino</div>
              </div>

              <div className="phone-kpis">
                <div className="phone-kpi">
                  <span className="phone-kpi-val">18</span>
                  <div className="phone-kpi-label">Días trabajados</div>
                </div>
                <div className="phone-kpi">
                  <span className="phone-kpi-val" style={{ color: '#F59E0B' }}>94%</span>
                  <div className="phone-kpi-label">Puntualidad</div>
                </div>
              </div>

              <div className="phone-btn-in">
                <span>✓</span> Registrar entrada
              </div>
              <div className="phone-btn-out">
                Registrar salida
              </div>
            </div>
          </div>

          {/* Browser: admin dashboard */}
          <div className="browser-frame">
            <div className="browser-bar">
              <div className="b-dot b-r"></div>
              <div className="b-dot b-y"></div>
              <div className="b-dot b-g"></div>
              <div className="browser-url">worktic.app/admin</div>
            </div>
            <div className="admin-body">
              <div className="admin-sidebar">
                <div className="admin-sidebar-logo">
                  <div className="asl-icon">W</div>
                  <span className="asl-text">Worktic</span>
                </div>
                <div className="admin-nav-item active"><span className="admin-nav-dot"></span> Asistencia</div>
                <div className="admin-nav-item"><span className="admin-nav-dot"></span> Empleados</div>
                <div className="admin-nav-item"><span className="admin-nav-dot"></span> Sitios</div>
                <div className="admin-nav-item"><span className="admin-nav-dot"></span> Horarios</div>
                <div className="admin-nav-item"><span className="admin-nav-dot"></span> Reportes</div>
              </div>

              <div className="admin-main">
                <div className="admin-header">
                  <span className="admin-title">Hoy — Semana 12</span>
                  <span className="admin-date">Vie 27 mar 2026</span>
                </div>

                <div className="admin-stats">
                  <div className="a-stat">
                    <div className="a-stat-lbl">A tiempo</div>
                    <div className="a-stat-val g">14</div>
                  </div>
                  <div className="a-stat">
                    <div className="a-stat-lbl">Tardanza</div>
                    <div className="a-stat-val y">2</div>
                  </div>
                  <div className="a-stat">
                    <div className="a-stat-lbl">Ausentes</div>
                    <div className="a-stat-val r">1</div>
                  </div>
                </div>

                <div className="a-table-hdr">
                  <span>Empleado</span><span>Entrada</span><span>Salida</span><span>Estado</span>
                </div>
                <div className="a-table-row">
                  <div className="a-emp">
                    <div className="a-av" style={{ background: 'rgba(29,158,117,0.2)', color: '#5DCAA5' }}>JL</div>
                    Juan López
                  </div>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>09:01</span>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>18:58</span>
                  <span className="a-pill g">✓ OK</span>
                </div>
                <div className="a-table-row">
                  <div className="a-emp">
                    <div className="a-av" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>AG</div>
                    Ana García
                  </div>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>09:18</span>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>—</span>
                  <span className="a-pill y">⚠ Tarde</span>
                </div>
                <div className="a-table-row">
                  <div className="a-emp">
                    <div className="a-av" style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>MR</div>
                    Mario Ruiz
                  </div>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>—</span>
                  <span style={{ color: 'rgba(249,250,251,.55)' }}>—</span>
                  <span className="a-pill r">✕ Ausente</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="como" id="como-funciona">
        <div className="como-header">
          <div className="section-label">Cómo funciona</div>
          <h2 className="section-title">Tres pasos.<br />Cero fricción.</h2>
          <p className="section-sub">
            Sin apps que descargar, sin hardware especial. Solo un código QR y el celular que ya todos tienen.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <span className="step-icon">🏪</span>
            <div className="step-title">Coloca el QR en tu sucursal</div>
            <div className="step-desc">
              Imprime o muestra el código QR de cada sitio. Lo pegas en la entrada y listo. No necesitas nada más.
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <span className="step-icon">📱</span>
            <div className="step-title">El empleado escanea al llegar</div>
            <div className="step-desc">
              Abre la cámara, escanea, confirma con su email. El sistema valida que esté físicamente en el lugar con GPS.
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <span className="step-icon">🔔</span>
            <div className="step-title">Tú recibes notificación al instante</div>
            <div className="step-desc">
              Push o correo: quién llegó, a qué hora, desde dónde. Si no aparece, te avisamos antes de que empieces a preguntar.
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section className="beneficios">
        <div className="bene-header">
          <div className="section-label">Por qué Worktic</div>
          <h2 className="section-title">Control sin estar ahí.</h2>
          <p className="section-sub">
            Para equipos que trabajan en campo, en tienda, o en varios lugares al mismo tiempo.
          </p>
        </div>

        <div className="bene-grid">
          <div className="bene-card featured">
            <span className="bene-icon">📍</span>
            <div className="bene-title">Asistencia verificada con GPS</div>
            <div className="bene-desc">
              El sistema solo acepta el check-in si el empleado está físicamente dentro del radio de la sucursal. No hay forma de marcar desde casa.
            </div>
            <div className="bene-quote">"Ya no tengo que preguntar si llegaron. Me llega la notificación sola."</div>
          </div>

          <div className="bene-card">
            <span className="bene-icon">⏰</span>
            <div className="bene-title">Alertas de tardanza y ausentismo</div>
            <div className="bene-desc">
              Si alguien no llegó a su hora, te enterás antes de que el día se arruine. Configura tolerancia y recibe alertas automáticas por push o correo.
            </div>
          </div>

          <div className="bene-card">
            <span className="bene-icon">📊</span>
            <div className="bene-title">Menos seguimiento manual</div>
            <div className="bene-desc">
              Sin llamadas para saber quién está. Sin hojas de excel. Sin WhatsApp de confirmación. El panel te muestra en tiempo real el estado de cada persona.
            </div>
          </div>

          <div className="bene-card featured">
            <span className="bene-icon">🏆</span>
            <div className="bene-title">Diseñado para equipos de ventas</div>
            <div className="bene-desc">
              Cada empleado ve su propia historial: días trabajados, puntualidad, racha. La transparencia motiva. Los datos no mienten.
            </div>
            <div className="bene-quote">"Mis vendedores compiten por quién tiene mejor puntualidad."</div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <div className="cta-banner">
        <h2>Prueba Worktic gratis.<br /><em>Sin instalación. Sin fricción.</em></h2>
        <p>Con notificaciones desde el primer día. Configura tu primera sucursal en menos de 5 minutos.</p>
        <div className="cta-banner-actions">
          <a href="/registro" className="btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>
            Empezar gratis →
          </a>
          <a href="#contacto" className="btn-ghost">
            Hablar con alguien primero
          </a>
        </div>
        <div className="cta-detail">Sin tarjeta de crédito · Sin compromisos · Cancela cuando quieras</div>
      </div>

      <hr className="divider" />

      {/* ── CONTACT ── */}
      <section className="contact" id="contacto">
        <div className="contact-left">
          <div className="section-label">Contacto</div>
          <h2>¿Tienes<br /><em style={{ fontStyle: 'italic', color: 'var(--verde)' }}>preguntas?</em></h2>
          <p>Cuéntanos sobre tu operación. Te mostramos cómo Worktic se adapta a tu negocio y te ayudamos a configurarlo desde cero.</p>
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
        <ContactForm />
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-copy">© 2026 Worktic. Todos los derechos reservados.</div>
        <div className="footer-links">
          <a href="#" className="footer-link">Privacidad</a>
          <a href="#" className="footer-link">Términos</a>
          <a href="/admin/login" className="footer-link">Admin →</a>
        </div>
      </footer>
    </>
  )
}
