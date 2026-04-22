"use client";

import { FormEvent, useEffect, useState } from "react";
import { ActionButtons, Feedback, getJson, LoadingOrEmpty, NumberOrBlank, PageShell, useAuthGuard, useCrudList } from "../_shared";

type Registro = Record<string, string | number | null>;

export default function Page() {
  const { ready } = useAuthGuard();
  const { data, loading, erro, setErro, reload } = useCrudList<Registro>("/api/clientes");
  const [options, setOptions] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome_cliente, setNome_cliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");

  useEffect(() => {

  }, []);

  function resetForm() {
    setEditingId(null);
    setNome_cliente("");
    setEndereco("");
    setTelefone("");
    setCpf("");
    setCnpj("");
  }

  function fillForEdit(row: Registro) {
    setEditingId(String(row["id_cliente"] ?? ""));
    setNome_cliente(String(row["nome_cliente"] ?? ""));
    setEndereco(String(row["endereco"] ?? ""));
    setTelefone(String(row["telefone"] ?? ""));
    setCpf(String(row["cpf"] ?? ""));
    setCnpj(String(row["cnpj"] ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      setErro("");
      setMensagem("");
      const response = await fetch("/api/clientes?id=" + id, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao excluir.");
      setMensagem("Registro excluído com sucesso.");
      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const payload: Record<string, unknown> = {
        nome_cliente: nome_cliente || null,
        endereco: endereco || null,
        telefone: telefone || null,
        cpf: cpf || null,
        cnpj: cnpj || null,
      };

      const method = editingId ? "PUT" : "POST";
      if (editingId) payload["id_cliente"] = Number(editingId);

      const response = await fetch("/api/clientes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Erro ao salvar.");
      setMensagem(editingId ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
      resetForm();
      await reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!ready) return <main className="min-h-screen p-8">Carregando...</main>;

  return (
    <PageShell title="Clientes" description="Cadastro e consulta de clientes.">
      <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-black">{editingId ? "Editar registro" : "Novo registro"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Nome do cliente</label>
              <input type="text" value={nome_cliente} onChange={(e) => setNome_cliente(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Endereço</label>
              <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Endereço" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Telefone</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="Telefone" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">CPF</label>
              <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="CPF" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">CNPJ</label>
              <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-black outline-none focus:border-zinc-500" placeholder="CNPJ" />
            </div>
            <Feedback erro={erro} mensagem={mensagem} />
            <div className="flex gap-2">
              <button type="submit" disabled={salvando} className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {salvando ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-black">Lista</h2>
            <button onClick={reload} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50">
              Atualizar
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <LoadingOrEmpty loading={loading} empty={data.length === 0} loadingText="Carregando registros..." emptyText="Nenhum registro cadastrado.">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Nome do cliente</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Endereço</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Telefone</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">CPF</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">CNPJ</th>
                    <th className="border-b border-zinc-200 px-3 py-3 text-left font-semibold text-black">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={String(index)}>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["nome_cliente"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["endereco"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["telefone"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["cpf"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">{row["cnpj"] ?? ""}</td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-black">
                        <ActionButtons onEdit={() => fillForEdit(row)} onDelete={() => handleDelete(String(row["id_cliente"] ?? ""))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LoadingOrEmpty>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
