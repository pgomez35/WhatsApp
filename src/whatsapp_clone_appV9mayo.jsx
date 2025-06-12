import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = "https://webhook-axec.onrender.com";

export default function ChatApp() {
  const [contactos, setContactos] = useState([]);
  const [chatActivo, setChatActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [grabando, setGrabando] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    fetch(`${API_URL}/contactos`)
      .then((res) => res.json())
      .then(setContactos);
  }, []);

  useEffect(() => {
    if (chatActivo) {
      fetch(`${API_URL}/mensajes/${chatActivo}`)
        .then((res) => res.json())
        .then(setMensajes);
    }
  }, [chatActivo]);

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;
    const res = await fetch(`${API_URL}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono: chatActivo, mensaje: nuevoMensaje }),
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

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("telefono", chatActivo);
      formData.append("audio", audioBlob);

      const res = await fetch(`${API_URL}/mensajes/audio`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMensajes([...mensajes, { tipo: "enviado", contenido: "[Audio enviado]" }]);
      }
    };

    mediaRecorderRef.current.start();
    setGrabando(true);
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current.stop();
    setGrabando(false);
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Contactos</h2>
        {contactos.map((tel) => (
          <div
            key={tel}
            className={`cursor-pointer p-2 rounded-lg hover:bg-gray-200 ${
              chatActivo === tel ? "bg-gray-300" : ""
            }`}
            onClick={() => setChatActivo(tel)}
          >
            {tel}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.tipo === "enviado"
                  ? "bg-blue-200 ml-auto text-right"
                  : "bg-gray-100"
              }`}
            >
              {msg.contenido}
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Escribe tu mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <Button onClick={enviarMensaje}>Enviar</Button>
          {!grabando ? (
            <Button onClick={comenzarGrabacion}>🎙️</Button>
          ) : (
            <Button variant="destructive" onClick={detenerGrabacion}>
              ⏹️
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
