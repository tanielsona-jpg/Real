// functions/index.js
// ─────────────────────────────────────────────────────────────────
// Cloud Function: canelaDeFogo
//
// Recebe do app: { pergunta, livro, capitulo, textoCapitulo }
// Chama a API da IA com um system prompt fixo
// Retorna: { resposta }
//
// Deploy:
//   firebase functions:secrets:set ANTHROPIC_KEY
//   firebase deploy --only functions
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");
const Anthropic               = require("@anthropic-ai/sdk");

const ANTHROPIC_KEY = defineSecret("ANTHROPIC_KEY");

exports.canelaDeFogo = onCall(
  { secrets: [ANTHROPIC_KEY], region: "us-central1" },
  async (request) => {

    const { pergunta, livro, capitulo, textoCapitulo } = request.data;

    // Validação básica
    if (!pergunta || typeof pergunta !== "string" || pergunta.trim().length === 0) {
      throw new HttpsError("invalid-argument", "A pergunta não pode estar vazia.");
    }
    if (pergunta.length > 800) {
      throw new HttpsError("invalid-argument", "Pergunta muito longa.");
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_KEY.value() });

    const systemPrompt = `Você é a Canela de Fogo ❤️‍🔥, assistente de estudos bíblicos da Família Azevedo.

Personalidade:
- Voz encorajadora, profunda e cheia de fé
- Respostas calorosas e inspiradoras, mas sempre fundamentadas no texto
- Usa linguagem acessível, com profundidade espiritual
- Pode incluir perguntas reflexivas para estimular meditação

Regras importantes:
- Responda APENAS perguntas relacionadas ao texto bíblico fornecido abaixo
- Se a pergunta for fora do escopo do capítulo, redirecione gentilmente: "Boa pergunta! Mas vamos nos concentrar em ${livro} ${capitulo} por agora..."
- Seja conciso: respostas entre 3 e 8 linhas
- Não cite versículos fora deste capítulo sem avisar que está expandindo o contexto

Texto atual — ${livro}, capítulo ${capitulo}:
${textoCapitulo || "(texto não disponível)"}`;

    try {
      const response = await client.messages.create({
        model:      "claude-opus-4-6",
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: "user", content: pergunta.trim() }],
      });

      const resposta = response.content[0]?.text || "Não consegui gerar uma resposta agora.";
      return { resposta };

    } catch (err) {
      console.error("Erro na API da IA:", err);
      throw new HttpsError("internal", "Erro ao consultar a IA. Tente novamente.");
    }
  }
);
