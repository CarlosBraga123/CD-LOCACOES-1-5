import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {AgendaConteudo} from '../../components/Agenda';
import AgendaRemota from '../../components/AgendaRemota';
import {useLeituraDev} from '../../data/LeituraDevContext';
import {atividadeRepository} from '../atividadeRepository';
import {obraRepository} from '../obraRepository';
import {dadosRemotosParaAgenda} from '../leituraCompartilhadaDev';
vi.mock('../../data/LeituraDevContext',()=>({useLeituraDev:vi.fn()}));
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
const snapshot=()=>({atividades:[
 {id:'agendada-uuid',obraId:'s',dataAgendamento:'2026-10-14',servico:'Instalação',equipamento:'Balancinho'},
 {id:'andamento',obraId:'s',dataAgendamento:'2026-10-14',iniciado:true,servico:'Manutenção',equipamento:'Balancinho'},
 {id:'liberada',obraId:'s',dataAgendamento:'2025-01-01',dataLiberacao:'2026-10-14',servico:'Remoção',equipamento:'Balancinho'},
],obras:[{id:'s',name:'Obra sintética',constructor_id:'c'}],construtoras:[{id:'c',name:'Construtora sintética'}]});
describe('Agenda com calendário original e fonte explícita',()=>{
 it('renderiza HTML idêntico para os mesmos dados Local e remoto',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T12:00:00'));
  const dados=dadosRemotosParaAgenda(snapshot());
  const atividades=vi.spyOn(atividadeRepository,'listar').mockReturnValue(dados.atividades);
  const obras=vi.spyOn(obraRepository,'listar').mockReturnValue(dados.obras);
  const local=renderToStaticMarkup(<AgendaConteudo/>);
  atividades.mockClear();obras.mockClear();
  const remoto=renderToStaticMarkup(<AgendaConteudo dados={dados}/>);
  expect(remoto).toBe(local);expect(atividades).not.toHaveBeenCalled();expect(obras).not.toHaveBeenCalled();
  for(const status of ['AGENDADO','EM ANDAMENTO','CONCLUÍDO'])expect(remoto).toContain(status);
  expect(remoto).toContain('Obra sintética');
 });
 it('não monta calendário vazio ou local em falha de rede',()=>{
  const Calendar=vi.fn(()=>null);useLeituraDev.mockReturnValue({snapshot:null,error:'Falha de leitura',authorized:true,atualizar:vi.fn()});
  const html=renderToStaticMarkup(<AgendaRemota Calendario={Calendar}/>);
  expect(html).toContain('Falha de leitura');expect(Calendar).not.toHaveBeenCalled();
 });
 it('bloqueia sem autorização mesmo com snapshot fornecido',()=>{
  const Calendar=vi.fn(()=>null);useLeituraDev.mockReturnValue({snapshot:snapshot(),authorized:false,atualizar:vi.fn()});
  expect(renderToStaticMarkup(<AgendaRemota Calendario={Calendar}/>)).toContain('autorizada necessária');expect(Calendar).not.toHaveBeenCalled();
 });
 it('mesmo snapshot permite calendário remoto e identifica revisão',()=>{
  const Calendar=vi.fn(()=> <div>CALENDARIO</div>);useLeituraDev.mockReturnValue({snapshot:snapshot(),authorized:true,revision:2,updated:'agora',atualizar:vi.fn()});
  const html=renderToStaticMarkup(<AgendaRemota Calendario={Calendar}/>);
  expect(html).toContain('revisão 2');expect(html).toContain('CALENDARIO');expect(Calendar.mock.calls[0][0].dados.atividades).toHaveLength(3);
 });
});
