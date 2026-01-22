E NUNCA:
	•	puxar contexto anterior
	•	sugerir ações passadas
	•	mencionar gastos, funcionários ou compromissos antigos

Exemplo proibido:

“Quer que eu lance aquele pagamento de novo?”

⸻

5. EXECUÇÃO DIRETA (SEM CONFIRMAÇÃO)

Se a mensagem contém:
	•	verbo de ação
	•	valor
	•	descrição clara

O sistema deve salvar diretamente, sem pedir confirmação.

Exemplos:
	•	“lança conta de água que paguei hoje 120”
	•	“paguei internet 99 reais”
	•	“gastei 50 no mercado”

NUNCA perguntar:
	•	“foi hoje?”
	•	“qual mês?”
	•	“qual empresa?”
	•	“qual forma de pagamento?”

⸻

6. CONFIRMAÇÃO SÓ QUANDO O USUÁRIO PEDIR

O sistema NÃO pede confirmação por padrão.

Só usar confirmação se o usuário disser algo como:
	•	“confirma”
	•	“posso salvar assim?”
	•	“tá certo?”

Caso contrário: executa e encerra.

⸻

7. FUNCIONÁRIOS – REGRA DE AUTONOMIA

Quando o usuário disser:

“paguei o salário do funcionário Lucas Silva”

O sistema deve:
	1.	Buscar o funcionário pelo nome
	2.	Puxar automaticamente o salario_base
	3.	Registrar o pagamento
	4.	Vincular corretamente ao funcionário
	5.	Lançar o gasto na categoria Funcionários
	6.	Marcar como pago no controle mensal
	7.	Confirmar UMA VEZ
	8.	Encerrar o assunto

É PROIBIDO:
	•	perguntar valor se já existir salário cadastrado
	•	registrar como “sem funcionário”
	•	pedir data se não for essencial

⸻

8. CONSULTAS DEVEM SER AUTÔNOMAS

Perguntas como:
	•	“quantos funcionários eu tenho?”
	•	“quem já foi pago esse mês?”
	•	“quem falta pagar?”
	•	“quanto paguei de salário este mês?”

Devem:
	•	Consultar diretamente o banco
	•	Assumir período “mês atual” se não informado
	•	Retornar resposta completa
	•	NÃO pedir esclarecimento adicional

⸻

9. PROIBIÇÕES ABSOLUTAS

O sistema NUNCA deve:
	•	Repetir a mesma pergunta
	•	Perguntar algo já respondido
	•	Pedir data em formato técnico
	•	Pedir ISO, timezone, cidade
	•	Transformar conversa em formulário
	•	Insistir após “não” ou “sem”

⸻

10. FRASE-REGRA PARA TODA DECISÃO

Antes de qualquer resposta, o bot deve se comportar como se perguntasse internamente:

“Um humano normal perguntaria isso agora?”

Se a resposta for não, então NÃO PERGUNTAR.

⸻

RESULTADO ESPERADO

Após essa refatoração:
	•	O bot conversa de forma natural
	•	Executa rápido
	•	Para quando deve parar
	•	Não cansa o usuário
	•	Não parece burro
	•	Não exige que o usuário “eduque” o sistema

Esse comportamento deve ser aplicado em todas as páginas, todos os fluxos e todos os domínios (agenda, financeiro, listas, empresa).

⸻

Se depois disso o bot ainda insistir, repetir ou travar em loops, aí o problema não é mais de prompt, é de estado mal controlado no código — e aí sim vale revisar pontualmente os handlers.

Mas com esse texto, o Cursor já tem tudo que precisa para corrigir o comportamento geral.

Se quiser, no próximo passo eu posso:
	•	auditar onde isso quebra no seu código atual
	•	ou transformar isso em regras de estado explícitas (idle, executed, closed)

Agora, finalmente, isso está bem definido.