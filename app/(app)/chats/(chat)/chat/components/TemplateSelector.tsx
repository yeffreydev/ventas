"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { HiTemplate, HiSearch, HiLightningBolt, HiX } from "react-icons/hi";
import { Spinner } from "flowbite-react";
import type { Template } from "@/app/types/templates";

interface TemplateSelectorProps {
  onSelect: (content: string) => void;
  onClose: () => void;
  searchQuery?: string;
}

export default function TemplateSelector({ onSelect, onClose, searchQuery = "" }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    // Focus search input when opened
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Update search when searchQuery prop changes
    setSearch(searchQuery);
  }, [searchQuery]);

  const loadTemplates = async () => {
    setError(null);
    try {
      console.log("Loading templates from chat...");
      const response = await fetch("/api/templates?active_only=true");
      console.log("Templates response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Templates loaded:", data);
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response from templates API:", response.status, errorData);
        setError(errorData.error || `Error ${response.status}`);
        setTemplates([]);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
      setError("Error de conexión");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    
    const searchLower = search.toLowerCase();
    return templates.filter((template) => {
      // Check if search matches shortcut (for /command style)
      if (search.startsWith("/") && template.shortcut) {
        const shortcutSearch = search.slice(1).toLowerCase();
        return template.shortcut.toLowerCase().startsWith(shortcutSearch);
      }
      
      // Regular search
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.content.toLowerCase().includes(searchLower) ||
        (template.shortcut && template.shortcut.toLowerCase().includes(searchLower)) ||
        (template.category && template.category.toLowerCase().includes(searchLower))
      );
    });
  }, [templates, search]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTemplates.length]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredTemplates.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredTemplates[selectedIndex]) {
          handleSelect(filteredTemplates[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleSelect = (template: Template) => {
    onSelect(template.content);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-current/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-current/20">
        <div className="flex items-center gap-2 mb-2">
          <HiTemplate className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Plantillas Rápidas</span>
          <button
            onClick={onClose}
            className="ml-auto p-1 hover:bg-hover-bg rounded transition-colors"
          >
            <HiX className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar plantilla o escribe /atajo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Templates List */}
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <HiTemplate className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-500 font-medium">Error al cargar plantillas</p>
            <p className="text-xs text-text-tertiary mt-1">{error}</p>
            <button
              onClick={loadTemplates}
              className="mt-3 px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Reintentar
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 px-4">
            <HiTemplate className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              {templates.length === 0
                ? "No hay plantillas disponibles"
                : "No se encontraron plantillas"}
            </p>
            {templates.length === 0 && (
              <p className="text-xs text-text-tertiary mt-1">
                Crea plantillas en Configuración → Plantillas
              </p>
            )}
          </div>
        ) : (
          filteredTemplates.map((template, index) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`w-full p-3 text-left hover:bg-hover-bg transition-colors border-b border-current/10 last:border-b-0 ${
                index === selectedIndex ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm truncate">
                      {template.name}
                    </span>
                    {template.shortcut && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-xs text-primary font-mono">
                        <HiLightningBolt className="w-3 h-3" />/{template.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {template.content}
                  </p>
                </div>
                {template.category && (
                  <span className="text-xs text-text-tertiary px-2 py-0.5 bg-hover-bg rounded flex-shrink-0">
                    {template.category}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-2 border-t border-current/20 bg-hover-bg">
        <p className="text-xs text-text-tertiary text-center">
          <kbd className="px-1.5 py-0.5 bg-background border border-current/20 rounded text-[10px]">↑↓</kbd> navegar
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-background border border-current/20 rounded text-[10px]">Enter</kbd> seleccionar
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-background border border-current/20 rounded text-[10px]">Esc</kbd> cerrar
        </p>
      </div>
    </div>
  );
}