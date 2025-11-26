import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// PREENCHA COM SUAS CHAVES DEPOIS (via Render)
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const ULTRA_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN;

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.data?.body;
    const phone = req.body?.data?.from;

    const openai = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: AGENT_ID,
        input: message
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` }
      }
    );

    const reply = openai.data.output_text;

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
    console.log(err?.response?.data || err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("Rodando na porta 3000"));
