import { useEffect, useMemo, useRef, useState } from "react";
import {
  converterMoedaParaNumero,
  formatarMoeda,
  formatarNumeroParaEdicao,
} from "../utils/moeda";
import {
  criarFormularioConstrutora,
  mesclarConstrutoraEditada,
  prepararConstrutoraParaSalvar,
} from "../utils/construtoras";
import {
  copiarTabelaComercialPadrao as criarCopiaTabelaComercialPadrao,
  normalizarTabelaComercial as normalizarTabelaComercialCompartilhada,
  normalizarTabelaComercialParaSalvar,
} from "../utils/tabelaComercial";

const Campo = ({ label, value, onChange, type = "text", className = "", ...props }) => (
  <label className={`block text-sm font-medium ${className}`}>
    {label}
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded border p-2"
      {...props}
    />
  </label>
);

const Bloco = ({ titulo, children }) => (
  <fieldset className="rounded border bg-gray-50 p-3">
    <legend className="px-1 text-sm font-semibold">{titulo}</legend>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
  </fieldset>
);

const classeFormularioDestacado =
  "outline outline-2 outline-blue-500 ring-4 ring-blue-200 bg-blue-50 transition-[outline,box-shadow,background-color] duration-200";

export default function Construtoras({ contextoNavegacao, limparContextoNavegacao, navegar }) {
  const [construtoras, setConstrutoras] = useState([]);
  const [nova, setNova] = useState(criarFormularioConstrutora());
  const [editandoId, setEditandoId] = useState(null);
  const [construtoraEditada, setConstrutoraEditada] = useState(criarFormularioConstrutora());
  const [tabelaEditada, setTabelaEditada] = useState(null);
  const [camposTabelaEmEdicao, setCamposTabelaEmEdicao] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [retornarParaUnificada, setRetornarParaUnificada] = useState(false);
  const [destinoRetorno, setDestinoRetorno] = useState({
    pagina: "construtorasobras",
    visualizacao: "gestao",
  });
  const [destacarFormulario, setDestacarFormulario] = useState(false);
  const deveRolarFormularioRef = useRef(false);
  const formularioEdicaoRef = useRef(null);
  const timeoutDestaqueRef = useRef(null);

  useEffect(() => {
    const salvas = JSON.parse(localStorage.getItem("construtoras") || "[]");
    setConstrutoras(salvas);
    setIsLoading(false);
  }, []);

  const construtorasOrdenadas = useMemo(
    () =>
      [...construtoras].sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" })
      ),
    [construtoras]
  );

  const copiarTabelaComercialPadrao = () => {
    const tabelaPadraoSalva = JSON.parse(localStorage.getItem("tabelaComercialPadrao") || "null");
    return criarCopiaTabelaComercialPadrao(
      tabelaPadraoSalva,
      new Date().toISOString()
    );
  };

  const normalizarTabelaComercial = (tabela = {}) =>
    normalizarTabelaComercialCompartilhada(tabela, {
      incluirVersaoPadrao: true,
    });

  const obterChaveCampoTabela = (grupo, chave) => `${grupo}:${chave}`;

  const atualizarValorTabela = (grupo, chave, valor) => {
    const numero = converterMoedaParaNumero(valor);
    if (numero === null) return;

    setTabelaEditada((tabelaAtual) => {
      const tabela = normalizarTabelaComercial(tabelaAtual || copiarTabelaComercialPadrao());

      return {
        ...tabela,
        atualizadoEm: new Date().toISOString(),
        [grupo]: {
          ...tabela[grupo],
          [chave]: numero,
        },
      };
    });
  };

  const iniciarEdicaoValorTabela = (grupo, chave, valor) => {
    setCamposTabelaEmEdicao((atuais) => ({
      ...atuais,
      [obterChaveCampoTabela(grupo, chave)]: formatarNumeroParaEdicao(valor),
    }));
  };

  const alterarValorTabelaEditado = (grupo, chave, valor) => {
    setCamposTabelaEmEdicao((atuais) => ({
      ...atuais,
      [obterChaveCampoTabela(grupo, chave)]: valor,
    }));
  };

  const finalizarEdicaoValorTabela = (grupo, chave) => {
    const chaveCampo = obterChaveCampoTabela(grupo, chave);
    atualizarValorTabela(grupo, chave, camposTabelaEmEdicao[chaveCampo]);
    setCamposTabelaEmEdicao((atuais) => {
      const novos = { ...atuais };
      delete novos[chaveCampo];
      return novos;
    });
  };

  const normalizarTabelaParaSalvar = (tabela) =>
    normalizarTabelaComercialParaSalvar(tabela, {
      incluirVersaoPadrao: true,
    });

  const renderCamposTabela = (grupo) => {
    const tabela = normalizarTabelaComercial(tabelaEditada || copiarTabelaComercialPadrao());

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(tabela[grupo]).map(([chave, valor]) => {
          const chaveCampo = obterChaveCampoTabela(grupo, chave);

          return (
            <div key={chave}>
              <label className="block text-sm font-medium">{chave}</label>
              <input
                type="text"
                inputMode="decimal"
                value={camposTabelaEmEdicao[chaveCampo] ?? formatarMoeda(valor)}
                onFocus={() => iniciarEdicaoValorTabela(grupo, chave, valor)}
                onChange={(e) => alterarValorTabelaEditado(grupo, chave, e.target.value)}
                onBlur={() => finalizarEdicaoValorTabela(grupo, chave)}
                className="border p-2 rounded w-full text-sm"
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderFormularioConstrutora = (formulario, setFormulario) => (
    <div className="space-y-3">
      <Bloco titulo="Identificacao">
        <Campo label="Nome curto" value={formulario.nome} onChange={(valor) => setFormulario({ ...formulario, nome: valor })} />
        <Campo label="Razao social" value={formulario.razaoSocial} onChange={(valor) => setFormulario({ ...formulario, razaoSocial: valor })} />
        <Campo label="Nome fantasia" value={formulario.nomeFantasia} onChange={(valor) => setFormulario({ ...formulario, nomeFantasia: valor })} />
        <Campo label="CNPJ" value={formulario.cnpj} onChange={(valor) => setFormulario({ ...formulario, cnpj: valor })} />
        <Campo label="Inscricao estadual" value={formulario.inscricaoEstadual} onChange={(valor) => setFormulario({ ...formulario, inscricaoEstadual: valor })} />
        <Campo label="Inscricao municipal" value={formulario.inscricaoMunicipal} onChange={(valor) => setFormulario({ ...formulario, inscricaoMunicipal: valor })} />
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input
            type="checkbox"
            checked={formulario.ativa !== false}
            onChange={(e) => setFormulario({ ...formulario, ativa: e.target.checked })}
          />
          Construtora ativa
        </label>
      </Bloco>

      <Bloco titulo="Contato principal">
        <Campo label="Responsavel" value={formulario.responsavel} onChange={(valor) => setFormulario({ ...formulario, responsavel: valor })} />
        <Campo label="Cargo do responsavel" value={formulario.cargoResponsavel} onChange={(valor) => setFormulario({ ...formulario, cargoResponsavel: valor })} />
        <Campo label="Telefone" value={formulario.telefone} onChange={(valor) => setFormulario({ ...formulario, telefone: valor })} />
        <Campo label="WhatsApp" value={formulario.whatsapp} onChange={(valor) => setFormulario({ ...formulario, whatsapp: valor })} />
        <Campo label="E-mail" type="email" value={formulario.email} onChange={(valor) => setFormulario({ ...formulario, email: valor })} />
        <Campo label="E-mail financeiro" type="email" value={formulario.emailFinanceiro} onChange={(valor) => setFormulario({ ...formulario, emailFinanceiro: valor })} />
      </Bloco>

      <Bloco titulo="Endereco">
        <Campo label="CEP" value={formulario.cep} onChange={(valor) => setFormulario({ ...formulario, cep: valor })} />
        <Campo label="Logradouro" value={formulario.logradouro} onChange={(valor) => setFormulario({ ...formulario, logradouro: valor })} />
        <Campo label="Numero" value={formulario.numero} onChange={(valor) => setFormulario({ ...formulario, numero: valor })} />
        <Campo label="Complemento" value={formulario.complemento} onChange={(valor) => setFormulario({ ...formulario, complemento: valor })} />
        <Campo label="Bairro" value={formulario.bairro} onChange={(valor) => setFormulario({ ...formulario, bairro: valor })} />
        <Campo label="Cidade" value={formulario.cidade} onChange={(valor) => setFormulario({ ...formulario, cidade: valor })} />
        <Campo label="Estado" value={formulario.estado} onChange={(valor) => setFormulario({ ...formulario, estado: valor })} />
      </Bloco>

      <Bloco titulo="Comercial e financeiro">
        <Campo label="Condicao de pagamento" value={formulario.condicaoPagamento} onChange={(valor) => setFormulario({ ...formulario, condicaoPagamento: valor })} />
        <Campo label="Responsavel comercial" value={formulario.responsavelComercial} onChange={(valor) => setFormulario({ ...formulario, responsavelComercial: valor })} />
        <label className="block text-sm font-medium md:col-span-2">
          Observacoes internas
          <textarea
            value={formulario.observacoesInternas || ""}
            onChange={(e) => setFormulario({ ...formulario, observacoesInternas: e.target.value })}
            className="mt-1 w-full rounded border p-2"
            rows={3}
          />
        </label>
      </Bloco>
    </div>
  );

  const salvarNova = () => {
    const dados = prepararConstrutoraParaSalvar(nova);
    if (!dados.nome) return;

    const novaConstrutora = {
      ...dados,
      id: Date.now(),
      tabelaComercial: copiarTabelaComercialPadrao(),
    };
    const atualizadas = [...construtoras, novaConstrutora];
    setConstrutoras(atualizadas);
    localStorage.setItem("construtoras", JSON.stringify(atualizadas));
    setNova(criarFormularioConstrutora());

    if (retornarParaUnificada) {
      navegar?.(destinoRetorno.pagina, { visualizacao: destinoRetorno.visualizacao });
    }
  };

  const iniciarEdicao = (id) => {
    const construtora = construtoras.find((c) => c.id === id);

    setEditandoId(id);
    setConstrutoraEditada(criarFormularioConstrutora(construtora));
    setCamposTabelaEmEdicao({});
    setTabelaEditada(
      normalizarTabelaComercial(construtora?.tabelaComercial || copiarTabelaComercialPadrao())
    );
  };

  useEffect(() => {
    if (isLoading) return;

    if (
      contextoNavegacao?.origem !== "construtoras-obras" ||
      contextoNavegacao?.destino !== "construtoras"
    ) {
      return;
    }

    if (contextoNavegacao.acao === "nova-construtora") {
      setRetornarParaUnificada(true);
      setDestinoRetorno({
        pagina: contextoNavegacao.retornarPara || "construtorasobras",
        visualizacao: contextoNavegacao.visualizacaoRetorno || "gestao",
      });
      limparContextoNavegacao?.();
      return;
    }

    if (contextoNavegacao.acao !== "editar-construtora") return;

    const construtoraId = contextoNavegacao.construtoraId || contextoNavegacao.id;
    const construtorasSalvas = JSON.parse(localStorage.getItem("construtoras") || "[]");
    const construtora = construtorasSalvas.find((c) => String(c.id) === String(construtoraId));

    setConstrutoras(construtorasSalvas);

    if (construtora) {
      setRetornarParaUnificada(true);
      setDestinoRetorno({
        pagina: contextoNavegacao.retornarPara || "construtorasobras",
        visualizacao: contextoNavegacao.visualizacaoRetorno || "gestao",
      });
      setEditandoId(construtora.id);
      setConstrutoraEditada(criarFormularioConstrutora(construtora));
      setCamposTabelaEmEdicao({});
      setTabelaEditada(
        normalizarTabelaComercial(construtora?.tabelaComercial || copiarTabelaComercialPadrao())
      );
      deveRolarFormularioRef.current = true;
      setDestacarFormulario(true);
    }

    limparContextoNavegacao?.();
  }, [contextoNavegacao, construtoras, isLoading]);

  useEffect(() => {
    if (!deveRolarFormularioRef.current || !formularioEdicaoRef.current) return;

    deveRolarFormularioRef.current = false;

    requestAnimationFrame(() => {
      formularioEdicaoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    if (timeoutDestaqueRef.current) {
      window.clearTimeout(timeoutDestaqueRef.current);
    }

    timeoutDestaqueRef.current = window.setTimeout(() => {
      setDestacarFormulario(false);
      timeoutDestaqueRef.current = null;
    }, 6000);
  }, [destacarFormulario, editandoId]);

  useEffect(
    () => () => {
      if (timeoutDestaqueRef.current) {
        window.clearTimeout(timeoutDestaqueRef.current);
      }
    },
    []
  );

  const removerDestaqueFormulario = () => {
    if (!destacarFormulario) return;

    setDestacarFormulario(false);
    if (timeoutDestaqueRef.current) {
      window.clearTimeout(timeoutDestaqueRef.current);
      timeoutDestaqueRef.current = null;
    }
  };

  const salvarEdicao = () => {
    const dados = prepararConstrutoraParaSalvar(construtoraEditada);
    if (!dados.nome) return;

    const atualizadas = construtoras.map((c) =>
      c.id === editandoId
        ? mesclarConstrutoraEditada({
            registroExistente: c,
            dadosEditados: dados,
            tabelaComercial: {
              ...normalizarTabelaParaSalvar(tabelaEditada || c.tabelaComercial || copiarTabelaComercialPadrao()),
              origem: tabelaEditada?.origem || c.tabelaComercial?.origem || "padrao",
              atualizadoEm: new Date().toISOString(),
            },
          })
        : c
    );
    setConstrutoras(atualizadas);
    localStorage.setItem("construtoras", JSON.stringify(atualizadas));
    setEditandoId(null);
    setConstrutoraEditada(criarFormularioConstrutora());
    setTabelaEditada(null);
    setCamposTabelaEmEdicao({});

    if (retornarParaUnificada) {
      navegar?.(destinoRetorno.pagina, { visualizacao: destinoRetorno.visualizacao });
    }
  };

  const excluir = (id) => {
    if (confirm("Tem certeza que deseja excluir esta construtora?")) {
      const atualizadas = construtoras.filter((c) => c.id !== id);
      setConstrutoras(atualizadas);
      localStorage.setItem("construtoras", JSON.stringify(atualizadas));
      setEditandoId(null);
      setTabelaEditada(null);
      setCamposTabelaEmEdicao({});
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Construtoras</h2>

      {!(retornarParaUnificada && editandoId !== null) && (
        <div className="rounded border bg-white p-3 space-y-3">
          <h3 className="font-semibold">Nova Construtora</h3>
          {renderFormularioConstrutora(nova, setNova)}
          <button onClick={salvarNova} className="bg-blue-600 text-white px-4 py-2 rounded">
            Salvar
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Carregando construtoras...</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {construtorasOrdenadas.map((c) => (
            <li key={c.id} className="border p-3 rounded bg-white">
              {editandoId === c.id ? (
                <div
                  ref={formularioEdicaoRef}
                  onMouseDown={removerDestaqueFormulario}
                  onFocusCapture={removerDestaqueFormulario}
                  onTouchStart={removerDestaqueFormulario}
                  className={`flex flex-col w-full gap-3 rounded-lg scroll-mt-24 ${
                    destacarFormulario ? classeFormularioDestacado : "transition-[outline,box-shadow,background-color] duration-200"
                  }`}
                >
                  {renderFormularioConstrutora(construtoraEditada, setConstrutoraEditada)}
                  <div className="border rounded p-3 space-y-4 bg-gray-50">
                    <h3 className="font-semibold">Tabela Comercial da Construtora</h3>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Servicos</h4>
                      {renderCamposTabela("servicos")}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Locacoes</h4>
                      {renderCamposTabela("locacoes")}
                    </div>
                  </div>
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{c.nome}</strong>
                    {c.ativa === false && <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs">Inativa</span>}
                    {c.razaoSocial && <p className="text-sm text-gray-600">{c.razaoSocial}</p>}
                    {(c.responsavel || c.telefone || c.whatsapp) && (
                      <p className="text-sm text-gray-500">
                        {[c.responsavel, c.telefone || c.whatsapp].filter(Boolean).join(" | ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => iniciarEdicao(c.id)}
                    className="text-blue-600 text-sm underline"
                  >
                    Editar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
