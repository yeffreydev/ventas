"use client";

import { useState, Suspense } from "react";
import { FcGoogle } from "react-icons/fc";
import { AiFillApple } from "react-icons/ai";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { FiArrowRight } from "react-icons/fi";
import { createClient } from "../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useThemeContext } from "../../providers/ThemeProvider";

function RegisterContent() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");
  const supabase = createClient();
  const { theme } = useThemeContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: firstName,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        // Guardar datos del usuario en localStorage si está disponible
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
        // Redirect to login or dashboard
        // Redirect logic
        if (invitationToken) {
          // If there's an invitation, go to accept page
          // Note: If email confirmation is required, this might need adjustment
          router.push(`/accept-invitation?token=${invitationToken}`);
        } else {
          router.push("/login");
        }
      }
    } catch (err) {
      setError("Ocurrió un error durante el registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 sm:px-6 lg:px-8">
      {/* Main Content - Crece para ocupar espacio disponible */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="max-w-md w-full">
          <div className="bg-background rounded-2xl shadow-xl p-8 space-y-6 border border-current/20">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/botia.svg"
              alt="Botia Logo"
              width={80}
              height={80}
            />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-center text-2xl font-bold text-foreground">
              Regístrate en Botia
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* First Name Input */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Nombre
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                className="appearance-none block w-full px-4 py-3 border border-current/20 rounded-lg placeholder-text-tertiary text-foreground bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Tu nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-current/20 rounded-lg placeholder-text-tertiary text-foreground bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="tucorreo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-current/20 rounded-lg placeholder-text-tertiary text-foreground bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-11"
                  placeholder="Escribe tu contraseña aquí..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <HiEyeOff className="h-5 w-5" />
                  ) : (
                    <HiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-current/20 rounded-lg placeholder-text-tertiary text-foreground bg-input-bg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-11"
                  placeholder="Confirma tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="h-5 w-5" />
                  ) : (
                    <HiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Accept Terms */}
            <div className="flex items-center">
              <input
                id="accept-terms"
                name="accept-terms"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-current/20 rounded cursor-pointer"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />
              <label
                htmlFor="accept-terms"
                className="ml-2 block text-sm text-foreground cursor-pointer"
              >
                Acepto los{" "}
                <a href="#" className="text-primary hover:text-primary/80">
                  términos y condiciones
                </a>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex items-center justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Registrando..." : "Registrarse"}
                {!isLoading && <FiArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-current/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-text-secondary">O</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center py-3 px-4 border border-current/20 rounded-lg shadow-sm bg-background text-sm font-medium text-foreground hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
              >
                <FcGoogle className="w-5 h-5 mr-3" />
                Registrarse con Google
              </button>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center py-3 px-4 border border-current/20 rounded-lg shadow-sm bg-background text-sm font-medium text-foreground hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
              >
                <AiFillApple className="w-5 h-5 mr-3" />
                Registrarse con Apple
              </button>
            </div>
          </form>

        </div>
      </div>
      </div>

      {/* Footer - Pegado a la parte inferior */}
      <footer className="py-6">
        <div className="max-w-md mx-auto w-full text-center">
          <p className="text-sm text-text-secondary">
            ©2025 Botia. Todos los derechos reservados.{" "}
            <a href="#" className="hover:text-primary transition-colors">
              Política de privacidad
            </a>{" "}
            ,{" "}
            <a href="#" className="hover:text-primary transition-colors">
              Administrar las cookies
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <RegisterContent />
    </Suspense>
  );
}