
//define o endereço do servidor (localhost) e a porta (3000) que o servidor irá escutar

const hostname = '127.0.0.1';
const port = 3000;

//cria o servidor e define a função de callback que será executada a cada requisição recebida

    const server = http.createServer((req, res) => {
    res.statusCode = 200; //define o status da resposta como 200 (OK) 
    res.setHeader('Content-Type', 'text/plain'); //define o tipo de conteúdo da resposta como texto simples
    res.end('Hello World\n'); //envia a resposta "Hello World" e finaliza a resposta
    });

// //faz o servidor escutar na porta e endereço definidos anteriormente
// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`); //exibe uma mensagem no console informando que o servidor está rodando
// });

// // Para executar o servidor, abra o terminal, navegue até o diretório onde o arquivo server.js está localizado e execute o comando: node server.js


// const server = http.createServer(() => {
// });

const nome = (a, b) => {
//   return a + b;
}