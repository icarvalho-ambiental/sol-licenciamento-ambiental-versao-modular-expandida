import { createFileRoute, Link } from "@tanstack/react-router";
import { SolLogo } from "@/components/sol/SolLogo";

export const Route = createFileRoute("/termos")({
  component: Term,
  head: () => ({ meta: [
    { title: "Termos de Uso — SOL" },
    { name: "description", content: "Termos de Uso da plataforma SOL." },
  ] }),
});

function Term() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <SolLogo/>
          <Link to="/login" className="text-sm text-primary underline">Voltar ao login</Link>
        </div>
        <article className="prose prose-slate max-w-none">
          <h1>Termos de Uso</h1>
          <p>Última atualização: 14/06/2026 · Versão 1.0</p>
          <p>Estes Termos disciplinam o acesso e uso do SOL. Ao se cadastrar, você declara concordar com estas regras e com a <Link to="/privacidade">Política de Privacidade</Link>.</p>
          <h2>1. Cadastro</h2>
          <p>Você é responsável pelas informações fornecidas e pela guarda de suas credenciais. Informações falsas podem acarretar suspensão da conta e responsabilização civil/criminal.</p>
          <h2>2. Uso permitido</h2>
          <p>O SOL deve ser utilizado para finalidades administrativas legítimas relacionadas ao licenciamento ambiental e demais módulos contratados pelo locatário (órgão público).</p>
          <h2>3. Condutas vedadas</h2>
          <ul>
            <li>Tentar burlar mecanismos de segurança ou de auditoria.</li>
            <li>Submeter documentos falsos ou indevidos.</li>
            <li>Realizar requisições automatizadas fora dos limites publicados na API.</li>
          </ul>
          <h2>4. Disponibilidade</h2>
          <p>Buscamos manter o serviço disponível 24/7, mas podem ocorrer janelas de manutenção. Não há garantia de disponibilidade absoluta.</p>
          <h2>5. Propriedade intelectual</h2>
          <p>Os direitos sobre o sistema pertencem ao titular do SOL. O conteúdo carregado por usuários permanece sob responsabilidade do respectivo locatário.</p>
          <h2>6. Encerramento</h2>
          <p>O acesso pode ser suspenso em caso de violação destes Termos, sem prejuízo de medidas legais cabíveis.</p>
          <h2>7. Alterações</h2>
          <p>Estes Termos podem ser atualizados. A continuação do uso após mudanças constitui aceite.</p>
          <h2>8. Foro</h2>
          <p>Fica eleito o foro do domicílio do locatário (órgão público responsável) para dirimir controvérsias.</p>
        </article>
      </div>
    </div>
  );
}