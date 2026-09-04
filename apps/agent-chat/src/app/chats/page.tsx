import type { Metadata } from "next";
import { ChatLobby } from "@/components/chat-lobby";
import { getAgents, listChats } from "@/lib/server/repository";

export const metadata: Metadata = { title: "Chats" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ChatsPage() {
  return <ChatLobby chats={listChats()} agents={getAgents()} />;
}
