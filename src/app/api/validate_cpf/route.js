import { NextResponse } from "next/server";
import mysql from 'mysql2';

// Configuração de conexão com o banco (para desenvolvimento)
const connection = mysql.createPool({
  host: '104.154.206.126', // Substitua pelo host real do banco de dados
  user: 'claudio', // Substitua pelo seu usuário
  password: '310102', // Substitua pela senha do banco
  database: 'cpf-api', // Substitua pelo nome do banco de dados
  waitForConnections: true, // Aguarda conexões se o número de conexões for excedido
  connectionLimit: 10, // Número de conexões simultâneas
});

export async function POST(req) {
  try {
    // Teste simples para verificar se o banco está acessível
    await new Promise((resolve, reject) => {
      connection.query('SELECT 1', (error, results) => {
        if (error) {
          reject(error); // Se ocorrer erro ao verificar a conexão, rejeita a promessa
        }
        resolve(results);
      });
    });

    // Pegando o corpo da requisição (o CPF)
    const { cpf } = await req.json();

    if (!cpf || cpf.length !== 11) {
      return NextResponse.json({ authorized: false, error: 'CPF inválido' }, { status: 400 });
    }

    // Realiza a consulta ao banco de dados
    return new Promise((resolve, reject) => {
      connection.query('SELECT * FROM cpfs WHERE cpf = ?', [cpf], (error, results) => {
          if (error) {
              reject(new Error('Erro no servidor'));
          } else if (results.length > 0) {
              const record = results[0]; // Como só há um CPF por registro, usa-se o primeiro resultado
              if (record.paid) {
                  resolve(
                      NextResponse.json({
                          authorized: true,
                          message: 'CPF autorizado e está pago.',
                      })
                  );
              } else {
                  resolve(
                      NextResponse.json({
                          authorized: false,
                          error: 'CPF encontrado, mas não está pago.',
                      })
                  );
              }
          } else {
              resolve(
                  NextResponse.json(
                      {
                          authorized: false,
                          error: 'CPF não encontrado.',
                      },
                      { status: 404 }
                  )
              );
          }
      });
  });
  } catch (error) {
    console.error('Erro detectado:', error);  // Adicionando log para capturar o erro real no servidor

    // Se o banco não estiver acessível, retorna uma mensagem amigável
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        authorized: false,
        error: 'Banco de dados não acessível. Tente novamente mais tarde.'
      }, { status: 503 }); // Status 503 indica serviço temporariamente indisponível
    }
    
    // Outros erros, incluindo falhas de consulta ao banco
    return NextResponse.json({
      authorized: false,
      error: `Erro inesperado no servidor: ${error.message}`
    }, { status: 500 });
  }
}
