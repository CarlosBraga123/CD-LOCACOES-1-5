import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Construtoras from "./components/Construtoras";
import Obras from "./components/Obras";
import Atividades from "./components/Atividades";
import Agenda from "./components/Agenda.tsx";
import RelatorioFinanceiro from "./components/RelatorioFinanceiro";
import RelatorioServicos from "./components/RelatorioServicos";
import DetalhesObra from "./components/DetalhesObra";
import BackupImportacao from "./components/BackupImportacao";
import Configuracoes from "./components/Configuracoes";
import Usuarios from "./components/Usuarios";
import Login from "./components/Login";
import ListaDeTarefas from "./components/ListaDeTarefas";

// 👇 Simula um login automático como admin
const usuarioAdminSimulado = {
  nome: "Admin (acesso automático)",
  tipo: "admin",
};

export default function App() {
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState(usuarioAdminSimulado);

  const renderTitle = () => {
    switch (selectedPage) {
      case "dashboard": return "Painel de Controle";
      case "construtoras": return "Construtoras";
      case "obras": return "Obras";
      case "atividades": return "Atividades";
      case "relatoriofinanceiro": return "Relatório Financeiro";
      case "relatorioservicos": return "Relatório de Serviços";
      case "detalhesobra": return "Detalhes da Obra";
      case "backup": return "Backup";
      case "configuracoes": return "Configurações";
      case "usuarios": return "Usuários";
      case "tarefas": return "Lista de Tarefas";
      default: return "CD Locações";
    }
  };

  const renderContent = () => {
    switch (selectedPage) {
      case "dashboard": return <Dashboard />;
      case "construtoras": return <Construtoras />;
      case "obras": return <Obras />;
      case "atividades": return <Atividades />;
      case "agenda": return <Agenda />;
      case "relatoriofinanceiro": return <RelatorioFinanceiro />;
      case "relatorioservicos": return <RelatorioServicos />;
      case "detalhesobra": return <DetalhesObra />;
      case "backup": return <BackupImportacao />;
      case "configuracoes": return <Configuracoes />;
      case "usuarios": return <Usuarios />;
      case "tarefas": return <ListaDeTarefas usuario={usuarioLogado?.nome || "Usuário"} />;
      default: return <div className="p-4">Página não encontrada</div>;
    }
  };

  return (
    <div className="flex h-screen text-gray-800">
      <button
        className="sm:hidden fixed top-4 left-4 z-50 bg-white border shadow-md p-2 rounded"
        onClick={() => setMenuAberto(!menuAberto)}
      >
        ☰
      </button>

      <aside
        className={
          "sm:block " +
          (menuAberto ? "block fixed inset-0 bg-white z-40 w-64 p-4" : "hidden")
        }
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Logo da empresa" className="h-12 w-auto mb-2" />
          <h1 className="text-xl font-semibold">CD Locações</h1>
        </div>
        <nav className="flex flex-col space-y-2">
          {(usuarioLogado.tipo === "admin" || usuarioLogado.tipo === "gestor") && (
            <button onClick={() => { setSelectedPage("dashboard"); setMenuAberto(false); }} className="text-left hover:text-blue-600">🏠 Início</button>
          )}
          {usuarioLogado.tipo === "admin" && (
            <>
              <button onClick={() => { setSelectedPage("construtoras"); setMenuAberto(false); }} className="text-left hover:text-blue-600">🏗️ Construtoras</button>
              <button onClick={() => { setSelectedPage("obras"); setMenuAberto(false); }} className="text-left hover:text-blue-600">🧱 Obras</button>
            </>
          )}
          <button onClick={() => { setSelectedPage("atividades"); setMenuAberto(false); }} className="text-left hover:text-blue-600">📋 Atividades</button>
          <button
  onClick={() => { setSelectedPage("agenda"); setMenuAberto(false); }}
  className="text-left hover:text-blue-600"
>
  📆 Agenda
</button>

          <button onClick={() => { setSelectedPage("tarefas"); setMenuAberto(false); }} className="text-left hover:text-blue-600">📝 Lista de Tarefas</button>
          {(usuarioLogado.tipo === "admin" || usuarioLogado.tipo === "gestor") && (
            <>
              <button onClick={() => { setSelectedPage("relatoriofinanceiro"); setMenuAberto(false); }} className="text-left hover:text-blue-600">💰 Relatório Financeiro</button>
              <button onClick={() => { setSelectedPage("relatorioservicos"); setMenuAberto(false); }} className="text-left hover:text-blue-600">📄 Relatório de Serviços</button>
            </>
          )}
          {usuarioLogado.tipo === "admin" && (
            <>
              <button onClick={() => { setSelectedPage("detalhesobra"); setMenuAberto(false); }} className="text-left hover:text-blue-600">📌 Detalhes da Obra</button>
              <button onClick={() => { setSelectedPage("backup"); setMenuAberto(false); }} className="text-left hover:text-blue-600">💾 Backup</button>
              <button onClick={() => { setSelectedPage("usuarios"); setMenuAberto(false); }} className="text-left hover:text-blue-600">👥 Usuários</button>
              <button onClick={() => { setSelectedPage("configuracoes"); setMenuAberto(false); }} className="text-left hover:text-blue-600">⚙️ Configurações</button>
            </>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("usuarioLogado");
              setUsuarioLogado(null);
              location.reload();
            }}
            className="text-left text-red-500 hover:text-red-700"
          >
            🚪 Sair
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-white overflow-auto pt-16 sm:pt-0 relative">
        <div className="sm:hidden fixed top-0 left-0 right-0 bg-white z-40 py-4 shadow-md">
          <h1 className="text-center font-semibold text-lg">{renderTitle()}</h1>
        </div>
        <div className="sm:hidden h-16" />
        {renderContent()}
      </main>
    </div>
  );
}
