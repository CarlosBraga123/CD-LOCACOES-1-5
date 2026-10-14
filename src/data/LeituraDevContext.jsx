import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useAuth} from '../auth/AuthContext';
import {supabase} from '../supabase';
import {criarAtividadeSupabaseRepository,criarTransporteCadastroRpc} from '../repositories/atividadeSupabaseRepository';
import {chaveSessaoLeitura,criarLeituraCompartilhadaDev} from '../repositories/leituraCompartilhadaDev';

const Context = createContext(null);
export function LeituraDevProvider({children}) {
  const auth = useAuth();
  const current = useRef(auth); current.current = auth;
  const service = useMemo(() => {
    const repository = criarAtividadeSupabaseRepository(supabase, {
      contextoAtual:()=>current.current, transporteCadastro:criarTransporteCadastroRpc(supabase),
    });
    return criarLeituraCompartilhadaDev(repository,()=>current.current);
  },[]);
  const [state,setState] = useState(service.getState);
  const key = chaveSessaoLeitura(auth);
  const publishedKey = useRef(key);
  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    setState(service.getState());
    return () => {unsubscribe();service.cancelar();};
  },[service]);
  useEffect(() => {service.sincronizarSessao();publishedKey.current=key;setState(service.getState());},[service,key]);
  // Nunca mostrar um snapshot da identidade anterior, nem por um render.
  const visible = key && key===publishedKey.current ? state : {snapshot:null,loading:false,error:'',updated:'',revision:0};
  return <Context.Provider value={{...visible,repository:service.repository,atualizar:service.atualizar,authorized:Boolean(key),scopeKey:key}}>{children}</Context.Provider>;
}
export function useLeituraDev() {
  const value=useContext(Context);
  if(!value) throw new Error('Leitura DEV exige LeituraDevProvider.');
  return value;
}
