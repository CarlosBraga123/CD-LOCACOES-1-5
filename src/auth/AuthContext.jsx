import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { criarControleSessao } from "./authSession";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: "loading", session: null, membership: null, message: "" });
  const [controller, setController] = useState(null);
  useEffect(() => {
    const control = criarControleSessao(supabase);
    const unsubscribe = control.subscribe(setAuth);
    setController(control);
    control.start();
    const refresh = () => navigator.onLine === false ? control.denyOffline() : control.refresh();
    const offline = () => control.denyOffline();
    window.addEventListener("focus", refresh);
    window.addEventListener("offline", offline);
    window.addEventListener("online", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("offline", offline); window.removeEventListener("online", refresh); unsubscribe(); control.stop(); };
  }, []);
  return <AuthContext.Provider value={{ ...auth, login: (email, password) => controller?.login(email, password), logout: () => controller?.logout() }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
