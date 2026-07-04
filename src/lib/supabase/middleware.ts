import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Rafraîchit la session Supabase et protège les routes de l'app.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = request.nextUrl.clone();
  const isAuthRoute = url.pathname.startsWith('/login');

  // Sans configuration Supabase, on laisse passer (mode démo local).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté sur une route protégée -> redirection login.
  if (!user && !isAuthRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Déjà connecté sur /login -> vers le dashboard.
  if (user && isAuthRoute) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
