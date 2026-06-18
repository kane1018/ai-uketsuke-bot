import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Refreshes the Supabase auth session on every request and guards /dashboard.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ---- Login-required areas (admin) ------------------------------------
  // Anything under these prefixes requires a session. Public pages (/, /b,
  // /embed, /pricing, /terms, /privacy) and the public response API are NOT
  // listed here, so they stay open to anonymous visitors.
  const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/account"];
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ---- Auth pages: send already-authenticated users to the dashboard ----
  const AUTH_PAGES = ["/login", "/signup", "/register"];
  if (AUTH_PAGES.includes(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything EXCEPT:
  //  - static assets (_next, images, favicon)
  //  - the public chat (/b/...) and iframe embed (/embed/...) routes
  //  - the public response-submission API (/api/responses)
  // Those public routes carry no session to refresh and must work for anonymous
  // visitors (incl. inside third-party iframes where cookies may be blocked).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|b/|embed/|api/responses|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
