// Importa o módulo nativo 'http' do Node.js
const http = require('http');

// Define o endereço (localhost) e a porta onde o servidor vai escutar
const hostname = '127.0.0.1';
const port = 3000;

// Cria o servidor web
const server = http.createServer((req, res) => {
 if (req.url === '/' ) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end( '<h1>Página Inicial<h1>' ); // O return impede a execução das linhas de baixo

 }

 if (req.url === '/alunos' ) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end( '<h1>Lista de Alunos<h1>' ); 
 }

    // Define o status HTTP como 200 (OK) e o tipo de conteúdo como texto plano em UTF-8
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
 
  // Envia a resposta para o navegador/cliente
  res.end('<h1>Olá, alunos! O servidor Node.js está rodando com sucesso!\n<h1>');


});

// Faz o servidor começar a escutar na porta definida
server.listen(port, hostname, () => {
  console.log(`Servidor rodando em http://${hostname}:${port}/`);
});