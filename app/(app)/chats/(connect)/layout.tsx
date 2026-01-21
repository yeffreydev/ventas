"use client";

import { FiCheck } from "react-icons/fi";
import { ConnectProvider, useConnectContext } from "./ConnectContext";

function ConnectLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentStep, steps } = useConnectContext();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Stepper */}
          <div className="lg:col-span-3">
            <div className="space-y-1">
              {steps.map((stepItem, index) => (
                <div key={stepItem.number} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                        stepItem.completed
                          ? "border-primary bg-primary text-white"
                          : stepItem.number === currentStep
                          ? "border-primary bg-background text-primary"
                          : "border-border bg-background text-text-secondary"
                      }`}
                    >
                      {stepItem.completed ? (
                        <FiCheck className="h-5 w-5" />
                      ) : (
                        stepItem.number
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-16 w-0.5 transition-colors ${
                          stepItem.completed ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3
                      className={`text-sm font-semibold transition-colors ${
                        stepItem.completed || stepItem.number === currentStep
                          ? "text-foreground"
                          : "text-text-secondary"
                      }`}
                    >
                      {stepItem.title}
                      {stepItem.completed && (
                        <FiCheck className="ml-1 inline h-4 w-4 text-green-500" />
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConnectProvider>
      <ConnectLayoutContent>{children}</ConnectLayoutContent>
    </ConnectProvider>
  );
}