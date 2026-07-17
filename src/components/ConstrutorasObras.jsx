import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizarTexto, atividadePertenceObra } from "../utils/obras";
import {
  compararTextoPtBr,
  ordenarConstrutoras,
  ordenarObrasPorEquipamentosAtivos,
} from "../utils/ordenacao";
import {
  obterResumoEquipamentosAtivos,
  obterTotalEquipamentosAtivos,
} from "../utils/equipamentosAtivos";

const texto = (valor) => String(valor || "").trim();

const normalizarBusca = (valor) =>
  normalizarTexto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const situacaoObra = (obra) => texto(obra?.situacao) || "Ativa";

const montarEndereco = (item) =>
  [
    item?.logradouro || item?.endereco,
    item?.numero,
    item?.complemento,
    item?.bairro,
    item?.cidade,
    item?.estado,
  ]
    .map(texto)
    .filter(Boolean)
    .join(", ");

const obterContatoPrincipal = (item) => texto(item?.telefone) || texto(item?.whatsapp);

const obraPertenceConstrutora = (obra, construtora) => {
  if (obra?.construtoraId && construtora?.id) {
    return String(obra.construtoraId) === String(construtora.id);
  }

  return normalizarTexto(obra?.construtora) === normalizarTexto(construtora?.nome);
};

const buscarEm = (termos, busca) =>
  termos.some((termo) => normalizarBusca(termo).includes(busca));

const obterConstrutoraDaObra = (obra, construtoras) =>
  construtoras.find((construtora) => obraPertenceConstrutora(obra, construtora));

const obterTotalGrupo = (resumo, prefixo) =>
  resumo
    .filter((item) => item.grupo === prefixo || item.grupo.startsWith(`${prefixo} `))
    .reduce((total, item) => total + Math.max(0, Number(item.total) || 0), 0);

const montarCategoriasAtivas = (resumo) => [
  { chave: "eletricos", rotulo: "Eletricos", valor: obterTotalGrupo(resumo, "Balancinho Elétrico") },
  { chave: "manuais", rotulo: "Manuais", valor: obterTotalGrupo(resumo, "Balancinho Manual") },
  { chave: "miniGruas", rotulo: "Mini Grua", valor: obterTotalGrupo(resumo, "Mini Grua") },
  { chave: "contrapesos", rotulo: "Contrapeso", valor: obterTotalGrupo(resumo, "Kit Contrapeso") },
];

const atividadesRecentesDaObra = (obra, atividades) =>
  atividades
    .filter((atividade) => atividadePertenceObra(atividade, obra))
    .sort((a, b) => {
      const dataA = a.dataLiberacao || a.dataAgendamento || "";
      const dataB = b.dataLiberacao || b.dataAgendamento || "";
      return dataB.localeCompare(dataA);
    })
    .slice(0, 5);

export default function ConstrutorasObras({ navegar, contextoNavegacao, limparContextoNavegacao }) {
  const [construtoras, setConstrutoras] = useState([]);
  const [obras, setObras] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [visualizacao, setVisualizacao] = useState("ativos");
  const [busca, setBusca] = useState("");
  const [construtoraAbertaId, setConstrutoraAbertaId] = useState(null);
  const [obraAbertaId, setObraAbertaId] = useState(null);
  const [obraAtivaAbertaId, setObraAtivaAbertaId] = useState(null);

  const carregarDados = useCallback(() => {
    setConstrutoras(JSON.parse(localStorage.getItem("construtoras") || "[]"));
    setObras(JSON.parse(localStorage.getItem("obras") || "[]"));
    setAtividades(JSON.parse(localStorage.getItem("atividades") || "[]"));
  }, []);

  useEffect(() => {
    carregarDados();

    const atualizarAoVoltar = () => {
      if (!document.hidden) carregarDados();
    };

    window.addEventListener("focus", carregarDados);
    document.addEventListener("visibilitychange", atualizarAoVoltar);

    return () => {
      window.removeEventListener("focus", carregarDados);
      document.removeEventListener("visibilitychange", atualizarAoVoltar);
    };
  }, [carregarDados]);

  useEffect(() => {
    if (contextoNavegacao?.visualizacao === "gestao") {
      setVisualizacao("gestao");
      limparContextoNavegacao?.();
    }
  }, [contextoNavegacao, limparContextoNavegacao]);

  const buscaNormalizada = normalizarBusca(busca);

  const obrasAtivas = useMemo(() => {
    const obrasComTotais = obras
      .map((obra) => {
        const resumo = obterResumoEquipamentosAtivos(obra, atividades);
        const totalAtivos = obterTotalEquipamentosAtivos(obra, atividades);
        const construtora = obterConstrutoraDaObra(obra, construtoras);

        return {
          obra,
          construtora,
          resumo,
          totalAtivos,
          categorias: montarCategoriasAtivas(resumo),
        };
      })
      .filter((item) => item.totalAtivos > 0);

    return ordenarObrasPorEquipamentosAtivos(
      obrasComTotais,
      (item) => item.totalAtivos
    ).sort((a, b) => {
      if (a.totalAtivos !== b.totalAtivos) return b.totalAtivos - a.totalAtivos;
      return compararTextoPtBr(a.obra?.nome, b.obra?.nome);
    });
  }, [atividades, construtoras, obras]);

  const resumoGeralAtivos = useMemo(
    () =>
      obrasAtivas.reduce(
        (acc, item) => {
          acc.obras += 1;
          acc.total += item.totalAtivos;
          item.categorias.forEach((categoria) => {
            acc[categoria.chave] += categoria.valor;
          });
          return acc;
        },
        {
          obras: 0,
          total: 0,
          eletricos: 0,
          manuais: 0,
          miniGruas: 0,
          contrapesos: 0,
        }
      ),
    [obrasAtivas]
  );

  const dadosConstrutoras = useMemo(() => {
    const construtorasOrdenadas = ordenarConstrutoras(construtoras);

    return construtorasOrdenadas
      .map((construtora) => {
        const obrasDaConstrutora = obras.filter((obra) => obraPertenceConstrutora(obra, construtora));
        const obrasOrdenadas = ordenarObrasPorEquipamentosAtivos(
          obrasDaConstrutora,
          (obra) => obterTotalEquipamentosAtivos(obra, atividades)
        );
        const totalAtivos = obrasDaConstrutora.reduce(
          (total, obra) => total + obterTotalEquipamentosAtivos(obra, atividades),
          0
        );

        return {
          construtora,
          obras: obrasOrdenadas,
          totalObras: obrasDaConstrutora.length,
          totalAtivos,
        };
      })
      .filter(({ construtora, obras: obrasDaConstrutora }) => {
        if (!buscaNormalizada) return true;

        const encontrouConstrutora = buscarEm(
          [
            construtora?.nome,
            construtora?.razaoSocial,
            construtora?.nomeFantasia,
            construtora?.cnpj,
            construtora?.responsavel,
            construtora?.telefone,
            construtora?.whatsapp,
            construtora?.email,
          ],
          buscaNormalizada
        );

        const encontrouObra = obrasDaConstrutora.some((obra) =>
          buscarEm(
            [
              obra?.nome,
              obra?.cnpj,
              obra?.responsavel,
              obra?.engenheiro,
              obra?.telefone,
              obra?.whatsapp,
              obra?.email,
              obra?.cidade,
            ],
            buscaNormalizada
          )
        );

        return encontrouConstrutora || encontrouObra;
      });
  }, [atividades, buscaNormalizada, construtoras, obras]);

  const alternarConstrutora = (id) => {
    setConstrutoraAbertaId((atual) => (String(atual) === String(id) ? null : id));
    setObraAbertaId(null);
  };

  const alternarObraGestao = (id) => {
    setObraAbertaId((atual) => (String(atual) === String(id) ? null : id));
  };

  const alternarObraAtiva = (id) => {
    setObraAtivaAbertaId((atual) => (String(atual) === String(id) ? null : id));
  };

  const navegarPara = (pagina, contexto = null) => navegar?.(pagina, contexto);

  const editarConstrutora = (construtora) => {
    navegarPara("construtoras", {
      origem: "construtoras-obras",
      destino: "construtoras",
      acao: "editar-construtora",
      id: construtora?.id || "",
      construtoraId: construtora?.id || "",
      retornarPara: "construtorasobras",
      visualizacaoRetorno: "gestao",
    });
  };

  const abrirNovaObra = (construtora = null) => {
    navegarPara("obras", {
      origem: "construtoras-obras",
      destino: "obras",
      acao: "nova-obra",
      id: construtora?.id || "",
      construtoraId: construtora?.id || "",
      construtoraNome: construtora?.nome || "",
      retornarPara: "construtorasobras",
      visualizacaoRetorno: "gestao",
    });
  };

  const editarObra = (obra) => {
    navegarPara("obras", {
      origem: "construtoras-obras",
      destino: "obras",
      acao: "editar-obra",
      id: obra?.id || "",
      obraId: obra?.id || "",
      retornarPara: "construtorasobras",
      visualizacaoRetorno: "gestao",
    });
  };

  const renderDetalheObra = ({ obra, construtora, resumo, compacto = false }) => {
    const contatoObra = obterContatoPrincipal(obra);
    const responsavel = texto(obra.responsavel) || texto(obra.engenheiro);
    const recentes = atividadesRecentesDaObra(obra, atividades);

    return (
      <div className={`grid gap-3 border-t pt-3 ${compacto ? "" : "lg:grid-cols-3"}`}>
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Resumo</h3>
          <p>Construtora: {construtora?.nome || obra.construtora || "-"}</p>
          <p>Endereco: {montarEndereco(obra) || "-"}</p>
          <p>Responsavel: {responsavel || "-"}</p>
          <p>Telefone: {obra.telefone || contatoObra || "-"}</p>
          <p>WhatsApp: {obra.whatsapp || "-"}</p>
        </div>

        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Equipamentos ativos</h3>
          {resumo.length === 0 ? (
            <p className="text-gray-500">Nenhum equipamento ativo.</p>
          ) : (
            resumo.map((item) => (
              <p key={item.grupo}>
                {item.grupo}: <strong>{item.total}</strong>
              </p>
            ))
          )}
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">Atividades recentes</h3>
          {recentes.length === 0 ? (
            <p className="text-gray-500">Nenhuma atividade encontrada.</p>
          ) : (
            recentes.map((atividade) => (
              <div key={atividade.id} className="rounded border bg-gray-50 p-2">
                <p className="font-medium">{atividade.servico || "Servico"} - {atividade.equipamento || "Equipamento"}</p>
                <p className="text-gray-500">
                  {atividade.dataLiberacao || atividade.dataAgendamento || "Sem data"}
                </p>
              </div>
            ))
          )}
        </div>

        <div className={`flex flex-col gap-2 ${compacto ? "" : "lg:col-span-3 sm:flex-row"}`}>
          <button
            type="button"
            onClick={() => navegarPara("atividades")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm"
          >
            Nova Atividade
          </button>
          <button
            type="button"
            onClick={() => editarObra(obra)}
            className="rounded-xl border bg-white px-4 py-2 text-blue-600 shadow-sm"
          >
            Editar Obra
          </button>
          <button
            type="button"
            onClick={() => navegarPara("detalhesobra")}
            className="rounded-xl border bg-white px-4 py-2 text-blue-600 shadow-sm"
          >
            Abrir Detalhes da Obra atual
          </button>
        </div>
      </div>
    );
  };

  const renderEquipamentosAtivos = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-6">
        {[
          ["Obras", resumoGeralAtivos.obras],
          ["Total", resumoGeralAtivos.total],
          ["Eletricos", resumoGeralAtivos.eletricos],
          ["Manuais", resumoGeralAtivos.manuais],
          ["Mini Gruas", resumoGeralAtivos.miniGruas],
          ["Contrapesos", resumoGeralAtivos.contrapesos],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-lg border bg-gray-50 px-2 py-1">
            <p className="text-[11px] font-semibold uppercase text-gray-500">{rotulo}</p>
            <p className="text-lg font-bold text-blue-700 leading-none">{valor}</p>
          </div>
        ))}
      </div>

      {obrasAtivas.length === 0 ? (
        <p className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
          Nenhuma obra com equipamento ativo.
        </p>
      ) : (
        <div className="space-y-1">
          {obrasAtivas.map(({ obra, construtora, resumo, totalAtivos, categorias }) => {
            const aberta = String(obraAtivaAbertaId) === String(obra.id || obra.nome);
            const categoriasVisiveis = categorias.filter((categoria) => categoria.valor > 0);

            return (
              <article key={obra.id || obra.nome} className="rounded-lg border bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => alternarObraAtiva(obra.id || obra.nome)}
                  className="grid w-full grid-cols-[1fr_auto] gap-2 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{obra.nome || "Obra sem nome"}</p>
                    <p className="truncate text-xs text-gray-500 leading-tight">
                      {construtora?.nome || obra.construtora || "Sem construtora"}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] leading-tight text-gray-600">
                      {categoriasVisiveis.map((categoria) => (
                        <span key={categoria.chave}>{categoria.rotulo} {categoria.valor}</span>
                      ))}
                    </p>
                  </div>
                  <div className="flex min-w-[42px] items-center justify-center rounded-lg bg-blue-50 px-2 text-xl font-bold text-blue-700">
                    {totalAtivos}
                  </div>
                </button>

                {aberta && (
                  <div className="px-3 pb-3">
                    {renderDetalheObra({ obra, construtora, resumo, compacto: true })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderGestao = () => (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => navegarPara("construtoras", {
            origem: "construtoras-obras",
            destino: "construtoras",
            acao: "nova-construtora",
            retornarPara: "construtorasobras",
            visualizacaoRetorno: "gestao",
          })}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm"
        >
          Nova Construtora
        </button>
        <button
          type="button"
          onClick={() => abrirNovaObra()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm"
        >
          Nova Obra
        </button>
      </div>

      <input
        type="text"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        placeholder="Buscar construtora, obra, CNPJ, responsavel ou contato"
        className="w-full rounded-xl border px-3 py-2 shadow-sm"
      />

      {dadosConstrutoras.length === 0 ? (
        <p className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
          Nenhuma construtora ou obra encontrada.
        </p>
      ) : (
        dadosConstrutoras.map(({ construtora, obras: obrasDaConstrutora, totalObras, totalAtivos }) => {
          const construtoraAberta = String(construtoraAbertaId) === String(construtora.id || construtora.nome);
          const contato = obterContatoPrincipal(construtora);

          return (
            <section key={construtora.id || construtora.nome} className="rounded-xl border bg-white shadow-sm">
              <button
                type="button"
                onClick={() => alternarConstrutora(construtora.id || construtora.nome)}
                className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold">{construtora.nome || "Construtora sem nome"}</p>
                  <p className="text-sm text-gray-500">
                    {totalObras} obra(s) | {totalAtivos} equipamento(s) ativo(s)
                  </p>
                  {construtora.responsavel && (
                    <p className="text-sm text-gray-600">Responsavel: {construtora.responsavel}</p>
                  )}
                  {contato && <p className="text-sm text-gray-600">Contato: {contato}</p>}
                  {construtora.email && <p className="text-sm text-gray-600">E-mail: {construtora.email}</p>}
                </div>
                <span className="rounded-full border px-3 py-1 text-sm text-gray-600">
                  {construtoraAberta ? "Recolher" : "Expandir"}
                </span>
              </button>

              {construtoraAberta && (
                <div className="space-y-3 border-t bg-gray-50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => editarConstrutora(construtora)}
                      className="rounded-xl border bg-white px-4 py-2 text-sm text-blue-600 shadow-sm"
                    >
                      Editar Construtora
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirNovaObra(construtora)}
                      className="rounded-xl border bg-white px-4 py-2 text-sm text-blue-600 shadow-sm"
                    >
                      Nova Obra nesta Construtora
                    </button>
                  </div>

                  {obrasDaConstrutora.length === 0 ? (
                    <p className="rounded-xl border bg-white p-3 text-sm text-gray-500">
                      Nenhuma obra vinculada a esta construtora.
                    </p>
                  ) : (
                    obrasDaConstrutora.map((obra) => {
                      const resumoAtivos = obterResumoEquipamentosAtivos(obra, atividades);
                      const totalAtivosObra = obterTotalEquipamentosAtivos(obra, atividades);
                      const obraAberta = String(obraAbertaId) === String(obra.id || obra.nome);
                      const contatoObra = obterContatoPrincipal(obra);
                      const responsavel = texto(obra.responsavel) || texto(obra.engenheiro);

                      return (
                        <article key={obra.id || obra.nome} className="rounded-xl border bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <p className="text-base font-semibold">{obra.nome || "Obra sem nome"}</p>
                              <p className="text-sm text-gray-500">
                                Situacao: {situacaoObra(obra)} | {totalAtivosObra} ativo(s)
                              </p>
                              {resumoAtivos.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {resumoAtivos.map((item) => (
                                    <span key={item.grupo} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                                      {item.grupo}: {item.total}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {responsavel && <p className="text-sm text-gray-600">Responsavel: {responsavel}</p>}
                              {contatoObra && <p className="text-sm text-gray-600">Contato: {contatoObra}</p>}
                              {obra.cidade && <p className="text-sm text-gray-600">Cidade: {obra.cidade}</p>}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                              <button
                                type="button"
                                onClick={() => alternarObraGestao(obra.id || obra.nome)}
                                className="rounded-xl border bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
                              >
                                {obraAberta ? "Recolher" : "Expandir"}
                              </button>
                              <button
                                type="button"
                                onClick={() => editarObra(obra)}
                                className="rounded-xl border bg-white px-4 py-2 text-sm text-blue-600 shadow-sm"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => navegarPara("atividades")}
                                className="rounded-xl border bg-white px-4 py-2 text-sm text-blue-600 shadow-sm"
                              >
                                Nova Atividade
                              </button>
                            </div>
                          </div>

                          {obraAberta && (
                            <div className="mt-4">
                              {renderDetalheObra({ obra, construtora, resumo: resumoAtivos })}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );

  return (
    <div className="p-3 space-y-3 sm:p-4">
      <div>
        <h2 className="text-xl font-semibold">Construtoras e Obras</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setVisualizacao("ativos")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            visualizacao === "ativos" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"
          }`}
        >
          Equipamentos Ativos
        </button>
        <button
          type="button"
          onClick={() => setVisualizacao("gestao")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            visualizacao === "gestao" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"
          }`}
        >
          Gestão
        </button>
      </div>

      {visualizacao === "ativos" ? renderEquipamentosAtivos() : renderGestao()}
    </div>
  );
}
