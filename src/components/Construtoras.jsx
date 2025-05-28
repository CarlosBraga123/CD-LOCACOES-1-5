import { useEffect, useState } from "react";

export default function Construtoras() {
  const [construtoras, setConstrutoras] = useState([]);
  const [nova, setNova] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const salvas = JSON.parse(localStorage.getItem("construtoras") || "[]");
    setConstrutoras(salvas);
    setIsLoading(false);
  }, []);

  const salvarNova = () => {
    if (!nova.trim()) return;
    const novaConstrutora = {
      id: Date.now(),
      nome: nova.trim(),
    };
    const atualizadas = [...construtoras, novaConstrutora];
    setConstrutoras(atualizadas);
    localStorage.setItem("construtoras", JSON.stringify(atualizadas));
    setNova("");
  };

  const iniciarEdicao = (id, nome) => {
    setEditandoId(id);
    setNomeEditado(nome);
  };

  const salvarEdicao = () => {
    const atualizadas = construtoras.map((c) =>
      c.id === editandoId ? { ...c, nome: nomeEditado } : c
    );
    setConstrutoras(atualizadas);
    localStorage.setItem("construtoras", JSON.stringify(atualizadas));
    setEditandoId(null);
    setNomeEditado("");
  };

  const excluir = (id) => {
    if (confirm("Tem certeza que deseja excluir esta construtora?")) {
      const atualizadas = construtoras.filter((c) => c.id !== id);
      setConstrutoras(atualizadas);
      localStorage.setItem("construtoras", JSON.stringify(atualizadas));
      setEditandoId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">🏗️ Construtoras</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova Construtora"
          className="border p-2 rounded flex-1"
        />
        <button onClick={salvarNova} className="bg-blue-600 text-white px-4 py-2 rounded">
          Salvar
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">🔄 Carregando construtoras...</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {construtoras.map((c) => (
            <li key={c.id} className="border p-2 rounded flex justify-between items-center">
              {editandoId === c.id ? (
                <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                  <input
                    type="text"
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    className="border p-1 rounded flex-1"
                  />
                  <div className="flex gap-2">
                    <button onClick={salvarEdicao} className="text-green-600 text-sm underline">
                      Salvar
                    </button>
                    <button onClick={() => excluir(c.id)} className="text-red-600 text-sm underline">
                      Excluir
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{c.nome}</span>
                  <button
                    onClick={() => iniciarEdicao(c.id, c.nome)}
                    className="text-blue-600 text-sm underline"
                  >
                    Editar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
