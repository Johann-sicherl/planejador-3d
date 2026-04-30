"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Database,
  Factory,
  FileText,
  Gauge,
  Layers3,
  LogIn,
  LogOut,
  Package,
  Printer,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type HomeLink = {
  href: string;
  titulo: string;
  descricao: string;
  icon: React.ElementType;
  destaque?: boolean;
};

const links: HomeLink[] = [
  {
    href: "/dashboard",
    titulo: "Dashboard",
    descricao: "Métricas reais do sistema, produção, pedidos e estoque.",
    icon: Gauge,
    destaque: true,
  },
  {
    href: "/plano-producao",
    titulo: "Plano de Produção",
    descricao: "Fila visual por cards, programação e acompanhamento por status.",
    icon: Factory,
    destaque: true,
  },
  {
    href: "/pedidos",
    titulo: "Pedidos",
    descricao: "Abertura, consulta e controle dos pedidos dos clientes.",
    icon: ClipboardList,
    destaque: true,
  },
  {
    href: "/execucoes",
    titulo: "Execuções",
    descricao: "Controle operacional das impressões e andamento real.",
    icon: Printer,
  },
  {
    href: "/estoque",
    titulo: "Estoque",
    descricao: "Controle de material, consumo, saldo e movimentações.",
    icon: Boxes,
  },
  {
    href: "/clientes",
    titulo: "Clientes",
    descricao: "Cadastro e consulta da base de clientes.",
    icon: Users,
  },
  {
    href: "/componentes",
    titulo: "Componentes",
    descricao: "Cadastro técnico de componentes STL e itens fabricáveis.",
    icon: Package,
  },
  {
    href: "/filamentos",
    titulo: "Filamentos",
    descricao: "Cadastro de materiais, cores e propriedades de filamento.",
    icon: Layers3,
  },
  {
    href: "/arquivos-3mf",
    titulo: "Arquivos 3MF",
    descricao: "Vinculação dos arquivos de impressão aos componentes.",
    icon: FileText,
  },
  {
    href: "/impressoras",
    titulo: "Impressoras",
    descricao: "Cadastro, disponibilidade e capacidade produtiva.",
    icon: Printer,
  },
  {
    href: "/falhas",
    titulo: "Falhas",
    descricao: "Registro e rastreabilidade das falhas de produção.",
    icon: TriangleAlert,
  },
  {
    href: "/cotacoes",
    titulo: "Cotações",
    descricao: "Estimativas comerciais por componente, impressora e material.",
    icon: BarChart3,
  },
];

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const principais = useMemo(() => links.filter((link) => link.destaque), []);
  const modulos = useMemo(() => links.filter((link) => !link.destaque), []);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-14rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col px-5 py-6">
        <header className="mb-10 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-cyan-500/30">
              <Database className="h-7 w-7 text-white" />
            </div>

            <div>
              <p className="text-lg font-black tracking-tight text-white md:text-xl">
                Controle Principal J_ao_Cubo_3d
              </p>
              <p className="text-xs font-medium text-slate-400">
                Central de manufatura aditiva
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {ready && email ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
                  <span className="text-slate-500">Usuário:</span>{" "}
                  <span className="font-semibold text-white">{email}</span>
                </div>

                <button
                  onClick={sair}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>

                <Link
                  href="/cadastro"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
                >
                  <UserPlus className="h-4 w-4" />
                  Cadastro
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-6 xl:grid-cols-[1.05fr_1.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
              <Sparkles className="h-4 w-4" />
              Painel principal
            </div>

            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl">
              Controle inteligente da produção 3D.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Acesse rapidamente pedidos, plano de produção, estoque, execução,
              falhas, componentes e cotações em uma interface única, moderna e
              orientada à operação.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <ResumoCard titulo="Módulos" valor={String(links.length)} />
              <ResumoCard titulo="Ambiente" valor="Online" />
              <ResumoCard titulo="Interface" valor="Dark Pro" />
            </div>

            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-black text-emerald-200">
                    Sistema conectado ao Supabase
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                    Esta página é apenas a central de navegação. Os dados reais
                    continuam sendo carregados dentro de cada módulo pelas APIs
                    existentes do projeto.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
                    Acesso rápido
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Módulos principais
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {principais.map((link) => (
                  <ModuloCard key={link.href} link={link} principal />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
                  Operação
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Todos os módulos
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modulos.map((link) => (
                  <ModuloCard key={link.href} link={link} />
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs font-semibold text-slate-400">{titulo}</p>
      <p className="mt-2 text-2xl font-black text-white">{valor}</p>
    </div>
  );
}

function ModuloCard({
  link,
  principal = false,
}: {
  link: HomeLink;
  principal?: boolean;
}) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className={[
        "group relative overflow-hidden rounded-3xl border p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition",
        "hover:-translate-y-1 hover:shadow-2xl",
        principal
          ? "border-cyan-400/30 bg-cyan-400/10 hover:shadow-cyan-500/20"
          : "border-white/10 bg-white/[0.045] hover:border-violet-400/40 hover:shadow-violet-500/10",
      ].join(" ")}
    >
      <div className="absolute right-[-3rem] top-[-3rem] h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition group-hover:bg-violet-500/20" />

      <div className="relative">
        <div
          className={[
            "mb-5 grid h-12 w-12 place-items-center rounded-2xl",
            principal
              ? "bg-gradient-to-br from-cyan-400 to-violet-600 text-white"
              : "bg-white/10 text-cyan-300",
          ].join(" ")}
        >
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-black text-white">{link.titulo}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
          {link.descricao}
        </p>

        <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-bold text-slate-300 transition group-hover:border-cyan-400/30 group-hover:text-cyan-300">
          Abrir módulo
        </div>
      </div>
    </Link>
  );
}
