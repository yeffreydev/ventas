import { Suspense } from "react";
import DashboardClient from "./DashboardClient";
import { getDashboardStats } from "./actions";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Cargando...</div>}>
      <DashboardClient initialStats={stats} />
    </Suspense>
  );
}
