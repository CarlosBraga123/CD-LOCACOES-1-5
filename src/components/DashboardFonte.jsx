import React,{useState} from 'react';
import DashboardLocal from './Dashboard';
import DashboardRemoto from './DashboardRemoto';
export default function DashboardFonte(props) {
  const [fonte,setFonte]=useState('local');
  return <>
    <div className="flex flex-wrap gap-3 border-b p-4">
      <label>Fonte do Dashboard <select className="ml-2 rounded border p-2" value={fonte} onChange={e=>setFonte(e.target.value)}>
        <option value="local">Local legado — não sincronizado</option>
        <option value="supabase-dev">Supabase DEV — somente leitura</option>
      </select></label>
      {fonte==='local'&&<p className="text-amber-800">Fonte: Local legado deste navegador. Indicadores e totais ainda não sincronizados.</p>}
    </div>
    {fonte==='local'?<DashboardLocal {...props}/>:<DashboardRemoto {...props}/>}
  </>;
}
