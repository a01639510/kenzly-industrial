import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cambiar-en-produccion'
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas de login: si ya está autenticado, redirigir al destino
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Proteger /admin
  if (pathname.startsWith('/admin')) {
    const adminToken = req.cookies.get('kenzly_admin_token')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/login/admin', req.url));
    }
    try {
      await jwtVerify(adminToken, JWT_SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/login/admin', req.url));
    }
  }

  // Proteger /[slug] (rutas de tenant)
  const slugMatch = pathname.match(/^\/([^/]+)(\/.*)?$/);
  if (slugMatch) {
    const tenantToken = req.cookies.get('kenzly_token')?.value;
    if (!tenantToken) {
      const slug = slugMatch[1];
      return NextResponse.redirect(new URL(`/login/${slug}`, req.url));
    }
    try {
      const { payload } = await jwtVerify(tenantToken, JWT_SECRET);
      const slug = slugMatch[1];
      // Verificar que el token corresponde al tenant correcto
      if ((payload as any).slug !== slug) {
        return NextResponse.redirect(new URL(`/login/${slug}`, req.url));
      }
      return NextResponse.next();
    } catch {
      const slug = slugMatch[1];
      return NextResponse.redirect(new URL(`/login/${slug}`, req.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/admin/:path*',
    '/login/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
