import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // Crear una respuesta inicial
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")) {
        // Si faltan las variables, no intentamos crear el cliente para evitar el crash
        return response;
    }

    // Cliente de Supabase configurado para manejar cookies en el Edge Runtime
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Actualiza la cookie en la solicitud para que esté disponible de inmediato
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    // Crea una nueva respuesta para incluir la cookie actualizada
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    // Establece la cookie en la respuesta final
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: "",
                        ...options,
                    });
                },
            },
        }
    );

    // Verificar la sesión del usuario
    const { data: { user } } = await supabase.auth.getUser();

    // Si NO hay usuario y NO estamos en la página de login, redirigir a /login
    if (!user && !request.nextUrl.pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Si HAY usuario y trata de entrar a /login, redirigir al dashboard (/pacientes)
    if (user && request.nextUrl.pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/pacientes", request.url));
    }

    return response;
}

export const config = {
    // Matcher para aplicar el middleware a todas las rutas excepto archivos estáticos e imágenes
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
