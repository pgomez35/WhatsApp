import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

const API_URL = "https://webhook-axec.onrender.com";

export default function EnhancedChatApp() {
  const [contactos, setContactos] = useState([]);
  const [chatActivo, setChatActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(true);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const chatRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/contactos`).then((res) => res.json()).then(setContactos);
  }, []);

  useEffect(() => {
    if (chatActivo) {
      fetch(`${API_URL}/mensajes/${chatActivo}`).then((res) => res.json()).then(setMensajes);
    }
  }, [chatActivo]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes]);

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;
    const res = await fetch(`${API_URL}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono: chatActivo, mensaje: nuevoMensaje })
    });
    if (res.ok) {
      setMensajes([...mensajes, { tipo: "enviado", contenido: nuevoMensaje }]);
      setNuevoMensaje("");
    }
  };

  const comenzarGrabacion = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("telefono", chatActivo);
      formData.append("audio", audioBlob);
      await fetch(`${API_URL}/mensajes/audio`, { method: "POST", body: formData });
    };

    mediaRecorderRef.current.start();
    setGrabando(true);
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current.stop();
    setGrabando(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${modoOscuro ? "bg-zinc-900 text-white" : "bg-white text-black"}`}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <h1 className="text-xl font-bold">Mensajería</h1>
        <div className="flex items-center gap-2">
          <span>🌙</span>
          <Switch checked={modoOscuro} onCheckedChange={setModoOscuro} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel de contactos */}
        <div className="w-1/4 border-r border-zinc-700 overflow-y-auto p-2 bg-zinc-800">
          <h2 className="font-semibold text-lg mb-2">Contactos</h2>
          {contactos.map((c) => (
            <div
              key={c.telefono}
              onClick={() => setChatActivo(c.telefono)}
              className={`p-2 rounded cursor-pointer hover:bg-zinc-700 ${chatActivo === c.telefono ? "bg-zinc-700" : ""}`}
            >
              {c.nombre || c.telefono}
            </div>
          ))}
        </div>

        {/* Panel de mensajes */}
        <div className="flex-1 flex flex-col">
          <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-3">
            {mensajes.map((msg, i) => (
              <div
                key={i}
                className={`max-w-md px-4 py-2 rounded-lg ${msg.tipo === "enviado" ? "bg-blue-600 text-white ml-auto" : "bg-zinc-700"}`}
              >
                {msg.es_audio ? (
                  <audio
                    controls
                    src={`${API_URL}/audios/${msg.contenido.match(/\[Audio guardado: (.+)\]/)?.[1]}`}
                  />
                ) : (
                  msg.contenido
                )}
              </div>
            ))}
          </div>

          {/* Input de mensaje */}
          <div className="p-4 border-t border-zinc-700 flex gap-2">
            <Input
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="Escribe tu mensaje..."
            />
            <Button onClick={enviarMensaje}>Enviar</Button>
            {!grabando ? (
              <Button onClick={comenzarGrabacion} variant="outline">🎙️</Button>
            ) : (
              <Button onClick={detenerGrabacion} variant="destructive">⏹️</Button>
            )}
          </div>
        </div>

        {/* Panel de soporte */}
        <div className="w-1/4 border-l border-zinc-700 p-4 bg-zinc-800">
          <h2 className="text-lg font-bold mb-3">Soporte</h2>
          <p>✔️ Envío de mensajes de texto y audio.</p>
          <p>✔️ Verifica que el servidor esté en línea.</p>
          <p className="mt-4">📧 soporte@tuempresa.com</p>
        </div>
      </div>
    </div>
  );
}
