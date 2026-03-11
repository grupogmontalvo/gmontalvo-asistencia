# G.Montalvo - Control de Asistencia

Sistema de control de asistencia para Grupo G.Montalvo.

## Deploy en Vercel

1. Sube este proyecto a un repositorio en GitHub
2. En vercel.com, clic en "Add New Project"
3. Importa el repositorio de GitHub
4. En "Environment Variables", agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://bctpdkfgglgspgnpdnfm.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (tu anon key de Supabase)
5. Clic en "Deploy"

## URLs

- **Admin**: `tudominio.com/admin`
- **Check-in empleados**: `tudominio.com/checkin/CODIGO-SITIO`

## Conectar dominio

En Vercel > Settings > Domains, agrega tu subdominio.
En tu DNS, agrega un CNAME apuntando a `cname.vercel-dns.com`.
