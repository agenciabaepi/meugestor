
QUERO QUE VOCÊ REFAÇA A ORGANIZAÇÃO E O PAPEL DE CADA ARQUIVO DO SISTEMA DE IA, SEM QUEBRAR NADA DO QUE JÁ FUNCIONA, APENAS AJUSTANDO RESPONSABILIDADES PARA TORNAR O BOT MAIS HUMANO, FLUIDO E AUTÔNOMO, COM EXPERIÊNCIA DE CONVERSA PRÓXIMA AO CHATGPT.

O PROBLEMA ATUAL NÃO É FALTA DE CÓDIGO, É MISTURA DE RESPONSABILIDADES. O SISTEMA TEM CONVERSA, DECISÃO E EXECUÇÃO TUDO NO MESMO FLUXO, O QUE FAZ O BOT PARECER ROBÓTICO, INSEGURO E CHEIO DE PERGUNTAS DESNECESSÁRIAS.

A PARTIR DE AGORA, CADA ARQUIVO DEVE TER UMA FUNÇÃO CLARA E ÚNICA. NÃO REMOVER ARQUIVOS, NÃO QUEBRAR APIS EXISTENTES, APENAS REORGANIZAR O FLUXO INTERNO.

CONCEITO CENTRAL DO SISTEMA:
	•	CONVERSA ≠ DECISÃO ≠ EXECUÇÃO
	•	IA CONVERSA, CÓDIGO DECIDE, SISTEMA EXECUTA
	•	O BANCO DE DADOS CONTINUA SENDO A FONTE DA VERDADE

========================
REORGANIZAÇÃO POR ARQUIVO
	1.	conversation.ts
Este arquivo DEVE ser a camada humana do sistema.
Ele é responsável APENAS por:

	•	responder mensagens casuais (“oi”, “tudo bem”, “bom dia”)
	•	manter fluidez de conversa
	•	responder perguntas abertas sem intenção operacional
	•	ajudar o usuário a se expressar melhor quando ele está confuso
	•	nunca validar dados
	•	nunca executar ações
	•	nunca falar de banco de dados
	•	nunca retornar JSON técnico

Aqui a IA pode conversar livremente, como ChatGPT, sem schema rígido.

Se a mensagem NÃO for claramente uma ação (“paguei”, “cria”, “adiciona”, “marca”), a resposta deve ser HUMANA, não técnica.
	2.	context-analyzer.ts
Este arquivo DEVE apenas:

	•	analisar a mensagem do usuário
	•	identificar se existe uma intenção operacional clara
	•	extrair entidades básicas (nomes, valores, datas relativas)
	•	NÃO validar se está completo
	•	NÃO decidir fluxo
	•	NÃO executar nada

Ele deve retornar algo como:
	•	intenção provável
	•	entidades encontradas
	•	nível de confiança

Nada mais.
	3.	conversational-assistant.ts
Este arquivo DEIXA de ser “conversacional” e passa a ser o ORQUESTRADOR DO SISTEMA.

Responsabilidades exclusivas:
	•	receber a intenção já interpretada
	•	consultar dados existentes (salário, funcionário, lista, compromisso)
	•	decidir se pode executar direto
	•	decidir se precisa pedir algo (apenas se realmente não existir no sistema)
	•	aplicar regras de negócio
	•	impedir perguntas redundantes
	•	impedir duplicidade de ações
	•	nunca responder conversa casual
	•	nunca tentar ser “simpático”

Este arquivo NÃO deve mais:
	•	responder “oi”
	•	responder “tudo bem”
	•	tentar explicar funcionalidades
	•	conversar com o usuário sem necessidade

Ele apenas decide e chama execução.
	4.	semantic-state.ts
Este arquivo deve continuar sendo:

	•	o estado técnico do sistema
	•	representação do que será executado
	•	nunca um reflexo direto da conversa

Ele NÃO deve tentar representar emoções, conversa ou texto humano.
	5.	context-manager.ts
Este arquivo deve ser usado SOMENTE para:

	•	lembrar contexto leve (ex: estamos falando de funcionários, listas, agenda)
	•	herdar contexto entre mensagens curtas (“e esse?”, “e o outro?”)
	•	nunca forçar contexto quando o usuário muda de assunto claramente

	6.	session-focus.ts e focus-lock.ts
Esses arquivos devem:

	•	garantir continuidade em correções (“não, é amanhã”, “não, é 15h”)
	•	evitar perguntas repetidas sobre o mesmo item
	•	nunca travar o usuário em um assunto quando ele mudou claramente

	7.	actions.ts / actions-query-simple.ts
Esses arquivos continuam sendo:

	•	execução pura
	•	criação de dados
	•	consultas
	•	relatórios

Eles NÃO devem:
	•	perguntar nada
	•	decidir nada
	•	interpretar texto

	8.	confirmation-manager.ts
Este arquivo deve ser usado SOMENTE quando:

	•	o usuário explicitamente pedir confirmação (“confirma?”, “pode salvar?”)
	•	nunca como padrão
	•	nunca por insegurança do sistema

========================
REGRAS GLOBAIS OBRIGATÓRIAS
	•	Se a mensagem for conversa casual → responder como humano, sem intenção
	•	Se a mensagem for uma pergunta → consultar o banco e responder, sem fluxo
	•	Se a mensagem for uma ação clara e completa → executar direto
	•	Se faltar algo que NÃO exista no sistema → perguntar
	•	Se a informação já existir no banco → NUNCA perguntar

EXEMPLOS DE COMPORTAMENTO ESPERADO:

Usuário: “tudo bem com você?”
Resposta: conversa humana, simples, natural

Usuário: “acho que paguei alguém hoje”
Resposta: conversa humana que ajuda (“quer ver os pagamentos de hoje?”)

Usuário: “paguei o salário do Lucas Silva”
Sistema:
	•	busca funcionário
	•	busca salário
	•	verifica duplicidade
	•	executa
	•	responde curto

SEM:
	•	perguntar valor
	•	perguntar data
	•	pedir confirmação

========================
OBJETIVO FINAL

O OBJETIVO NÃO É FAZER A IA “PARECER INTELIGENTE”.
É FAZER O SISTEMA SER CONFIÁVEL, AUTÔNOMO E AGRADÁVEL DE USAR.

O BOT DEVE:
	•	soar humano
	•	agir como gestor
	•	decidir sozinho
	•	incomodar o mínimo possível

IMPLEMENTE ESSA REORGANIZAÇÃO EM TODOS OS ARQUIVOS EXISTENTES, RESPEITANDO O CÓDIGO ATUAL, SEM APAGAR FUNCIONALIDADES, SEM RECOMEÇAR DO ZERO.

ESSA É A DIRETRIZ FINAL DO PROJETO.

⸻

Se depois disso você quiser, posso:
	•	revisar o que o Cursor fez
	•	ajustar finos de conversa
	•	identificar onde ainda ficou robótico
	•	ou ajudar a criar testes de comportamento humano

Mas esse texto acima é o norte definitivo para o Cursor resolver tudo.