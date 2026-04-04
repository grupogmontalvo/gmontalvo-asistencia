'use client'
import { useState } from 'react'

export default function CopyEmailBtn({ email }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button onClick={handleCopy} className="autodemo-copy-btn" type="button">
      {copied ? '¡Copiado! ✓' : 'Copiar'}
    </button>
  )
}
