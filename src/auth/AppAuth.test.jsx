import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";
import { useAuth } from "./AuthContext";

vi.mock("./AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../components/Dashboard", () => ({ default: () => "PAINEL_LOCAL" }));
vi.mock("../components/DiagnosticoSupabase", () => ({ default: () => "RPC_LEITURA" }));
vi.mock("../components/ConstrutorasObras", () => ({ default: () => null }));
vi.mock("../components/Atividades", () => ({ default: () => null }));
vi.mock("../components/Agenda.tsx", () => ({ default: () => null }));
vi.mock("../components/RelatorioFinanceiro", () => ({ default: () => null }));
vi.mock("../components/RelatorioServicos", () => ({ default: () => null }));
vi.mock("../components/RelatorioLocacao", () => ({ default: () => null }));
vi.mock("../components/RelatorioEquipamentosObra", () => ({ default: () => null }));
vi.mock("../components/Relatorios", () => ({ default: () => null }));
vi.mock("../components/FechamentoMensal", () => ({ default: () => null }));
vi.mock("../components/BackupImportacao", () => ({ default: () => null }));
vi.mock("../components/Configuracoes", () => ({ default: () => null }));
vi.mock("../components/TabelaComercial", () => ({ default: () => null }));
vi.mock("../components/ListaDeTarefas", () => ({ default: () => null }));
vi.mock("../components/ControlePatrimonios", () => ({ default: () => null }));

function render(status, role = "admin") {
  useAuth.mockReturnValue({ status, session: status === "authorized" ? { user: { email: "teste@example.invalid" } } : null,
    membership: status === "authorized" ? { organization_id: "cd-locacoes", role, active: true } : null,
    message: status === "denied" ? "Acesso negado" : "", login: vi.fn(), logout: vi.fn() });
  return renderToStaticMarkup(<App />);
}
beforeEach(() => { vi.stubGlobal("React", React); });
describe("proteção das telas do App", () => {
  it("loading não monta dados locais", () => { const html = render("loading"); expect(html).toContain("Verificando sessão"); expect(html).not.toContain("PAINEL_LOCAL"); });
  it.each(["signed-out", "denied", "unconfigured"])("%s bloqueia as telas", (status) => {
    const html = render(status); expect(html).not.toContain("PAINEL_LOCAL"); expect(html).not.toContain("RPC_LEITURA");
    expect(html).toContain(status === "denied" ? "Acesso negado" : "Entrar");
  });
  it("admin acessa painel sem gestão legada de usuários", () => {
    const html = render("authorized"); expect(html).toContain("PAINEL_LOCAL"); expect(html).toContain("ainda não sincronizados"); expect(html).not.toContain(">Usuários<");
  });
  it("gestor não recebe cadastro comercial exclusivo de admin", () => {
    const html = render("authorized", "gestor"); expect(html).toContain("PAINEL_LOCAL"); expect(html).not.toContain("Tabela Comercial");
  });
  it("cliente recebe somente diagnóstico RPC e logout", () => {
    const html = render("authorized", "cliente"); expect(html).toContain("RPC_LEITURA"); expect(html).not.toContain("PAINEL_LOCAL"); expect(html).not.toContain(">Atividades<"); expect(html).not.toContain(">Agenda<"); expect(html).toContain("Sair");
  });
  it("funcionário recebe bloqueio explícito sem montar views", () => {
    const html = render("authorized", "funcionario"); expect(html).toContain("080002 está pendente"); expect(html).not.toContain("PAINEL_LOCAL"); expect(html).not.toContain("RPC_LEITURA");
  });
});
