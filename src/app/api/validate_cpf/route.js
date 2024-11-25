import { NextResponse } from "next/server";
import mysql from "mysql2/promise"; // Usando mysql2/promise para simplificar as operações assíncronas

// Configuração de conexão com o banco (para desenvolvimento)
const pool = mysql.createPool({
  host: "104.154.206.126", // Substitua pelo host real do banco de dados
  user: "claudio", // Substitua pelo seu usuário
  password: "310102", // Substitua pela senha do banco
  database: "cpf-api", // Substitua pelo nome do banco de dados
  waitForConnections: true, // Aguarda conexões se o número de conexões for excedido
  connectionLimit: 10, // Número de conexões simultâneas
});

export async function POST(req) {
  try {
    console.log("Recebendo requisição...");

    // Testando a conexão com o banco de dados
    await pool.query("SELECT 1");
    console.log("Conexão com o banco bem-sucedida.");

    // Pegando o corpo da requisição
    const { cpf } = await req.json();
    console.log("CPF recebido:", cpf);

    // Validação básica do CPF
    if (!cpf || cpf.length !== 11) {
      console.warn("CPF inválido.");
      return NextResponse.json(
        { authorized: false, error: "CPF inválido" },
        { status: 400 }
      );
    }

    // Consulta ao banco de dados
    const [results] = await pool.query("SELECT * FROM cpfs WHERE cpf = ?", [cpf]);
    console.log("Resultados da consulta:", results);

    if (results.length > 0) {
      const record = results[0]; // Como só há um CPF por registro, usa-se o primeiro resultado
      if (record.paid) {
        console.log("CPF autorizado e está pago.");
        return NextResponse.json({
          authorized: true,
          message: "CPF autorizado e está pago.",
        });
      } else {
        console.warn("CPF encontrado, mas não está pago.");
        return NextResponse.json({
          authorized: false,
          error: "CPF encontrado, mas não está pago.",
        });
      }
    } else {
      console.warn("CPF não encontrado.");
      return NextResponse.json(
        {
          authorized: false,
          error: "CPF não encontrado.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Erro detectado:", error);

    // Verifica se o erro é relacionado à conexão com o banco
    if (error.code === "PROTOCOL_CONNECTION_LOST" || error.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          authorized: false,
          error: "Banco de dados não acessível. Tente novamente mais tarde.",
        },
        { status: 503 } // Status 503 indica serviço temporariamente indisponível
      );
    }

    // Retorna erros inesperados
    return NextResponse.json(
      {
        authorized: false,
        error: `Erro inesperado no servidor: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

// Configuração para ajustar o tempo limite, se necessário
export const config = {
  maxDuration: 10, // Tempo limite em segundos (ajuste conforme o necessário)
};
