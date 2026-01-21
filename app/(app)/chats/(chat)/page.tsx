'use client';

import { BiSearch, BiPlus } from 'react-icons/bi';
import Link from 'next/link';

export default function ChatsPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
          <BiSearch className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Selecciona una conversación
        </h2>
        <p className="text-text-secondary mb-6">
          Haz clic en cualquier chat de la lista para ver los mensajes y responder.
        </p>
        <Link
          href="/chats/connect"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25"
        >
          <BiPlus className="w-5 h-5" />
          <span>Conectar con tus redes</span>
        </Link>
      </div>
    </div>
  );
}