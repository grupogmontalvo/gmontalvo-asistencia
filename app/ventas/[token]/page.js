import VentasView from './VentasView'

export function generateMetadata({ params }) {
  return {
    title: 'Ventas del día',
    manifest: `/api/widget/manifest?t=${encodeURIComponent(params.token)}`,
    appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Ventas' },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

export default function Page({ params }) {
  return <VentasView token={params.token} />
}
