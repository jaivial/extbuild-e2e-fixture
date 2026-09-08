import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Plus } from "lucide-react";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { Loading } from "../components/ui";
import type { Chat, ChatMessage } from "../lib/types";

function Conversation({ chatId }: { chatId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get<{ messages: ChatMessage[] }>(`/api/chats/${chatId}/messages`)
      .then((d) => { if (alive) setMessages(d.messages ?? []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [chatId]);

  useEffect(() => { endRef.current?.scrollIntoView(); }, [messages]);

  if (loading) return <Loading />;
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((m) => {
        const mine = m.role === "user";
        const system = m.role === "system";
        if (system) {
          return <div key={m.id} className="text-center text-xs text-[#525252] py-1">{m.content}</div>;
        }
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${mine ? "bg-[#06B6D4] text-[#0A0A0A]" : "bg-[#171717] border border-[#262626] text-[#FAFAFA]"}`}>
              {!mine && <div className="text-[10px] uppercase tracking-wide text-[#737373] mb-1">{m.author || (m as { author_name?: string }).author_name}</div>}
              {m.content}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

export default function Chats() {
  const { data, loading } = useApi<{ chats: Chat[] }>("/api/chats");
  const chats = data?.chats ?? [];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="h-[calc(100vh-9rem)] grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4">
      <aside className="card overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#262626]">
          <span className="font-semibold text-[#FAFAFA] flex items-center gap-2"><MessagesSquare className="w-4 h-4 text-[#06B6D4]" />Chats</span>
          <button className="btn-icon" title="Novo chat"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-1.5">
          {loading ? <Loading /> : chats.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full text-left rounded-lg px-3 py-2 mb-1 transition ${selected === c.id ? "bg-[#262626]" : "hover:bg-[#141414]"}`}>
              <div className="text-sm font-medium text-[#FAFAFA] truncate">{c.title || "(sem título)"}</div>
              <div className="text-xs text-[#737373] truncate">{c.last_message || `#${c.id}`}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="card overflow-hidden flex flex-col min-h-0">
        {selected == null ? (
          <div className="flex-1 grid place-items-center text-[#737373] text-sm">
            Selecione uma conversa na lista ao lado — ou crie um novo chat.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#262626]">
              <h2 className="font-semibold text-[#FAFAFA]">{chats.find((c) => c.id === selected)?.title || `#${selected}`}</h2>
              <span className="text-xs text-[#737373]">#{selected}</span>
            </div>
            <Conversation chatId={selected} />
          </>
        )}
      </section>
    </div>
  );
}
