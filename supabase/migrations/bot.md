ARQUITETURA FINAL DO BOT COM AUTONOMIA REAL PARA CONSULTAS (QUERIES)

OBJETIVO
Transformar o bot em um gestor conversacional autônomo, capaz de responder perguntas consultando diretamente o banco de dados do usuário/empresa, sem criar fluxos, sem pedir confirmações e sem exigir que o usuário “ensine” o sistema.

PRINCÍPIO FUNDAMENTAL
PERGUNTAS NÃO GERAM FLUXO
PERGUNTAS NÃO GERAM CONFIRMAÇÃO
PERGUNTAS NÃO GERAM INTENÇÕES MUTÁVEIS

PERGUNTAS GERAM CONSULTAS DIRETAS AO BANCO E UMA RESPOSTA FINAL.

O BOT JÁ POSSUI ACESSO A:
	•	tenant_id
	•	user_id
	•	mode (pessoal ou empresa)
	•	empresa_id (quando modo empresa)
	•	todas as tabelas relacionadas ao usuário

PORTANTO, EM HIPÓTESE ALGUMA O BOT PODE RESPONDER SEM CONSULTAR O BANCO.

RESPONSABILIDADE DA IA (LLM)
A IA NÃO EXECUTA LÓGICA DE NEGÓCIO.
A IA APENAS CLASSIFICA A PERGUNTA E RETORNA UM JSON SIMPLES.

FORMATO PADRÃO DE SAÍDA DA IA:
{
intent: “query”,
query_type: “tipo_da_consulta”,
periodo: “opcional”,
filtros: {}
}

EXEMPLOS:
{
intent: “query”,
query_type: “funcionarios”
}

{
intent: “query”,
query_type: “pagamentos_funcionarios”,
periodo: “mes_atual”
}

TODA A INTELIGÊNCIA REAL FICA NO BACKEND.

REGRAS GERAIS PARA QUERIES
	•	Se o usuário não informar período, assumir automaticamente o mês atual
	•	“hoje” = data atual
	•	“esse mês” = mês corrente
	•	“ano” = ano corrente
	•	Nunca pedir confirmação para consulta
	•	Nunca depender do histórico da conversa
	•	Sempre responder com base no estado atual do banco

CONSULTAS DE FUNCIONÁRIOS (OBRIGATÓRIAS)
	1.	“quantos funcionários eu tenho?”

	•	Consultar tabela de funcionários da empresa
	•	Retornar COUNT(*)
	•	Responder com total e nomes

	2.	“quais funcionários eu já paguei?”

	•	Consultar pagamentos vinculados a funcionario_id
	•	Filtrar pelo mês atual
	•	Agrupar por funcionário
	•	Listar apenas funcionários pagos

	3.	“falta quantos funcionários para pagar esse mês?”

	•	Consultar todos os funcionários da empresa
	•	Consultar pagamentos do mês atual
	•	Calcular a diferença
	•	Retornar número + nomes

	4.	“quem eu ainda não paguei?”

	•	É sinônimo direto da consulta acima
	•	Reutilizar exatamente a mesma lógica

	5.	“quanto eu já paguei de salário esse mês?”

	•	Somar todos os gastos de categoria Funcionários / salário
	•	Filtrar pelo mês atual
	•	Retornar total

REGRA CRÍTICA DE CONSISTÊNCIA
SE UM PAGAMENTO FOI REGISTRADO COM FUNCIONARIO_ID, ELE DEVE APARECER EM TODAS AS CONSULTAS.
O BOT NÃO PODE RESPONDER “NÃO HÁ PAGAMENTOS” SE EXISTE REGISTRO NO BANCO.

NÃO EXISTE “CONTEXTO DE CONVERSA” PARA CONSULTAS
CONSULTAS SÃO SEMPRE:
	•	tenant_id
	•	empresa_id (se aplicável)
	•	banco de dados atual

SE UMA PERGUNTA PODE SER RESPONDIDA COM:
	•	COUNT
	•	SUM
	•	GROUP BY
	•	LISTAGEM

ENTÃO O BOT DEVE RESPONDER AUTOMATICAMENTE.

A EXPERIÊNCIA FINAL ESPERADA
O USUÁRIO FAZ UMA PERGUNTA COMO SE FALASSE COM UM GESTOR HUMANO.
O SISTEMA RESPONDE COMO UM DASHBOARD CONVERSACIONAL INTELIGENTE.

SEM ENSINAR
SEM CORRIGIR
SEM PERGUNTAR DE NOVO

ESSA ARQUITETURA É O QUE PERMITE ESCALA, AUTONOMIA E OPERAÇÃO GRANDE SEM AUMENTAR ATRITO.

IMPLEMENTAR ESSE PADRÃO PARA TODAS AS QUERIES A PARTIR DE AGORA, SEM EXCEÇÕES.