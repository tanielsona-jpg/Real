// ─────────────────────────────────────────────────────────────────────────────
// apiBible.js — Integração com api.scripture.api.bible
//
// Versões suportadas: NVI, NVT (buscadas dinamicamente por nome na API)
// ─────────────────────────────────────────────────────────────────────────────

const API_KEY = 'q3d75t6SITE5gIxDJr2_C';
const BASE    = 'https://api.scripture.api.bible/v1';

// ── Mapeamento: nome português do livro → código OSIS (usado pela API) ────────
export const BOOK_CODES = {
  // Antigo Testamento
  'Gênesis':                  'GEN',
  'Êxodo':                    'EXO',
  'Levítico':                 'LEV',
  'Números':                  'NUM',
  'Deuteronômio':             'DEU',
  'Josué':                    'JOS',
  'Juízes':                   'JDG',
  'Rute':                     'RUT',
  '1 Samuel':                 '1SA',
  '2 Samuel':                 '2SA',
  '1 Reis':                   '1KI',
  '2 Reis':                   '2KI',
  '1 Crônicas':               '1CH',
  '2 Crônicas':               '2CH',
  'Esdras':                   'EZR',
  'Neemias':                  'NEH',
  'Ester':                    'EST',
  'Jó':                       'JOB',
  'Salmos':                   'PSA',
  'Provérbios':               'PRO',
  'Eclesiastes':              'ECC',
  'Cantares':                 'SNG',
  'Cântico dos Cânticos':     'SNG',
  'Cantares de Salomão':      'SNG',
  'Isaías':                   'ISA',
  'Jeremias':                 'JER',
  'Lamentações':              'LAM',
  'Ezequiel':                 'EZK',
  'Daniel':                   'DAN',
  'Oséias':                   'HOS',
  'Joel':                     'JOL',
  'Amós':                     'AMO',
  'Obadias':                  'OBA',
  'Jonas':                    'JON',
  'Miquéias':                 'MIC',
  'Naum':                     'NAM',
  'Habacuque':                'HAB',
  'Sofonias':                 'ZEP',
  'Ageu':                     'HAG',
  'Zacarias':                 'ZEC',
  'Malaquias':                'MAL',
  // Novo Testamento
  'Mateus':                   'MAT',
  'Marcos':                   'MRK',
  'Lucas':                    'LUK',
  'João':                     'JHN',
  'Atos':                     'ACT',
  'Romanos':                  'ROM',
  '1 Coríntios':              '1CO',
  '2 Coríntios':              '2CO',
  'Gálatas':                  'GAL',
  'Efésios':                  'EPH',
  'Filipenses':               'PHP',
  'Colossenses':              'COL',
  '1 Tessalonicenses':        '1TH',
  '2 Tessalonicenses':        '2TH',
  '1 Timóteo':                '1TI',
  '2 Timóteo':                '2TI',
  'Tito':                     'TIT',
  'Filemom':                  'PHM',
  'Hebreus':                  'HEB',
  'Tiago':                    'JAS',
  '1 Pedro':                  '1PE',
  '2 Pedro':                  '2PE',
  '1 João':                   '1JN',
  '2 João':                   '2JN',
  '3 João':                   '3JN',
  'Judas':                    'JUD',
  'Apocalipse':               'REV',
};

// ── Cache em memória dos IDs das Bíblias (evita re-fetch a cada troca) ────────
let _bibleIdsCache = null;

async function resolveBibleIds() {
  if (_bibleIdsCache) return _bibleIdsCache;

  const res = await fetch(`${BASE}/bibles?language=por`, {
    headers: { 'api-key': API_KEY },
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'Chave de API inválida. Ative a chave em portal.dev.api.bible.'
        : `Erro ao listar versões: ${res.status}`
    );
  }

  const { data: bibles } = await res.json();

  // Busca pelo nome/abreviação — robusto a mudanças de ID no servidor
  const find = (...keywords) =>
    bibles.find(b => {
      const haystack = [
        b.name, b.nameLocal, b.abbreviation, b.abbreviationLocal,
      ].join(' ').toLowerCase();
      return keywords.some(k => haystack.includes(k.toLowerCase()));
    })?.id ?? null;

  _bibleIdsCache = {
    NVI: find('NVI', 'nova versão internacional', 'nova versao internacional'),
    NVT: find('NVT', 'nova versão transformadora', 'nova versao transformadora'),
  };

  return _bibleIdsCache;
}

// ── Parseia o texto da API em array de versículos ─────────────────────────────
// O endpoint retorna conteúdo como: "[1] No princípio... [2] A terra era..."
function parseContent(content) {
  if (!content) return [];

  const verses = [];
  const re = /\[(\d+)\]([\s\S]*?)(?=\[\d+\]|$)/g;
  let m;

  while ((m = re.exec(content)) !== null) {
    const num  = parseInt(m[1], 10);
    const text = m[2].replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (num > 0 && text) verses.push({ verse: num, text });
  }

  return verses;
}

// ── Função principal exportada ────────────────────────────────────────────────
// Retorna: [{verse: number, text: string}, ...]
export async function fetchApiChapter(version, bookName, chapterNum) {
  const ids      = await resolveBibleIds();
  const bibleId  = ids[version];

  if (!bibleId) {
    throw new Error(
      `A versão "${version}" não está disponível nesta conta da API.Bible.`
    );
  }

  const bookCode = BOOK_CODES[bookName];
  if (!bookCode) {
    throw new Error(`Livro "${bookName}" não mapeado para a API.`);
  }

  const chapterId = `${bookCode}.${chapterNum}`;
  const url =
    `${BASE}/bibles/${bibleId}/chapters/${chapterId}` +
    `?content-type=text&include-verse-numbers=true` +
    `&include-notes=false&include-titles=false&include-chapter-numbers=false`;

  const res = await fetch(url, { headers: { 'api-key': API_KEY } });

  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? `Capítulo não encontrado na versão ${version}.`
        : `Erro ao carregar capítulo (${res.status}).`
    );
  }

  const { data } = await res.json();
  const verses   = parseContent(data.content);

  if (verses.length === 0) {
    throw new Error(`Nenhum versículo retornado para ${bookName} ${chapterNum} (${version}).`);
  }

  return verses;
}
