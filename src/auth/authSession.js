export const DEV_PROJECT_REF = "ldamjmjcgjmujiougcrs";
export const DEV_ORGANIZATION = "cd-locacoes";
const ROLES = ["admin", "gestor", "funcionario", "cliente"];
const MANAGEMENT = ["dashboard", "atividades", "agenda", "tarefas", "relatorios", "fechamentomensal", "relatoriofinanceiro", "relatorioservicos", "relatoriolocacao", "relatorioequipamentosobra"];
const ADMIN = ["construtorasobras", "controlepatrimonios", "backup", "configuracoes", "tabelacomercial"];

export function configuracaoDevValida(url, key) {
  try {
    if (new URL(url).origin !== `https://${DEV_PROJECT_REF}.supabase.co`) return false;
    if (key?.startsWith("sb_publishable_")) return true;
    const payload = JSON.parse(atob(String(key).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "anon" && payload.ref === DEV_PROJECT_REF;
  } catch { return false; }
}
export function podeAcessarPagina(membership, page) {
  if (membership?.active !== true || membership.organization_id !== DEV_ORGANIZATION || !ROLES.includes(membership.role)) return false;
  if (page === "diagnosticosupabase") return membership.role !== "funcionario";
  return (["admin", "gestor"].includes(membership.role) && MANAGEMENT.includes(page)) || (membership.role === "admin" && ADMIN.includes(page));
}
export function mensagemLogin(error) {
  if (error?.code === "invalid_credentials") return "E-mail ou senha inválidos.";
  if (error?.code === "email_not_confirmed") return "Confirme seu e-mail antes de entrar.";
  return "Não foi possível autenticar. Confira sua conexão e tente novamente.";
}

// Autoridade remota; não consulta nem altera perfis ou coleções locais.
export function criarControleSessao(client, { now = () => Date.now(), schedule = setTimeout, cancel = clearTimeout } = {}) {
  let state = { status: "loading", session: null, membership: null, message: "" };
  let generation = 0, operation = 0, stopped = false, blocked = false, timer, expiryTimer, subscription;
  const listeners = new Set();
  const publish = (next) => { state = next; listeners.forEach((listener) => listener(state)); };
  const clear = (status, message = "") => {
    generation += 1;
    cancel(timer);
    cancel(expiryTimer);
    publish({ status, message, session: null, membership: null });
  };
  const validate = async (session, background = false) => {
    if (stopped || blocked) return;
    if (background && state.status === "authorized") { generation += 1; cancel(timer); }
    else clear(session ? "loading" : "signed-out");
    const current = generation;
    if (!session) return;
    if (!Number.isFinite(session.expires_at) || session.expires_at * 1000 <= now()) {
      clear("signed-out", "Sessão expirada. Entre novamente."); return;
    }
    try {
      const { data: userData, error: userError } = await client.auth.getUser(session.access_token);
      if (stopped || current !== generation) return;
      if (userError || !userData?.user?.id || userData.user.id !== session.user?.id) {
        clear("signed-out", "Não foi possível validar sua sessão. Entre novamente."); return;
      }
      const { data, error } = await client.from("current_membership_context")
        .select("organization_id, role, active").eq("organization_id", DEV_ORGANIZATION).limit(2);
      if (stopped || current !== generation) return;
      if (error) throw error;
      const membership = data?.length === 1 ? data[0] : null;
      if (membership?.active !== true || membership.organization_id !== DEV_ORGANIZATION || !ROLES.includes(membership.role)) {
        clear("denied", "Acesso negado: é necessária uma membership ativa e autorizada na organização de Desenvolvimento."); return;
      }
      if (session.expires_at * 1000 <= now()) {
        clear("signed-out", "Sessão expirada. Entre novamente."); return;
      }
      publish({ status: "authorized", message: "", session: { ...session, user: userData.user }, membership: { ...membership } });
      // Revalidação periódica detecta revogação; erros fecham o acesso.
      timer = schedule(() => validate(session, true), Math.min(60000, session.expires_at * 1000 - now()));
      cancel(expiryTimer);
      expiryTimer = schedule(() => clear("signed-out", "Sessão expirada. Entre novamente."), session.expires_at * 1000 - now());
    } catch {
      if (!stopped && current === generation) clear("denied", "Não foi possível verificar o acesso à organização. Confira sua conexão e entre novamente.");
    }
  };
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async start() {
      stopped = false;
      if (!client) { clear("unconfigured", "Configuração Supabase DEV ausente ou inválida."); return; }
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (stopped || blocked) return;
        if (event === "SIGNED_OUT") clear("signed-out", "Sessão encerrada. Entre novamente.");
        else {
          const background = state.status === "authorized" && state.session?.user?.id === session?.user?.id;
          if (background) generation += 1;
          else clear("loading");
          const current = generation;
          // Evita aguardar chamadas Auth dentro do callback do SDK.
          Promise.resolve().then(() => { if (!stopped && current === generation) validate(session, background); });
        }
      });
      subscription = data.subscription;
      const current = generation;
      try {
        const { data: recovered, error } = await client.auth.getSession();
        if (!stopped && current === generation) {
          if (error) clear("signed-out", "Não foi possível recuperar a sessão. Entre novamente.");
          else await validate(recovered?.session);
        }
      } catch { if (!stopped && current === generation) clear("signed-out", "Não foi possível recuperar a sessão."); }
    },
    async login(email, password) {
      const attempt = ++operation;
      blocked = false;
      clear("loading");
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (stopped || blocked || attempt !== operation) return;
        if (error) clear("signed-out", mensagemLogin(error));
        else await validate(data?.session);
      } catch { if (!stopped && !blocked && attempt === operation) clear("signed-out", mensagemLogin()); }
    },
    async logout() {
      operation += 1;
      blocked = true;
      clear("signed-out", "Sessão encerrada.");
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        blocked = false;
      } catch { clear("denied", "Falha ao encerrar a sessão. Tente sair novamente antes de continuar."); }
    },
    async refresh() {
      if (stopped || blocked || !client) return;
      const background = state.status === "authorized";
      if (background) generation += 1;
      else clear("loading");
      const current = generation;
      try {
        const { data, error } = await client.auth.getSession();
        if (stopped || current !== generation) return;
        if (error) throw error;
        await validate(data?.session, background && data?.session?.user?.id === state.session?.user?.id);
      } catch { if (!stopped && current === generation) clear("signed-out", "Não foi possível revalidar a sessão. Entre novamente."); }
    },
    denyOffline() { clear("denied", "Sem conexão: não é possível validar o acesso Supabase. Os dados locais foram preservados."); },
    stop() { stopped = true; generation += 1; operation += 1; cancel(timer); cancel(expiryTimer); subscription?.unsubscribe(); listeners.clear(); },
  };
}
