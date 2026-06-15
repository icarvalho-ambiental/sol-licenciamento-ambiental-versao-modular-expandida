/**
 * Smoke test do MVP do SOL.
 * Roda contra o banco do projeto usando service role.
 * Fluxo: cadastrar empresa → criar empreendimento → abrir requerimento → emitir documento + QR.
 *
 * Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/smoke-mvp.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const ts = Date.now();
const cnpj = String(10000000000000n + BigInt(ts % 10000000000));

async function main() {
  // tenant ativo (qualquer)
  const { data: t } = await db.from("tenants").select("id").eq("ativo", true).limit(1).single();
  if (!t) throw new Error("Nenhum tenant ativo. Rode o onboarding primeiro.");
  const tenant_id = t.id;

  // 1) Empresa
  const { data: pj, error: pjErr } = await db.from("pessoas_juridicas")
    .insert({ cnpj, razao_social: `Smoke ${ts}`, nome_fantasia: `Smoke ${ts}`, email: `smoke${ts}@test.local` })
    .select("id").single();
  if (pjErr) throw pjErr;
  const { data: emp, error: eErr } = await db.from("empresas")
    .insert({ tenant_id, pessoa_juridica_id: pj.id, nome_fantasia: `Smoke ${ts}`, ativo: true })
    .select("id").single();
  if (eErr) throw eErr;
  console.log("✅ Empresa criada:", emp.id);

  // 2) Empreendimento
  const { data: cidade } = await db.from("cidades").select("id").limit(1).maybeSingle();
  const { data: epr, error: eprErr } = await db.from("empreendimentos")
    .insert({ tenant_id, empresa_id: emp.id, cidade_id: cidade?.id ?? null, nome: `Unidade smoke ${ts}`, endereco: "Rua Teste, 1", ativo: true })
    .select("id").single();
  if (eprErr) throw eprErr;
  console.log("✅ Empreendimento criado:", epr.id);

  // 3) Requerimento
  const { data: req, error: reqErr } = await db.from("requerimentos")
    .insert({ tenant_id, empreendimento_id: epr.id, tipo: "Licença Prévia (LP)", titulo: `Smoke ${ts}`, status: "rascunho" })
    .select("id").single();
  if (reqErr) throw reqErr;
  console.log("✅ Requerimento aberto:", req.id);

  // 4) Documento + QR
  const { data: doc, error: docErr } = await db.from("documentos")
    .insert({ tenant_id, titulo: `Doc smoke ${ts}`, tipo: "comprovante", status: "emitido", hash_sha256: "sha256-smoke-" + ts, requerimento_id: req.id })
    .select("id").single();
  if (docErr) throw docErr;
  const token = `smoke-${ts}`;
  const { error: qrErr } = await db.from("qr_tokens").insert({ tenant_id, documento_id: doc.id, token });
  if (qrErr) throw qrErr;
  console.log("✅ Documento + QR emitido:", doc.id, "→ token:", token);

  // validar QR via RPC
  const { data: v, error: vErr } = await db.rpc("validar_qr_token", { _token: token });
  if (vErr) throw vErr;
  console.log("✅ QR validável:", Array.isArray(v) && v.length > 0 ? "ok" : "vazio");

  console.log("\n🎉 Smoke MVP concluído com sucesso.");
}

main().catch((e) => { console.error("❌ Smoke falhou:", e); process.exit(2); });