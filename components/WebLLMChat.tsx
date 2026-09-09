"use client";

import { useEffect, useState, useRef } from "react";
import { AnalyzeResponse } from "@/types/repo";
import { MessageSquare, ShieldAlert, Cpu, Bot, User, Send, ChevronDown, CheckCircle2 } from "lucide-react";
import * as webllm from "@mlc-ai/web-llm";

interface WebLLMChatProps {
    data: AnalyzeResponse;
}

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

type Persona = "architect" | "security" | "junior";

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // Universally supported fast model in latest web-llm

const PERSONA_PROMPTS: Record<Persona, string> = {
    architect:
        "Rolün: Kıdemli Yazılım Mimarı. Katmanlar, bağımlılıklar ve mimari kararlar üzerine odaklan. Modülerlik, sorumlulukların ayrılması ve ölçeklenebilirlik sorunlarını vurgula.",
    security:
        "Rolün: AppSec ve Pentest Uzmanı. Güvenlik açıkları, lisans riskleri ve saldırı yüzeyine odaklan. Hardcoded secret, deprecated paket ve aşırı izinlere dikkat et.",
    junior:
        "Rolün: Yazılım Eğitmeni. Yeni başlayan bir geliştiriciye rehberlik et. Teknik kavramları sade ve anlaşılır örneklerle açıkla. Jargondan kaçın, adım adım rehberlik et.",
};

const PERSONA_UI: Record<Persona, { icon: string; label: string; color: string }> = {
    architect: { icon: "🏛️", label: "Mimar", color: "text-violet-300 border-violet-500/40 bg-violet-500/10" },
    security: { icon: "🛡️", label: "Güvenlik", color: "text-red-300 border-red-500/40 bg-red-500/10" },
    junior: { icon: "🌱", label: "Junior", color: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" },
};

export function WebLLMChat({ data }: WebLLMChatProps) {
    const [open, setOpen] = useState(false);
    const [supported, setSupported] = useState<boolean | null>(null);
    const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
    const [progress, setProgress] = useState<{ text: string; step: number }>({ text: "", step: 0 });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [persona, setPersona] = useState<Persona>("architect");
    const bottomRef = useRef<HTMLDivElement>(null);

    const buildSystemPrompt = (p: Persona) =>
        `${PERSONA_PROMPTS[p]}

Sen RepoMind asistanısın. Kısa ve öz Türkçe cevap ver.
Repo: ${data.meta.fullName} (${data.meta.language}, ${data.meta.stars} stars).
Ana katmanlar: ${data.analysis.architecture.filter(a => a.name !== "Other").map(a => a.name).join(", ")}.
Güvenlik/Uyarılar: ${data.analysis.security.findings.length} kural ihlali.
Lütfen doğal bir dille ve kesin kanıtlarla kullanıcının sorularını yanıtla.`;

    useEffect(() => {
        if (typeof navigator !== "undefined" && "gpu" in navigator) {
            setSupported(true);
        } else {
            setSupported(false);
        }
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, open]);

    const initEngine = async () => {
        if (engine || !supported) return;
        setLoading(true);
        try {
            const initProgressCallback = (report: webllm.InitProgressReport) => {
                setProgress({
                    text: report.text,
                    step: Math.round(report.progress * 100)
                });
            };

            const mlcEngine = new webllm.MLCEngine();
            mlcEngine.setInitProgressCallback(initProgressCallback);
            await mlcEngine.reload(MODEL_ID);

            setEngine(mlcEngine);
            setMessages([
                { role: "system", content: buildSystemPrompt(persona) },
                { role: "assistant", content: `Merhaba! ${data.meta.name} deposu için model başarıyla yüklendi. Üst kısımdan perspektif seçebilir, ardından sorularınızı sorabilirsiniz.` }
            ]);
        } catch (e: any) {
            console.warn("WebLLM başlatılamadı (Desteklenmeyen Donanım/WebGPU Kapalı).", e?.message);
            setSupported(false);
            setProgress({ text: "Model yüklenemedi. Tarayıcınızı güncelleyin veya donanım ivmesini açın.", step: -1 });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        if (!open && !engine && supported) {
            initEngine();
        }
        setOpen(!open);
    };

    const handlePersonaChange = (p: Persona) => {
        setPersona(p);
        if (engine && messages.length > 0) {
            setMessages((prev) => [
                { role: "system", content: buildSystemPrompt(p) },
                ...prev.filter((m) => m.role !== "system"),
            ]);
        }
    };

    const handleSend = async (override?: string) => {
        const text = override ?? input;
        if (!text.trim() || !engine) return;

        const sysMsg: ChatMessage = { role: "system", content: buildSystemPrompt(persona) };
        const historyWithoutSys = messages.filter((m) => m.role !== "system");
        const newMessages = [...historyWithoutSys, { role: "user" as const, content: text.trim() }];
        const fullMessages = [sysMsg, ...newMessages];

        setMessages([...newMessages, { role: "assistant", content: "..." }]);
        setInput("");
        setLoading(true);

        try {
            const req = fullMessages.map(m => ({ role: m.role, content: m.content }));

            const reply = await engine.chat.completions.create({
                messages: req,
            });

            const content = reply.choices[0].message.content || "Cevap üretilemedi.";
            setMessages([...newMessages, { role: "assistant", content }]);
        } catch (e) {
            console.error(e);
            setMessages([...newMessages, { role: "assistant", content: "Kritik bir hata oluştu." }]);
        } finally {
            setLoading(false);
        }
    };

    const QUICK_PROMPTS: Record<Persona, string[]> = {
        architect: [
            "Bu projenin giriş noktası neresi?",
            "Mimari nasıl tasarlanmış?",
            "Katmanlar arası bağımlılık ne durumda?",
        ],
        security: [
            "Güvenlik açığı var mı?",
            "Tehlikeli bağımlılıklar hangileri?",
            "Saldırı yüzeyi nerededir?",
        ],
        junior: [
            "Bu proje ne işe yarıyor?",
            "Koda nereden başlamalıyım?",
            "En önemli dosyalar hangileri?",
        ],
    };

    if (supported === false) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center justify-center p-3.5 bg-zinc-800 border border-white/10 text-white/50 rounded-full shadow-2xl hover:bg-zinc-700 hover:text-white/80 transition-all cursor-not-allowed"
                    title="WebGPU desteklenmiyor"
                >
                    <ShieldAlert className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {open && (
                <div className="w-[360px] md:w-[420px] h-[600px] max-h-[85vh] flex flex-col bg-[#0b0b14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl mb-4 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white/90">WebLLM Asistanı</h3>
                                <p className="text-[10px] text-white/40 flex items-center gap-1">
                                    <Cpu className="w-3 h-3" /> Yerel Çalışıyor (Zero-Key)
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 text-white/40 hover:text-white/80">
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Persona Selector */}
                    <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.05] flex items-center gap-2">
                        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider flex-shrink-0">Perspektif:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            {(Object.keys(PERSONA_UI) as Persona[]).map((p) => {
                                const ui = PERSONA_UI[p];
                                const isActive = persona === p;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePersonaChange(p)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${isActive
                                                ? ui.color
                                                : "text-white/30 border-white/10 bg-transparent hover:bg-white/5 hover:text-white/50"
                                            }`}
                                    >
                                        <span>{ui.icon}</span>
                                        <span>{ui.label}</span>
                                        {isActive && <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
                        {!engine && progress.step >= 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <Cpu className="w-10 h-10 text-white/20 animate-pulse" />
                                <div>
                                    <p className="text-xs font-semibold text-white/70">{MODEL_ID}</p>
                                    <p className="text-[10px] text-white/40 max-w-[200px] mx-auto mt-1">
                                        Tarayıcınıza yükleniyor. Bu işlem bir defalık yaklaşık 100MB indirecektir.
                                    </p>
                                </div>
                                <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress.step}%` }} />
                                </div>
                                <p className="text-[10px] text-white/40">{progress.text}</p>
                            </div>
                        )}

                        {progress.step < 0 && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                                <ShieldAlert className="w-4 h-4" />
                                {progress.text}
                            </div>
                        )}

                        {engine && messages.filter(m => m.role !== "system").map((m, i) => (
                            <div key={i} className={`flex items-start gap-2.5 max-w-[90%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-white/10" : "bg-indigo-500"}`}>
                                    {m.role === "user" ? <User className="w-3.5 h-3.5 text-white/70" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className={`p-3 text-[13px] leading-relaxed rounded-2xl ${m.role === "user" ? "bg-white/10 text-white/90 rounded-tr-sm" : "bg-[#1a1a24] border border-white/5 text-white/80 rounded-tl-sm"}`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Quick Prompts */}
                    {engine && messages.filter(m => m.role !== "system").length <= 1 && (
                        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/5 bg-zinc-950">
                            {QUICK_PROMPTS[persona].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleSend(p)}
                                    disabled={loading}
                                    className="whitespace-nowrap px-3 py-1.5 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/40 text-[11px] text-white/60 hover:text-indigo-300 rounded-full transition-all"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input field */}
                    <div className="p-3 bg-white/5 border-t border-white/10 pb-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSend()}
                                disabled={!engine || loading}
                                placeholder={engine ? "RepoMind asistanına sor..." : "Model yükleniyor..."}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!engine || loading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-30 transition-all"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!open && (
                <button
                    onClick={handleToggle}
                    className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-white/10 text-white font-semibold rounded-full shadow-lg shadow-indigo-500/25 transition-all outline-none focus:ring-2 ring-indigo-400/50"
                >
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span>Repo AI Asistanı</span>
                    <span className="text-[10px] ml-1 opacity-60">{PERSONA_UI[persona].icon}</span>
                </button>
            )}
        </div>
    );
}
