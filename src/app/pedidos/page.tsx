"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ActionButtons,
  Feedback,
  getJson,
  LoadingOrEmpty,
  PageShell,
  useAuthGuard,
  useCrudList,
} from "../_shared";

type Registro = Record<string, unknown>;
type OptionItem = Record<string, unknown>;

type OptionsPayload = {
  clientes: OptionItem[];
  arquivos3mf: OptionItem[];
};

function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function labelFrom(row: OptionItem, fields: string[], fallback: string) {
  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
}

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/pedidos");

  const [options, setOptions] = useState<OptionsPayload | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [id_cliente, setId_cliente] = useState("");
  const [id_3mf, setId_3mf] = useState("");
  const [data_solic, setData_solic] = useState("");
  const [data_entrega_prevista, setData_entrega_prevista] = useState("");
  const [data_entrega_realizada, setData_entrega_realizada] = useState("");

  useEffect(() => {
    getJson<OptionsPayload>("/api/options")
      .then((result) => setOptions(result[0] || null))
      .catch(() => {});
  }, []);

  const nomes = useMemo(() => {
    const clientes = new Map<number, string>();
    const arquivos3mf = new Map<number, string>();

    for (const item of options?.clientes || []) {
      clientes.set(
        Number(item.id_cliente),
        labelFrom(item, ["nome_cliente", "cliente", "razao_social", "nome"], "Cliente sem nome")
      );
    }

    for (const item of options?.arquivos3mf || []) {
      arquivos3mf.set(
        Number(item.id_3mf),
        labelFrom(item, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome")
      );
    }

    return { clientes, arquivos3mf };
  }, [options]);

  function resetForm() {
    setEditingId(null);
    setId_cliente("");
    setId_3mf("");
    setData_solic("");
    setData_entrega_prevista("");
    setData_entrega_realizada("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(asText(row.id_pedido));
    setId_cliente(asText(row.id_cliente));
    setId_3mf(asText(row.id_3mf));
    setData_solic(asText(row.data_solic));
    setData_entrega_prevista(asText(row.data_entrega_prevista));
    setData_entrega_realizada(asText(row.data_entrega_realizada));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      setErro("");
      setMensagem("");

      const response = await fetch("/api/pedidos?id=" + id, { method: "DELETE" });
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

      // Correção cirúrgica: pedido não envia id_impressora.
      const payload: Record<string, unknown> = {
        id_cliente: id_cliente === "" ? null : Number(id_cliente),
        id_3mf: id_3mf === "" ? null : Number(id_3mf),
        data_solic: data_solic || null,
        data_entrega_prevista: data_entrega_prevista || null,
        data_entrega_realizada: data_entrega_realizada || null,
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload.id_pedido = Number(editingId);

      const response = await fetch("/api/pedidos", {
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

  return (
    <PageShell
      title="Pedidos"
      description="Cadastre os pedidos comerciais. A impressora será definida somente no Plano de Produção."
    >
      <Feedback erro={erro} mensagem={mensagem} />

      <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-black text-white">
          {editingId ? "Editar registro" : "Novo registro"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Cliente</label>
            <select
              value={id_cliente}
              onChange={(e) => setId_cliente(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
            >
              <option value="">Selecione</option>
              {(options?.clientes || []).map((item) => (
                <option key={String(item.id_cliente)} value={String(item.id_cliente)}>
                  {labelFrom(item, ["nome_cliente", "cliente", "razao_social", "nome"], "Cliente sem nome")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Arquivo 3MF</label>
            <select
              value={id_3mf}
              onChange={(e) => setId_3mf(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
            >
              <option value="">Selecione</option>
              {(options?.arquivos3mf || []).map((item) => (
                <option key={String(item.id_3mf)} value={String(item.id_3mf)}>
                  {labelFrom(item, ["nome_arquivo_3mf", "nome_arquivo", "filename", "arquivo", "descricao"], "Arquivo 3MF sem nome")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data da solicitação</label>
            <input
              value={data_solic}
              onChange={(e) => setData_solic(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data entrega prevista</label>
            <input
              value={data_entrega_prevista}
              onChange={(e) => setData_entrega_prevista(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-300">Data entrega realizada</label>
            <input
              value={data_entrega_realizada}
              onChange={(e) => setData_entrega_realizada(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Lista</h2>
          <button
            onClick={reload}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>

        <LoadingOrEmpty
          loading={loading}
          empty={data.length === 0}
          loadingText="Carregando pedidos..."
          emptyText="Nenhum pedido cadastrado."
        >
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Arquivo 3MF</th>
                  <th className="px-4 py-3">Data da solicitação</th>
                  <th className="px-4 py-3">Data entrega prevista</th>
                  <th className="px-4 py-3">Data entrega realizada</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {data.map((row, index) => (
                  <tr key={String(row.id_pedido ?? index)} className="text-slate-200">
                    <td className="px-4 py-3">{nomes.clientes.get(Number(row.id_cliente)) || ""}</td>
                    <td className="px-4 py-3">{nomes.arquivos3mf.get(Number(row.id_3mf)) || ""}</td>
                    <td className="px-4 py-3">{asText(row.data_solic)}</td>
                    <td className="px-4 py-3">{asText(row.data_entrega_prevista)}</td>
                    <td className="px-4 py-3">{asText(row.data_entrega_realizada)}</td>
                    <td className="px-4 py-3">
                      <ActionButtons
                        onEdit={() => fillForEdit(row)}
                        onDelete={() => handleDelete(asText(row.id_pedido))}
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
