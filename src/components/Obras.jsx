import { useEffect, useMemo, useRef, useState } from "react";
import {
  converterMoedaParaNumero,
  formatarMoeda,
  formatarNumeroParaEdicao,
  normalizarValoresMonetarios,
} from "../utils/moeda";

const tabelaComercialInicial = {
  versao: 1,
  servicos: {
    "Balancinho-Eletrico-Instalação": 1000,
    "Balancinho-Eletrico-Deslocamento": 1000,
    "Balancinho-Eletrico-Manutenção": 0,
    "Balancinho-Eletrico-Remoção": 1000,
    "Balancinho-Manual-Instalação": 900,
    "Balancinho-Manual-Deslocamento": 900,
    "Balancinho-Manual-Manutenção": 0,
    "Balancinho-Manual-Remoção": 900,
    "Balancinho-Contrapeso-Instalação": 0,
    "Balancinho-Contrapeso-Deslocamento": 0,
    "Balancinho-Contrapeso-Manutenção": 0,
    "Balancinho-Contrapeso-Remoção": 0,
    "Mini Grua-500kg-Instalação": 4000,
    "Mini Grua-500kg-Ascensão": 900,
    "Mini Grua-500kg-Manutenção": 0,
    "Mini Grua-500kg-Remoção": 4000,
    "Mini Grua-1T-Instalação": 8500,
    "Mini Grua-1T-Ascensão": 1000,
    "Mini Grua-1T-Manutenção": 0,
    "Mini Grua-1T-Remoção": 8500,
  },
  locacoes: {
    "Balancinho-Eletrico": 1200,
    "Balancinho-Manual": 1000,
    "Balancinho-Contrapeso": 600,
    "Mini Grua-500kg": 0,
    "Mini Grua-1T": 0,
  },
};

const situacoesObra = ["Ativa", "Paralisada", "Concluída", "Inativa"];

const camposObra = {
  nome: "",
  construtora: "",
  construtoraId: "",
  cnpj: "",
  cno: "",
  codigoInterno: "",
  situacao: "Ativa",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  pontoReferencia: "",
  engenheiro: "",
  endereco: "",
  observacoes: "",
  responsavel: "",
  cargoResponsavel: "",
  telefone: "",
  whatsapp: "",
  email: "",
  horarioEntrega: "",
  orientacoesAcesso: "",
  enderecoEntregaDiferente: false,
  enderecoEntrega: "",
  contatos: [],
};

const criarContato = (dados = {}) => ({
  id: dados.id || String(Date.now() + Math.random()),
  tipo: dados.tipo || "Engenheiro",
  nome: dados.nome || "",
  cargo: dados.cargo || "",
  crea: dados.crea || "",
  telefone: dados.telefone || "",
  whatsapp: dados.whatsapp || "",
  email: dados.email || "",
  principal: dados.principal === true,
  ativo: dados.ativo !== false,
});

const criarFormularioObra = (obra = {}) => ({
  ...camposObra,
  ...obra,
  situacao: obra.situacao || "Ativa",
  enderecoEntregaDiferente: obra.enderecoEntregaDiferente === true,
  contatos: Array.isArray(obra.contatos) ? obra.contatos.map(criarContato) : [],
});

const texto = (valor) => String(valor || "").trim();

const contatoTemConteudo = (contato) =>
  [
    contato.tipo,
    contato.nome,
    contato.cargo,
    contato.crea,
    contato.telefone,
    contato.whatsapp,
    contato.email,
  ].some((valor) => texto(valor));

const prepararContatosParaSalvar = (contatos = []) =>
  contatos
    .map((contato) => ({
      ...criarContato(contato),
      tipo: texto(contato.tipo) || "Contato",
      nome: texto(contato.nome),
      cargo: texto(contato.cargo),
      crea: texto(contato.crea),
      telefone: texto(contato.telefone),
      whatsapp: texto(contato.whatsapp),
      email: texto(contato.email),
      principal: contato.principal === true,
      ativo: contato.ativo !== false,
    }))
    .filter(contatoTemConteudo);

const prepararObraParaSalvar = (formulario) => ({
  ...formulario,
  nome: texto(formulario.nome),
  construtora: texto(formulario.construtora),
  construtoraId: formulario.construtoraId || "",
  cnpj: texto(formulario.cnpj),
  cno: texto(formulario.cno),
  codigoInterno: texto(formulario.codigoInterno),
  situacao: formulario.situacao || "Ativa",
  cep: texto(formulario.cep),
  logradouro: texto(formulario.logradouro),
  numero: texto(formulario.numero),
  complemento: texto(formulario.complemento),
  bairro: texto(formulario.bairro),
  cidade: texto(formulario.cidade),
  estado: texto(formulario.estado),
  pontoReferencia: texto(formulario.pontoReferencia),
  engenheiro: texto(formulario.engenheiro),
  endereco: texto(formulario.endereco),
  observacoes: texto(formulario.observacoes),
  responsavel: texto(formulario.responsavel),
  cargoResponsavel: texto(formulario.cargoResponsavel),
  telefone: texto(formulario.telefone),
  whatsapp: texto(formulario.whatsapp),
  email: texto(formulario.email),
  horarioEntrega: texto(formulario.horarioEntrega),
  orientacoesAcesso: texto(formulario.orientacoesAcesso),
  enderecoEntregaDiferente: formulario.enderecoEntregaDiferente === true,
  enderecoEntrega: texto(formulario.enderecoEntrega),
  contatos: prepararContatosParaSalvar(formulario.contatos || []),
});

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

export default function Obras({ contextoNavegacao, limparContextoNavegacao, navegar }) {
  const [obras, setObras] = useState([]);
  const [construtoras, setConstrutoras] = useState([]);
  const [novaObra, setNovaObra] = useState(criarFormularioObra());
  const [editandoId, setEditandoId] = useState(null);
  const [obraEditada, setObraEditada] = useState(null);
  const [camposTabelaEmEdicao, setCamposTabelaEmEdicao] = useState({});
  const [retornarParaUnificada, setRetornarParaUnificada] = useState(false);
  const [dadosCarregados, setDadosCarregados] = useState(false);
  const [destinoRetorno, setDestinoRetorno] = useState({
    pagina: "construtorasobras",
    visualizacao: "gestao",
  });
  const [destacarFormulario, setDestacarFormulario] = useState(false);
  const deveRolarFormularioRef = useRef(false);
  const formularioNovaObraRef = useRef(null);
  const formularioEdicaoRef = useRef(null);
  const alvoRolagemRef = useRef(null);
  const timeoutDestaqueRef = useRef(null);

  useEffect(() => {
    const construtorasSalvas = JSON.parse(localStorage.getItem("construtoras") || "[]");
    const obrasSalvas = JSON.parse(localStorage.getItem("obras") || "[]");

    setConstrutoras(construtorasSalvas);
    setObras(obrasSalvas);
    setDadosCarregados(true);
  }, []);

  useEffect(() => {
    if (!dadosCarregados) return;

    if (
      contextoNavegacao?.origem !== "construtoras-obras" ||
      contextoNavegacao?.destino !== "obras"
    ) {
      return;
    }

    const construtorasSalvas = JSON.parse(localStorage.getItem("construtoras") || "[]");
    const obrasSalvas = JSON.parse(localStorage.getItem("obras") || "[]");

    setConstrutoras(construtorasSalvas);
    setObras(obrasSalvas);

    if (contextoNavegacao.acao === "nova-obra") {
      const construtora =
        construtorasSalvas.find((c) => String(c.id) === String(contextoNavegacao.construtoraId || contextoNavegacao.id)) ||
        construtorasSalvas.find((c) => String(c.nome || "") === String(contextoNavegacao.construtoraNome || ""));

      const formulario = criarFormularioObra();

      if (construtora) {
        setNovaObra({
          ...formulario,
          construtora: construtora.nome || "",
          construtoraId: construtora.id || "",
        });
      } else {
        setNovaObra(formulario);
      }

      setRetornarParaUnificada(true);
      setDestinoRetorno({
        pagina: contextoNavegacao.retornarPara || "construtorasobras",
        visualizacao: contextoNavegacao.visualizacaoRetorno || "gestao",
      });
      alvoRolagemRef.current = "nova";
      deveRolarFormularioRef.current = true;
      setDestacarFormulario(true);
      limparContextoNavegacao?.();
      return;
    }

    if (contextoNavegacao.acao !== "editar-obra") return;

    const obra = obrasSalvas.find((item) => String(item.id) === String(contextoNavegacao.obraId || contextoNavegacao.id));

    if (obra) {
      setEditandoId(obra.id);
      setCamposTabelaEmEdicao({});
      setObraEditada({
        ...criarFormularioObra(obra),
        tabelaComercial: obra.tabelaComercial || null,
      });
      setRetornarParaUnificada(true);
      setDestinoRetorno({
        pagina: contextoNavegacao.retornarPara || "construtorasobras",
        visualizacao: contextoNavegacao.visualizacaoRetorno || "gestao",
      });
      alvoRolagemRef.current = "edicao";
      deveRolarFormularioRef.current = true;
      setDestacarFormulario(true);
    }

    limparContextoNavegacao?.();
  }, [contextoNavegacao, construtoras, dadosCarregados, obras]);

  useEffect(() => {
    if (!deveRolarFormularioRef.current) return;

    const formulario =
      alvoRolagemRef.current === "nova"
        ? formularioNovaObraRef.current
        : formularioEdicaoRef.current;

    if (!formulario) return;

    deveRolarFormularioRef.current = false;

    requestAnimationFrame(() => {
      formulario.scrollIntoView({
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
  }, [destacarFormulario, editandoId, novaObra.construtora]);

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

  const construtorasOrdenadas = useMemo(
    () =>
      [...construtoras].sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" })
      ),
    [construtoras]
  );

  const obrasOrdenadas = useMemo(
    () =>
      [...obras].sort((a, b) => {
        const porConstrutora = String(a.construtora || "").localeCompare(String(b.construtora || ""), "pt-BR", { sensitivity: "base" });
        if (porConstrutora !== 0) return porConstrutora;
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" });
      }),
    [obras]
  );

  const obterConstrutoraPorNome = (nomeConstrutora) =>
    construtoras.find((c) => String(c.nome || "") === String(nomeConstrutora || ""));

  const atualizarConstrutoraFormulario = (formulario, setFormulario, nomeConstrutora) => {
    const construtora = obterConstrutoraPorNome(nomeConstrutora);
    setFormulario({
      ...formulario,
      construtora: nomeConstrutora,
      construtoraId: construtora?.id || "",
    });
  };

  const copiarTabelaComercialDaConstrutora = (nomeConstrutora) => {
    const construtora = obterConstrutoraPorNome(nomeConstrutora);
    const tabelaPadraoSalva = JSON.parse(localStorage.getItem("tabelaComercialPadrao") || "null");
    const tabelaPadrao = normalizarTabelaComercial(tabelaPadraoSalva || tabelaComercialInicial);
    const tabelaOrigem = construtora?.tabelaComercial || tabelaPadrao;

    return {
      origem: "construtora",
      construtoraId: construtora?.id || null,
      atualizadoEm: new Date().toISOString(),
      servicos: { ...tabelaPadrao.servicos, ...(tabelaOrigem.servicos || {}) },
      locacoes: { ...tabelaPadrao.locacoes, ...(tabelaOrigem.locacoes || {}) },
    };
  };

  const normalizarTabelaComercial = (tabela = {}) => ({
    ...tabela,
    servicos: {
      ...tabelaComercialInicial.servicos,
      ...(tabela.servicos || {}),
    },
    locacoes: {
      ...tabelaComercialInicial.locacoes,
      ...(tabela.locacoes || {}),
    },
  });

  const obterChaveCampoTabela = (grupo, chave) => `${grupo}:${chave}`;

  const atualizarValorTabelaObra = (grupo, chave, valor) => {
    const numero = converterMoedaParaNumero(valor);
    if (numero === null) return;

    setObraEditada((obraAtual) => {
      const tabelaAtual =
        obraAtual.tabelaComercial ||
        copiarTabelaComercialDaConstrutora(obraAtual.construtora);

      return {
        ...obraAtual,
        tabelaComercial: {
          ...tabelaAtual,
          atualizadoEm: new Date().toISOString(),
          [grupo]: {
            ...normalizarTabelaComercial(tabelaAtual)[grupo],
            [chave]: numero,
          },
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
    atualizarValorTabelaObra(grupo, chave, camposTabelaEmEdicao[chaveCampo]);
    setCamposTabelaEmEdicao((atuais) => {
      const novos = { ...atuais };
      delete novos[chaveCampo];
      return novos;
    });
  };

  const normalizarTabelaParaSalvar = (tabela) => ({
    ...normalizarTabelaComercial(tabela),
    servicos: normalizarValoresMonetarios(normalizarTabelaComercial(tabela).servicos),
    locacoes: normalizarValoresMonetarios(normalizarTabelaComercial(tabela).locacoes),
  });

  const renderCamposTabela = (grupo) => {
    const tabela = normalizarTabelaComercial(
      obraEditada?.tabelaComercial ||
      copiarTabelaComercialDaConstrutora(obraEditada?.construtora)
    );

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

  const atualizarContato = (formulario, setFormulario, indice, campo, valor) => {
    const contatos = [...(formulario.contatos || [])];
    contatos[indice] = { ...contatos[indice], [campo]: valor };
    setFormulario({ ...formulario, contatos });
  };

  const adicionarContato = (formulario, setFormulario) => {
    setFormulario({
      ...formulario,
      contatos: [...(formulario.contatos || []), criarContato()],
    });
  };

  const removerContato = (formulario, setFormulario, indice) => {
    setFormulario({
      ...formulario,
      contatos: (formulario.contatos || []).filter((_, atual) => atual !== indice),
    });
  };

  const renderContatos = (formulario, setFormulario) => (
    <Bloco titulo="Responsaveis e contatos">
      <Campo label="Responsavel principal" value={formulario.responsavel} onChange={(valor) => setFormulario({ ...formulario, responsavel: valor })} />
      <Campo label="Cargo do responsavel" value={formulario.cargoResponsavel} onChange={(valor) => setFormulario({ ...formulario, cargoResponsavel: valor })} />
      <Campo label="Telefone principal" value={formulario.telefone} onChange={(valor) => setFormulario({ ...formulario, telefone: valor })} />
      <Campo label="WhatsApp principal" value={formulario.whatsapp} onChange={(valor) => setFormulario({ ...formulario, whatsapp: valor })} />
      <Campo label="E-mail principal" type="email" value={formulario.email} onChange={(valor) => setFormulario({ ...formulario, email: valor })} className="md:col-span-2" />

      <div className="space-y-3 md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">Contatos adicionais</h4>
          <button
            type="button"
            onClick={() => adicionarContato(formulario, setFormulario)}
            className="rounded border bg-white px-3 py-1 text-sm text-blue-600"
          >
            Adicionar contato
          </button>
        </div>

        {(formulario.contatos || []).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum contato adicional cadastrado.</p>
        ) : (
          formulario.contatos.map((contato, indice) => (
            <div key={contato.id || indice} className="rounded border bg-white p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Campo label="Tipo" value={contato.tipo} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "tipo", valor)} />
                <Campo label="Nome" value={contato.nome} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "nome", valor)} />
                <Campo label="Cargo" value={contato.cargo} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "cargo", valor)} />
                <Campo label="CREA" value={contato.crea} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "crea", valor)} />
                <Campo label="Telefone" value={contato.telefone} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "telefone", valor)} />
                <Campo label="WhatsApp" value={contato.whatsapp} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "whatsapp", valor)} />
                <Campo label="E-mail" type="email" value={contato.email} onChange={(valor) => atualizarContato(formulario, setFormulario, indice, "email", valor)} />
                <div className="flex flex-wrap items-center gap-3 pt-6 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contato.principal === true}
                      onChange={(e) => atualizarContato(formulario, setFormulario, indice, "principal", e.target.checked)}
                    />
                    Principal
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contato.ativo !== false}
                      onChange={(e) => atualizarContato(formulario, setFormulario, indice, "ativo", e.target.checked)}
                    />
                    Ativo
                  </label>
                  <button
                    type="button"
                    onClick={() => removerContato(formulario, setFormulario, indice)}
                    className="text-red-600 underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Bloco>
  );

  const renderFormularioObra = (formulario, setFormulario) => (
    <div className="space-y-3">
      <Bloco titulo="Identificacao">
        <label className="block text-sm font-medium">
          Construtora
          <select
            value={formulario.construtora}
            onChange={(e) => atualizarConstrutoraFormulario(formulario, setFormulario, e.target.value)}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="">Construtora</option>
            {construtorasOrdenadas.map((c) => (
              <option key={c.id || c.nome} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </label>
        <Campo label="Nome da obra" value={formulario.nome} onChange={(valor) => setFormulario({ ...formulario, nome: valor })} />
        <Campo label="CNPJ da obra" value={formulario.cnpj} onChange={(valor) => setFormulario({ ...formulario, cnpj: valor })} />
        <Campo label="CNO" value={formulario.cno} onChange={(valor) => setFormulario({ ...formulario, cno: valor })} />
        <Campo label="Codigo interno" value={formulario.codigoInterno} onChange={(valor) => setFormulario({ ...formulario, codigoInterno: valor })} />
        <label className="block text-sm font-medium">
          Situacao
          <select
            value={formulario.situacao || "Ativa"}
            onChange={(e) => setFormulario({ ...formulario, situacao: e.target.value })}
            className="mt-1 w-full rounded border p-2"
          >
            {situacoesObra.map((situacao) => (
              <option key={situacao} value={situacao}>{situacao}</option>
            ))}
          </select>
        </label>
      </Bloco>

      <Bloco titulo="Endereco">
        <Campo label="CEP" value={formulario.cep} onChange={(valor) => setFormulario({ ...formulario, cep: valor })} />
        <Campo label="Logradouro" value={formulario.logradouro} onChange={(valor) => setFormulario({ ...formulario, logradouro: valor })} />
        <Campo label="Numero" value={formulario.numero} onChange={(valor) => setFormulario({ ...formulario, numero: valor })} />
        <Campo label="Complemento" value={formulario.complemento} onChange={(valor) => setFormulario({ ...formulario, complemento: valor })} />
        <Campo label="Bairro" value={formulario.bairro} onChange={(valor) => setFormulario({ ...formulario, bairro: valor })} />
        <Campo label="Cidade" value={formulario.cidade} onChange={(valor) => setFormulario({ ...formulario, cidade: valor })} />
        <Campo label="Estado" value={formulario.estado} onChange={(valor) => setFormulario({ ...formulario, estado: valor })} />
        <Campo label="Ponto de referencia" value={formulario.pontoReferencia} onChange={(valor) => setFormulario({ ...formulario, pontoReferencia: valor })} />
        <Campo label="Endereco" value={formulario.endereco} onChange={(valor) => setFormulario({ ...formulario, endereco: valor })} className="md:col-span-2" />
      </Bloco>

      {renderContatos(formulario, setFormulario)}

      <Bloco titulo="Operacao">
        <Campo label="Engenheiro responsavel" value={formulario.engenheiro} onChange={(valor) => setFormulario({ ...formulario, engenheiro: valor })} />
        <Campo label="Horario de entrega" value={formulario.horarioEntrega} onChange={(valor) => setFormulario({ ...formulario, horarioEntrega: valor })} />
        <label className="block text-sm font-medium md:col-span-2">
          Orientacoes de acesso
          <textarea
            value={formulario.orientacoesAcesso || ""}
            onChange={(e) => setFormulario({ ...formulario, orientacoesAcesso: e.target.value })}
            className="mt-1 w-full rounded border p-2"
            rows={2}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input
            type="checkbox"
            checked={formulario.enderecoEntregaDiferente === true}
            onChange={(e) => setFormulario({ ...formulario, enderecoEntregaDiferente: e.target.checked })}
          />
          Endereco de entrega diferente
        </label>
        {formulario.enderecoEntregaDiferente && (
          <label className="block text-sm font-medium md:col-span-2">
            Endereco de entrega
            <textarea
              value={formulario.enderecoEntrega || ""}
              onChange={(e) => setFormulario({ ...formulario, enderecoEntrega: e.target.value })}
              className="mt-1 w-full rounded border p-2"
              rows={2}
            />
          </label>
        )}
        <label className="block text-sm font-medium md:col-span-2">
          Observacoes
          <textarea
            value={formulario.observacoes || ""}
            onChange={(e) => setFormulario({ ...formulario, observacoes: e.target.value })}
            className="mt-1 w-full rounded border p-2"
            rows={3}
          />
        </label>
      </Bloco>

      <div className="rounded border bg-gray-50 p-3">
        <h3 className="text-sm font-semibold">Contratos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Area reservada para historico e dados contratuais da obra. O armazenamento sera implementado em etapa futura.
        </p>
      </div>
    </div>
  );

  const salvar = () => {
    const dados = prepararObraParaSalvar(novaObra);
    if (!dados.nome || !dados.construtora) return;

    const construtora = obterConstrutoraPorNome(dados.construtora);
    const nova = {
      ...dados,
      construtoraId: construtora?.id || dados.construtoraId || "",
      id: Date.now(),
      tabelaComercial: copiarTabelaComercialDaConstrutora(dados.construtora),
    };

    const atualizadas = [...obras, nova];
    setObras(atualizadas);
    localStorage.setItem("obras", JSON.stringify(atualizadas));
    setNovaObra(criarFormularioObra());

    if (retornarParaUnificada) {
      navegar?.(destinoRetorno.pagina, { visualizacao: destinoRetorno.visualizacao });
    }
  };

  const iniciarEdicao = (obra) => {
    setEditandoId(obra.id);
    setCamposTabelaEmEdicao({});
    setObraEditada({
      ...criarFormularioObra(obra),
      tabelaComercial:
        obra.tabelaComercial ||
        copiarTabelaComercialDaConstrutora(obra.construtora),
    });
  };

  const salvarEdicao = () => {
    const dados = prepararObraParaSalvar(obraEditada);
    if (!dados.nome || !dados.construtora) return;

    const construtora = obterConstrutoraPorNome(dados.construtora);
    const atualizadas = obras.map((o) =>
      o.id === editandoId
        ? {
            ...o,
            ...dados,
            id: o.id,
            construtoraId: construtora?.id || dados.construtoraId || o.construtoraId || "",
            tabelaComercial:
              normalizarTabelaParaSalvar(
                obraEditada.tabelaComercial ||
                o.tabelaComercial ||
                copiarTabelaComercialDaConstrutora(dados.construtora)
              ),
          }
        : o
    );
    setObras(atualizadas);
    localStorage.setItem("obras", JSON.stringify(atualizadas));
    setEditandoId(null);
    setObraEditada(null);
    setCamposTabelaEmEdicao({});

    if (retornarParaUnificada) {
      navegar?.(destinoRetorno.pagina, { visualizacao: destinoRetorno.visualizacao });
    }
  };

  const excluir = (id) => {
    if (confirm("Deseja realmente excluir esta obra?")) {
      const atualizadas = obras.filter((o) => o.id !== id);
      setObras(atualizadas);
      localStorage.setItem("obras", JSON.stringify(atualizadas));
      setEditandoId(null);
      setCamposTabelaEmEdicao({});
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Obras</h2>

      {!(retornarParaUnificada && editandoId !== null) && (
        <div
          ref={formularioNovaObraRef}
          onMouseDown={removerDestaqueFormulario}
          onFocusCapture={removerDestaqueFormulario}
          onTouchStart={removerDestaqueFormulario}
          className={`rounded border bg-white p-3 space-y-3 scroll-mt-24 ${
            destacarFormulario && alvoRolagemRef.current === "nova" ? classeFormularioDestacado : "transition-[outline,box-shadow,background-color] duration-200"
          }`}
        >
          <h3 className="font-semibold">Nova Obra</h3>
          {renderFormularioObra(novaObra, setNovaObra)}
          <button onClick={salvar} className="bg-blue-600 text-white px-4 py-2 rounded">
            Salvar
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {obrasOrdenadas.map((obra) => (
          <li key={obra.id} className="border p-3 rounded space-y-2 bg-white shadow-sm">
            {editandoId === obra.id ? (
              <div
                ref={formularioEdicaoRef}
                onMouseDown={removerDestaqueFormulario}
                onFocusCapture={removerDestaqueFormulario}
                onTouchStart={removerDestaqueFormulario}
                className={`space-y-3 rounded-lg scroll-mt-24 ${
                  destacarFormulario && alvoRolagemRef.current === "edicao" ? classeFormularioDestacado : "transition-[outline,box-shadow,background-color] duration-200"
                }`}
              >
                {obraEditada && renderFormularioObra(obraEditada, setObraEditada)}
                <div className="border rounded p-3 space-y-4 bg-gray-50">
                  <h3 className="font-semibold">Tabela Comercial da Obra</h3>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Servicos</h4>
                    {renderCamposTabela("servicos")}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Locacoes</h4>
                    {renderCamposTabela("locacoes")}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={salvarEdicao} className="text-green-600 text-sm underline">Salvar</button>
                  <button onClick={() => excluir(obra.id)} className="text-red-600 text-sm underline">Excluir</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-3">
                <div>
                  <strong>{obra.nome}</strong> <small className="text-gray-500">({obra.construtora})</small>
                  <br />
                  <span className="text-sm text-gray-600">Situacao: {obra.situacao || "Ativa"}</span>
                  <br />
                  <span className="text-sm text-gray-600">Responsavel: {obra.responsavel || obra.engenheiro || "—"}</span>
                  <br />
                  <span className="text-sm text-gray-600">Endereco: {obra.logradouro || obra.endereco || "—"}</span>
                  {obra.observacoes && (
                    <>
                      <br />
                      <span className="text-sm text-gray-600">Obs: {obra.observacoes}</span>
                    </>
                  )}
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
