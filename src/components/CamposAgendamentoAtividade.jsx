import React from "react";
export default function CamposAgendamentoAtividade({form,setForm,apenasAgendada=false,bloquearLiberacao=false}) {
 const inputClass="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800";
 return <>
   <label className="text-sm font-medium mt-2">Data de Agendamento</label>
   <input type="date" value={form.dataAgendamento ?? ""} onChange={e=>setForm({...form,dataAgendamento:e.target.value})} className={inputClass}/>
   {!apenasAgendada && <><label className="text-sm font-medium mt-2">Data de Liberação</label>
   <input type="date" disabled={bloquearLiberacao} value={form.dataLiberacao ?? ""} onChange={e=>setForm({...form,dataLiberacao:e.target.value})} className={inputClass}/></>}
   <label className="text-sm font-medium mt-2">Equipe responsavel</label>
   <input type="text" value={form.equipeResponsavel ?? ""} onChange={e=>setForm({...form,equipeResponsavel:e.target.value})} placeholder="Ex.: Israel, Matheus e LG" className={inputClass}/>
   <label className="text-sm font-medium mt-2">Número da OS de campo</label>
   <input type="text" value={form.numeroOsCampo ?? ""} onChange={e=>setForm({...form,numeroOsCampo:e.target.value})} placeholder="Ex.: 0125" className={inputClass}/>
   <textarea value={form.observacoes ?? ""} onChange={e=>setForm({...form,observacoes:e.target.value})} placeholder="Observações" className={inputClass}/>
 </>;
}
