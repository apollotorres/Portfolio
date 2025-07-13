// Local do arquivo: netlify/functions/chat.js

/**
 * Esta é uma Função Serverless da Netlify.
 * Ela atua como um intermediário seguro (backend) entre o seu site (front-end)
 * e a API da Gemini.
 *
 * O fluxo é:
 * 1. O JavaScript do seu site envia a pergunta do usuário para esta função.
 * 2. Esta função recebe a pergunta.
 * 3. Ela adiciona a sua chave secreta da API (que só ela conhece).
 * 4. Ela envia a pergunta + chave para a API do Google Gemini.
 * 5. Ela recebe a resposta da IA.
 * 6. Ela envia a resposta de volta para o JavaScript do seu site, que a exibe na tela.
 */
export const handler = async (event) => {
    // Pega a chave de API das "Environment Variables" da Netlify.
    // Este é o método seguro, a chave nunca fica exposta no código.
    const apiKey = process.env.GEMINI_API_KEY;

    // Se a chave não estiver configurada no painel da Netlify, retorna um erro claro.
    if (!apiKey) {
        console.error("A chave de API do Gemini não foi encontrada.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erro de configuração no servidor: A chave de API não foi definida." })
        };
    }

    // URL da API do Google Gemini. Usamos o modelo 'gemini-1.5-flash' que é rápido e eficiente.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    try {
        // Pega o "prompt" completo que foi enviado pelo JavaScript do seu site.
        // O 'event.body' vem como uma string, então precisamos convertê-lo para um objeto JSON.
        const { prompt } = JSON.parse(event.body);

        // Se o prompt estiver vazio por algum motivo, retorna um erro.
        if (!prompt) {
             return { statusCode: 400, body: JSON.stringify({ error: "Nenhum prompt foi fornecido." }) };
        }

        // Faz a chamada para a API da Gemini usando 'fetch'.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Monta o corpo da requisição no formato que a API da Gemini espera.
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        // Se a resposta da API do Google não for bem-sucedida (ex: erro 400, 500),
        // nós capturamos o erro para dar uma resposta mais clara.
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Erro da API Gemini:", errorBody);
            throw new Error(`A chamada para a API falhou com o status ${response.status}`);
        }

        // Converte a resposta bem-sucedida para JSON.
        const data = await response.json();

        // Verificação de segurança para garantir que a resposta veio no formato esperado.
        if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
             console.error("Formato de resposta inesperado da API:", data);
             throw new Error("A resposta da API da Gemini não veio no formato esperado.");
        }
        
        // Extrai o texto da resposta da IA.
        const botResponse = data.candidates[0].content.parts[0].text;

        // Retorna a resposta da IA para o seu site com o status de sucesso (200).
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: botResponse })
        };

    } catch (error) {
        // Se qualquer parte do bloco 'try' falhar, este bloco 'catch' será executado.
        console.error("Erro na função serverless:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Ocorreu um erro interno ao processar sua solicitação." })
        };
    }
};