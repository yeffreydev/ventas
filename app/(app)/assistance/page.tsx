"use client";

import { useEffect, useState, useRef } from "react";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import { HiSparkles, HiPaperAirplane, HiX } from "react-icons/hi";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AssistancePage() {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    // Welcome message
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "¡Hola! Soy tu asistente de IA para Botia CRM. Puedo ayudarte con:\n\n✅ Crear clientes, productos y pedidos\n✅ Consultar información del CRM\n✅ Actualizar datos de clientes\n✅ Analizar tu negocio\n\n¿Qué necesitas hacer hoy?",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentWorkspace) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setStreamingMessage("");

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          workspaceId: currentWorkspace.id,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const contentType = response.headers.get("content-type");

      // Check if response is JSON (tool execution) or SSE (streaming)
      if (contentType?.includes("application/json")) {
        // Tool execution response
        const data = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.text || "Acción completada",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Regular streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  break;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    setStreamingMessage(accumulatedText);
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }

        // Add final assistant message
        if (accumulatedText) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: accumulatedText,
              timestamp: new Date(),
            },
          ]);
        }
      }

      setStreamingMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al procesar tu mensaje";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Lo siento, ocurrió un error: ${errorMessage}. Por favor, verifica que tu API key de Google Gemini esté configurada correctamente.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "¡Hola! Soy tu asistente de IA para Botia CRM. Puedo ayudarte con información sobre tus clientes, pedidos, productos y más. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      },
    ]);
  };

  const suggestions = [
    "Crea un cliente llamado Juan Pérez con email juan@example.com",
    "¿Cuántos clientes tengo en total?",
    "Muéstrame los productos con bajo stock",
    "Lista mis pedidos pendientes",
  ];

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <HiSparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Selecciona un Workspace
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Por favor selecciona un workspace para usar el asistente de IA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <HiSparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Asistente IA
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Powered by Google Gemini
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <HiX className="w-4 h-4" />
              Limpiar Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {msg.content.split("\n").map((line, i) => (
                      <p key={i} className={msg.role === "user" ? "text-white" : ""}>
                        {line || "\u00A0"}
                      </p>
                    ))}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {streamingMessage.split("\n").map((line, i) => (
                      <p key={i}>{line || "\u00A0"}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions (only show when no messages) */}
            {messages.length === 1 && !isLoading && (
              <div className="mt-8">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Sugerencias:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(suggestion)}
                      className="p-3 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje aquí... (Presiona Enter para enviar)"
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span className="hidden sm:inline">Enviando...</span>
                </>
              ) : (
                <>
                  <HiPaperAirplane className="w-5 h-5" />
                  <span className="hidden sm:inline">Enviar</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            El asistente puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
