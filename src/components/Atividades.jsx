// Atividades.jsx - Versão corrigida sem erro de fechamento de JSX
import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Atividades() {
  const topoRef = useRef(null);
  const [construtoras, setConstrutoras] = useState([]);
  const [obras, setObras] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [mostrarMateriaisId, setMostrarMateriaisId] = useState(null);

  const [form, setForm] = useState({
    id: null,
    construtora: "",
    obra: "",
    equipamento: "",
    servico: "",
    tamanho: "",
    tamanhoAnterior: "",
    tamanhoNovo: "",
    ancoragem: "",
    dataAgendamento: "",
    dataLiberacao: "",
    observacoes: "",
  });

  useEffect(() => {
    const dadosSalvos = JSON.parse(localStorage.getItem("atividades")) || [];
    setAtividades(dadosSalvos);

    const construtorasSalvas = JSON.parse(localStorage.getItem("construtoras")) || [];
    setConstrutoras(construtorasSalvas);

    const obrasSalvas = JSON.parse(localStorage.getItem("obras")) || [];
    setObras(obrasSalvas);
  }, []);

  const salvar = () => {
    const novaAtividade = {
      ...form,
      id: form.id || Date.now(),
      iniciado: form.iniciado || false,
    };

    const novas = form.id
      ? atividades.map((a) => (a.id === form.id ? novaAtividade : a))
      : [novaAtividade, ...atividades];

    setAtividades(novas);
    localStorage.setItem("atividades", JSON.stringify(novas));
    setForm({
      id: null,
      construtora: "",
      obra: "",
      equipamento: "",
      servico: "",
      tamanho: "",
      tamanhoAnterior: "",
      tamanhoNovo: "",
      ancoragem: "",
      dataAgendamento: "",
      dataLiberacao: "",
      observacoes: "",
      iniciado: false,
    });
  };

  const editar = (item) => {
    setForm(item);
    setTimeout(() => {
      topoRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };
  const excluir = (id) => {
    const novas = atividades.filter((a) => a.id !== id);
    setAtividades(novas);
    localStorage.setItem("atividades", JSON.stringify(novas));
  };

  const toggleMateriais = (id) =>
    setMostrarMateriaisId(mostrarMateriaisId === id ? null : id);

  const calcularMateriais = (tamanho, ancoragem) => {
    if (!tamanho || !ancoragem) return [];
    const base = [`Plataforma ${tamanho}m`];
    if (ancoragem === "Andaime Simples") base.push("Kit Simples");
    if (ancoragem === "Andaime Duplo") base.push("Kit Duplo");
    if (ancoragem === "Afastador") base.push("Afastador");
    return base;
  };

    const tamanhoSelecionado =
    form.servico === "Deslocamento" ? form.tamanhoNovo : form.tamanho;

  const materiais = calcularMateriais(tamanhoSelecionado, form.ancoragem);

  return (
    <div className="p-4">
      <div ref={topoRef}></div>
      <h2 className="text-xl font-semibold mb-4">Nova Atividade</h2>

      <div className="grid gap-3">
        <select
          value={form.construtora}
          onChange={(e) => setForm({ ...form, construtora: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        >
          <option value="">Construtora</option>
          {construtoras.map((c) => (
            <option key={c.id}>{c.nome}</option>
          ))}
        </select>

        <select
          value={form.obra}
          onChange={(e) => setForm({ ...form, obra: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        >
          <option value="">Obra</option>
          {obras
            .filter((o) => o.construtora === form.construtora)
            .map((o) => (
              <option key={o.id}>{o.nome}</option>
            ))}
        </select>

        <select
          value={form.equipamento}
          onChange={(e) =>
            setForm({ ...form, equipamento: e.target.value, ancoragem: "" })
          }
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        >
          <option value="">Equipamento</option>
          <option>Balancinho</option>
          <option>Mini Grua</option>
        </select>

        <select
          value={form.servico}
          onChange={(e) => setForm({ ...form, servico: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        >
          <option value="">Serviço</option>
          {form.equipamento === "Mini Grua" ? (
            <>
              <option>Ascensão</option>
              <option>Instalação</option>
              <option>Manutenção</option>
              <option>Remoção</option>
            </>
          ) : (
            <>
              <option>Instalação</option>
              <option>Deslocamento</option>
              <option>Manutenção</option>
              <option>Remoção</option>
            </>
          )}
        </select>

        {form.equipamento === "Balancinho" &&
          form.servico !== "" &&
          form.servico !== "Deslocamento" && (
            <select
              value={form.tamanho}
              onChange={(e) => setForm({ ...form, tamanho: e.target.value })}
              className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
            >
              <option value="">Tamanho</option>
              {[1, 1.5, 2, 3, 4, 5, 6].map((val) => (
                <option key={val} value={val}>{val}m</option>
              ))}
            </select>
          )}

        {form.servico === "Deslocamento" && (
          <>
            <select
              value={form.tamanhoAnterior}
              onChange={(e) =>
                setForm({ ...form, tamanhoAnterior: e.target.value })
              }
              className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
            >
              <option value="">Tamanho Anterior</option>
              {[1, 1.5, 2, 3, 4, 5, 6].map((val) => (
                <option key={val} value={val}>{val}m</option>
              ))}
            </select>

            <select
              value={form.tamanhoNovo}
              onChange={(e) =>
                setForm({ ...form, tamanhoNovo: e.target.value })
              }
              className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
            >
              <option value="">Tamanho Novo</option>
              {[1, 1.5, 2, 3, 4, 5, 6].map((val) => (
                <option key={val} value={val}>{val}m</option>
              ))}
            </select>
          </>
        )}

        {form.equipamento === "Balancinho" && (
          <select
            value={form.ancoragem}
            onChange={(e) => setForm({ ...form, ancoragem: e.target.value })}
            className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
          >
            <option value="">Ancoragem</option>
            <option>Andaime Simples</option>
            <option>Andaime Duplo</option>
            <option>Afastador</option>
          </select>
        )}

        <label className="text-sm font-medium mt-2">Data de Agendamento</label>
        <input
          type="date"
          value={form.dataAgendamento}
          onChange={(e) => setForm({ ...form, dataAgendamento: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        />

        <label className="text-sm font-medium mt-2">Data de Liberação</label>
        <input
          type="date"
          value={form.dataLiberacao}
          onChange={(e) => setForm({ ...form, dataLiberacao: e.target.value })}
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        />

        <textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          placeholder="Observações"
          className="w-full rounded-xl border px-3 py-2 shadow-sm bg-white text-gray-800"
        />
        <button
          onClick={salvar}
          className="bg-blue-500 text-white p-2 rounded-xl shadow"
        >
          Salvar
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-4">Atividades Salvas</h2>
      <div className="space-y-4">
        {
          [...atividades].sort((a, b) => {
            if (a.dataLiberacao && !b.dataLiberacao) return 1;
            if (!a.dataLiberacao && b.dataLiberacao) return -1;
            const dataA = new Date(a.dataAgendamento);
            const dataB = new Date(b.dataAgendamento);
            return dataA - dataB;
          }).map((item) => {
          const tamanhoInfo =
            item.servico === "Deslocamento"
              ? `Tamanho: ${item.tamanhoAnterior || ""} ➔ ${item.tamanhoNovo || ""}`
              : `Tamanho: ${item.tamanho || ""}`;

          return (
            <div
              key={item.id}
              className="border rounded-xl p-4 shadow flex flex-col gap-2 bg-white"
            >
              <strong>{item.servico} - {item.equipamento}</strong>
              <span className="text-xs font-semibold text-gray-500">
  Status: {item.dataLiberacao
    ? "CONCLUÍDO"
    : item.iniciado
    ? "EM ANDAMENTO"
    : "AGENDADO"}
</span>

              <span>{item.construtora} | {item.obra}</span>
              <span>{tamanhoInfo}</span>
              <span>Ancoragem: {item.ancoragem}</span>
              {item.dataAgendamento && (
                <span>
                  Agendamento: {item.dataAgendamento.split("-").reverse().join("/")}
                </span>
              )}
              {item.dataLiberacao && (
                <span>
                  Liberação: {item.dataLiberacao.split("-").reverse().join("/")}
                </span>
              )}

              {item.observacoes && (
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-medium">
                  Obs: {item.observacoes}
                </div>
              )}

              <div className="flex gap-2 flex-wrap mt-2">
                {!item.dataLiberacao && !item.iniciado && (
                  <button
                    onClick={() => {
                      const atualizadas = atividades.map((a) =>
                        a.id === item.id ? { ...a, iniciado: true } : a
                      );
                      setAtividades(atualizadas);
                      localStorage.setItem("atividades", JSON.stringify(atualizadas));
                    }}
                    className="bg-white border rounded-xl px-4 py-1 text-orange-600 shadow-sm"
                  >
                    Iniciar Serviço
                  </button>
                )}
                {!item.dataLiberacao && (
                  <button
                    onClick={() => {
                      const atualizadas = atividades.map((a) =>
                        a.id === item.id
                          ? {
                              ...a,
                              dataLiberacao: new Date().toISOString().split("T")[0],
                            }
                          : a
                      );
                      setAtividades(atualizadas);
                      localStorage.setItem("atividades", JSON.stringify(atualizadas));
                    }}
                    className="bg-white border rounded-xl px-4 py-1 text-green-600 shadow-sm"
                  >
                    Liberar
                  </button>
                )}
                <button
                  onClick={() => editar(item)}
                  className="bg-white border rounded-xl px-4 py-1 text-blue-500 shadow-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(item.id)}
                  className="bg-white border rounded-xl px-4 py-1 text-red-500 shadow-sm"
                >
                  Excluir
                </button>
                <button
                  onClick={() => toggleMateriais(item.id)}
                  className="bg-white border rounded-xl px-4 py-1 text-gray-700 shadow-sm"
                >
                  {mostrarMateriaisId === item.id ? "Ocultar Materiais" : "Ver Materiais"}
                </button>
              </div>

              {mostrarMateriaisId === item.id && (
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                  {calcularMateriais(
                    item.servico === "Deslocamento"
                      ? item.tamanhoNovo
                      : item.tamanho,
                    item.ancoragem
                  ).map((mat, i) => (
                    <li key={i}>{mat}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
