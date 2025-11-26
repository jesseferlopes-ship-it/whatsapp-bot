import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Variáveis do Render
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const ULTRA_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN;

console.log("🟦 Assistente carregado:", AGENT_ID);

// Chamada para Assistants API
async function callAssistant(assistant_id, message) {
  const run = await axios.post(
    `https://api.openai.com/v1/assistants/${assistant_id}/runs`,
    {
      input: message
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return run.data.output_text;
}

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.data?.body;
    const phone = req.body?.data?.from;

    console.log("📩 Mensagem recebida:", message);

    let reply;

    try {
      reply = await callAssistant(AGENT_ID, message);
      console.log("🤖 Resposta do assistente:", reply);
    } catch (e) {
      console.log("⚠️ Erro no assistente:", e?.response?.data);
      reply = "Desculpe, estou com dificuldades para responder agora.";
    }

    if (!reply) reply = "Desculpe, não consegui entender.";

    // Envia para WhatsApp
    await axios.post(
      `https://api.ultramsg.com/${ULTRA_INSTANCE}/messages/chat`,
      {
        token: ULTRA_TOKEN,
        to: phone,
        body: reply,
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.log("❌ ERRO FINAL:", err?.response?.data || err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("🚀 Rodando na porta 3000"));
