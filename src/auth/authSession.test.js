import { describe, it, expect, vi } from "vitest";
import { criarControleSessao, podeAcessarPagina, configuracaoDevValida, DEV_PROJECT_REF, DEV_ORGANIZATION } from "./authSession";

const membership = (role = "admin", extra = {}) => ({ organization_id: DEV_ORGANIZATION, role, active: true, ...extra });
const session = { access_token: "ficticio", user: { id: "teste", email: "conta@example.invalid", user_metadata: { role: "admin" } }, expires_at: 2000 };
function setup({ recovered = session, rows = [membership()], user = session.user, userError = null, memberError = null } = {}) {
  let callback;
  const unsubscribe = vi.fn();
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), limit: vi.fn(async () => ({ data: rows, error: memberError })) };
  const client = { from: vi.fn(() => query), auth: {
    getSession: vi.fn(async () => ({ data: { session: recovered }, error: null })),
    getUser: vi.fn(async () => ({ data: { user }, error: userError })),
    onAuthStateChange: vi.fn((listener) => { callback = listener; return { data: { subscription: { unsubscribe } } }; }),
    signInWithPassword: vi.fn(async () => ({ data: { session }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  } };
  const schedule = vi.fn(), cancel = vi.fn();
  const control = criarControleSessao(client, { now: () => 1000000, schedule, cancel });
  return { client, query, control, unsubscribe, schedule, cancel, event: (event, next) => callback(event, next) };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe("sessão Supabase DEV", () => {
  it("recupera e valida usuário remoto antes da membership", async () => {
    const { control, client, query } = setup();
    expect(control.getState().status).toBe("loading");
    await control.start();
    expect(control.getState().status).toBe("authorized");
    expect(client.auth.getUser).toHaveBeenCalledWith(session.access_token);
    expect(client.from).toHaveBeenCalledWith("current_membership_context");
    expect(query.eq).toHaveBeenCalledWith("organization_id", DEV_ORGANIZATION);
  });
  it("não abre telas sem sessão", async () => {
    const { control, client } = setup({ recovered: null }); await control.start();
    expect(control.getState().status).toBe("signed-out"); expect(client.from).not.toHaveBeenCalled();
  });
  it.each([
    ["ausente", []], ["inativa", [membership("admin", { active: false })]],
    ["outra organização", [membership("admin", { organization_id: "outra" })]],
    ["perfil desconhecido", [membership("superadmin")]], ["ambígua", [membership(), membership()]],
    ["active textual", [membership("admin", { active: "true" })]],
  ])("nega membership %s", async (_label, rows) => {
    const { control } = setup({ rows }); await control.start();
    expect(control.getState().status).toBe("denied"); expect(control.getState().membership).toBeNull();
  });
  it("ignora admin em metadata quando membership é cliente", async () => {
    const { control } = setup({ rows: [membership("cliente")] }); await control.start();
    expect(control.getState().membership.role).toBe("cliente");
    expect(podeAcessarPagina(control.getState().membership, "atividades")).toBe(false);
  });
  it.each([null, { id: "outro" }])("rejeita identidade remota divergente", async (user) => {
    const { control, client } = setup({ user }); await control.start();
    expect(control.getState().status).toBe("signed-out"); expect(client.from).not.toHaveBeenCalled();
  });
  it("nega sessão rejeitada pelo servidor", async () => {
    const { control } = setup({ userError: { message: "segredo" } }); await control.start();
    expect(control.getState().status).toBe("signed-out"); expect(JSON.stringify(control.getState())).not.toContain("segredo");
  });
  it("fecha acesso diante de erro de membership sem expor erro bruto", async () => {
    const { control } = setup({ memberError: { message: "token-sensivel" } }); await control.start();
    expect(control.getState().status).toBe("denied"); expect(JSON.stringify(control.getState())).not.toContain("token-sensivel");
  });
  it("rejeita sessão expirada sem consultar tabelas", async () => {
    const { control, client } = setup({ recovered: { ...session, expires_at: 1000 } }); await control.start();
    expect(control.getState().message).toContain("expirada"); expect(client.from).not.toHaveBeenCalled();
  });
  it("fecha no evento SIGNED_OUT", async () => {
    const { control, event } = setup(); await control.start(); event("SIGNED_OUT", null);
    expect(control.getState().status).toBe("signed-out"); expect(control.getState().session).toBeNull();
  });
  it("logout revoga imediatamente e preserva coleções locais", async () => {
    const storage = { clear: vi.fn(), removeItem: vi.fn(), setItem: vi.fn(), getItem: vi.fn(() => '{"tipo":"admin"}') };
    vi.stubGlobal("localStorage", storage);
    const { control, client } = setup(); await control.start();
    let resolve;
    client.auth.signOut.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const pending = control.logout();
    expect(control.getState().session).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    resolve({ error: null }); await pending;
    expect(storage.clear).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.getItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("falha de logout continua bloqueada mesmo com evento de refresh", async () => {
    const { control, client, event } = setup(); await control.start();
    client.auth.signOut.mockResolvedValue({ error: {} }); await control.logout(); event("TOKEN_REFRESHED", session); await flush();
    expect(control.getState().status).toBe("denied");
  });
  it("login envia senha apenas ao SDK e valida membership", async () => {
    const { control, client } = setup({ recovered: null }); await control.start(); await control.login(" conta@example.invalid ", "senha-ficticia");
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: "conta@example.invalid", password: "senha-ficticia" });
    expect(control.getState().status).toBe("authorized"); expect(JSON.stringify(control.getState())).not.toContain("senha-ficticia");
  });
  it("login falho apresenta mensagem segura", async () => {
    const { control, client } = setup({ recovered: null }); await control.start();
    client.auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "segredo" } });
    await control.login("teste@example.invalid", "senha-ficticia");
    expect(control.getState().status).toBe("signed-out"); expect(control.getState().message).toContain("inválidos");
  });
  it("não reabre depois de logout com membership pendente", async () => {
    const { control, query } = setup(); let resolve;
    query.limit.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const pending = control.start(); await flush(); await control.logout();
    resolve({ data: [membership()], error: null }); await pending;
    expect(control.getState().status).toBe("signed-out");
  });
  it("não reabre depois de logout com login pendente", async () => {
    const { control, client } = setup({ recovered: null }); await control.start(); let resolve;
    client.auth.signInWithPassword.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const pending = control.login("teste@example.invalid", "ficticia"); await control.logout();
    resolve({ data: { session }, error: null }); await pending;
    expect(control.getState().status).toBe("signed-out");
  });
  it("refresh valida novo token fora do callback", async () => {
    const { control, event } = setup(); await control.start(); event("TOKEN_REFRESHED", { ...session, access_token: "novo" });
    expect(control.getState().status).toBe("authorized"); await flush(); expect(control.getState().session.access_token).toBe("novo");
  });
  it("revalidação detecta revogação de membership", async () => {
    const { control, query, schedule } = setup(); await control.start();
    query.limit.mockResolvedValue({ data: [], error: null }); await schedule.mock.calls[0][0]();
    expect(control.getState().status).toBe("denied");
  });
  it("revalidação bem-sucedida não desmonta a tela operacional", async () => {
    const { control, schedule } = setup(); await control.start();
    const states = []; control.subscribe((state) => states.push(state.status));
    await schedule.mock.calls[0][0](); expect(states).toEqual(["authorized"]);
  });
  it("expiração bloqueia mesmo se consulta de revalidação não responder", async () => {
    const { control, schedule, client } = setup(); await control.start();
    client.auth.getUser.mockImplementation(() => new Promise(() => {}));
    schedule.mock.calls[0][0](); schedule.mock.calls[1][0]();
    expect(control.getState().status).toBe("signed-out"); expect(control.getState().message).toContain("expirada");
  });
  it("troca de usuário retira dados antes da nova validação", async () => {
    const { control, event } = setup(); await control.start();
    event("SIGNED_IN", { ...session, user: { id: "outro" } });
    expect(control.getState().status).toBe("loading"); expect(control.getState().session).toBeNull();
    await flush(); expect(control.getState().status).toBe("signed-out");
  });
  it("perda de conexão bloqueia telas preservando dados locais", async () => {
    const { control } = setup(); await control.start(); control.denyOffline();
    expect(control.getState().status).toBe("denied"); expect(control.getState().session).toBeNull();
  });
  it("desmontagem remove listener e timer", async () => {
    const { control, unsubscribe, cancel, event } = setup(); await control.start(); control.stop();
    expect(unsubscribe).toHaveBeenCalled(); expect(cancel).toHaveBeenCalled(); event("SIGNED_IN", session); await flush();
    expect(control.getState().status).toBe("authorized");
  });
  it("configuração ausente fecha acesso", async () => {
    const control = criarControleSessao(null); await control.start(); expect(control.getState().status).toBe("unconfigured");
  });
});
describe("limites de autorização e configuração", () => {
  it.each(["cliente", "funcionario"])("%s não acessa módulos locais ou usuários", (role) => {
    for (const page of ["atividades", "agenda", "tarefas", "dashboard", "usuarios", "backup", "relatoriofinanceiro"]) expect(podeAcessarPagina(membership(role), page)).toBe(false);
  });
  it("gestor mantém relatórios, sem módulos exclusivos de admin", () => {
    expect(podeAcessarPagina(membership("gestor"), "relatoriolocacao")).toBe(true);
    expect(podeAcessarPagina(membership("gestor"), "tabelacomercial")).toBe(false);
  });
  it("nenhum perfil tem acesso à gestão legada de senhas", () => {
    for (const role of ["admin", "gestor", "cliente", "funcionario"]) expect(podeAcessarPagina(membership(role), "usuarios")).toBe(false);
  });
  it("organização incorreta e membership inativa não autorizam", () => {
    expect(podeAcessarPagina(membership("admin", { active: false }), "dashboard")).toBe(false);
    expect(podeAcessarPagina(membership("admin", { organization_id: "outra" }), "dashboard")).toBe(false);
  });
  it("aceita chave pública DEV e rejeita host de outro projeto e chave secreta", () => {
    const url = `https://${DEV_PROJECT_REF}.supabase.co`;
    expect(configuracaoDevValida(url, "sb_publishable_ficticia")).toBe(true);
    expect(configuracaoDevValida("https://outro.supabase.co", "sb_publishable_ficticia")).toBe(false);
    expect(configuracaoDevValida(url, "sb_secret_ficticia")).toBe(false);
    expect(configuracaoDevValida(url, `x.${btoa(JSON.stringify({ role: "service_role", ref: DEV_PROJECT_REF }))}.x`)).toBe(false);
    expect(configuracaoDevValida(url, `x.${btoa(JSON.stringify({ role: "anon", ref: DEV_PROJECT_REF }))}.x`)).toBe(true);
  });
});
