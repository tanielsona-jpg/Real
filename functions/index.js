const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

const OPENAI_KEY = defineSecret("OPENAI_KEY");

exports.canelaDeFogo = onCall(
  { secrets: [OPENAI_KEY], region: "us-central1" },
  async (request) => {

    const { pergunta, livro, capitulo, textoCapitulo } = request.data;

    if (!pergunta || typeof pergunta !== "string" || pergunta.trim().length === 0) {
      throw new HttpsError("invalid-argument", "A pergunta nao pode estar vazia.");
    }
    if (pergunta.length > 800) {
      throw new HttpsError("invalid-argument", "Pergunta muito longa.");
    }

    const client = new OpenAI({ apiKey: OPENAI_KEY.value() });

    const systemPrompt = `Voce e a Canela de Fogo, assistente de estudos biblicos da Familia Azevedo.
Personalidade:
- Voz encorajadora, profunda e cheia de fe
- Respostas calorosas e inspiradoras, mas sempre fundamentadas no texto
- Usa linguagem acessivel, com profundidade espiritual
- Pode incluir perguntas reflexivas para estimular meditacao
Regras importantes:
- Responda APENAS perguntas relacionadas ao texto biblico fornecido abaixo
- Se a pergunta for fora do escopo do capitulo, redirecione gentilmente
- Seja conciso: respostas entre 3 e 8 linhas
- Nao cite versiculos fora deste capitulo sem avisar que esta expandindo o contexto
Texto atual - ${livro}, capitulo ${capitulo}:
${textoCapitulo || "(texto nao disponivel)"}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: pergunta.trim() },
        ],
      });

      const resposta = response.choices[0]?.message?.content || "Nao consegui gerar uma resposta.";
      return { resposta };

    } catch (err) {
      console.error("Erro OpenAI:", err);
      throw new HttpsError("internal", "Erro ao chamar a IA.");
    }
  }
);
