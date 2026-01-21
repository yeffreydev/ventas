"use client";

import React from "react";
import Link from "next/link";
import {
  FaFacebookMessenger,
  FaWhatsapp,
  FaSms,
  FaEnvelope,
  FaTelegram,
  FaLine,
  FaInstagram,
} from "react-icons/fa";
import { BiWorld } from "react-icons/bi";
import { SiCodeigniter } from "react-icons/si";
import { useConnectContext } from "../ConnectContext";

interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}

const channels: Channel[] = [
  {
    id: "website",
    name: "Website",
    icon: <BiWorld className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: <FaFacebookMessenger className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <FaWhatsapp className="w-16 h-16" />,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: "sms",
    name: "SMS",
    icon: <FaSms className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "email",
    name: "Email",
    icon: <FaEnvelope className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "api",
    name: "API",
    icon: <SiCodeigniter className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: <FaTelegram className="w-16 h-16" />,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-400",
  },
  {
    id: "line",
    name: "Line",
    icon: <FaLine className="w-16 h-16" />,
    bgColor: "bg-green-100",
    iconColor: "text-green-500",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <FaInstagram className="w-16 h-16" />,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
];

export default function ConnectChannelPage() {
  const { updateStepCompletion } = useConnectContext();

  const handleChannelClick = (channelId: string) => {
    // Mark step 1 as completed when a channel is selected
    updateStepCompletion(1, true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Elige un canal
        </h1>
        <p className="text-text-secondary">
          Conecta diferentes canales de comunicación como widgets de chat en vivo,
          Facebook Messenger, WhatsApp, correos electrónicos, etc. Si deseas crear
          un canal personalizado, puedes hacerlo usando el canal API. Para comenzar,
          elige uno de los canales a continuación.
        </p>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-4 gap-4">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/chats/connect/${channel.id}`}
            onClick={() => handleChannelClick(channel.id)}
          >
            <div className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-background border border-border rounded-lg hover:border-primary/50">
              <div className="flex flex-col items-center justify-center p-6">
                <div
                  className={`${channel.bgColor} dark:bg-opacity-20 ${channel.iconColor} rounded-2xl p-6 mb-4 transition-colors`}
                >
                  {channel.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {channel.name}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
