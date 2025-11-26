import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Variáveis do Render
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const ULTRA_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN;

console.log("🟦 AGENT_ID carregado:", AGENT_ID);

// Função para chamar o modelo GPT
async function callChatModel(model, message) {
  return axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [
        { role: "user", content: message }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.data?.body;
    const phone = req.body?.data?.from;

    console.log("📩 Mensagem recebida:", message);

    let reply;

    try {
      const response = await callChatModel(AGENT_ID, message);

      reply = response.data.choices[0]?.message?.content;
      console.log("🤖 Resposta modelo principal:", reply);
    } catch (err) {
      console.log("⚠️ Erro modelo principal:", err?.response?.data);

      // Tentativa fallback com gpt-4o-mini
      const fallback = await callChatModel("gpt-4o-mini", message);

      reply = fallback.data.choices[0]?.message?.content;
      console.log("🔁 Resposta fallback:", reply);
    }

    // Se ainda estiver undefined:
    if (!reply) reply = "Desculpe, não entendi sua mensagem.";

    // Envia no WhatsApp
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
