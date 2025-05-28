import { useEffect, useState } from "react";

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [construtoras, setConstrutoras] = useState([]);
  const [novaObra, setNovaObra] = useState({
    nome: "",
    construtora: "",
    engenheiro: "",
    endereco: "",
    observacoes: "",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [obraEditada, setObraEditada] = useState(null);

  useEffect(() => {
    setConstrutoras(JSON.parse(localStorage.getItem("construtoras") || "[]"));
    setObras(JSON.parse(localStorage.getItem("obras") || "[]"));
  }, []);

  const salvar = () => {
    if (!novaObra.nome.trim() || !novaObra.construtora) return;

    const nova = {
      ...novaObra,
      id: Date.now(),
    };

    const atualizadas = [...obras, nova];
    setObras(atualizadas);
    localStorage.setItem("obras", JSON.stringify(atualizadas));
    setNovaObra({ nome: "", construtora: "", engenheiro: "", endereco: "", observacoes: "" });
  };

  const iniciarEdicao = (obra) => {
    setEditandoId(obra.id);
    setObraEditada({ ...obra });
  };

  const salvarEdicao = () => {
    const atualizadas = obras.map((o) =>
      o.id === editandoId ? obraEditada : o
    );
    setObras(atualizadas);
    localStorage.setItem("obras", JSON.stringify(atualizadas));
    setEditandoId(null);
    setObraEditada(null);
  };

  const excluir = (id) => {
    if (confirm("Deseja realmente excluir esta obra?")) {
      const atualizadas = obras.filter((o) => o.id !== id);
      setObras(atualizadas);
      localStorage.setItem("obras", JSON.stringify(atualizadas));
      setEditandoId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">🧱 Obras</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={novaObra.construtora}
          onChange={(e) => setNovaObra({ ...novaObra, construtora: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Construtora</option>
          {construtoras.map((c) => (
            <option key={c.id} value={c.nome}>{c.nome}</option>
          ))}
        </select>
        <input
          type="text"
          value={novaObra.nome}
          onChange={(e) => setNovaObra({ ...novaObra, nome: e.target.value })}
          placeholder="Nome da Obra"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={novaObra.engenheiro}
          onChange={(e) => setNovaObra({ ...novaObra, engenheiro: e.target.value })}
          placeholder="Engenheiro responsável"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={novaObra.endereco}
          onChange={(e) => setNovaObra({ ...novaObra, endereco: e.target.value })}
          placeholder="Endereço"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={novaObra.observacoes}
          onChange={(e) => setNovaObra({ ...novaObra, observacoes: e.target.value })}
          placeholder="Observações"
          className="border p-2 rounded"
        />
      </div>

      <button onClick={salvar} className="bg-blue-600 text-white px-4 py-2 rounded">
        Salvar
      </button>

      <ul className="mt-4 space-y-2">
        {obras.map((obra) => (
          <li key={obra.id} className="border p-3 rounded space-y-2 bg-white shadow-sm">
            {editandoId === obra.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={obraEditada.nome}
                  onChange={(e) => setObraEditada({ ...obraEditada, nome: e.target.value })}
                  placeholder="Nome da Obra"
                  className="border p-2 rounded w-full"
                />
                <select
                  value={obraEditada.construtora}
                  onChange={(e) => setObraEditada({ ...obraEditada, construtora: e.target.value })}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Construtora</option>
                  {construtoras.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={obraEditada.engenheiro || ""}
                  onChange={(e) => setObraEditada({ ...obraEditada, engenheiro: e.target.value })}
                  placeholder="Engenheiro responsável"
                  className="border p-2 rounded w-full"
                />
                <input
                  type="text"
                  value={obraEditada.endereco || ""}
                  onChange={(e) => setObraEditada({ ...obraEditada, endereco: e.target.value })}
                  placeholder="Endereço"
                  className="border p-2 rounded w-full"
                />
                <input
                  type="text"
                  value={obraEditada.observacoes || ""}
                  onChange={(e) => setObraEditada({ ...obraEditada, observacoes: e.target.value })}
                  placeholder="Observações"
                  className="border p-2 rounded w-full"
                />
                <div className="flex gap-4">
                  <button onClick={salvarEdicao} className="text-green-600 text-sm underline">Salvar</button>
                  <button onClick={() => excluir(obra.id)} className="text-red-600 text-sm underline">Excluir</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <strong>{obra.nome}</strong> <small className="text-gray-500">({obra.construtora})</small><br />
                  👷 {obra.engenheiro || "—"}<br />
                  📍 {obra.endereco || "—"}<br />
                  📝 {obra.observacoes || "—"}
                </div>
                <button onClick={() => iniciarEdicao(obra)} className="text-blue-600 text-sm underline">Editar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
