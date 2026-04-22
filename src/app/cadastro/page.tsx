"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CadastroPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setCarregando(true);
      setErro("");
      setMensagem("");
      if (senha !== confirmacao) throw new Error("As senhas não coincidem.");
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) throw error;
      setMensagem("Usuário cadastrado com sucesso. Agora faça login.");
      setEmail(""); setSenha(""); setConfirmacao("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar usuário.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-black">Cadastro de usuário</h1>
        <p className="mt-2 text-sm text-zinc-800">Crie um usuário com email e senha.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Seu email" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Sua senha" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Confirmar senha</label>
            <input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Repita a senha" required />
          </div>

          {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
          {mensagem && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{mensagem}</div>}

          <button type="submit" disabled={carregando} className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>

          <a href="/login" className="block text-center text-sm underline">Voltar para login</a>
        </form>
      </div>
    </main>
  );
}
