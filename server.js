
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CONFIGURAÇÕES DO SERVIDOR
// ========================================

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://127.0.0.1:5500",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "infoportal-chave-local-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000
    }
}));

// ========================================
// CONEXÃO COM O MYSQL
// ========================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "infoportal",
    waitForConnections: true,
    connectionLimit: 10
});

// ========================================
// VERIFICAR LOGIN
// ========================================

function verificarLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Você precisa fazer login."
        });
    }

    next();
}

// ========================================
// VERIFICAR PERFIL DE JORNALISTA
// ========================================

function verificarJornalista(req, res, next) {
    if (req.session.usuario.perfil !== "jornalista") {
        return res.status(403).json({
            sucesso: false,
            mensagem: "Apenas jornalistas podem publicar notícias."
        });
    }

    next();
}

// ========================================
// TESTAR CONEXÃO
// ========================================

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

// ========================================
// CADASTRO
// ========================================

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

// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha o e-mail e a senha."
            });
        }

        const emailLimpo = email.trim().toLowerCase();

        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, senha, perfil
             FROM usuarios
             WHERE email = ?
             LIMIT 1`,
            [emailLimpo]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const usuario = usuarios[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "E-mail ou senha incorretos."
            });
        }

        req.session.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        };

        return res.status(200).json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!",
            usuario: req.session.usuario
        });

    } catch (erro) {
        console.error("Erro no login:", erro.message);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao realizar login."
        });
    }
});

// ========================================
// PUBLICAR NOTÍCIA
// ========================================

app.post(
    "/api/noticias",
    verificarLogin,
    verificarJornalista,
    async (req, res) => {
        try {
            const {
                titulo,
                categoria,
                tags,
                imagem,
                resumo,
                conteudo,
                acao
            } = req.body;

            if (
                !titulo?.trim() ||
                !categoria ||
                !resumo?.trim() ||
                !conteudo?.trim()
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os campos obrigatórios."
                });
            }

            const categoriasPermitidas = [
                "politica",
                "economia",
                "tecnologia",
                "esportes",
                "cultura",
                "saude"
            ];

            if (!categoriasPermitidas.includes(categoria)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Categoria inválida."
                });
            }

            if (!["rascunho", "revisao"].includes(acao)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Ação inválida."
                });
            }

            if (titulo.trim().length > 200 || resumo.trim().length > 300) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "O título ou resumo ultrapassou o limite permitido."
                });
            }

            const status = acao === "rascunho"
                ? "RASCUNHO"
                : "EM_REVISAO";

            await pool.execute(
                `INSERT INTO noticias
                (titulo, categoria, tags, imagem, resumo, conteudo, autor_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    titulo.trim(),
                    categoria,
                    tags || null,
                    imagem || null,
                    resumo.trim(),
                    conteudo.trim(),
                    req.session.usuario.id,
                    status
                ]
            );

            return res.status(201).json({
                sucesso: true,
                mensagem: status === "RASCUNHO"
                    ? "Rascunho salvo com sucesso!"
                    : "Notícia enviada para revisão!"
            });

        } catch (erro) {
            console.error("Erro ao publicar notícia:", erro.message);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao salvar a notícia."
            });
        }
    }
);

// ========================================
// SAIR DA CONTA
// ========================================

app.post("/api/logout", (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível sair da conta."
            });
        }

        res.clearCookie("connect.sid");

        return res.json({
            sucesso: true,
            mensagem: "Logout realizado com sucesso!"
        });
    });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(`InfoPortal rodando em http://localhost:${PORT}`);
});
