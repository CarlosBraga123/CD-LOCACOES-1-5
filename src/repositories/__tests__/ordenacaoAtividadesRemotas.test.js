import {describe,it,expect} from 'vitest';
import {ordenarAtividadesRemotas} from '../ordenacaoAtividadesRemotas';
describe('ordenação remota igual à Local',()=>{
 it('agendadas crescentes antes de liberadas decrescentes, sem usar criação',()=>{
  const rows=[{id:'old',dataLiberacao:'2025-04-01'},
   {id:'later',dataAgendamento:'2026-11-01',createdAt:'2026-01-01'},
   {id:'recent',dataLiberacao:'2026-10-14'},
   {id:'first',dataAgendamento:'2026-10-14',createdAt:'2026-12-01'}];
  const before=JSON.stringify(rows);
  expect(ordenarAtividadesRemotas(rows).map(a=>a.id)).toEqual(['first','later','recent','old']);
  expect(JSON.stringify(rows)).toBe(before);
 });
 it('ordena todas as páginas antes do limite, preservando UUID e filtros',()=>{
  const rows=Array.from({length:882},(_,i)=>({id:String(i),obraId:'other',dataLiberacao:'2025-04-01'}));
  const uuid='88000000-0000-4000-8000-000000000001';
  rows.push({id:uuid,obraId:'marina',dataAgendamento:'2026-10-14',dataLiberacao:null,numerosPatrimonio:['0141']});
  const sorted=ordenarAtividadesRemotas(rows);
  expect(sorted.slice(0,50)[0].id).toBe(uuid);
  expect(sorted.filter(a=>a.obraId==='marina').map(a=>a.id)).toEqual([uuid]);
  expect(sorted.filter(a=>a.id.includes(uuid))).toHaveLength(1);
  expect(sorted).toHaveLength(883);
 });
 it('preserva empates e datas ausentes como o comparador original',()=>{
  const rows=[{id:'a'},{id:'b'},{id:'c',dataLiberacao:'2026-01-01'},{id:'d',dataLiberacao:'2026-01-01'}];
  expect(ordenarAtividadesRemotas(rows).map(a=>a.id)).toEqual(['a','b','c','d']);
 });
});
