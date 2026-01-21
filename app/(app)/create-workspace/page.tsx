"use client";

import CreateWorkspace from "../../components/CreateWorkspace";
import { HiArrowLeft } from "react-icons/hi";
import Link from "next/link";

export default function CreateWorkspacePage() {
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>

      <div className="flex-1 flex flex-col justify-center items-center p-4 relative z-10">
        <div className="absolute top-8 left-8">
            <Link 
                href="/dashboard"
                className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors duration-200 group"
            >
                <div className="p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                    <HiArrowLeft className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">Volver al panel</span>
            </Link>
        </div>

        <div className="w-full max-w-2xl bg-card-bg rounded-3xl shadow-xl shadow-card-shadow border border-border/50 p-8 md:p-12 backdrop-blur-sm">
            <CreateWorkspace 
                redirectTo="/dashboard" 
                onSuccess={() => {
                    // Optional: Show a toast or confetti
                    console.log("Workspace created!");
                }}
            />
        </div>
      </div>
    </div>
  );
}
