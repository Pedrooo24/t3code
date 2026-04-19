/**
 * Strings PT-PT para superficies de alta exposicao.
 * Sem framework i18n - um utilizador, uma lingua.
 * NAO traduzir: mensagens de erro internas, console logs, nomes de providers/modelos.
 */
export const strings = {
  composer: {
    // Placeholders do editor
    placeholderDefault:
      "Pergunta qualquer coisa, usa @ficheiro/pasta, ou / para ver comandos disponiveis",
    placeholderDisconnected: "Pede alteracoes adicionais ou anexa imagens",
    placeholderPendingAnswer:
      "Escreve a tua resposta, ou deixa em branco para usar a opcao seleccionada",
    placeholderPlanRefine:
      "Adiciona feedback para refinar o plano, ou deixa em branco para implementar",
    // Modos de interaccao
    planMode: "Plano",
    buildMode: "Construir",
    planModeTitle: "Modo plano - clica para voltar ao modo construir",
    buildModeTitle: "Modo padrao - clica para entrar no modo plano",
    // Runtime modes
    supervised: "Supervisionado",
    supervisedDescription: "Pede confirmacao antes de comandos e alteracoes a ficheiros.",
    autoAcceptEdits: "Aceitar edicoes auto.",
    autoAcceptEditsDescription: "Aprova edicoes automaticamente, pede confirmacao para outras accoes.",
    fullAccess: "Acesso total",
    fullAccessDescription: "Permite comandos e edicoes sem confirmacao.",
    // Worktree
    preparingWorktree: "A preparar worktree...",
    // Imagens
    draftAttachmentWarning:
      "O anexo de rascunho nao foi guardado localmente e pode perder-se ao navegar.",
  },

  chat: {
    newThread: "Nova conversa",
    noGitRepo: "Sem Git",
    // Tooltips do header
    terminalUnavailable:
      "O terminal nao esta disponivel ate esta conversa ter um projecto activo.",
    terminalToggle: "Alternar painel terminal",
    terminalToggleWithShortcut: (label: string) => `Alternar painel terminal (${label})`,
    diffUnavailable: "O painel de diff nao esta disponivel porque este projecto nao e um repositorio git.",
    diffToggle: "Alternar painel de diff",
    diffToggleWithShortcut: (label: string) => `Alternar painel de diff (${label})`,
  },

  sidebar: {
    search: "Pesquisar",
    projects: "Projectos",
    noProjects: "Sem projectos",
    noThreadsYet: "Sem conversas ainda",
    settings: "Definicoes",
    addProject: "Adicionar projecto",
    sortProjects: "Ordenar projectos",
    newThread: "Nova conversa",
    newThreadInProject: (name: string) => `Criar nova conversa em ${name}`,
    newThreadWithShortcut: (label: string) => `Nova conversa (${label})`,
    showMore: "Mostrar mais",
    showLess: "Mostrar menos",
    confirmArchive: "Confirmar",
    archive: "Arquivar",
    // Sort menu
    sortProjectsLabel: "Ordenar projectos",
    sortThreadsLabel: "Ordenar conversas",
    groupProjectsLabel: "Agrupar projectos",
    // Sort labels
    sortByLastMessage: "Ultima mensagem",
    sortByCreatedAt: "Data de criacao",
    sortManual: "Manual",
    // Grouping labels
    groupByRepository: "Agrupar por repositorio",
    groupByRepositoryPath: "Agrupar por caminho no repositorio",
    keepSeparate: "Manter separados",
    // Remote
    remoteProject: "Projecto remoto",
    // Rename dialog
    renameProject: "Renomear projecto",
    renameProjectDescription: (cwd: string) => `Actualizar o titulo para ${cwd}.`,
    renameProjectDescriptionDefault: "Actualizar o titulo do projecto.",
    projectTitleLabel: "Titulo do projecto",
    projectTitleAriaLabel: "Titulo do projecto",
    environmentLabel: (label: string) => `Ambiente: ${label}`,
    cancel: "Cancelar",
    save: "Guardar",
    // Grouping dialog
    projectGrouping: "Agrupamento de projectos",
    projectGroupingDescription: (cwd: string) =>
      `Escolhe como ${cwd} deve ser agrupado na barra lateral.`,
    projectGroupingDescriptionDefault:
      "Escolhe como este projecto deve ser agrupado na barra lateral.",
    groupingRule: "Regra de agrupamento",
    groupingRuleAriaLabel: "Regra de agrupamento de projectos",
    useGlobalDefault: (label: string) => `Usar padrao global (${label})`,
    useGlobalDefaultBase: "Usar padrao global",
    // Remote environment tooltip
    remoteEnvironment: (labels: string) => `Ambiente remoto: ${labels}`,
    // Version
    version: (v: string) => `Versao ${v}`,
    // Project counts
    projectsCount: (n: number) => `${n} projectos`,
  },

  status: {
    rateLimitLabel5h: "5h",
    rateLimitLabel7d: "7d",
    resetPending: "a reiniciar",
    resetsInMinutes: (mins: number) => `reinicia em ${mins}m`,
    resetsInHours: (hours: number, mins: number) => `reinicia em ${hours}h ${mins}m`,
  },

  providers: {
    comingSoon: "Em breve",
    disabled: "Desactivado",
    notInstalled: "Nao instalado",
    unavailable: "Indisponivel",
  },

  settings: {
    general: "Geral",
    providers: "Providers",
    threads: "Conversas",
    about: "Sobre",
    // Secoes de settings
    version: "Versao",
    theme: "Tema",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Escuro",
    timestampFormat: "Formato de data/hora",
    timestampSystemDefault: "Padrao do sistema",
    // Toasts de configuracao
    threadIdCopied: "ID da conversa copiado",
    pathCopied: "Caminho copiado",
    failedToCopyThreadId: "Falha ao copiar ID da conversa",
    failedToCopyPath: "Falha ao copiar caminho",
  },
} as const;
