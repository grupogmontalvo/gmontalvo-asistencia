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

  .como-header { max-width: 560px; margin-bottom: 56px; }

  .bento-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .bento-card {
    border-radius: 20px;
    padding: 36px 40px;
    overflow: hidden;
  }

  .bento-card-1 {
    grid-column: 1 / 3;
    background: #E8FAF3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    min-height: 220px;
  }

  .bento-card-2 { background: #EFF6FF; }
  .bento-card-3 { background: #FFF7ED; }

  .bento-num {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #1D9E75;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 20px;
    flex-shrink: 0;
  }

  .bento-card-2 .bento-num { background: #3b82f6; }
  .bento-card-3 .bento-num { background: #f97316; }

  .bento-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.25;
    margin-bottom: 12px;
  }

  .bento-card-1 .bento-title { font-size: 22px; }

  .bento-desc {
    font-size: 14px;
    color: rgba(15,23,42,0.55);
    line-height: 1.65;
  }

  .bento-tags {
    display: flex;
    gap: 8px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .bento-tag {
    font-size: 11px;
    font-weight: 500;
    color: #1D9E75;
    background: rgba(29,158,117,0.12);
    border: 1px solid rgba(29,158,117,0.2);
    border-radius: 20px;
    padding: 4px 12px;
  }

  .bento-card-2 .bento-tag { color: #3b82f6; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); }
  .bento-card-3 .bento-tag { color: #f97316; background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.2); }

  .bento-text { flex: 0 0 220px; }

  .bento-illustration {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 180px;
  }

  .bento-illustration svg {
    width: 100%;
    height: auto;
    max-height: 175px;
  }

  .bento-notifs { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }

  .bento-notif {
    background: white;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  }

  .bento-notif-icon {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .bento-notif-name { font-size: 12px; font-weight: 600; color: #0f172a; }
  .bento-notif-sub  { font-size: 11px; color: #94a3b8; }

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
    transition: border-color 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .bene-card:hover { border-color: rgba(29,158,117,0.2); }

  .bene-card.featured {
    background: linear-gradient(135deg, rgba(29,158,117,0.10) 0%, var(--negro2) 70%);
    border-color: rgba(29,158,117,0.2);
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

  .bene-illus {
    display: flex;
    justify-content: center;
    margin-top: 28px;
  }

  .bene-illus svg { width: 100%; max-width: 240px; height: auto; }

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

  /* ── AUTODEMO ── */
  .autodemo {
    padding: 80px 24px 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background: var(--negro3);
    border-top: 1px solid rgba(0,0,0,0.06);
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }

  .autodemo-sub {
    font-size: 16px;
    color: var(--gris);
    max-width: 480px;
    margin: 0 auto 36px;
    line-height: 1.6;
  }

  .autodemo-sub strong { color: var(--blanco); }

  .autodemo-qr-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .autodemo-qr {
    width: 180px;
    height: 180px;
    border-radius: 16px;
    border: 3px solid var(--verde);
    padding: 8px;
    background: #fff;
  }

  .autodemo-qr-label {
    font-size: 12px;
    color: var(--gris-claro);
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  .autodemo-mobile-cta {
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .autodemo-arrow {
    font-size: 13px;
    color: var(--gris);
  }

  .autodemo-hint {
    font-size: 13px;
    color: var(--gris);
    margin-top: 8px;
  }

  .autodemo-hint code {
    background: var(--verde-fondo);
    color: var(--verde);
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 13px;
  }

  .autodemo-touch-hint {
    font-size: 13px;
    color: var(--verde);
    text-decoration: underline;
    cursor: pointer;
    margin-bottom: 4px;
  }

  @media (max-width: 768px) {
    .autodemo-mobile-cta { display: none; }
    .autodemo { padding: 60px 20px 50px; }
  }

  @media (max-width: 768px) {

    .hero { padding: 100px 20px 60px; }
    .hero h1 { letter-spacing: -1px; }

    .hero-visual { grid-template-columns: 1fr; max-width: 300px; }
    .phone-frame { max-width: 260px; margin: 0 auto; }
    .browser-frame { display: none; }

    .como { padding: 80px 20px; }
    .bento-grid { grid-template-columns: 1fr; }
    .bento-card-1 { grid-column: 1; flex-direction: column; align-items: flex-start; min-height: auto; }
    .bento-illustration { width: 100%; max-height: 200px; margin-top: 24px; }

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

      {/* ── AUTODEMO ── */}
      <section className="autodemo" id="pruebalo">
        <div className="section-label">Pruébalo ahora</div>
        <h2 className="section-title">¿Quieres ver cómo funciona<br /><em>en 30 segundos?</em></h2>
        <p className="autodemo-sub">
          Escanea el QR con tu celular, ingresa con <strong>prueba@worktic.app</strong> y haz tu primer check-in real.
        </p>

        {/* QR — visible siempre */}
        <div className="autodemo-qr-wrap">
          <a href="/checkin/DEMO" className="autodemo-touch-hint">(tócalo 👆 y será como escanearlo)</a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://worktic.app/checkin/DEMO&color=1D9E75&bgcolor=ffffff"
            className="autodemo-qr"
            alt="QR para demo de Worktic"
          />
          <div className="autodemo-qr-label">worktic.app/checkin/DEMO</div>
        </div>

        {/* Botón — visible en móvil */}
        <div className="autodemo-mobile-cta">
          <span className="autodemo-arrow">Esto es lo que pasaría si escanearan el QR 👇</span>
          <a href="/checkin/DEMO" className="btn-primary">
            Toca aquí para probarlo
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        <div className="autodemo-hint">
          Email de prueba: <code>prueba@worktic.app</code>
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

        <div className="bento-grid">

          {/* Card 1 — QR en sucursal */}
          <div className="bento-card bento-card-1">
            <div className="bento-text">
              <div className="bento-num">1</div>
              <div className="bento-title">Coloca el QR en<br />tu sucursal</div>
              <div className="bento-desc">Imprime o muestra el código QR de cada sitio. Lo pegas en la entrada y listo.</div>
              <div className="bento-tags">
                <span className="bento-tag">Sin hardware</span>
                <span className="bento-tag">Gratis para imprimir</span>
              </div>
            </div>
            <div className="bento-illustration">
              <svg viewBox="0 0 340 175" xmlns="http://www.w3.org/2000/svg">
                {/* Floor shadow */}
                <ellipse cx="155" cy="162" rx="125" ry="7" fill="rgba(0,0,0,0.07)"/>
                {/* Side wall */}
                <polygon points="42,52 42,152 24,157 24,57" fill="#c8d4d0"/>
                {/* Main wall */}
                <rect x="42" y="52" width="190" height="100" fill="#eef2f1"/>
                {/* Green cenefa */}
                <rect x="42" y="52" width="190" height="54" fill="#1D9E75"/>
                <rect x="42" y="96" width="190" height="10" fill="#17876a"/>
                <text x="137" y="83" fontFamily="Arial,sans-serif" fontSize="20" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="4">TIENDA</text>
                {/* Window */}
                <rect x="55" y="116" width="50" height="36" rx="3" fill="#d4e4e0"/>
                <line x1="80" y1="116" x2="80" y2="152" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                <line x1="55" y1="134" x2="105" y2="134" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
                {/* QR panel */}
                <rect x="118" y="106" width="100" height="46" rx="4" fill="white" stroke="rgba(29,158,117,0.3)" strokeWidth="1.5"/>
                {/* QR corners */}
                <rect x="125" y="113" width="16" height="16" rx="1.5" fill="#1D9E75"/>
                <rect x="127" y="115" width="12" height="12" rx="0.5" fill="white"/>
                <rect x="129" y="117" width="8" height="8" fill="#1D9E75"/>
                <rect x="194" y="113" width="16" height="16" rx="1.5" fill="#1D9E75"/>
                <rect x="196" y="115" width="12" height="12" rx="0.5" fill="white"/>
                <rect x="198" y="117" width="8" height="8" fill="#1D9E75"/>
                <rect x="125" y="128" width="16" height="16" rx="1.5" fill="#1D9E75"/>
                <rect x="127" y="130" width="12" height="12" rx="0.5" fill="white"/>
                <rect x="129" y="132" width="8" height="8" fill="#1D9E75"/>
                {/* QR dots */}
                <rect x="146" y="113" width="3" height="3" fill="#1D9E75"/>
                <rect x="151" y="113" width="3" height="3" fill="#1D9E75"/>
                <rect x="157" y="113" width="3" height="3" fill="#1D9E75"/>
                <rect x="163" y="113" width="3" height="3" fill="#1D9E75"/>
                <rect x="146" y="118" width="3" height="3" fill="#1D9E75"/>
                <rect x="157" y="118" width="3" height="3" fill="#1D9E75"/>
                <rect x="163" y="118" width="3" height="3" fill="#1D9E75"/>
                <rect x="146" y="123" width="3" height="3" fill="#1D9E75"/>
                <rect x="151" y="123" width="3" height="3" fill="#1D9E75"/>
                <rect x="163" y="123" width="3" height="3" fill="#1D9E75"/>
                <rect x="146" y="128" width="3" height="3" fill="#1D9E75"/>
                <rect x="151" y="133" width="3" height="3" fill="#1D9E75"/>
                <rect x="157" y="133" width="3" height="3" fill="#1D9E75"/>
                <rect x="163" y="128" width="3" height="3" fill="#1D9E75"/>
                <rect x="175" y="123" width="3" height="3" fill="#1D9E75"/>
                <rect x="181" y="118" width="3" height="3" fill="#1D9E75"/>
                <rect x="187" y="123" width="3" height="3" fill="#1D9E75"/>
                {/* Check circle */}
                <circle cx="218" cy="106" r="13" fill="#1D9E75"/>
                <polyline points="212,106 216,110 225,100" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                {/* Dashed line */}
                <line x1="264" y1="129" x2="223" y2="129" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6"/>
                {/* Person */}
                <circle cx="301" cy="85" r="15" fill="#FDBF7F"/>
                <ellipse cx="301" cy="73" rx="15" ry="9" fill="#2d3748"/>
                <rect x="284" y="99" width="34" height="48" rx="9" fill="#1D9E75"/>
                <rect x="285" y="143" width="11" height="17" rx="4" fill="#374151"/>
                <rect x="298" y="143" width="11" height="17" rx="4" fill="#374151"/>
                <ellipse cx="290" cy="159" rx="9" ry="4" fill="#1f2937"/>
                <ellipse cx="303" cy="159" rx="9" ry="4" fill="#1f2937"/>
                {/* Arm */}
                <path d="M284 116 Q275 120 268 126" stroke="#FDBF7F" strokeWidth="9" strokeLinecap="round" fill="none"/>
                {/* Phone */}
                <rect x="249" y="114" width="22" height="38" rx="4" fill="#1a202c"/>
                <rect x="251" y="116" width="18" height="32" rx="3" fill="#1D9E75"/>
                {/* W logo on screen */}
                <text x="260" y="130" fontFamily="Georgia,serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">W</text>
                <text x="260" y="140" fontFamily="Arial,sans-serif" fontSize="5" fill="rgba(255,255,255,0.85)" textAnchor="middle">Worktic</text>
              </svg>
            </div>
          </div>

          {/* Card 2 — Empleado escanea */}
          <div className="bento-card bento-card-2">
            <div className="bento-num">2</div>
            <div className="bento-title">El empleado escanea al llegar</div>
            <div className="bento-desc">Abre la cámara, escanea el QR, confirma con su email. El sistema valida que esté físicamente en el lugar con GPS.</div>
            <div className="bento-tags">
              <span className="bento-tag">Sin app</span>
              <span className="bento-tag">Validación GPS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 160 }}>
                <rect x="50" y="5" width="60" height="90" rx="10" fill="#1a202c"/>
                <rect x="53" y="10" width="54" height="78" rx="7" fill="white"/>
                <rect x="70" y="10" width="20" height="6" rx="3" fill="#1a202c"/>
                <rect x="57" y="22" width="46" height="6" rx="3" fill="#e2e8f0"/>
                <rect x="57" y="32" width="30" height="4" rx="2" fill="#f1f5f9"/>
                <rect x="60" y="40" width="40" height="30" rx="4" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5"/>
                <path d="M60,47 L60,40 L67,40" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M93,40 L100,40 L100,47" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M60,63 L60,70 L67,70" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M100,63 L100,70 L93,70" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <rect x="65" y="45" width="7" height="7" rx="0.5" fill="#3b82f6"/>
                <rect x="66" y="46" width="5" height="5" rx="0.5" fill="white"/>
                <rect x="67" y="47" width="3" height="3" fill="#3b82f6"/>
                <rect x="88" y="45" width="7" height="7" rx="0.5" fill="#3b82f6"/>
                <rect x="89" y="46" width="5" height="5" rx="0.5" fill="white"/>
                <rect x="90" y="47" width="3" height="3" fill="#3b82f6"/>
                <rect x="65" y="58" width="7" height="7" rx="0.5" fill="#3b82f6"/>
                <rect x="66" y="59" width="5" height="5" rx="0.5" fill="white"/>
                <rect x="67" y="60" width="3" height="3" fill="#3b82f6"/>
                <rect x="76" y="45" width="2" height="2" fill="#3b82f6"/>
                <rect x="79" y="47" width="2" height="2" fill="#3b82f6"/>
                <rect x="82" y="45" width="2" height="2" fill="#3b82f6"/>
                <rect x="76" y="50" width="2" height="2" fill="#3b82f6"/>
                <rect x="82" y="52" width="2" height="2" fill="#3b82f6"/>
                <line x1="60" y1="55" x2="100" y2="55" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6"/>
                <circle cx="80" cy="83" r="6" fill="#10b981"/>
                <polyline points="76,83 79,86 84,79" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          </div>

          {/* Card 3 — Notificación */}
          <div className="bento-card bento-card-3">
            <div className="bento-num">3</div>
            <div className="bento-title">Tú recibes notificación al instante</div>
            <div className="bento-desc">Push o correo: quién llegó, a qué hora, desde dónde. Si alguien no aparece, te avisamos antes que nadie.</div>
            <div className="bento-tags">
              <span className="bento-tag">Tiempo real</span>
              <span className="bento-tag">Push + email</span>
            </div>
            <div className="bento-notifs">
              <div className="bento-notif">
                <div className="bento-notif-icon" style={{ background: '#dcfce7' }}>✅</div>
                <div>
                  <div className="bento-notif-name">Juan llegó · 9:02 AM</div>
                  <div className="bento-notif-sub">Casa Mist · Puntual</div>
                </div>
              </div>
              <div className="bento-notif">
                <div className="bento-notif-icon" style={{ background: '#fef3c7' }}>⏰</div>
                <div>
                  <div className="bento-notif-name">Ana · En tolerancia</div>
                  <div className="bento-notif-sub">Garden · 5 min tarde</div>
                </div>
              </div>
              <div className="bento-notif">
                <div className="bento-notif-icon" style={{ background: '#fee2e2' }}>🔴</div>
                <div>
                  <div className="bento-notif-name">Luis no llegó</div>
                  <div className="bento-notif-sub">SB Americas · Falta</div>
                </div>
              </div>
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

          {/* Card 1 — GPS */}
          <div className="bene-card featured">
            <div>
              <div className="bene-title">Asistencia verificada con GPS</div>
              <div className="bene-desc">El sistema solo acepta el check-in si el empleado está físicamente dentro del radio de la sucursal. No hay forma de marcar desde casa.</div>
              <div className="bene-quote">"Ya no tengo que preguntar si llegaron. Me llega la notificación sola."</div>
            </div>
            <div className="bene-illus">
              <svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="220" height="110" rx="12" fill="rgba(29,158,117,0.06)"/>
                <line x1="0" y1="36" x2="220" y2="36" stroke="rgba(29,158,117,0.12)" strokeWidth="1"/>
                <line x1="0" y1="72" x2="220" y2="72" stroke="rgba(29,158,117,0.12)" strokeWidth="1"/>
                <line x1="55" y1="0" x2="55" y2="110" stroke="rgba(29,158,117,0.12)" strokeWidth="1"/>
                <line x1="110" y1="0" x2="110" y2="110" stroke="rgba(29,158,117,0.12)" strokeWidth="1"/>
                <line x1="165" y1="0" x2="165" y2="110" stroke="rgba(29,158,117,0.12)" strokeWidth="1"/>
                <circle cx="110" cy="55" r="42" fill="rgba(29,158,117,0.1)" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="5,3"/>
                <circle cx="110" cy="55" r="26" fill="rgba(29,158,117,0.12)"/>
                <path d="M110 25 C99 25 90 34 90 44 C90 57 110 72 110 72 C110 72 130 57 130 44 C130 34 121 25 110 25Z" fill="#1D9E75"/>
                <circle cx="110" cy="44" r="7" fill="white"/>
                <circle cx="130" cy="65" r="8" fill="#FDBF7F"/>
                <rect x="124" y="72" width="12" height="14" rx="4" fill="#1D9E75"/>
                <circle cx="137" cy="60" r="7" fill="#10b981" stroke="white" strokeWidth="1.5"/>
                <polyline points="133,60 136,63 141,57" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="178" cy="30" r="7" fill="#cbd5e1"/>
                <rect x="173" y="36" width="10" height="12" rx="3" fill="#94a3b8"/>
                <circle cx="185" cy="25" r="6" fill="#ef4444" stroke="white" strokeWidth="1.5"/>
                <line x1="182" y1="22" x2="188" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="188" y1="22" x2="182" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="55" y="88" width="110" height="16" rx="8" fill="rgba(29,158,117,0.15)"/>
                <text x="110" y="99" fontFamily="Arial,sans-serif" fontSize="8" fill="#1D9E75" textAnchor="middle" fontWeight="600">Radio verificado · 200m</text>
              </svg>
            </div>
          </div>

          {/* Card 2 — Alertas */}
          <div className="bene-card">
            <div>
              <div className="bene-title">Alertas de tardanza y ausentismo</div>
              <div className="bene-desc">Si alguien no llegó a su hora, te enterás antes de que el día se arruine. Configura tolerancia y recibe alertas automáticas por push o correo.</div>
            </div>
            <div className="bene-illus">
              <svg viewBox="0 0 220 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="52" r="38" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2"/>
                <circle cx="60" cy="52" r="30" fill="white"/>
                <line x1="60" y1="26" x2="60" y2="30" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                <line x1="60" y1="72" x2="60" y2="78" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                <line x1="34" y1="52" x2="30" y2="52" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                <line x1="86" y1="52" x2="90" y2="52" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
                <line x1="60" y1="52" x2="60" y2="36" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="60" y1="52" x2="72" y2="58" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="60" cy="52" r="3" fill="#1e293b"/>
                <circle cx="88" cy="20" r="12" fill="#ef4444"/>
                <text x="88" y="25" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">!</text>
                <rect x="110" y="15" width="100" height="32" rx="8" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                <rect x="117" y="22" width="18" height="18" rx="5" fill="#fef3c7"/>
                <text x="126" y="34" fontFamily="Arial,sans-serif" fontSize="12" textAnchor="middle">⏰</text>
                <rect x="141" y="21" width="62" height="5" rx="2.5" fill="#1e293b" opacity="0.8"/>
                <rect x="141" y="30" width="42" height="4" rx="2" fill="#94a3b8"/>
                <rect x="110" y="54" width="100" height="32" rx="8" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                <rect x="117" y="61" width="18" height="18" rx="5" fill="#fee2e2"/>
                <text x="126" y="73" fontFamily="Arial,sans-serif" fontSize="12" textAnchor="middle">🔴</text>
                <rect x="141" y="60" width="52" height="5" rx="2.5" fill="#1e293b" opacity="0.8"/>
                <rect x="141" y="69" width="36" height="4" rx="2" fill="#94a3b8"/>
              </svg>
            </div>
          </div>

          {/* Card 3 — Menos seguimiento */}
          <div className="bene-card">
            <div>
              <div className="bene-title">Menos seguimiento manual</div>
              <div className="bene-desc">Sin llamadas para saber quién está. Sin hojas de excel. Sin WhatsApp de confirmación. El panel te muestra en tiempo real el estado de cada persona.</div>
            </div>
            <div className="bene-illus">
              <svg viewBox="0 0 220 100" xmlns="http://www.w3.org/2000/svg">
                <text x="42" y="14" fontFamily="Arial,sans-serif" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="600">ANTES</text>
                <rect x="15" y="18" width="26" height="26" rx="5" fill="#dcfce7"/>
                <text x="28" y="35" fontFamily="Arial,sans-serif" fontSize="14" textAnchor="middle">📊</text>
                <rect x="44" y="18" width="26" height="26" rx="5" fill="#dcfce7"/>
                <text x="57" y="35" fontFamily="Arial,sans-serif" fontSize="14" textAnchor="middle">💬</text>
                <rect x="15" y="48" width="26" height="26" rx="5" fill="#fce7f3"/>
                <text x="28" y="65" fontFamily="Arial,sans-serif" fontSize="14" textAnchor="middle">📞</text>
                <rect x="44" y="48" width="26" height="26" rx="5" fill="#fce7f3"/>
                <text x="57" y="65" fontFamily="Arial,sans-serif" fontSize="14" textAnchor="middle">📋</text>
                <line x1="8" y1="12" x2="76" y2="82" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.75"/>
                <line x1="76" y1="12" x2="8" y2="82" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.75"/>
                <line x1="88" y1="47" x2="104" y2="47" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="100,43 104,47 100,51" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <rect x="108" y="10" width="104" height="80" rx="8" fill="white" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                <rect x="108" y="10" width="104" height="24" rx="8" fill="#f1f5f9"/>
                <rect x="108" y="26" width="104" height="8" fill="#f1f5f9"/>
                <text x="160" y="25" fontFamily="Arial,sans-serif" fontSize="7" fill="#64748b" textAnchor="middle" fontWeight="600">Panel en tiempo real</text>
                <circle cx="120" cy="43" r="6" fill="#FDBF7F"/>
                <rect x="130" y="40" width="30" height="4" rx="2" fill="#e2e8f0"/>
                <rect x="164" y="38" width="36" height="10" rx="5" fill="#dcfce7"/>
                <text x="182" y="45" fontFamily="Arial,sans-serif" fontSize="6" fill="#16a34a" textAnchor="middle" fontWeight="600">Puntual</text>
                <circle cx="120" cy="60" r="6" fill="#FDBF7F"/>
                <rect x="130" y="57" width="28" height="4" rx="2" fill="#e2e8f0"/>
                <rect x="164" y="55" width="40" height="10" rx="5" fill="#fef3c7"/>
                <text x="184" y="62" fontFamily="Arial,sans-serif" fontSize="6" fill="#d97706" textAnchor="middle" fontWeight="600">Tolerancia</text>
                <circle cx="120" cy="77" r="6" fill="#cbd5e1"/>
                <rect x="130" y="74" width="24" height="4" rx="2" fill="#e2e8f0"/>
                <rect x="164" y="72" width="30" height="10" rx="5" fill="#fee2e2"/>
                <text x="179" y="79" fontFamily="Arial,sans-serif" fontSize="6" fill="#dc2626" textAnchor="middle" fontWeight="600">Falta</text>
              </svg>
            </div>
          </div>

          {/* Card 4 — Equipos de ventas */}
          <div className="bene-card featured">
            <div>
              <div className="bene-title">Diseñado para equipos de ventas</div>
              <div className="bene-desc">Cada empleado ve su propio historial: días trabajados, puntualidad, racha. La transparencia motiva. Los datos no mienten.</div>
              <div className="bene-quote">"Mis vendedores compiten por quién tiene mejor puntualidad."</div>
            </div>
            <div className="bene-illus">
              <svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg">
                <rect x="38" y="68" width="44" height="42" rx="4" fill="rgba(29,158,117,0.18)"/>
                <text x="60" y="62" fontFamily="Arial,sans-serif" fontSize="11" textAnchor="middle" fill="#94a3b8">🥈</text>
                <circle cx="60" cy="48" r="14" fill="#FDBF7F"/>
                <ellipse cx="60" cy="38" rx="14" ry="8" fill="#374151"/>
                <rect x="46" y="61" width="28" height="10" rx="3" fill="#475569"/>
                <rect x="38" y="82" width="44" height="5" rx="2" fill="rgba(29,158,117,0.3)"/>
                <text x="60" y="99" fontFamily="Arial,sans-serif" fontSize="8" fill="#64748b" textAnchor="middle">Ana</text>
                <text x="60" y="108" fontFamily="Arial,sans-serif" fontSize="7" fill="#1D9E75" textAnchor="middle" fontWeight="600">98%</text>
                <rect x="88" y="52" width="44" height="58" rx="4" fill="rgba(29,158,117,0.28)"/>
                <text x="110" y="44" fontFamily="Arial,sans-serif" fontSize="14" textAnchor="middle">🏆</text>
                <circle cx="110" cy="30" r="16" fill="#FDBF7F"/>
                <ellipse cx="110" cy="19" rx="16" ry="9" fill="#2d3748"/>
                <rect x="95" y="43" width="30" height="12" rx="3" fill="#1D9E75"/>
                <rect x="88" y="68" width="44" height="5" rx="2" fill="rgba(29,158,117,0.4)"/>
                <text x="110" y="87" fontFamily="Arial,sans-serif" fontSize="8" fill="#64748b" textAnchor="middle">Juan</text>
                <text x="110" y="99" fontFamily="Arial,sans-serif" fontSize="8" fill="#1D9E75" textAnchor="middle" fontWeight="700">100% 🔥</text>
                <rect x="138" y="80" width="44" height="30" rx="4" fill="rgba(29,158,117,0.12)"/>
                <text x="160" y="74" fontFamily="Arial,sans-serif" fontSize="11" textAnchor="middle" fill="#94a3b8">🥉</text>
                <circle cx="160" cy="60" r="12" fill="#FDBF7F"/>
                <ellipse cx="160" cy="51" rx="12" ry="7" fill="#6b7280"/>
                <rect x="148" y="71" width="24" height="10" rx="3" fill="#6b7280"/>
                <rect x="138" y="90" width="44" height="4" rx="2" fill="rgba(29,158,117,0.2)"/>
                <text x="160" y="102" fontFamily="Arial,sans-serif" fontSize="8" fill="#64748b" textAnchor="middle">Luis</text>
                <text x="160" y="109" fontFamily="Arial,sans-serif" fontSize="7" fill="#1D9E75" textAnchor="middle" fontWeight="600">94%</text>
              </svg>
            </div>
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
