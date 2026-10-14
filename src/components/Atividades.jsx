import React, { useState } from "react";
import AtividadesRemotas from "./AtividadesRemotas";
import { FormularioAtividadesExistente } from "./FormularioAtividades";
export { FormularioAtividadesExistente } from "./FormularioAtividades";
export default function Atividades(props) {
  const [fonte, setFonte] = useState("supabase-dev");
  return <>
    <div className="flex flex-wrap gap-3 border-b p-4">
      <label>Fonte de Atividades <select className="ml-2 rounded border p-2" value={fonte} onChange={(event) => setFonte(event.target.value)}>
        <option value="supabase-dev">Supabase DEV — atividades agendadas</option>
        <option value="local">Local legado — não sincronizado</option>
      </select></label>
      {fonte === "local" && <p className="text-amber-800">Alterações nesta fonte ficam somente neste navegador e não aparecem no outro dispositivo.</p>}
    </div>
    {fonte === "supabase-dev" ? <AtividadesRemotas {...props} /> : <FormularioAtividadesExistente {...props} />}
  </>;
}

