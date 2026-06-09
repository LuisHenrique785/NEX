# NEX Inventory — Guia de Configuração

## 1. Banco de Dados (Supabase)

1. Acesse seu projeto Supabase: `https://supabase.com/dashboard/project/gjjwcpdkdqvfgephwulk`
2. Vá em **SQL Editor**
3. Copie e execute o conteúdo de `src/lib/database.sql`
4. Aguarde a criação das tabelas e bucket de storage

## 2. Configurar a Chave da API

1. No Supabase, vá em **Settings > API**
2. Copie a **anon key**
3. Abra o arquivo `src/config.ts`
4. Substitua `'COLOQUE_SUA_ANON_KEY_AQUI'` pela sua chave real

```ts
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...sua chave aqui...';
```

## 3. Configurar o PIN de Administrador

No arquivo `src/config.ts`, mude o `ADMIN_PIN` para um código seguro:

```ts
export const ADMIN_PIN = 'SEU_PIN_AQUI'; // só números, máximo 6 dígitos
```

## 4. Instalação e Execução

```bash
npm install
npx expo start
```

Escaneie o QR Code com o app **Expo Go** no celular.

## 5. Importar os NODOS

1. Abra o app
2. Na tela inicial, toque em **NOVOS NODOS**
3. Digite o PIN de administrador
4. Toque em **Sincronizar com Planilha**
5. Aguarde — o sistema vai buscar os NODOS e geocodificar os endereços

> ⚠️ A geocodificação usa o Nominatim (OpenStreetMap) — leva ~1 segundo por NODO para respeitar o rate limit.

## Estrutura do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `nodos` | Agências/pontos de distribuição |
| `sacas_movimentos` | Chegadas e expedições de sacas |
| `pacotes_expedicoes` | Expedições de pacotes (com dados do motorista) |
| `pacotes_inventario` | Inventário físico de pacotes |
| `svc_recebimentos` | Recebimentos no SVC |
| `svc_recebimentos_pacotes` | Pacotes dos recebimentos SVC |

## Fluxo de Uso

### Agência
1. Tela inicial → **Agências**
2. Selecionar o NODO (mostra os 1km mais próximos primeiro)
3. Escolher: **Inventário de Sacas** ou **Inventário de Pacotes**

### SVC
1. Tela inicial → **SVC**
2. **Recebimento de Pacotes**
3. Escanear/digitar/fotografar os pacotes

### Pendências
- Pacotes bipados ontem que não aparecem no inventário de hoje são exibidos como **pendência** no topo da tela de Inventário Físico
- Quando um pacote é expedido, ele sai do inventário ativo e não conta mais como pendência
