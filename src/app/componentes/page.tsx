"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ActionButtons,
  Feedback,
  getJson,
  LoadingOrEmpty,
  NumberOrBlank,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Registro = Record<string, any>;

type OptionsData = {
  filamentos?: Registro[];
};

type CampoFilamento = {
  idx: number;
  idFilamento: string;
  setIdFilamento: (value: string) => void;
  gramas: string;
  setGramas: (value: string) => void;
};

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function montarLabelFilamento(item: Registro | undefined) {
  if (!item) return "";

  const nome = texto(item.nome_filamento) || texto(item.nome) || texto(item.descricao);
  const material = texto(item.material_filamento) || texto(item.material);
  const fabricante =
    texto(item.nome_fabricante) ||
    texto(item.fabricante_filamento) ||
    texto(item.fabricante) ||
    texto(item.cadastro_fabricantes_filamentos?.nome_fabricante) ||
    texto(item.cadastro_fabricantes_filamentos?.fabricante);
  const cor = texto(item.cor_filamento) || texto(item.cor);

  const partes = [nome, material, fabricante, cor].filter(Boolean);

  if (partes.length === 0) {
    return `Filamento ${texto(item.id_filamento) || "sem identificação"}`;
  }

  return partes.join(" • ");
}

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/componentes");

  const [options, setOptions] = useState<OptionsData | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nome_componente, setNomeComponente] = useState("");

  const [id_filamento1, setIdFilamento1] = useState("");
  const [id_filamento2, setIdFilamento2] = useState("");
  const [id_filamento3, setIdFilamento3] = useState("");
  const [id_filamento4, setIdFilamento4] = useState("");
  const [id_filamento5, setIdFilamento5] = useState("");
  const [id_filamento6, setIdFilamento6] = useState("");
  const [id_filamento7, setIdFilamento7] = useState("");
  const [id_filamento8, setIdFilamento8] = useState("");

  const [gramas_filamento_1, setGramas1] = useState("");
  const [gramas_filamento_2, setGramas2] = useState("");
  const [gramas_filamento_3, setGramas3] = useState("");
  const [gramas_filamento_4, setGramas4] = useState("");
  const [gramas_filamento_5, setGramas5] = useState("");
  const [gramas_filamento_6, setGramas6] = useState("");
  const [gramas_filamento_7, setGramas7] = useState("");
  const [gramas_filamento_8, setGramas8] = useState("");

  useEffect(() => {
    getJson<OptionsData>("/api/options")
      .then((r) => setOptions(r[0] || null))
      .catch(() => {});
  }, []);

  const filamentosDisponiveis = useMemo(() => options?.filamentos || [], [options]);

  const filamentoPorId = useMemo(() => {
    const mapa = new Map<string, Registro>();

    for (const item of filamentosDisponiveis) {
      mapa.set(String(item.id_filamento ?? ""), item);
    }

    return mapa;
  }, [filamentosDisponiveis]);

  function labelFilamentoPorId(id: unknown) {
    const chave = texto(id);
    if (!chave) return "";
    return montarLabelFilamento(filamentoPorId.get(chave)) || chave;
  }

  function resetForm() {
    setEditingId(null);
    setNomeComponente("");

    setIdFilamento1("");
    setIdFilamento2("");
    setIdFilamento3("");
    setIdFilamento4("");
    setIdFilamento5("");
    setIdFilamento6("");
    setIdFilamento7("");
    setIdFilamento8("");

    setGramas1("");
    setGramas2("");
    setGramas3("");
    setGramas4("");
    setGramas5("");
    setGramas6("");
    setGramas7("");
    setGramas8("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row.id_componente_stl ?? ""));
    setNomeComponente(String(row.nome_componente ?? ""));

    setIdFilamento1(String(row.id_filamento1 ?? ""));
    setIdFilamento2(String(row.id_filamento2 ?? ""));
    setIdFilamento3(String(row.id_filamento3 ?? ""));
    setIdFilamento4(String(row.id_filamento4 ?? ""));
    setIdFilamento5(String(row.id_filamento5 ?? ""));
    setIdFilamento6(String(row.id_filamento6 ?? ""));
    setIdFilamento7(String(row.id_filamento7 ?? ""));
    setIdFilamento8(String(row.id_filamento8 ?? ""));

    setGramas1(String(row.gramas_filamento_1 ?? ""));
    setGramas2(String(row.gramas_filamento_2 ?? ""));
    setGramas3(String(row.gramas_filamento_3 ?? ""));
    setGramas4(String(row.gramas_filamento_4 ?? ""));
    setGramas5(String(row.gramas_filamento_5 ?? ""));
    setGramas6(String(row.gramas_filamento_6 ?? ""));
    setGramas7(String(row.gramas_filamento_7 ?? ""));
    setGramas8(String(row.gramas_filamento_8 ?? ""));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      setErro("");
      setMensagem("");

      const response = await fetch("/api/componentes?id=" + id, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao excluir.");
      }

      setMensagem("Registro excluído com sucesso.");
      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const payload: Registro = {
        nome_componente,
        id_filamento1: id_filamento1 === "" ? null : Number(id_filamento1),
        id_filamento2: id_filamento2 === "" ? null : Number(id_filamento2),
        id_filamento3: id_filamento3 === "" ? null : Number(id_filamento3),
        id_filamento4: id_filamento4 === "" ? null : Number(id_filamento4),
        id_filamento5: id_filamento5 === "" ? null : Number(id_filamento5),
        id_filamento6: id_filamento6 === "" ? null : Number(id_filamento6),
        id_filamento7: id_filamento7 === "" ? null : Number(id_filamento7),
        id_filamento8: id_filamento8 === "" ? null : Number(id_filamento8),
        gramas_filamento_1: NumberOrBlank(gramas_filamento_1),
        gramas_filamento_2: NumberOrBlank(gramas_filamento_2),
        gramas_filamento_3: NumberOrBlank(gramas_filamento_3),
        gramas_filamento_4: NumberOrBlank(gramas_filamento_4),
        gramas_filamento_5: NumberOrBlank(gramas_filamento_5),
        gramas_filamento_6: NumberOrBlank(gramas_filamento_6),
        gramas_filamento_7: NumberOrBlank(gramas_filamento_7),
        gramas_filamento_8: NumberOrBlank(gramas_filamento_8),
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_componente_stl = Number(editingId);

      const response = await fetch("/api/componentes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Erro ao salvar.");
      }

      setMensagem(editingId ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
      resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!ready) return <div>Carregando...</div>;

  const filamentos: CampoFilamento[] = [
    { idx: 1, idFilamento: id_filamento1, setIdFilamento: setIdFilamento1, gramas: gramas_filamento_1, setGramas: setGramas1 },
    { idx: 2, idFilamento: id_filamento2, setIdFilamento: setIdFilamento2, gramas: gramas_filamento_2, setGramas: setGramas2 },
    { idx: 3, idFilamento: id_filamento3, setIdFilamento: setIdFilamento3, gramas: gramas_filamento_3, setGramas: setGramas3 },
    { idx: 4, idFilamento: id_filamento4, setIdFilamento: setIdFilamento4, gramas: gramas_filamento_4, setGramas: setGramas4 },
    { idx: 5, idFilamento: id_filamento5, setIdFilamento: setIdFilamento5, gramas: gramas_filamento_5, setGramas: setGramas5 },
    { idx: 6, idFilamento: id_filamento6, setIdFilamento: setIdFilamento6, gramas: gramas_filamento_6, setGramas: setGramas6 },
    { idx: 7, idFilamento: id_filamento7, setIdFilamento: setIdFilamento7, gramas: gramas_filamento_7, setGramas: setGramas7 },
    { idx: 8, idFilamento: id_filamento8, setIdFilamento: setIdFilamento8, gramas: gramas_filamento_8, setGramas: setGramas8 },
  ];

  return (
    <PageShell
      title="Componentes"
      description="Cadastro de componentes e vinculação dos filamentos utilizados."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl"
      >
        <h2 className="mb-4 text-xl font-black text-white">
          {editingId ? "Editar registro" : "Novo registro"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block md:col-span-2 xl:col-span-4">
            <span className="mb-1 block text-sm font-semibold text-slate-300">Nome do componente</span>
            <input
              value={nome_componente}
              onChange={(e) => setNomeComponente(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
              placeholder="Nome do componente"
              required
            />
          </label>

          {filamentos.map((campo) => (
            <div
              key={campo.idx}
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
            >
              <p className="mb-3 text-sm font-black text-cyan-300">Filamento {campo.idx}</p>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Nome • Material • Fabricante • Cor
                </span>
                <select
                  value={campo.idFilamento}
                  onChange={(e) => campo.setIdFilamento(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Selecione</option>
                  {filamentosDisponiveis.map((item) => (
                    <option key={String(item.id_filamento)} value={String(item.id_filamento)}>
                      {montarLabelFilamento(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Gramas</span>
                <input
                  value={campo.gramas}
                  onChange={(e) => campo.setGramas(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  placeholder={`Gramas Filamento ${campo.idx}`}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            disabled={salvando}
            className="rounded-2xl bg-cyan-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Lista</h2>
          <button
            type="button"
            onClick={reload}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty
          loading={loading}
          empty={data.length === 0}
          loadingText="Carregando componentes..."
          emptyText="Nenhum componente cadastrado."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Filamento 1</th>
                  <th className="px-3 py-3">G1</th>
                  <th className="px-3 py-3">Filamento 2</th>
                  <th className="px-3 py-3">G2</th>
                  <th className="px-3 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={String(row.id_componente_stl)} className="border-b border-white/5 text-slate-200">
                    <td className="px-3 py-3">{row.id_componente_stl ?? ""}</td>
                    <td className="px-3 py-3 font-semibold text-white">{row.nome_componente ?? ""}</td>
                    <td className="px-3 py-3">{labelFilamentoPorId(row.id_filamento1)}</td>
                    <td className="px-3 py-3">{row.gramas_filamento_1 ?? ""}</td>
                    <td className="px-3 py-3">{labelFilamentoPorId(row.id_filamento2)}</td>
                    <td className="px-3 py-3">{row.gramas_filamento_2 ?? ""}</td>
                    <td className="px-3 py-3">
                      <ActionButtons
                        onEdit={() => fillForEdit(row)}
                        onDelete={() => handleDelete(String(row.id_componente_stl ?? ""))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadingOrEmpty>
      </section>
    </PageShell>
  );
}
