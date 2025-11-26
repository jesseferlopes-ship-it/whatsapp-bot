import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Variáveis do Render
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const AGENT_ID = process.env.AGENT_ID; // ← modelo configurado no Render
const ULTRA_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN;

// Log para garantir que o modelo está correto
console.log("🔍 AGENT_ID carregado:", AGENT_ID);

// Função para chamar a OpenAI
async function callOpenAI(model, input) {
  return axios.post(
    "https://api.openai.com/v1/responses",
    { model, input },
    { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
  );
}

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.data?.body;
    const phone = req.body?.data?.from;

    console.log("📩 Mensagem recebida:", message);

    let reply;

    try {
      // Tenta o modelo configurado no Render
      const openai = await callOpenAI(AGENT_ID, message);
      reply = openai.data.output_text;
      console.log("🤖 Resposta do modelo principal:", reply);
    } catch (err) {
      console.log("⚠️ Erro com modelo principal:", err?.response?.data);

      // Fallback automático se o modelo falhar
      const fallback = await callOpenAI("gpt-4o-mini", message);
      reply = fallback.data.output_text;
      console.log("🔁 Resposta do fallback (gpt-4o-mini):", reply);
    }

    // Envia resposta no WhatsApp
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
