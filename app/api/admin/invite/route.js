'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // onAuthStateChange captura el evento SIGNED_IN que Supabase
    // dispara automáticamente cuando procesa el #hash del link de invitación.
    // Esto funciona en mobile y en cualquier browser, a diferencia de getSession()
    // que a veces se llama antes de que el hash sea procesado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setReady(true);
      } else if (event === 'INITIAL_SESSION' && !session) {
        // Si ya hay sesión activa (re-intento del mismo usuario), también dejar pasar
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) {
            setReady(true);
          } else {
            setError('Link inválido o expirado. Pide al administrador que te reenvíe la invitación.');
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit() {
    if (password.length < 8)
      return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm)
      return setError('Las contraseñas no coinciden.');

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push('/admin');
  }

  const inputStyle = {
    width: '100%',
    background: '#0d1220',
    border: '1px solid #1e2a45',
    color: '#f1f5f9',
    fontSize: 14,
    padding: '10px 12px',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0a0e1a',
      fontFamily: "'DM Sans', sans-serif", padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpeg" style={{ width: 52, height: 52, borderRadius: 12, marginBottom: 12 }} alt="GM" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Crear contraseña
          </h1>
          <p style={{ fontSize: 13, color: '#8892a8', marginTop: 6 }}>
            Bienvenido a G.Montalvo — elige una contraseña para tu cuenta.
          </p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1e2a45', borderRadius: 14, padding: 28 }}>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          {!ready && !error && (
            <div style={{ textAlign: 'center', color: '#8892a8', fontSize: 13, padding: 20 }}>
              Verificando link...
            </div>
          )}

          {ready && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: '#8892a8', display: 'block',
                  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px',
                }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: '#8892a8', display: 'block',
                  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px',
                }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !password || !confirm}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none',
                  background: (!loading && password && confirm) ? '#3b82f6' : '#1e2a45',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: (!loading && password && confirm) ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Guardando...' : 'Guardar contraseña y entrar'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
