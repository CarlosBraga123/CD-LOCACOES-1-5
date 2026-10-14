import { describe, it, expect, vi } from "vitest";
import { criarAtividadeSupabaseRepository, criarTransporteCadastroRpc, mapearAtividadesRemotas, prepararCadastroAgendado } from "../atividadeSupabaseRepository";
import { calcularEquipamentosAtivosDaObra } from "../../utils/equipamentosAtivos";
import {criarLeituraCompartilhadaDev} from '../leituraCompartilhadaDev';
const org = "cd-locacoes", id = "88000000-0000-4000-8000-000000000001";
const catalog = { construtoras: [{ organization_id: org, id: "c" }], obras: [{ organization_id: org, id: "s", constructor_id: "c" }], equipamentos: [{ organization_id: org, id: "e", active: true, equipment_type: "Balancinho", balancinho_type: "Eletrico", current_patrimony_number: "001" }] };
const form = { obraId: "s", equipamento: "Balancinho", servico: "Instalação", tipoBalancinho: "Eletrico", quantidade: 1, dataAgendamento: "2026-10-13", itensEquipamentos: [{ idEquipamento: "e", numeroPatrimonio: "001" }] };
const clone = (value) => JSON.parse(JSON.stringify(value));
function fake({ rows = [{ organization_id: org, id: "old", service_type: "Instalação", construction_site_id: "s", equipment_type: "Balancinho", release_date: "2026-10-01" }], role = "admin", active = true, network = false } = {}) {
  const calls = [], context = { status: "authorized", membership: { organization_id: org, role, active }, session: { user: { id: "user" } } };
  const store = { site_contacts: [], commercial_tables: [], unit_patrimony_bindings: [], equipment_config_adjustments: [], equipment_substitutions: [], activities: rows, activity_equipment_items: [], constructors: catalog.construtoras, construction_sites: catalog.obras, physical_equipment: catalog.equipamentos };
  const client = { supabaseUrl: "https://ldamjmjcgjmujiougcrs.supabase.co", auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user" } }, error: null })) }, from: (table) => {
    const q = { table, filters: [], select: vi.fn(() => q), eq: (field, value) => { q.filters.push([field, value]); return q; }, order: () => q, abortSignal: () => q,
      limit: async () => ({ data: [{ organization_id: org, role, active }], error: null }),
      range: (start, end) => { q.start = start; q.end = end; return q; },
      then(resolve, reject) {
        calls.push({ table, columns: q.select.mock.calls[0]?.[0], filters: q.filters, start: q.start });
        return Promise.resolve(network ? { error: { message: "segredo" } } : { data: store[table].filter((r) => q.filters.every(([field, value]) => r[field] === value)).slice(q.start, q.end + 1), error: null }).then(resolve, reject);
      } };
    return q;
  } };
  return { client, calls, store, context, repo: criarAtividadeSupabaseRepository(client, { contextoAtual: () => context }) };
}
describe("fonte remota de Atividades", () => {
  it('pagina contatos pela identidade composta e carrega colunas completas sem raw_payload',async()=>{
    const f=fake();f.store.site_contacts=Array.from({length:201},(_,i)=>({organization_id:org,id:'mesmo',construction_site_id:`site-${i}`}));
    const result=await f.repo.listarAtualizado();expect(result.contatosObras).toHaveLength(201);
    expect(f.calls.filter(c=>c.table==='site_contacts').map(c=>c.start)).toEqual([0,200]);
    expect(f.calls.find(c=>c.table==='constructors').columns).toContain('financial_email');
    expect(f.calls.find(c=>c.table==='construction_sites').columns).toContain('delivery_address');
    expect(f.calls.every(c=>!c.columns.includes('raw_payload'))).toBe(true);
  });
  it('leitura compartilhada valida todas as páginas duas vezes, incluindo o último UUID',async()=>{
    const rows=Array.from({length:884},(_,i)=>({organization_id:org,id:`id-${i}`,scheduled_date:'2026-10-14'}));
    const f=fake({rows});const shared=criarLeituraCompartilhadaDev(f.repo,()=>f.context);
    expect(await shared.atualizar()).toBe(true);expect(shared.getState().snapshot.atividades).toHaveLength(884);
    expect(f.calls.filter(c=>c.table==='activities').map(c=>c.start)).toEqual([0,200,400,600,800,0,200,400,600,800]);
  });
  it('mudança concorrente observada entre passagens não publica coleção parcial',async()=>{
    const f=fake();const read=f.repo.listarAtualizado;let n=0;
    const repository={listarAtualizado:async options=>{const result=await read(options);if(++n===1)f.store.activities.push({organization_id:org,id:'concurrent'});return result;}};
    const shared=criarLeituraCompartilhadaDev(repository,()=>f.context);expect(await shared.atualizar()).toBe(false);expect(shared.getState().snapshot).toBeNull();
  });
  it.each(['', null, undefined])('preserva campo não aplicável do catálogo sem transformar vazio em null: %s', value => {
    const c=clone(catalog); c.equipamentos[0].mini_crane_type=value;
    const command=prepararCadastroAgendado(form,c,id);
    expect(command.items[0].mini_crane_type).toBe(value ?? null);
    expect(command.items[0].physical_equipment_id).toBe('e');
    expect(command.items[0].unit_id).toBe('e');
    expect(command.items[0].patrimony_number).toBe('001');
    // Reproduz a condição IS DISTINCT FROM: vazio e null são distintos no servidor.
    expect(command.items[0].mini_crane_type).toBe(c.equipamentos[0].mini_crane_type ?? null);
  });
  it.each([['23503','VINCULO'],['55000','INDISPONIVEL'],['22023','FORMATO']])('classifica rejeição %s sem divulgar mensagem do servidor', async (sqlstate,code)=>{
    const f=fake(); const repo=criarAtividadeSupabaseRepository(f.client,{contextoAtual:()=>f.context,transporteCadastro:async()=>{throw {code:sqlstate,message:'segredo do servidor'};}});
    await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form,catalog,id))).rejects.toMatchObject({code});
    await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form,catalog,id))).rejects.not.toThrow('segredo');
  });
  it.each(["cliente","funcionario","sem-perfil"])("não envia RPC para %s", async role=>{
    const f=fake({role});f.client.rpc=vi.fn();
    const repo=criarAtividadeSupabaseRepository(f.client,{contextoAtual:()=>f.context,transporteCadastro:criarTransporteCadastroRpc(f.client)});
    await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form,catalog,id))).rejects.toMatchObject({code:"ACESSO"});
    expect(f.client.rpc).not.toHaveBeenCalled();
  });
  it.each(["admin","gestor"])("cadastro %s usa RPC e leitura atualizada inclui a nova atividade", async role=>{
    const f=fake({role});const before=clone(f.store.activities);
    f.client.rpc=vi.fn(async(name,{p_command})=>{
      f.store.activities.push({...p_command.activity,charges_service:false,starts_rental:false,ends_rental:false});
      f.store.activity_equipment_items.push(...p_command.items.map(item=>({...item,organization_id:org,activity_id:id})));
      return {data:{id,created:true},error:null};
    });
    const repo=criarAtividadeSupabaseRepository(f.client,{contextoAtual:()=>f.context,transporteCadastro:criarTransporteCadastroRpc(f.client)});
    await repo.cadastrarIndividual(prepararCadastroAgendado(form,catalog,id));
    expect(f.client.rpc).toHaveBeenCalledTimes(1);
    const rows=(await repo.listarAtualizado()).atividades;
    expect(rows.find(a=>a.id===id)).toMatchObject({obraId:"s",dataAgendamento:"2026-10-13"});
    expect(f.store.activities[0]).toEqual(before[0]);
  });
  it("cadastro com sessão expirada ou membership inativa não chama RPC",async()=>{
    const f=fake();f.client.auth.getUser.mockResolvedValue({error:{}});f.client.rpc=vi.fn();
    const repo=criarAtividadeSupabaseRepository(f.client,{contextoAtual:()=>f.context,transporteCadastro:criarTransporteCadastroRpc(f.client)});
    await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form,catalog,id))).rejects.toMatchObject({code:"SESSAO"});
    expect(f.client.rpc).not.toHaveBeenCalled();
    const g=fake({active:false});g.client.rpc=vi.fn();
    await expect(criarAtividadeSupabaseRepository(g.client,{contextoAtual:()=>g.context,transporteCadastro:criarTransporteCadastroRpc(g.client)}).cadastrarIndividual({})).rejects.toMatchObject({code:"ACESSO"});
    expect(g.client.rpc).not.toHaveBeenCalled();
  });
  it("lê por organização, mapeia IDs e não importa dados", async () => {
    const { repo, calls, store } = fake(); const before = clone(store);
    expect((await repo.listarAtualizado()).atividades[0]).toMatchObject({ id: "old", obraId: "s", servico: "Instalação" });
    expect(store).toEqual(before); expect(calls.every((c) => c.filters.some(([k, v]) => k === "organization_id" && v === org))).toBe(true);
    expect(calls.some((c) => c.columns.includes("raw_payload"))).toBe(false);
  });
  it("pagina além do limite padrão e não perde registros", async () => {
    const rows = Array.from({ length: 882 }, (_, n) => ({ organization_id: org, id: `id-${n}` }));
    const { repo, calls } = fake({ rows }); expect((await repo.listarAtualizado()).atividades).toHaveLength(882);
    expect(calls.filter((c) => c.table === "activities").map((c) => c.start)).toEqual([0, 200, 400, 600, 800]);
  });
  it("atualização manual observa outro dispositivo sem cache local", async () => {
    const { client, context, store, repo } = fake(); const second = criarAtividadeSupabaseRepository(client, { contextoAtual: () => context });
    expect((await repo.listarAtualizado()).atividades).toHaveLength(1);
    store.activities.push({ organization_id: org, id: "novo" }); expect((await second.listarAtualizado()).atividades).toHaveLength(2);
  });
  it.each(["cliente", "funcionario", "sem-perfil"])("bloqueia %s antes de consultar tabelas", async (role) => {
    const { repo, calls } = fake({ role }); await expect(repo.listarAtualizado()).rejects.toMatchObject({ code: "ACESSO" }); expect(calls).toHaveLength(0);
  });
  it("membership inativa não lê", async () => { await expect(fake({ active: false }).repo.listarAtualizado()).rejects.toMatchObject({ code: "ACESSO" }); });
  it("não consulta outro projeto ou organização", async () => {
    const f = fake(); f.client.supabaseUrl = "https://outro.supabase.co"; await expect(f.repo.listarAtualizado()).rejects.toMatchObject({ code: "ACESSO" });
    const g = fake(); g.context.membership.organization_id = "outro"; await expect(g.repo.listarAtualizado()).rejects.toMatchObject({ code: "ACESSO" });
  });
  it("expiração e rede falham sem fallback local nem exposição do erro", async () => {
    const f = fake(); f.client.auth.getUser.mockResolvedValue({ error: {} }); await expect(f.repo.listarAtualizado()).rejects.toMatchObject({ code: "SESSAO" });
    await expect(fake({ network: true }).repo.listarAtualizado()).rejects.toMatchObject({ code: "LEITURA" });
  });
  it("sessão alterada durante leitura descarta resultados", async () => {
    const f = fake(); const old = f.client.auth.getUser; f.client.auth.getUser = async () => { const result = await old(); queueMicrotask(() => { f.context.status = "signed-out"; }); return result; };
    await expect(f.repo.listarAtualizado()).rejects.toMatchObject({ code: "SESSAO" });
  });
  it("backend ausente bloqueia cadastro antes de tentar gravar", async () => {
    const { repo, client } = fake(); await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form, catalog, id))).rejects.toMatchObject({ code: "DEPENDENCIA" }); expect(client.auth.getUser).not.toHaveBeenCalled();
  });
  it("legados preservam ausência de flags e itens individuais", () => {
    const result = mapearAtividadesRemotas([{ organization_id: org, id: "a", starts_rental: null, ends_rental: null, quantity: 2 }], [])[0];
    expect(result).not.toHaveProperty("iniciaLocacao"); expect(result).not.toHaveProperty("itensEquipamentos"); expect(result.quantidade).toBe(2);
  });
  it("itens mantêm patrimônio, origem, ordem e flags explícitas", () => {
    const items = [{ organization_id: org, activity_id: "a", id: "i2", position: 2, physical_equipment_id: "e2" }, { organization_id: org, activity_id: "a", id: "i1", position: 1, physical_equipment_id: "e1", item_origin_id: "origem", patrimony_number: "002" }];
    const result = mapearAtividadesRemotas([{ organization_id: org, id: "a", starts_rental: false }], items)[0];
    expect(result.iniciaLocacao).toBe(false); expect(result.itensEquipamentos[0]).toMatchObject({ idItem: "i1", idEquipamento: "e1", idItemOrigem: "origem", numeroPatrimonio: "002" });
  });
  it("órfãos e organização inesperada bloqueiam leitura", () => {
    expect(() => mapearAtividadesRemotas([], [{ organization_id: org, id: "i", activity_id: "orfao" }])).toThrow();
    expect(() => mapearAtividadesRemotas([{ organization_id: "outro", id: "a" }], [])).toThrow();
  });
});
describe("cadastro individual preparado", () => {
  it("prepara uma atividade estável com um item, sem alterar origem", () => {
    const before = clone(form), command = prepararCadastroAgendado(form, catalog, id);
    expect(form).toEqual(before); expect(command.activity).toMatchObject({ id, release_date: null, starts_rental: true, constructor_id: "c", construction_site_id: "s" });
    expect(command.items[0].id).toBe(`${id}:0`); expect(prepararCadastroAgendado(form, catalog, id)).toEqual(command);
  });
  it("normaliza representações equivalentes de UUID e seus itens", () => {
    const canonical = "abcdefab-0000-4000-8000-abcdefabcdef";
    const expected = prepararCadastroAgendado(form, catalog, canonical);
    for (const representation of [canonical.toUpperCase(), `{${canonical}}`, canonical.replaceAll("-", "")]) expect(prepararCadastroAgendado(form, catalog, representation)).toEqual(expected);
    expect(() => prepararCadastroAgendado(form, catalog, canonical.replace('-', '---'))).toThrow();
  });
  it("Gestor usa transporte individual autorizado sem ampliar outros perfis", async () => {
    const f = fake({ role: "gestor" }), transport = vi.fn(async (cmd) => ({ id: cmd.activity.id, created: true }));
    const repo = criarAtividadeSupabaseRepository(f.client, { contextoAtual: () => f.context, transporteCadastro: transport });
    expect((await repo.cadastrarIndividual(prepararCadastroAgendado(form, catalog, id))).created).toBe(true);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["construtora divergente", { construtoraId: "outra" }], ["obra órfã", { obraId: "outra" }], ["referência por nome", { obraId: "Obra de teste" }],
    ["patrimônio incorreto", { itensEquipamentos: [{ idEquipamento: "e", numeroPatrimonio: "999" }] }],
    ["equipamento órfão", { itensEquipamentos: [{ idEquipamento: "outro", numeroPatrimonio: "001" }] }],
    ["quantidade divergente", { quantidade: 2 }], ["data inválida", { dataAgendamento: "2026-02-30" }], ["liberação", { dataLiberacao: "2026-10-13" }],
    ["financeiro", { valorTotalServico: 100 }], ["operação inválida", { servico: "Transferência" }],
  ])("rejeita %s", (_name, patch) => { expect(() => prepararCadastroAgendado({ ...form, ...patch }, catalog, id)).toThrow(); });
  it("duplicidade e equipamento inativo são bloqueados", () => {
    expect(() => prepararCadastroAgendado({ ...form, quantidade: 2, itensEquipamentos: [...form.itensEquipamentos, ...form.itensEquipamentos] }, catalog, id)).toThrow();
    const c = clone(catalog); c.equipamentos[0].active = false; expect(() => prepararCadastroAgendado(form, c, id)).toThrow();
  });
  it.each(["EM_MANUTENCAO", "INDISPONIVEL", "BAIXADO", "SEM_LOCALIZACAO_ATUAL"])("estado administrativo %s é bloqueado segundo as restrições patrimoniais existentes", (status) => {
    const c = clone(catalog); c.equipamentos[0].administrative_status = status;
    expect(() => prepararCadastroAgendado(form, c, id)).toThrow();
  });
  it("IDs e nomes duplicados nunca são reconciliados por nome", () => {
    const c = clone(catalog); c.obras.push({ ...c.obras[0] }); expect(() => prepararCadastroAgendado(form, c, id)).toThrow();
  });
  it("nome explícito divergente não substitui o vínculo com a obra", () => {
    const c = clone(catalog); c.construtoras[0].name = "Construtora A";
    expect(() => prepararCadastroAgendado({ ...form, construtora: "Construtora B" }, c, id)).toThrow();
  });
  it("nomes iguais exigem ID explícito, sem escolher automaticamente", () => {
    const c = clone(catalog); c.construtoras[0].name = "Duplicada"; c.construtoras.push({ organization_id: org, id: "outra", name: "Duplicada" });
    expect(() => prepararCadastroAgendado({ ...form, construtora: "Duplicada" }, c, id)).toThrow();
    expect(prepararCadastroAgendado({ ...form, construtora: "Duplicada", construtoraId: "c" }, c, id).activity.constructor_id).toBe("c");
  });
  it("agendamento não afeta disponibilidade existente", () => {
    const command = prepararCadastroAgendado(form, catalog, id);
    const activity = mapearAtividadesRemotas([command.activity], command.items.map((i) => ({ ...i, organization_id: org, activity_id: id })))[0];
    expect(calcularEquipamentosAtivosDaObra({ id: "s", nome: "Obra" }, [activity])).toEqual(calcularEquipamentosAtivosDaObra({ id: "s", nome: "Obra" }, []));
  });
  it("transporte atômico simulado preserva registros, idempotência e conflitos", async () => {
    const f = fake(); const store = new Map([["legado", { intacto: true }]]);
    const transport = vi.fn(async (cmd) => { const previous = store.get(cmd.activity.id); if (previous && JSON.stringify(previous) !== JSON.stringify(cmd)) throw { code: "23505" }; store.set(cmd.activity.id, clone(cmd)); return { id: cmd.activity.id, created: !previous }; });
    const repo = criarAtividadeSupabaseRepository(f.client, { contextoAtual: () => f.context, transporteCadastro: transport });
    const cmd = prepararCadastroAgendado(form, catalog, id);
    expect((await repo.cadastrarIndividual(cmd)).created).toBe(true); expect((await repo.cadastrarIndividual(cmd)).created).toBe(false);
    await expect(repo.cadastrarIndividual({ ...cmd, activity: { ...cmd.activity, notes: "conflito" } })).rejects.toMatchObject({ code: "CONFLITO" });
    expect(store.size).toBe(2); expect(store.get("legado")).toEqual({ intacto: true });
  });
  it("rede não provoca retry automático ou gravação local", async () => {
    const f = fake(), transport = vi.fn(async () => { throw new Error("token-sensivel"); });
    const repo = criarAtividadeSupabaseRepository(f.client, { contextoAtual: () => f.context, transporteCadastro: transport });
    await expect(repo.cadastrarIndividual(prepararCadastroAgendado(form, catalog, id))).rejects.toMatchObject({ code: "RESULTADO_INCERTO" }); expect(transport).toHaveBeenCalledTimes(1);
  });
});
