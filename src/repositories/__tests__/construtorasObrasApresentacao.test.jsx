import React,{useState} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {ConstrutorasObrasLocal} from '../../components/ConstrutorasObras';
import {localStorageAdapter} from '../localStorageAdapter';
vi.mock('react',async()=>{
  const actual=await vi.importActual('react');
  return {...actual,useState:vi.fn(actual.useState)};
});
const tabela={servicos:{'Balancinho-Eletrico-Instalação':0},locacoes:{'Balancinho-Eletrico':123.45}};
const c={id:'c',nome:'Construtora sintética',ativa:true,emailFinanceiro:'financeiro@example.invalid',tabelaComercial:tabela};
const o={id:'o',nome:'Obra sintética',construtoraId:'c',construtora:c.nome,situacao:'Ativa',cep:'00000-000',logradouro:'Rua fictícia',numero:'1',contatos:[{id:'ct',tipo:'Engenheiro',nome:'Contato sintético',ativo:true,principal:true}],tabelaComercial:tabela};
const atividade={id:'a',obraId:'o',equipamento:'Balancinho',tipoBalancinho:'Eletrico',servico:'Instalação',quantidade:1,dataLiberacao:'2026-10-14',iniciaLocacao:true};
const dados={construtoras:[c],obras:[o],atividades:[atividade]};
function remote(estadoInicial={}) {return renderToStaticMarkup(<ConstrutorasObrasLocal dadosRemotos={dados} estadoInicial={estadoInicial}/>);}
function local(estadoInicial={}) {
  // Apenas injeta as três coleções que o efeito Local carregaria; não muda os helpers.
  useState.mockImplementationOnce(()=>[dados.construtoras,vi.fn()]).mockImplementationOnce(()=>[dados.obras,vi.fn()]).mockImplementationOnce(()=>[dados.atividades,vi.fn()]);
  return renderToStaticMarkup(<ConstrutorasObrasLocal estadoInicial={estadoInicial}/>);
}
const buttons=html=>[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m=>({attrs:m[1],label:m[2].replace(/<[^>]+>/g,'').trim()}));
afterEach(()=>{vi.restoreAllMocks();useState.mockClear();});
describe('apresentação original compartilhada Local/DEV',()=>{
  it('Gestão fechada tem o mesmo HTML Local, salvo disabled nos botões de escrita',()=>{
    const estado={visualizacao:'gestao'};
    expect(remote(estado).replaceAll(' disabled=""','')).toBe(local(estado));
  });
  it('compartilha cards, botões de expansão e classes responsivas originais',()=>{
    const output=remote({visualizacao:'gestao',construtoraId:'c',obraId:'o'});
    expect(output).not.toContain('<details');expect(output).not.toContain('<summary');
    expect(output).toContain('lg:flex-row lg:items-start lg:justify-between');
    expect(output).toContain('sm:flex-row sm:items-center sm:justify-between');
    expect(output).toContain('lg:grid-cols-3');expect(output).toContain('Recolher');
    for(const label of ['Nova Construtora','Nova Obra','Editar Construtora','Nova Obra nesta Construtora','Editar','Nova Atividade','Editar Obra']) {
      const selected=buttons(output).filter(b=>b.label===label);expect(selected.length).toBeGreaterThan(0);expect(selected.every(b=>b.attrs.includes('disabled'))).toBe(true);
    }
    expect(buttons(output).filter(b=>b.label==='Consultar cadastro').every(b=>!b.attrs.includes('disabled'))).toBe(true);
  });
  it.each(['ativos','gestao','detalhes'])('aba %s não consulta nem escreve no armazenamento local',visualizacao=>{
    const read=vi.spyOn(localStorageAdapter,'lerJson').mockImplementation(()=>{throw Error('local proibido');});
    const write=vi.spyOn(localStorageAdapter,'escreverJson').mockImplementation(()=>{throw Error('escrita proibida');});
    const output=remote({visualizacao,construtoraId:'c',obraId:'o',detalheId:'o'});
    expect(output).toContain('Obra sintética');expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
    if(visualizacao==='detalhes') {expect(output).toContain('Responsaveis e contatos');expect(output).toContain('Contato sintético');expect(output).toContain('Indisponível nesta tela DEV');}
  });
  it('consulta da construtora usa os mesmos campos e grades comerciais, sem preços padrão',()=>{
    const output=remote({visualizacao:'gestao',construtoraConsulta:c});
    expect(output).toContain('Nome curto');expect(output).toContain('Comercial e financeiro');expect(output).toContain('Tabela Comercial da Construtora');
    expect(output).toContain('grid grid-cols-1 gap-3 md:grid-cols-2');expect(output).toContain('123,45');expect(output).not.toContain('Mini Grua-500kg');
    expect(buttons(output).find(b=>b.label==='Salvar').attrs).toContain('disabled');
  });
  it('consulta da obra mantém contatos, endereço, condições de entrega e tabela original',()=>{
    const output=remote({visualizacao:'gestao',obraConsulta:{...o,enderecoEntregaDiferente:true,enderecoEntrega:'Entrega sintética'}});
    expect(output).toContain('Contatos adicionais');expect(output).toContain('Entrega sintética');expect(output).toContain('Tabela Comercial da Obra');expect(output).toContain('<fieldset disabled=""');
  });
  it('não fabrica preço ou situação ausentes',()=>{
    const output=remote({visualizacao:'gestao',obraConsulta:{...o,situacao:null,tabelaComercial:null}});
    expect(output).toContain('Não informada');expect(output).toContain('Tabela comercial indisponível');expect(output).not.toContain('1.200,00');
    const nullPrice=remote({visualizacao:'gestao',obraConsulta:{...o,tabelaComercial:{servicos:{ausente:null},locacoes:{}}}});
    expect(nullPrice).toContain('value="Não informado"');
    expect(remote({visualizacao:'gestao',obraConsulta:{...o,situacao:'Situação legada'}})).toContain('Situação legada</option>');
  });
});
