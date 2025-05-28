import { useRef, useState, useEffect } from "react";

export default function BackupImportacao() {
  const inputRef = useRef();
  const [ultimaAcao, setUltimaAcao] = useState("");

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

  const exportarBackup = () => {
    const dados = {
      atividades: JSON.parse(localStorage.getItem("atividades") || "[]"),
      construtoras: JSON.parse(localStorage.getItem("construtoras") || "[]"),
      obras: JSON.parse(localStorage.getItem("obras") || "[]"),
      pecasBalancinho: JSON.parse(localStorage.getItem("pecasBalancinho") || "{}"),
      pecasAncoragem: JSON.parse(localStorage.getItem("pecasAncoragem") || "{}"),
      tarefas: JSON.parse(localStorage.getItem("tarefas") || "[]"),
      usuarios: JSON.parse(localStorage.getItem("usuarios") || "[]")
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup-cd-locacoes-${Date.now()}.json`;
    link.click();

    salvarUltimaAcao("Backup exportado");
  };

  const importarBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const conteudo = JSON.parse(e.target.result);
        if (conteudo.atividades) localStorage.setItem("atividades", JSON.stringify(conteudo.atividades));
        if (conteudo.construtoras) localStorage.setItem("construtoras", JSON.stringify(conteudo.construtoras));
        if (conteudo.obras) localStorage.setItem("obras", JSON.stringify(conteudo.obras));
        if (conteudo.pecasBalancinho) localStorage.setItem("pecasBalancinho", JSON.stringify(conteudo.pecasBalancinho));
        if (conteudo.pecasAncoragem) localStorage.setItem("pecasAncoragem", JSON.stringify(conteudo.pecasAncoragem));
        if (conteudo.tarefas) localStorage.setItem("tarefas", JSON.stringify(conteudo.tarefas));
        if (conteudo.usuarios) localStorage.setItem("usuarios", JSON.stringify(conteudo.usuarios));

        alert("✅ Backup importado com sucesso!");
        salvarUltimaAcao("Backup importado");
      } catch (err) {
        alert("❌ Erro ao importar backup. Verifique o arquivo.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">💾 Backup e Restauração</h2>

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
    </div>
  );
}
