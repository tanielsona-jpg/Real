import { STUDY_PLAN } from "./useStudy";

describe("STUDY_PLAN", () => {
  it("é um array com pelo menos 5 livros", () => {
    expect(Array.isArray(STUDY_PLAN)).toBe(true);
    expect(STUDY_PLAN.length).toBeGreaterThanOrEqual(5);
  });

  it("inclui Daniel como primeiro livro do plano", () => {
    expect(STUDY_PLAN[0]).toBe("Daniel");
  });

  it("não tem duplicatas", () => {
    const unicos = [...new Set(STUDY_PLAN)];
    expect(unicos.length).toBe(STUDY_PLAN.length);
  });
});
