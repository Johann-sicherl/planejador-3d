"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

const links = [
  { href: "/dashboard", titulo: "Dashboard", descricao: "Métricas reais do sistema." },
  { href: "/clientes", titulo: "Clientes", descricao: "Cadastro e consulta de clientes." },
  { href: "/filamentos", titulo: "Filamentos", descricao: "Cadastro de filamentos." },
  { href: "/estoque", titulo: "Estoque", descricao: "Controle de estoque em gramas." },
  { href: "/componentes", titulo: "Componentes", descricao: "Cadastro de componentes STL." },
  { href: "/arquivos-3mf", titulo: "Arquivos 3MF", descricao: "Vinculação de arquivos 3MF aos componentes." },
  { href: "/impressoras", titulo: "Impressoras", descricao: "Cadastro e disponibilidade das impressoras." },
  { href: "/pedidos", titulo: "Pedidos", descricao: "Abertura e consulta de pedidos." },
  { href: "/plano-producao", titulo: "Plano de Produção", descricao: "Planejamento de produção por pedido." },
  { href: "/execucoes", titulo: "Execuções", descricao: "Fila e execução real das impressões." },
  { href: "/falhas", titulo: "Falhas", descricao: "Registro de falhas de produção." },
  { href: "/cotacoes", titulo: "Cotações", descricao: "Cadastro de cotações por componente e impressora." },
];

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Planejador de Impressão 3D</h1>
            <p className="mt-2 text-zinc-800">Sistema web conectado ao Supabase, usando as tabelas e colunas do seu banco.</p>
          </div>
          <div className="flex gap-2">
            {email ? (
              <>
                <div className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm">{email}</div>
                <button onClick={sair} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">Sair</button>
              </>
            ) : (
              <>
                <a href="/login" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">Login</a>
                <a href="/cadastro" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">Cadastro</a>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <h2 className="text-lg font-semibold text-black">{link.titulo}</h2>
              <p className="mt-2 text-sm text-zinc-800">{link.descricao}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
