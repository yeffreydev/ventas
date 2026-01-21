"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface Step {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}

interface ConnectContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: Step[];
  updateStepCompletion: (stepNumber: number, completed: boolean) => void;
  resetSteps: () => void;
}

const ConnectContext = createContext<ConnectContextType | undefined>(undefined);

const initialSteps: Step[] = [
  {
    number: 1,
    title: "Elegir Canal",
    description: "Elige el proveedor que deseas integrar con Chatwoot.",
    completed: false,
  },
  {
    number: 2,
    title: "Configurar Canal",
    description: "Autentica tu cuenta y configura el canal de comunicación.",
    completed: false,
  },
  {
    number: 3,
    title: "¡Listo!",
    description: "Tu canal está configurado y listo para usar.",
    completed: false,
  },
];

export function ConnectProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<Step[]>(initialSteps);

  const updateStepCompletion = (stepNumber: number, completed: boolean) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.number === stepNumber ? { ...step, completed } : step
      )
    );
  };

  const resetSteps = () => {
    setSteps(initialSteps);
    setCurrentStep(1);
  };

  return (
    <ConnectContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        steps,
        updateStepCompletion,
        resetSteps,
      }}
    >
      {children}
    </ConnectContext.Provider>
  );
}

export function useConnectContext() {
  const context = useContext(ConnectContext);
  if (context === undefined) {
    throw new Error("useConnectContext must be used within a ConnectProvider");
  }
  return context;
}