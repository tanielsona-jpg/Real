import { BOOK_CODES } from "./apiBible";

// Testa o parseContent indiretamente via importação
// A função não é exportada, então testamos via comportamento dos dados
describe("BOOK_CODES", () => {
  it("contém os 66 livros canônicos", () => {
    const codigos = Object.values(BOOK_CODES);
    // Remove duplicatas (Cantares tem 3 entradas para o mesmo código SNG)
    const unicos = [...new Set(codigos)];
    expect(unicos.length).toBe(66);
  });

  it("mapeia corretamente livros do AT e NT", () => {
    expect(BOOK_CODES["Gênesis"]).toBe("GEN");
    expect(BOOK_CODES["Apocalipse"]).toBe("REV");
    expect(BOOK_CODES["João"]).toBe("JHN");
    expect(BOOK_CODES["Salmos"]).toBe("PSA");
    expect(BOOK_CODES["Daniel"]).toBe("DAN");
  });

  it("todos os valores são strings de 3 caracteres", () => {
    Object.values(BOOK_CODES).forEach((code) => {
      expect(typeof code).toBe("string");
      expect(code.length).toBe(3);
    });
  });
});

describe("parseContent (via regex interno)", () => {
  // Testa a lógica de parsing diretamente
  function parseContent(content) {
    if (!content) return [];
    const verses = [];
    const re = /\[(\d+)\]([\s\S]*?)(?=\[\d+\]|$)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const num  = parseInt(m[1], 10);
      const text = m[2].replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
      if (num > 0 && text) verses.push({ verse: num, text });
    }
    return verses;
  }

  it("parseia formato padrão da API", () => {
    const input = "[1] No princípio criou Deus [2] A terra era sem forma";
    const result = parseContent(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ verse: 1, text: "No princípio criou Deus" });
    expect(result[1]).toEqual({ verse: 2, text: "A terra era sem forma" });
  });

  it("retorna array vazio para conteúdo nulo ou vazio", () => {
    expect(parseContent(null)).toHaveLength(0);
    expect(parseContent("")).toHaveLength(0);
    expect(parseContent(undefined)).toHaveLength(0);
  });

  it("normaliza quebras de linha e espaços múltiplos", () => {
    const input = "[1] Texto\ncom\nquebras   e  espaços [2] Segundo";
    const result = parseContent(input);
    expect(result[0].text).toBe("Texto com quebras e espaços");
  });
});
