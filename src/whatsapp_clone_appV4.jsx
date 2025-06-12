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
  const [modoOscuro, setModoOscuro] = useState(false);
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
    <div className={`h-screen ${modoOscuro ? "bg-zinc-900 text-white" : "bg-white text-black"} transition-colors duration-300`}> 
      <div className="p-4 flex justify-between items-center border-b shadow-md">
        <h1 className="text-2xl font-semibold">💬 WhatsApp UI</h1>
        <div className="flex items-center gap-2">
          <span className="text-xl">{modoOscuro ? "🌙" : "☀️"}</span>
          <Switch checked={modoOscuro} onCheckedChange={setModoOscuro} />
        </div>
      </div>

      <Tabs defaultValue="chats" className="h-full">
        <TabsList className="grid grid-cols-3 bg-gray-100 dark:bg-zinc-800 p-2 shadow">
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="soporte">Soporte</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex h-[calc(100vh-128px)]">
          <div className="w-1/4 border-r p-4 bg-gray-50 dark:bg-zinc-800 overflow-y-auto">
            {contactos.map((c) => (
              <Card
                key={c.telefono}
                onClick={() => setChatActivo(c.telefono)}
                className={`mb-2 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200 ${chatActivo === c.telefono ? "bg-blue-100 dark:bg-blue-700 ring-2 ring-blue-500" : ""}`}
              >
                <CardContent className="p-3 font-medium">{c.nombre || c.telefono}</CardContent>
              </Card>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            <ScrollArea ref={chatRef} className="flex-1 p-4 space-y-2 overflow-y-auto">
              {mensajes.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[70%] px-4 py-2 rounded-lg shadow ${msg.tipo === "enviado" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 dark:bg-zinc-700"}`}
                >
                  {msg.es_audio ? (
                    <audio controls src={`${API_URL}/audios/${msg.contenido.match(/\[Audio guardado: (.+)\]/)?.[1]}`} />
                  ) : (
                    msg.contenido
                  )}
                </div>
              ))}
            </ScrollArea>

            <div className="p-4 border-t flex gap-2 bg-white dark:bg-zinc-800">
              <Input value={nuevoMensaje} onChange={(e) => setNuevoMensaje(e.target.value)} placeholder="Escribe un mensaje..." />
              <Button onClick={enviarMensaje} className="bg-blue-600 hover:bg-blue-700">Enviar</Button>
              {!grabando ? (
                <Button onClick={comenzarGrabacion} className="bg-green-600 hover:bg-green-700">🎙️</Button>
              ) : (
                <Button onClick={detenerGrabacion} variant="destructive">⏹️</Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contactos">
          <div className="p-4">
            <h2 className="text-xl mb-3 font-semibold">📇 Contactos Registrados</h2>
            <ul className="space-y-2">
              {contactos.map((c) => (
                <li key={c.telefono} className="border rounded px-3 py-2 bg-white dark:bg-zinc-700 shadow-sm">
                  {c.nombre || c.telefono}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="soporte">
          <div className="p-6 space-y-3">
            <h2 className="text-xl font-bold">🛠 Soporte Técnico</h2>
            <p>✔️ Puedes enviar mensajes de texto y audios.</p>
            <p>✔️ El backend debe estar en funcionamiento (Render).</p>
            <p>📧 Contacto: soporte@tuempresa.com</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
