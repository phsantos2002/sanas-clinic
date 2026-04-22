// Curadoria de CNAEs mais usados em prospecção B2B (subclasse 7 dígitos sem formatação).
// Fonte: IBGE/Receita Federal.

export type CnaeOption = {
  code: string; // subclasse (7 dígitos, sem pontuação)
  label: string; // descrição curta
  group: string; // categoria para agrupar no select
};

export const CNAE_OPTIONS: CnaeOption[] = [
  // Saúde
  { code: "8630504", label: "Odontológica / dentistas", group: "Saúde" },
  { code: "8630501", label: "Clínica médica", group: "Saúde" },
  { code: "8690901", label: "Fisioterapia", group: "Saúde" },
  { code: "8650099", label: "Nutricionistas / outros profissionais", group: "Saúde" },
  { code: "8650004", label: "Psicologia / psicanálise", group: "Saúde" },
  { code: "8650003", label: "Fonoaudiologia", group: "Saúde" },
  { code: "9602501", label: "Cabeleireiros / barbearias", group: "Saúde" },
  { code: "9602502", label: "Estética e cuidados com a beleza", group: "Saúde" },

  // Jurídico / consultoria
  { code: "6911701", label: "Advocacia", group: "Serviços profissionais" },
  { code: "7020400", label: "Consultoria em gestão empresarial", group: "Serviços profissionais" },
  { code: "6920601", label: "Contabilidade", group: "Serviços profissionais" },
  { code: "6920602", label: "Auditoria contábil", group: "Serviços profissionais" },
  {
    code: "7490104",
    label: "Atividades de intermediação e agenciamento",
    group: "Serviços profissionais",
  },

  // Tecnologia
  { code: "6201501", label: "Desenvolvimento de software sob encomenda", group: "Tecnologia" },
  { code: "6201502", label: "Web design", group: "Tecnologia" },
  { code: "6202300", label: "Desenvolvimento de software customizável", group: "Tecnologia" },
  { code: "6209100", label: "Suporte técnico / TI", group: "Tecnologia" },
  { code: "6311900", label: "Hospedagem de TI e processamento de dados", group: "Tecnologia" },

  // Educação
  { code: "8599604", label: "Treinamentos em desenvolvimento pessoal", group: "Educação" },
  { code: "8599603", label: "Cursos preparatórios / vestibular", group: "Educação" },
  { code: "8513900", label: "Ensino fundamental", group: "Educação" },
  { code: "8520100", label: "Ensino médio", group: "Educação" },

  // Varejo / comércio
  { code: "4781400", label: "Comércio de artigos do vestuário", group: "Varejo" },
  { code: "4772500", label: "Comércio de cosméticos e perfumaria", group: "Varejo" },
  { code: "4789099", label: "Comércio varejista de outros produtos", group: "Varejo" },
  { code: "4744001", label: "Ferragens e ferramentas", group: "Varejo" },
  { code: "4753900", label: "Eletrodomésticos", group: "Varejo" },
  { code: "4761003", label: "Papelaria", group: "Varejo" },
  { code: "4771701", label: "Farmácias / drogarias", group: "Varejo" },
  { code: "4774100", label: "Produtos médicos e ortopédicos", group: "Varejo" },

  // Alimentação
  { code: "5611201", label: "Restaurantes / similares", group: "Alimentação" },
  { code: "5611203", label: "Lanchonetes / docerias", group: "Alimentação" },
  { code: "5620104", label: "Fornecimento para eventos", group: "Alimentação" },
  { code: "5611205", label: "Bares", group: "Alimentação" },

  // Pet
  { code: "4789004", label: "Pet shop", group: "Pet" },
  { code: "7500100", label: "Veterinária", group: "Pet" },

  // Construção / imobiliário
  {
    code: "4399199",
    label: "Serviços especializados de construção",
    group: "Construção / Imóveis",
  },
  { code: "4110700", label: "Incorporação de imóveis", group: "Construção / Imóveis" },
  {
    code: "6821801",
    label: "Intermediação na compra e venda de imóveis",
    group: "Construção / Imóveis",
  },
  {
    code: "6822600",
    label: "Gestão e administração de propriedade",
    group: "Construção / Imóveis",
  },

  // Marketing / agências
  { code: "7311400", label: "Agências de publicidade", group: "Marketing" },
  { code: "7319003", label: "Marketing direto", group: "Marketing" },
  { code: "7319099", label: "Outras atividades de publicidade", group: "Marketing" },
  { code: "5920100", label: "Produção audiovisual", group: "Marketing" },

  // Indústria / atacado
  {
    code: "4649408",
    label: "Atacado de produtos de higiene e cosméticos",
    group: "Indústria / Atacado",
  },
  { code: "4639701", label: "Atacado de produtos alimentícios", group: "Indústria / Atacado" },
  { code: "1412601", label: "Confecção de roupas profissionais", group: "Indústria / Atacado" },
  { code: "2511000", label: "Fabricação de estruturas metálicas", group: "Indústria / Atacado" },

  // Transporte / logística
  { code: "4930201", label: "Transporte rodoviário de carga", group: "Transporte" },
  { code: "5229099", label: "Atividades auxiliares dos transportes", group: "Transporte" },

  // Academia / fitness
  { code: "9313100", label: "Academia / ginástica", group: "Fitness" },
  { code: "9311500", label: "Clubes e instalações esportivas", group: "Fitness" },
];

export const UF_OPTIONS: { code: string; label: string }[] = [
  { code: "AC", label: "Acre" },
  { code: "AL", label: "Alagoas" },
  { code: "AP", label: "Amapá" },
  { code: "AM", label: "Amazonas" },
  { code: "BA", label: "Bahia" },
  { code: "CE", label: "Ceará" },
  { code: "DF", label: "Distrito Federal" },
  { code: "ES", label: "Espírito Santo" },
  { code: "GO", label: "Goiás" },
  { code: "MA", label: "Maranhão" },
  { code: "MT", label: "Mato Grosso" },
  { code: "MS", label: "Mato Grosso do Sul" },
  { code: "MG", label: "Minas Gerais" },
  { code: "PA", label: "Pará" },
  { code: "PB", label: "Paraíba" },
  { code: "PR", label: "Paraná" },
  { code: "PE", label: "Pernambuco" },
  { code: "PI", label: "Piauí" },
  { code: "RJ", label: "Rio de Janeiro" },
  { code: "RN", label: "Rio Grande do Norte" },
  { code: "RS", label: "Rio Grande do Sul" },
  { code: "RO", label: "Rondônia" },
  { code: "RR", label: "Roraima" },
  { code: "SC", label: "Santa Catarina" },
  { code: "SP", label: "São Paulo" },
  { code: "SE", label: "Sergipe" },
  { code: "TO", label: "Tocantins" },
];
