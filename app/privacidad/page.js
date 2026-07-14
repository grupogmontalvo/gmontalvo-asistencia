export const metadata = {
  title: 'Aviso de Privacidad — Worktic',
}

const S = {
  page: { minHeight: '100vh', background: '#0a0e1a', color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif", padding: '0 0 60px' },
  bar: { padding: '18px 20px', borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', gap: 10 },
  container: { maxWidth: 720, margin: '0 auto', padding: '32px 20px' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 13, color: '#8892a8', marginBottom: 32 },
  h2: { fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 32, marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 1.75, color: '#c7d0e0', marginBottom: 12 },
  li: { fontSize: 14, lineHeight: 1.75, color: '#c7d0e0', marginBottom: 6 },
  strong: { color: '#f1f5f9' },
  divider: { border: 'none', borderTop: '1px solid #1e2a45', margin: '36px 0' },
  footer: { fontSize: 11, color: '#4a5568', textAlign: 'center', marginTop: 40 },
}

function P({ children }) { return <p style={S.p}>{children}</p> }
function Li({ children }) { return <li style={S.li}>{children}</li> }
function H2({ children }) { return <h2 style={S.h2}>{children}</h2> }

export default function PrivacidadPage() {
  return (
    <div style={S.page}>
      <style>{`a { color: #3b82f6; text-decoration: none; } a:hover { text-decoration: underline; }`}</style>
      <div style={S.bar}>
        <a href='/' style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff' }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>worktic</span>
        </a>
      </div>

      <div style={S.container}>
        <h1 style={S.h1}>Aviso de Privacidad Integral</h1>
        <div style={S.sub}>Plataforma Worktic — Control de asistencia con QR + GPS · Última actualización: 13 de julio de 2026</div>

        <P>El presente Aviso de Privacidad se emite en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares ("LFPDPPP"), su Reglamento y los Lineamientos del Aviso de Privacidad, y regula el tratamiento de los datos personales que se recaban a través del sitio y la aplicación worktic.app (la "Plataforma").</P>

        <H2>I. Identidad y domicilio del responsable</H2>
        <P>José Vicente González Montalvo, persona física con actividad empresarial (RFC GOMV8702109P4), operador de la plataforma Worktic ("Worktic"), con domicilio en Calle 24 No. 209 x 33 y 31, Col. García Ginerés, C.P. 97070, Mérida, Yucatán, México y correo de contacto <strong style={S.strong}>hola@worktic.app</strong>, es responsable del tratamiento de los datos personales en los términos y con el alcance que se describen en este aviso.</P>

        <H2>II. Alcance y doble carácter de Worktic</H2>
        <P>Este aviso aplica a dos tipos de titulares:</P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li><strong style={S.strong}>Administradores / Clientes:</strong> personas que crean una cuenta y contratan el servicio para su negocio.</Li>
          <Li><strong style={S.strong}>Colaboradores:</strong> personas cuyo registro de asistencia se efectúa a través de la Plataforma por instrucción del negocio que las emplea.</Li>
        </ul>
        <P>Respecto de los Administradores, Worktic actúa como responsable. Respecto de los datos de Colaboradores, Worktic actúa como encargado, tratándolos por cuenta y bajo instrucciones del negocio contratante —quien es el responsable de esos datos—, en términos de los artículos 49 a 56 del Reglamento de la LFPDPPP. Worktic no utiliza los datos de los Colaboradores para fines propios ni distintos a la prestación del servicio.</P>

        <H2>III. Datos personales que se recaban</H2>
        <P><strong style={S.strong}>De los Administradores:</strong></P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li>Nombre, correo electrónico y teléfono.</Li>
          <Li>Nombre de la empresa y número de empleados.</Li>
          <Li>Datos de facturación y pago (cuando aplique).</Li>
        </ul>
        <P><strong style={S.strong}>De los Colaboradores:</strong></P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li>Nombre y correo electrónico.</Li>
          <Li>Geolocalización (coordenadas GPS) capturada únicamente en el momento del registro de entrada y salida, no de forma continua.</Li>
          <Li>Fecha, hora y sitio o sucursal del registro.</Li>
        </ul>
        <P><strong style={S.strong}>Datos técnicos y de navegación:</strong> dirección IP, tipo de dispositivo, sistema operativo, navegador e identificadores de sesión.</P>
        <P>No se recaban datos personales sensibles. La Plataforma no exige la instalación de aplicaciones y la geolocalización se obtiene solo al escanear el código, con la finalidad de validar la presencia física dentro del radio autorizado.</P>

        <H2>IV. Finalidades del tratamiento</H2>
        <P><strong style={S.strong}>Finalidades primarias</strong> (necesarias para prestar el servicio):</P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li>Crear, autenticar y administrar las cuentas de usuario.</Li>
          <Li>Registrar y verificar entradas, salidas y asistencia, y validar la ubicación mediante GPS.</Li>
          <Li>Generar reportes, alertas y notificaciones en tiempo real (push y correo).</Li>
          <Li>Facturación, cobro y administración de la relación contractual (cuando aplique).</Li>
          <Li>Brindar soporte técnico y atender solicitudes.</Li>
          <Li>Garantizar la seguridad, prevención de fraude y buen funcionamiento de la Plataforma.</Li>
        </ul>
        <P><strong style={S.strong}>Finalidades secundarias</strong> (no necesarias; puede oponerse a ellas sin afectar el servicio):</P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li>Análisis estadístico y mejora del producto.</Li>
          <Li>Envío de comunicaciones comerciales, novedades y promociones de Worktic.</Li>
        </ul>
        <P>Si no desea que sus datos se traten para las finalidades secundarias, puede manifestarlo escribiendo a <strong style={S.strong}>hola@worktic.app</strong> en cualquier momento; su negativa no será motivo para negarle el servicio.</P>

        <H2>V. Cookies y tecnologías de rastreo</H2>
        <P>La Plataforma utiliza cookies y tecnologías similares para mantener la sesión, recordar preferencias y obtener estadísticas de uso. Usted puede deshabilitarlas desde la configuración de su navegador; ello podría limitar algunas funciones. Actualmente la Plataforma no utiliza cookies de analítica de terceros; únicamente cookies propias necesarias para mantener la sesión activa del usuario.</P>

        <H2>VI. Remisiones y transferencias de datos</H2>
        <P>Para operar el servicio, Worktic se apoya en proveedores que tratan datos por su cuenta (encargados / subencargados), tales como:</P>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          <Li>Servicios de alojamiento en la nube: Vercel Inc. y Supabase Inc. (Estados Unidos de América).</Li>
          <Li>Procesador de pagos: no aplica actualmente; en caso de incorporarse uno, este aviso será actualizado.</Li>
          <Li>Servicios de envío de correo y notificaciones: Resend (Estados Unidos de América).</Li>
        </ul>
        <P>Estos proveedores quedan obligados contractualmente a tratar los datos únicamente conforme a las instrucciones de Worktic y a guardar confidencialidad. En caso de que el alojamiento implique una transferencia internacional, se realizará al amparo de las excepciones del artículo 37 de la LFPDPPP o mediando garantías equivalentes. Fuera de lo anterior, Worktic no transfiere datos a terceros sin el consentimiento del titular, salvo los supuestos legales que no lo requieren (por ejemplo, requerimiento de autoridad competente).</P>

        <H2>VII. Medidas de seguridad</H2>
        <P>Worktic implementa medidas de seguridad administrativas, técnicas y físicas razonables —incluido el cifrado en tránsito y controles de acceso— para proteger los datos contra pérdida, uso, acceso o divulgación no autorizados. Ningún sistema es infalible; ante una vulneración que afecte significativamente los derechos de los titulares, Worktic lo notificará conforme a la normativa aplicable.</P>

        <H2>VIII. Conservación de los datos</H2>
        <P>Los datos se conservarán mientras exista la relación con el usuario o el negocio contratante y, posteriormente, durante los plazos legales de bloqueo aplicables, tras los cuales serán suprimidos. Los datos de Colaboradores se conservan o suprimen conforme a las instrucciones del negocio responsable.</P>

        <H2>IX. Derechos ARCO, revocación y limitación de uso</H2>
        <P>Todo titular puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO), revocar su consentimiento y limitar el uso o divulgación de sus datos, dirigiendo su solicitud a <strong style={S.strong}>hola@worktic.app</strong>, con: (i) nombre y medio para recibir respuesta; (ii) documento que acredite su identidad; y (iii) descripción clara de los datos y del derecho que desea ejercer.</P>
        <P><strong style={S.strong}>Nota para Colaboradores:</strong> dado que sus datos son tratados por Worktic como encargado, sus solicitudes ARCO también pueden dirigirse al negocio que los emplea, en su calidad de responsable. Worktic apoyará la atención conforme a las instrucciones de dicho responsable.</P>

        <H2>X. Cambios al aviso de privacidad</H2>
        <P>Worktic podrá modificar este aviso. Las actualizaciones se publicarán en worktic.app y, cuando corresponda, se comunicarán por correo electrónico. La fecha de la última versión se indica al inicio de esta página.</P>

        <hr style={S.divider} />

        <H2>Anexo — Aviso de privacidad simplificado</H2>
        <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 12 }}>(Para mostrar en el formulario de registro y en la pantalla de check-in)</div>
        <P>Worktic tratará sus datos de nombre, correo electrónico, geolocalización (al momento del registro) y datos técnicos de uso, con la finalidad de prestar y administrar el servicio de control de asistencia. La ubicación se captura únicamente al escanear el código, no de forma continua.</P>
        <P>Respecto de los datos de empleados, Worktic actúa como encargado por cuenta del negocio contratante. Puede consultar el aviso de privacidad integral y ejercer sus derechos ARCO en worktic.app/privacidad o escribiendo a hola@worktic.app.</P>

        <div style={S.footer}>
          <a href='/'>← Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}
