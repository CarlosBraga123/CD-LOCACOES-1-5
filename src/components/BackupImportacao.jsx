import { useRef, useState, useEffect } from "react";
import { DatabaseBackup } from "lucide-react";
import {
  criarBackupVersionado,
  obterVersaoBackup,
  validarEstruturaBackup,
} from "../utils/contratoDados";
import {
  auditarDadosParaMigracao,
  formatarRelatorioAuditoriaTexto,
} from "../utils/auditoriaMigracao";

export default function BackupImportacao() {
  const inputRef = useRef();
  const [ultimaAcao, setUltimaAcao] = useState("");
  const [relatorioAuditoria, setRelatorioAuditoria] = useState(null);

  useEffect(() => {
    const ultima = localStorage.getItem("ultimoBackup");
    if (ultima) setUltimaAcao(ultima);
  }, []);

  const salvarUltimaAcao = (tipo) => {
    const agora = new Date().toLocaleString();
    const texto = `${tipo} em ${agora}`;
    localStorage.setItem("ultimoBackup", texto);
    setUltimaAcao(texto);
  };

  const obterDadosBackupAtuais = () => {
    return {
      atividades: JSON.parse(localStorage.getItem("atividades") || "[]"),
      patrimonioEquipamentos: JSON.parse(localStorage.getItem("patrimonioEquipamentos") || "[]"),
      equipamentosPatrimonio: JSON.parse(localStorage.getItem("equipamentosPatrimonio") || "[]"),
      substituicoesEquipamentos: JSON.parse(localStorage.getItem("substituicoesEquipamentos") || "[]"),
      ajustesConfiguracaoEquipamentos: JSON.parse(localStorage.getItem("ajustesConfiguracaoEquipamentos") || "[]"),
      controleKitContrapeso: JSON.parse(localStorage.getItem("controleKitContrapeso") || "{\"quantidadeTotal\":0,\"historico\":[]}"),
      construtoras: JSON.parse(localStorage.getItem("construtoras") || "[]"),
      obras: JSON.parse(localStorage.getItem("obras") || "[]"),
      pecasBalancinho: JSON.parse(localStorage.getItem("pecasBalancinho") || "{}"),
      pecasAncoragem: JSON.parse(localStorage.getItem("pecasAncoragem") || "{}"),
      tarefas: JSON.parse(localStorage.getItem("tarefas") || "[]"),
      usuarios: JSON.parse(localStorage.getItem("usuarios") || "[]"),
      valoresServicos: JSON.parse(localStorage.getItem("valoresServicos") || "{}"),
      valoresPadrao: JSON.parse(localStorage.getItem("valoresPadrao") || "{}"),
      tabelaComercialPadrao: JSON.parse(localStorage.getItem("tabelaComercialPadrao") || "{}"),
      empresaLogo: localStorage.getItem("empresaLogo") || "",
      empresaNome: localStorage.getItem("empresaNome") || ""
    };
  };

  const baixarBackup = (dados, nomeArquivo) => {
    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportarBackup = () => {
    baixarBackup(
      criarBackupVersionado(obterDadosBackupAtuais()),
      `backup-cd-locacoes-${Date.now()}.json`
    );

    salvarUltimaAcao("Backup exportado");
  };

  const gerarBackupAntesDaImportacao = () => {
    const data = new Date().toISOString().replace(/[:.]/g, "-");
    baixarBackup(
      criarBackupVersionado(obterDadosBackupAtuais()),
      `backup-antes-importacao-cd-locacoes-${data}.json`
    );
  };

  const importarBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const conteudo = JSON.parse(e.target.result);
        const validacao = validarEstruturaBackup(conteudo);

        const confirmarImportacao = window.confirm(
          "Atenção: importar este backup vai substituir os dados atuais do app. Antes de continuar, será gerado automaticamente um backup dos dados atuais. Deseja continuar?"
        );

        if (!confirmarImportacao) return;

        gerarBackupAntesDaImportacao();

        if (conteudo.atividades) localStorage.setItem("atividades", JSON.stringify(conteudo.atividades));
        if (conteudo.patrimonioEquipamentos !== undefined) localStorage.setItem("patrimonioEquipamentos", JSON.stringify(conteudo.patrimonioEquipamentos));
        if (conteudo.equipamentosPatrimonio !== undefined) localStorage.setItem("equipamentosPatrimonio", JSON.stringify(conteudo.equipamentosPatrimonio));
        if (conteudo.substituicoesEquipamentos !== undefined) localStorage.setItem("substituicoesEquipamentos", JSON.stringify(conteudo.substituicoesEquipamentos));
        if (conteudo.ajustesConfiguracaoEquipamentos !== undefined) localStorage.setItem("ajustesConfiguracaoEquipamentos", JSON.stringify(conteudo.ajustesConfiguracaoEquipamentos));
        if (conteudo.controleKitContrapeso !== undefined) localStorage.setItem("controleKitContrapeso", JSON.stringify(conteudo.controleKitContrapeso));
        if (conteudo.construtoras) localStorage.setItem("construtoras", JSON.stringify(conteudo.construtoras));
        if (conteudo.obras) localStorage.setItem("obras", JSON.stringify(conteudo.obras));
        if (conteudo.pecasBalancinho) localStorage.setItem("pecasBalancinho", JSON.stringify(conteudo.pecasBalancinho));
        if (conteudo.pecasAncoragem) localStorage.setItem("pecasAncoragem", JSON.stringify(conteudo.pecasAncoragem));
        if (conteudo.tarefas) localStorage.setItem("tarefas", JSON.stringify(conteudo.tarefas));
        if (conteudo.usuarios) localStorage.setItem("usuarios", JSON.stringify(conteudo.usuarios));
        if (conteudo.valoresServicos) localStorage.setItem("valoresServicos", JSON.stringify(conteudo.valoresServicos));
        if (conteudo.valoresPadrao) localStorage.setItem("valoresPadrao", JSON.stringify(conteudo.valoresPadrao));
        if (conteudo.tabelaComercialPadrao) localStorage.setItem("tabelaComercialPadrao", JSON.stringify(conteudo.tabelaComercialPadrao));
        if (conteudo.empresaLogo) localStorage.setItem("empresaLogo", conteudo.empresaLogo);
        if (conteudo.empresaNome) localStorage.setItem("empresaNome", conteudo.empresaNome);

        alert(
          validacao.legado
            ? "✅ Backup legado importado com sucesso!"
            : `✅ Backup versão ${obterVersaoBackup(conteudo)} importado com sucesso!`
        );
        salvarUltimaAcao("Backup importado");
      } catch (err) {
        alert(`❌ Erro ao importar backup. ${err.message || "Verifique o arquivo."}`);
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const executarAuditoria = () => {
    setRelatorioAuditoria(
      auditarDadosParaMigracao(obterDadosBackupAtuais())
    );
  };

  const baixarRelatorio = (formato) => {
    if (!relatorioAuditoria) return;
    const conteudo = formato === "txt"
      ? formatarRelatorioAuditoriaTexto(relatorioAuditoria)
      : JSON.stringify(relatorioAuditoria, null, 2);
    const blob = new Blob([conteudo], {
      type: formato === "txt" ? "text/plain;charset=utf-8" : "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria-migracao-cd-locacoes-${Date.now()}.${formato}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold"><DatabaseBackup size={20} aria-hidden="true" />Backup e Restauração</h2>

      {ultimaAcao && (
        <p className="text-sm text-gray-600 border p-2 rounded bg-gray-50">
          🕒 Última ação: {ultimaAcao}
        </p>
      )}

      <button
        onClick={exportarBackup}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        ⬇️ Exportar Backup Local
      </button>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={importarBackup}
        />
        <button
          onClick={() => inputRef.current.click()}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ⬆️ Importar Backup Local
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div>
          <h3 className="font-semibold text-amber-950">Auditoria para migração</h3>
          <p className="text-sm text-amber-900">
            Analisa os dados atuais sem corrigir ou salvar qualquer informação.
          </p>
        </div>
        <button
          type="button"
          onClick={executarAuditoria}
          className="rounded bg-amber-600 px-4 py-2 text-white"
        >
          Auditar dados para migração
        </button>
        {relatorioAuditoria && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-white p-3 text-sm">
            <h4 className="font-bold">AUDITORIA PARA MIGRAÇÃO</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(relatorioAuditoria.contagens).map(([chave, valor]) => (
                <p key={chave}><strong>{chave}:</strong> {valor}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 font-semibold">
              <span className="text-red-700">Erros: {relatorioAuditoria.totais.erros}</span>
              <span className="text-amber-700">Avisos: {relatorioAuditoria.totais.avisos}</span>
              <span className="text-blue-700">Informações: {relatorioAuditoria.totais.informacoes}</span>
            </div>
            {relatorioAuditoria.problemas.length > 0 && (
              <div className="max-h-80 space-y-1 overflow-y-auto rounded border p-2">
                {relatorioAuditoria.problemas.map((item, indice) => (
                  <p key={`${item.codigo}-${indice}`}>
                    <strong>[{item.nivel}] {item.codigo}</strong>: {item.mensagem}
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => baixarRelatorio("json")} className="rounded border px-3 py-2">Baixar relatório JSON</button>
              <button type="button" onClick={() => baixarRelatorio("txt")} className="rounded border px-3 py-2">Baixar relatório TXT</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
