#!/usr/bin/env node

/**
 * Proxy Server para mineração de Monero via navegador
 * Conecta navegadores ao pool Monero Ocean
 *
 * Deploy:
 *   - Local: node proxy-server.js
 *   - Cloud: Render, Railway, Glitch (ver DEPLOY.md)
 *
 * Depois, atualize miner.js com a URL do proxy:
 *   - Local: ws://localhost:8181
 *   - Cloud: wss://seu-app.onrender.com
 */

const WebSocket = require("ws");
const net = require("net");
const crypto = require("crypto");

const MONERO_OCEAN = {
  host: "gulf.moneroocean.stream",
  port: 10128,
};

// 🔒 SEGURANÇA: Wallet fixa (controlada por você)
// Define via variável de ambiente no Render/Railway
const FIXED_WALLET =
  process.env.WALLET ||
  "49WSEYsxMnCH1f8S38sopVScBQ7tvkipz21yVrgtHeXoUGJASnykYHc9DhoVVCBN2X54rcateoGMf5CdeSbAe9sjBMXxUHx";

// Porta: usa variável de ambiente (cloud) ou padrão 8181 (local)
const WS_PORT = process.env.PORT || 8181;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Cria servidor WebSocket
const wss = new WebSocket.Server({
  port: WS_PORT,
  clientTracking: true,
  perMessageDeflate: false, // Melhor performance
  // Aumenta timeouts para manter conexões mais tempo
  handshakeTimeout: 30000, // 30s para handshake
  maxPayload: 5 * 1024 * 1024, // 5MB
});

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`✓ Monero Ocean Proxy Server`);
console.log(`✓ Porta: ${WS_PORT}`);
console.log(`✓ Pool: ${MONERO_OCEAN.host}:${MONERO_OCEAN.port}`);
console.log(`✓ Modo: ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}`);
console.log(
  `🔒 Wallet: ${FIXED_WALLET.substring(0, 12)}...${FIXED_WALLET.substring(FIXED_WALLET.length - 8)}`,
);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

let clientCount = 0;

wss.on("connection", (ws, req) => {
  clientCount++;
  const clientId = clientCount;
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  let clientWorkerId = null;

  console.log(`→ Cliente #${clientId} conectado de ${clientIp}`);

  let poolSocket = null;
  let loginData = null;
  let lastActivity = Date.now();
  let pingInterval = null;

  // Configura ping/pong para manter WebSocket ativo
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
    lastActivity = Date.now();
  });

  // Ping a cada 30 segundos para detectar conexões mortas
  pingInterval = setInterval(() => {
    if (ws.isAlive === false) {
      console.log(
        `⚠️  Cliente #${clientId} (${clientWorkerId}) não respondeu ao ping, desconectando`,
      );
      clearInterval(pingInterval);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(() => {});
  }, 30000);

  ws.on("message", (message) => {
    lastActivity = Date.now();

    try {
      const data = JSON.parse(message);

      // Login inicial
      if (data.type === "login") {
        loginData = data;
        clientWorkerId = data.workerId || `worker-${clientId}`;
        ws.workerId = clientWorkerId; // Salva no objeto ws para acesso posterior

        // 🔒 SEGURANÇA: Sobrescreve a wallet enviada pelo cliente
        // Sempre usa FIXED_WALLET (definida no servidor)
        const clientWallet = data.wallet;
        data.wallet = FIXED_WALLET;

        if (clientWallet !== FIXED_WALLET) {
          console.log(
            `⚠️  Cliente #${clientId} tentou usar wallet diferente (ignorado)`,
          );
        }

        // Conecta ao pool Monero Ocean
        poolSocket = net.createConnection({
          host: MONERO_OCEAN.host,
          port: MONERO_OCEAN.port,
        });

        poolSocket.on("connect", () => {
          console.log(`✓ Cliente #${clientId} conectado ao pool Monero Ocean`);
          console.log(`💰 Minerando para: ${FIXED_WALLET.substring(0, 12)}...`);
          console.log(`🆔 Worker ID: ${clientWorkerId}`);

          // Envia login ao pool com rigid (worker ID)
          const loginRequest = {
            id: 1,
            jsonrpc: "2.0",
            method: "login",
            params: {
              login: FIXED_WALLET, // ← Sempre SUA wallet
              pass: clientWorkerId, // Worker ID no campo pass para identificação
              rigid: clientWorkerId, // RigID para diferenciar workers no pool
              agent: "web-miner/1.0",
            },
          };

          poolSocket.write(JSON.stringify(loginRequest) + "\n");
        });

        poolSocket.on("data", (poolData) => {
          // Repassa dados do pool para o navegador
          ws.send(poolData.toString());

          // Log de shares aceitas (opcional)
          try {
            const response = JSON.parse(poolData.toString());
            if (response.result && response.result.status === "OK") {
              console.log(`✓ Cliente #${clientId} - Share aceita!`);
            }
          } catch (e) {
            // Ignora erros de parse
          }
        });

        poolSocket.on("error", (error) => {
          console.error(`❌ Cliente #${clientId} - Erro pool:`, error.message);
          ws.send(
            JSON.stringify({
              type: "error",
              error: error.message,
            }),
          );
        });

        poolSocket.on("close", () => {
          console.log(`✗ Cliente #${clientId} - Desconectado do pool`);
          ws.close();
        });
      }

      // Submissão de shares
      else if (data.type === "submit" && poolSocket) {
        poolSocket.write(JSON.stringify(data.params) + "\n");
      }

      // Keepalive para manter conexão ativa
      else if (data.type === "keepalive") {
        // Responde ao keepalive para manter WebSocket ativo
        lastActivity = Date.now();
        ws.isAlive = true;
        try {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          // Log menos verboso
          if (clientWorkerId) {
            console.log(
              `💓 Keepalive - Cliente #${clientId} (${clientWorkerId})`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Erro ao responder keepalive Cliente #${clientId}:`,
            error.message,
          );
        }
      }

      // Outros comandos
      else if (poolSocket) {
        poolSocket.write(JSON.stringify(data) + "\n");
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    const duration = ((Date.now() - lastActivity) / 1000).toFixed(1);
    console.log(
      `← Cliente #${clientId} (${clientWorkerId || "unknown"}) desconectado (ativo por ${duration}s)`,
    );
    if (poolSocket) {
      poolSocket.destroy();
    }
  });

  ws.on("error", (error) => {
    console.error(
      `❌ Cliente #${clientId} (${clientWorkerId}) - Erro WebSocket:`,
      error.message,
    );
  });
});

// Estatísticas periódicas (a cada 3 minutos)
setInterval(
  () => {
    const activeClients = wss.clients.size;
    if (activeClients > 0) {
      console.log(`📊 Clientes ativos: ${activeClients}`);

      // Lista workers ativos
      let workersList = [];
      wss.clients.forEach((client) => {
        if (client.workerId) {
          workersList.push(client.workerId);
        }
      });

      if (workersList.length > 0) {
        console.log(`👥 Workers ativos: ${workersList.join(", ")}`);
      }
    }
  },
  3 * 60 * 1000,
);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM recebido, encerrando...");
  wss.close(() => {
    console.log("✓ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

console.log("\n💡 Para conectar do navegador:");
console.log(`   Local: ws://localhost:${WS_PORT}`);
console.log(`   Cloud: wss://seu-app.onrender.com`);
console.log("\n📖 Ver DEPLOY.md para instruções de deploy na nuvem\n");
