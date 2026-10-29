
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5500"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "infoportal",
    waitForConnections: true,
    connectionLimit: 10
});

// Testa a conexão
app.get("/api/status", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            sucesso: true,
            mensagem: "Servidor e banco conectados!"
        });
    } catch (erro) {
        console.error("Erro MySQL:", erro.message);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao conectar ao banco de dados."
        });
    }
});

// Cadastro
app.post("/api/cadastro", async (req, res) => {
    try {
        const {
            nome,
            email,
            dataNascimento,
            senha,
            confirmarSenha
        } = req.body;

        if (
            !nome || !email || !dataNascimento ||
            !senha || !confirmarSenha
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });
        }

        const nomeLimpo = nome.trim();
        const emailLimpo = email.trim().toLowerCase();

        if (!nomeLimpo || nomeLimpo.length > 150) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome inválido."
            });
        }

        if (
            emailLimpo.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "E-mail inválido."
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "A senha deve ter pelo menos 6 caracteres."
            });
        }

        if (senha !== confirmarSenha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "As senhas não coincidem."
            });
        }

        if (
            typeof dataNascimento !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Data de nascimento inválida."
            });
        }

        const data = new Date(`${dataNascimento}T00:00:00Z`);
        const hoje = new Date().toISOString().slice(0, 10);

        if (
            Number.isNaN(data.getTime()) ||
            data.toISOString().slice(0, 10) !== dataNascimento ||
            dataNascimento > hoje
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Data de nascimento inválida."
            });
        }

        const [existentes] = await pool.execute(
            "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
            [emailLimpo]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        await pool.execute(
            `INSERT INTO usuarios
            (nome, email, data_nascimento, senha)
            VALUES (?, ?, ?, ?)`,
            [nomeLimpo, emailLimpo, dataNascimento, senhaHash]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso!"
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        console.error("Erro no cadastro:", erro.message);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao realizar o cadastro."
        });
    }
});

app.listen(PORT, () => {
    console.log(`InfoPortal rodando em http://localhost:${PORT}`);
});
