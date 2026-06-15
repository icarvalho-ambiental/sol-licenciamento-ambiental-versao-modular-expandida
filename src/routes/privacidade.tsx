import { createFileRoute, Link } from "@tanstack/react-router";
import { SolLogo } from "@/components/sol/SolLogo";

export const Route = createFileRoute("/privacidade")({
  component: Pol,
  head: () => ({ meta: [
    { title: "Política de Privacidade — SOL" },
    { name: "description", content: "Política de Privacidade do SOL, em conformidade com a LGPD." },
  ] }),
});

function Pol() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <SolLogo/>
          <Link to="/login" className="text-sm text-primary underline">Voltar ao login</Link>
        </div>
        <article className="prose prose-slate max-w-none">
          <h1>Política de Privacidade</h1>
          <p>Última atualização: 14/06/2026 · Versão 1.0</p>
          <p>O SOL é um sistema de gestão pública (licenciamento ambiental, fiscalização e correlatos) operado pelo locatário (órgão público) responsável. Tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
          <h2>1. Dados coletados</h2>
          <ul>
            <li>Identificação: nome, CPF/CNPJ, e-mail, telefone.</li>
            <li>Dados de uso: registros de acesso (IP, navegador, horário) para auditoria e segurança.</li>
            <li>Documentos enviados em processos administrativos.</li>
          </ul>
          <h2>2. Finalidade</h2>
          <p>Os dados são utilizados para execução de políticas públicas, instrução de processos administrativos, transparência ativa e cumprimento de obrigações legais.</p>
          <h2>3. Base legal</h2>
          <p>Execução de políticas públicas (art. 7º, III, LGPD) e cumprimento de obrigação legal (art. 7º, II).</p>
          <h2>4. Compartilhamento</h2>
          <p>Dados podem ser compartilhados com órgãos públicos competentes, exclusivamente para fins legais e mediante registro de auditoria.</p>
          <h2>5. Direitos do titular</h2>
          <p>Você pode solicitar acesso, correção, anonimização, portabilidade e eliminação dos seus dados, conforme art. 18 da LGPD, contatando o encarregado do locatário responsável.</p>
          <h2>6. Segurança</h2>
          <p>Adotamos controle de acesso baseado em perfis, criptografia em trânsito (HTTPS) e em repouso, e registros de auditoria para todas as operações sensíveis.</p>
          <h2>7. Cookies</h2>
          <p>Utilizamos cookies/armazenamento local apenas para manter sua sessão autenticada.</p>
          <h2>8. Retenção</h2>
          <p>Os dados são mantidos pelo prazo necessário ao cumprimento das finalidades acima e pelos prazos legais aplicáveis.</p>
          <h2>9. Contato</h2>
          <p>Para exercer seus direitos, fale com o encarregado do órgão responsável pelo SOL no seu município/estado.</p>
        </article>
      </div>
    </div>
  );
}