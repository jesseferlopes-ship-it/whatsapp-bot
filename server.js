import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.AGENT_ID;
const ULTRA_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN;

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.data?.body;
    const phone = req.body?.data?.from;

    console.log("📩 Mensagem recebida:", message);

    // 1) Criar thread
    const thread = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const threadId = thread.data.id;

    // 2) Adicionar mensagem do usuário
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: message },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    // 3) Criar o RUN
    const run = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const runId = run.data.id;

    // 4) Aguardar a finalização do RUN
    let completed = false;

    while (!completed) {
      const status = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      if (status.data.status === "completed") {
        completed = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 5) Obter mensagens finais
    const msgs = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const responses = msgs.data.data;
    const reply = responses[0].content[0].text.value;

    console.log("🤖 Resposta:", reply);

    // 6) Enviar resposta para o WhatsApp via UltraMSG
    await axios.post(
      `https://api.ultramsg.com/${ULTRA_INSTANCE}/messages/chat`,
      {
        token: ULTRA_TOKEN,
        to: phone,
        body: reply
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.log("❌ Erro no assistente:", err.response?.data || err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("🚀 Rodando na porta 3000"));
