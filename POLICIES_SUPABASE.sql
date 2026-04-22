alter table cadastro_clientes enable row level security;
alter table cadastro_filamentos enable row level security;
alter table estoque_j_ao_cubo enable row level security;
alter table cadastro_componentes enable row level security;
alter table cadastro_3mf enable row level security;
alter table cadastro_impressoras enable row level security;
alter table cadastro_pedidos enable row level security;
alter table plano_producao enable row level security;
alter table execucao_fabric enable row level security;
alter table falhas_producao enable row level security;
alter table cotacao_componente enable row level security;

drop policy if exists "select_clientes" on cadastro_clientes;
drop policy if exists "insert_clientes" on cadastro_clientes;
drop policy if exists "update_clientes" on cadastro_clientes;
drop policy if exists "delete_clientes" on cadastro_clientes;
drop policy if exists "select_filamentos" on cadastro_filamentos;
drop policy if exists "insert_filamentos" on cadastro_filamentos;
drop policy if exists "update_filamentos" on cadastro_filamentos;
drop policy if exists "delete_filamentos" on cadastro_filamentos;
drop policy if exists "select_estoque" on estoque_j_ao_cubo;
drop policy if exists "insert_estoque" on estoque_j_ao_cubo;
drop policy if exists "update_estoque" on estoque_j_ao_cubo;
drop policy if exists "delete_estoque" on estoque_j_ao_cubo;
drop policy if exists "select_componentes" on cadastro_componentes;
drop policy if exists "insert_componentes" on cadastro_componentes;
drop policy if exists "update_componentes" on cadastro_componentes;
drop policy if exists "delete_componentes" on cadastro_componentes;
drop policy if exists "select_3mf" on cadastro_3mf;
drop policy if exists "insert_3mf" on cadastro_3mf;
drop policy if exists "update_3mf" on cadastro_3mf;
drop policy if exists "delete_3mf" on cadastro_3mf;
drop policy if exists "select_impressoras" on cadastro_impressoras;
drop policy if exists "insert_impressoras" on cadastro_impressoras;
drop policy if exists "update_impressoras" on cadastro_impressoras;
drop policy if exists "delete_impressoras" on cadastro_impressoras;
drop policy if exists "select_pedidos" on cadastro_pedidos;
drop policy if exists "insert_pedidos" on cadastro_pedidos;
drop policy if exists "update_pedidos" on cadastro_pedidos;
drop policy if exists "delete_pedidos" on cadastro_pedidos;
drop policy if exists "select_plano_producao" on plano_producao;
drop policy if exists "insert_plano_producao" on plano_producao;
drop policy if exists "update_plano_producao" on plano_producao;
drop policy if exists "delete_plano_producao" on plano_producao;
drop policy if exists "select_execucoes" on execucao_fabric;
drop policy if exists "insert_execucoes" on execucao_fabric;
drop policy if exists "update_execucoes" on execucao_fabric;
drop policy if exists "delete_execucoes" on execucao_fabric;
drop policy if exists "select_falhas" on falhas_producao;
drop policy if exists "insert_falhas" on falhas_producao;
drop policy if exists "update_falhas" on falhas_producao;
drop policy if exists "delete_falhas" on falhas_producao;
drop policy if exists "select_cotacoes" on cotacao_componente;
drop policy if exists "insert_cotacoes" on cotacao_componente;
drop policy if exists "update_cotacoes" on cotacao_componente;
drop policy if exists "delete_cotacoes" on cotacao_componente;

create policy "select_clientes" on cadastro_clientes for select to anon using (true);
create policy "insert_clientes" on cadastro_clientes for insert to anon with check (true);
create policy "update_clientes" on cadastro_clientes for update to anon using (true) with check (true);
create policy "delete_clientes" on cadastro_clientes for delete to anon using (true);

create policy "select_filamentos" on cadastro_filamentos for select to anon using (true);
create policy "insert_filamentos" on cadastro_filamentos for insert to anon with check (true);
create policy "update_filamentos" on cadastro_filamentos for update to anon using (true) with check (true);
create policy "delete_filamentos" on cadastro_filamentos for delete to anon using (true);

create policy "select_estoque" on estoque_j_ao_cubo for select to anon using (true);
create policy "insert_estoque" on estoque_j_ao_cubo for insert to anon with check (true);
create policy "update_estoque" on estoque_j_ao_cubo for update to anon using (true) with check (true);
create policy "delete_estoque" on estoque_j_ao_cubo for delete to anon using (true);

create policy "select_componentes" on cadastro_componentes for select to anon using (true);
create policy "insert_componentes" on cadastro_componentes for insert to anon with check (true);
create policy "update_componentes" on cadastro_componentes for update to anon using (true) with check (true);
create policy "delete_componentes" on cadastro_componentes for delete to anon using (true);

create policy "select_3mf" on cadastro_3mf for select to anon using (true);
create policy "insert_3mf" on cadastro_3mf for insert to anon with check (true);
create policy "update_3mf" on cadastro_3mf for update to anon using (true) with check (true);
create policy "delete_3mf" on cadastro_3mf for delete to anon using (true);

create policy "select_impressoras" on cadastro_impressoras for select to anon using (true);
create policy "insert_impressoras" on cadastro_impressoras for insert to anon with check (true);
create policy "update_impressoras" on cadastro_impressoras for update to anon using (true) with check (true);
create policy "delete_impressoras" on cadastro_impressoras for delete to anon using (true);

create policy "select_pedidos" on cadastro_pedidos for select to anon using (true);
create policy "insert_pedidos" on cadastro_pedidos for insert to anon with check (true);
create policy "update_pedidos" on cadastro_pedidos for update to anon using (true) with check (true);
create policy "delete_pedidos" on cadastro_pedidos for delete to anon using (true);

create policy "select_plano_producao" on plano_producao for select to anon using (true);
create policy "insert_plano_producao" on plano_producao for insert to anon with check (true);
create policy "update_plano_producao" on plano_producao for update to anon using (true) with check (true);
create policy "delete_plano_producao" on plano_producao for delete to anon using (true);

create policy "select_execucoes" on execucao_fabric for select to anon using (true);
create policy "insert_execucoes" on execucao_fabric for insert to anon with check (true);
create policy "update_execucoes" on execucao_fabric for update to anon using (true) with check (true);
create policy "delete_execucoes" on execucao_fabric for delete to anon using (true);

create policy "select_falhas" on falhas_producao for select to anon using (true);
create policy "insert_falhas" on falhas_producao for insert to anon with check (true);
create policy "update_falhas" on falhas_producao for update to anon using (true) with check (true);
create policy "delete_falhas" on falhas_producao for delete to anon using (true);

create policy "select_cotacoes" on cotacao_componente for select to anon using (true);
create policy "insert_cotacoes" on cotacao_componente for insert to anon with check (true);
create policy "update_cotacoes" on cotacao_componente for update to anon using (true) with check (true);
create policy "delete_cotacoes" on cotacao_componente for delete to anon using (true);
