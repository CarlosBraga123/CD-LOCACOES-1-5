import React from "react";
import { FormularioAtividadesExistente } from "./FormularioAtividades";
// Somente adapta o destino; todos os campos e seletores pertencem ao formulário original.
export default function CadastroAtividadeRemota({repository,catalogo,onSaved}) {
 return <FormularioAtividadesExistente remote={{repository,catalogo,onSaved}}/>;
}