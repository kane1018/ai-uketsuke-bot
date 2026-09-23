import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authDestination } from "@/lib/navigation";
type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const {pathname}=request.nextUrl;
  const protectedRoute=["/dashboard","/settings","/account"].some((p)=>pathname===p||pathname.startsWith(`${p}/`));
  const authPage=["/login","/signup","/register"].includes(pathname);
  // Public discovery/guide/demo requests must not depend on an Auth network call.
  if(!protectedRoute&&!authPage&&pathname!=="/pricing"&&!pathname.startsWith("/auth/")&&!pathname.startsWith("/api/stripe/"))return response;
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    cookies:{getAll(){return request.cookies.getAll();},setAll(cookiesToSet:CookieToSet[]){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}
  });
  const {data:{user}}=await supabase.auth.getUser();
  function redirectWithCookies(url:URL){const redirect=NextResponse.redirect(url);response.cookies.getAll().forEach((cookie)=>redirect.cookies.set(cookie));return redirect;}
  if(protectedRoute&&!user){const url=new URL("/login",request.url);url.searchParams.set("redirect",pathname+request.nextUrl.search);return redirectWithCookies(url);}
  if(authPage&&user){const target=authDestination(request.nextUrl.searchParams.get("next")||request.nextUrl.searchParams.get("redirect"));return redirectWithCookies(new URL(target,request.url));}
  return response;
}
export const config={runtime:"nodejs",matcher:["/((?!_next/static|_next/image|favicon.ico|b/|embed/|api/responses|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
