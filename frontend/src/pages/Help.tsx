import { PageHeader } from '../ui';

const FAQ = [
  {
    q: 'Como registrar um visitante que chegou sem agendamento?',
    a: 'Toque em "Novo visitante" (ou Check-in → Visitante sem agendamento), preencha os dados e o anfitrião. O check-in é feito na hora.',
  },
  {
    q: 'Como funciona o pré-registro?',
    a: 'Em Início → Pré-registro, informe os dados e a data da visita. É gerado um QR Code com um código de 6 letras: envie-o ao visitante pelo botão "Enviar".',
  },
  {
    q: 'Como fazer o check-in pelo QR Code?',
    a: 'Abra Check-in → Ler QR Code e aponte a câmera para o código do visitante. Se a câmera não estiver disponível, use o Check-in manual digitando o código ou escolhendo o visitante na lista.',
  },
  {
    q: 'Como registrar a saída?',
    a: 'Abra o visitante (lista de Visitantes, filtro "Presentes") e toque em "Fazer check-out". O tempo de permanência é calculado automaticamente.',
  },
  {
    q: 'Esqueci minha senha. E agora?',
    a: 'Um administrador pode definir uma nova senha em Perfil → Equipe e acessos. Depois troque-a em Perfil → Alterar senha.',
  },
  {
    q: 'Como exportar os dados?',
    a: 'Em Relatórios, escolha o período e toque em "Ver relatório detalhado" → "Exportar CSV". O arquivo abre no Excel ou no Google Planilhas.',
  },
];

export default function Help() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ajuda e suporte" back />
      <div className="flex flex-col gap-3">
        {FAQ.map((f) => (
          <details key={f.q} className="card group p-4">
            <summary className="flex min-h-[28px] cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              <span className="min-w-0">{f.q}</span>
              <span className="shrink-0 text-brand transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-[#475569]">{f.a}</p>
          </details>
        ))}
      </div>
      <div id="sobre" className="card mt-6 p-4 text-sm text-[#475569]">
        <p className="font-bold text-[#0f172a]">Sobre o Visitante</p>
        <p className="mt-1">Versão 1.0 · Controle de visitantes com pré-registro, check-in por QR Code, check-out e relatórios.</p>
        <p className="mt-1">Instale na tela inicial: no navegador do celular, use "Adicionar à Tela de Início".</p>
      </div>
    </div>
  );
}
