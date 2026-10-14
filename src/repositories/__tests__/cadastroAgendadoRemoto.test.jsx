import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi} from "vitest";
import {criarTentativaCadastro} from "../cadastroAgendadoRemoto";
import {criarTransporteCadastroRpc,gerarUuidCadastro} from "../atividadeSupabaseRepository";
import Campos from "../../components/CamposAgendamentoAtividade";
import Cadastro from "../../components/CadastroAtividadeRemota";

const id="88000000-0000-4000-8000-000000000001";
const catalogo={construtoras:[{organization_id:"cd-locacoes",id:"c",name:"Fictícia"}],obras:[{organization_id:"cd-locacoes",id:"s",constructor_id:"c",name:"Obra fictícia"}],equipamentos:[{organization_id:"cd-locacoes",id:"e",active:true,equipment_type:"Balancinho",balancinho_type:"Eletrico",current_patrimony_number:"TESTE"}]};
const form={obraId:"s",equipamento:"Balancinho",tipoBalancinho:"Eletrico",servico:"Instalação",dataAgendamento:"2026-10-14",quantidade:1,itensEquipamentos:[{idEquipamento:"e",numeroPatrimonio:"TESTE"}]};
describe("cadastro remoto agendado",()=>{
 it("UUID v4 seguro mesmo sem randomUUID no acesso por rede local",()=>{
   const random=vi.fn(bytes=>{bytes.fill(255);return bytes;});
   expect(gerarUuidCadastro({getRandomValues:random})).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");expect(random).toHaveBeenCalledTimes(1);
   expect(()=>gerarUuidCadastro({})).toThrow();
 });
 it("envia exclusivamente RPC e valida a confirmação",async()=>{
   const rpc=vi.fn(async()=>({data:{id,created:true}}));
   const transport=criarTransporteCadastroRpc({supabaseUrl:"https://ldamjmjcgjmujiougcrs.supabase.co",rpc});
   const repo={cadastrarIndividual:transport};const tentativa=criarTentativaCadastro(repo,()=>id);
   expect(await tentativa.salvar(form,catalogo)).toEqual({id,created:true});
   expect(rpc).toHaveBeenCalledWith("create_dev_scheduled_activity",{p_command:expect.objectContaining({activity:expect.objectContaining({id,release_date:null,started:false})})});
 });
 it("falha de rede preserva comando/UUID; reenvio explícito é idempotente",async()=>{
   const save=vi.fn().mockRejectedValueOnce(new Error("rede")).mockResolvedValue({id,created:false});
   const uuid=vi.fn(()=>id);const tentativa=criarTentativaCadastro({cadastrarIndividual:save},uuid);const before=JSON.stringify(form);
   await expect(tentativa.salvar(form,catalogo)).rejects.toThrow("rede");expect(tentativa.bloqueada).toBe(true);
   await tentativa.salvar({...form,observacoes:"mudança não deve alterar comando incerto"},catalogo);
   expect(save.mock.calls[0][0]).toBe(save.mock.calls[1][0]);expect(uuid).toHaveBeenCalledTimes(1);expect(JSON.stringify(form)).toBe(before);expect(tentativa.bloqueada).toBe(false);
 });
 it("validação local falha antes do envio e permite correção",async()=>{
   const save=vi.fn();const tentativa=criarTentativaCadastro({cadastrarIndividual:save},()=>id);
   await expect(tentativa.salvar({...form,obraId:"órfã"},catalogo)).rejects.toThrow();expect(save).not.toHaveBeenCalled();expect(tentativa.bloqueada).toBe(false);
 });
 it("duplo clique não envia dois comandos",async()=>{
   let finish;const save=vi.fn(()=>new Promise(resolve=>{finish=resolve}));
   const tentativa=criarTentativaCadastro({cadastrarIndividual:save},()=>id);const first=tentativa.salvar(form,catalogo);
   await expect(tentativa.salvar(form,catalogo)).rejects.toThrow("andamento");finish({id,created:true});await first;expect(save).toHaveBeenCalledTimes(1);
 });
 it("resposta inválida não produz sucesso falso",async()=>{
   const transport=criarTransporteCadastroRpc({supabaseUrl:"https://ldamjmjcgjmujiougcrs.supabase.co",rpc:async()=>({data:{id:"outro",created:true}})});
   await expect(transport({activity:{id}})).rejects.toMatchObject({code:"RESULTADO_INCERTO"});
 });
 it("outro projeto bloqueado antes da RPC",async()=>{
   const rpc=vi.fn();await expect(criarTransporteCadastroRpc({supabaseUrl:"https://outro.supabase.co",rpc})({activity:{id}})).rejects.toMatchObject({code:"ACESSO"});expect(rpc).not.toHaveBeenCalled();
 });
 it("formulário original exibe liberação bloqueada no remoto",()=>{
   expect(renderToStaticMarkup(<Campos form={{}} setForm={()=>{}}/>)).toContain("Data de Liberação");
   const html=renderToStaticMarkup(<Cadastro repository={{}} catalogo={catalogo} onSaved={()=>{}}/>);
   expect(html).toContain("Data de Liberação");expect(html).toContain('type="date" disabled=""');expect(html).toContain("Nova Atividade");
 });
});
