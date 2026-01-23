import { redirect } from "next/navigation";
import { createClient } from "./utils/supabase/server";
import { cookies } from "next/headers";

// Force dynamic to ensure fresh auth check
export const dynamic = 'force-dynamic';

// Disable static generation
export const revalidate = 0;

export default async function Home() {
  try {
    const supabase = await createClient(cookies());
    
    // Use getSession instead of getUser for faster check
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch {
    // On any error, redirect to login
    redirect("/login");
  }
}
