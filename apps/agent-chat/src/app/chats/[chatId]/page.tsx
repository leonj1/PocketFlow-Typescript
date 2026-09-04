import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat-workspace";
import { getAgents, getChatDetail, listChats } from "@/lib/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ chatId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chatId } = await params;
  const chat = getChatDetail(chatId);
  return { title: chat?.title ?? "Room not found" };
}

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params;
  const chat = getChatDetail(chatId);
  if (!chat) notFound();
  return <ChatWorkspace initialChat={chat} chats={listChats()} agents={getAgents()} />;
}
