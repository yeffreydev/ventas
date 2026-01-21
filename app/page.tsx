import { redirect } from "next/navigation";
import { createClient } from "./utils/supabase/server";
import { cookies } from "next/headers";

export default async function Home() {
  const supabase = await createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if user has completed onboarding
    const onboardingCompleted = user.user_metadata?.onboarding_completed;

    if (!onboardingCompleted) {
      redirect("/dashboard");
    } else {
      redirect("/dashboard");
    }
  } else {
    redirect("/login");
  }
}
