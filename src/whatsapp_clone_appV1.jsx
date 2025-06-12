import { useState, useEffect, useRef } from "react";

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

  useEffect(() => {
    const chatDiv = document.querySelector(".overflow-y-auto");
    if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
  }, [mensajes]);

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
        const nombreArchivo = `${chatActivo}_${Date.now()}.webm`;
        setMensajes([
          ...mensajes,
          { tipo: "enviado", contenido: `[Audio guardado: ${nombreArchivo}]`, es_audio: true },
        ]);
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
    <div className="flex h-screen font-sans">
      <div className="w-1/4 border-r p-4 overflow-y-auto bg-gray-100">
        <h2 className="text-xl font-bold mb-4">Contactos</h2>
        {contactos.map((c) => (
          <div
            key={c.telefono}
            className={`cursor-pointer p-2 rounded-lg hover:bg-gray-300 ${chatActivo === c.telefono ? "bg-gray-400" : ""}`}
            onClick={() => setChatActivo(c.telefono)}
          >
            {c.nombre || c.telefono}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={`max-w-xs px-4 py-2 rounded-lg ${msg.tipo === "enviado" ? "bg-blue-200 ml-auto text-right" : "bg-gray-200"}`}
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

        <div className="p-4 border-t flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Escribe tu mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <button onClick={enviarMensaje} className="bg-blue-600 text-white px-4 py-2 rounded">
            Enviar
          </button>
          {!grabando ? (
            <button onClick={comenzarGrabacion} className="bg-green-500 text-white px-2 py-2 rounded">🎙️</button>
          ) : (
            <button onClick={detenerGrabacion} className="bg-red-600 text-white px-2 py-2 rounded">⏹️</button>
          )}
        </div>
      </div>
    </div>
  );
}