self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Worktic', {
      body: data.body || '',
      icon: '/logo.jpeg',
      badge: '/logo.jpeg',
      tag: data.tag || 'worktic',
      requireInteraction: false,
      data: { url: data.url || '/admin' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/admin'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const open = cs.find(c => c.url.includes('/admin') && 'focus' in c)
      if (open) return open.focus()
      return clients.openWindow(url)
    })
  )
})
