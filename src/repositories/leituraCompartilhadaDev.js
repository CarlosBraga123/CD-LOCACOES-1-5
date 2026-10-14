export function chaveSessaoLeitura(auth) {
  if (auth?.status !== 'authorized' || !auth.session?.user?.id ||
      auth.membership?.organization_id !== 'cd-locacoes' || auth.membership?.active !== true ||
      !['admin','gestor'].includes(auth.membership?.role)) return null;
  return JSON.stringify([auth.session.user.id, auth.membership.organization_id, auth.membership.role]);
}

// Mesmo snapshot publicado para todos os consumidores; nunca lê/grava armazenamento local.
export function criarLeituraCompartilhadaDev(repository, contextoAtual, agora = () => new Date().toISOString()) {
  let state = {snapshot:null, loading:false, error:'', updated:'', revision:0};
  let scope = null, generation = 0, abort = null;
  const listeners = new Set();
  const publish = next => { state = next; listeners.forEach(fn => fn(state)); };
  const sincronizarSessao = () => {
    const next = chaveSessaoLeitura(contextoAtual());
    if (next !== scope) {
      scope = next; generation++; abort?.abort();
      publish({snapshot:null, loading:false, error:'', updated:'', revision:0});
    }
    return scope;
  };
  return {
    repository,
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    sincronizarSessao,
    cancelar() { generation++; abort?.abort(); },
    async atualizar({preservarSnapshot=false}={}) {
      const owner = sincronizarSessao();
      if (!owner) return false;
      const request = ++generation;
      abort?.abort(); abort = new AbortController();
      const signal = abort.signal;
      publish({...state, loading:true, error:''});
      try {
        const first = await repository.listarAtualizado({signal});
        if (request !== generation || chaveSessaoLeitura(contextoAtual()) !== owner) return false;
        const second = await repository.listarAtualizado({signal});
        if (request !== generation || chaveSessaoLeitura(contextoAtual()) !== owner) return false;
        // Detecta mudanças observáveis entre páginas/tabelas sem supor MVCC remoto.
        if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Leitura divergente');
        publish({snapshot:second, loading:false, error:'', updated:agora(), revision:state.revision+1});
        return true;
      } catch {
        if (request === generation && chaveSessaoLeitura(contextoAtual()) === owner) {
          publish({...state, snapshot:preservarSnapshot ? state.snapshot : null,
            updated:preservarSnapshot ? state.updated : '', loading:false,
            error:'Leitura Supabase DEV não confirmada. Verifique sessão e conexão ou atualize novamente; os dados podem ter mudado durante a consulta. Nenhum dado local foi usado.'});
        }
        return false;
      } finally {
        if (chaveSessaoLeitura(contextoAtual()) !== owner) sincronizarSessao();
      }
    },
  };
}

export function dadosRemotosParaAgenda(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.atividades) || !Array.isArray(snapshot.obras) || !Array.isArray(snapshot.construtoras)) {
    throw new Error('Dados remotos da Agenda incompletos.');
  }
  // Só adapta os catálogos; não consulta preços, vínculos ou obras do navegador.
  const obras = snapshot.obras.map(o => ({...o, nome:o.name,
    construtora:snapshot.construtoras.find(c => c.id === o.constructor_id)?.name}));
  const avisos = [];
  const dataValida = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
  };
  const semData = snapshot.atividades.filter(a => !dataValida(a.dataLiberacao || a.dataAgendamento)).length;
  const semObra = snapshot.atividades.filter(a => !obras.some(o => o.id === a.obraId && o.nome && o.construtora)).length;
  if (semData) avisos.push(`${semData} atividade(s) com data de referência ausente ou inválida. O calendário mantém o tratamento original; confira esses registros antes de considerar a agenda completa.`);
  if (semObra) avisos.push(`${semObra} atividade(s) sem catálogo completo de obra/construtora; serão usados apenas os nomes históricos remotos disponíveis.`);
  return {atividades:snapshot.atividades, obras, avisos};
}
