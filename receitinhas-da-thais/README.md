# 🥣 Receitinhas da Thaís

Um app web simples e acolhedor para entregar receitas a pacientes, **liberando os blocos de receitas aos poucos**, conforme cada pessoa evolui no acompanhamento nutricional.

Feito em **Google Apps Script** + **Google Sheets**: não precisa de servidor, banco de dados nem mensalidade. Se você tem uma conta Google, você consegue colocar o seu no ar. 💚

---

## ✨ O que ele faz

- **Login por e-mail e senha**, com troca obrigatória da senha provisória no primeiro acesso.
- **Acesso por blocos**: cada pessoa vê só os blocos de receitas que foram liberados para ela.
- **Painel da administradora** para cadastrar pessoas, ativar/desativar contas, marcar os blocos de cada uma e redefinir senhas.
- **Galeria com fotos**, busca por nome ou ingrediente, modo de preparo, lista de compras, receitas favoritas e marcação de "receita feita".
- Funciona bem no celular e pode ser **adicionado à tela inicial** como se fosse um aplicativo.

### Os 8 blocos de receitas

☀️ Café da manhã · 🎒 Lancheira · 🍽️ Almoço · 🥪 Lanche da tarde · 🌙 Jantar · 🎉 Festas saudáveis · 🧸 Receitas infantis · 🧩 Receitas interativas

Na prática, a nutricionista começa liberando um ou dois blocos e vai abrindo os outros à medida que o paciente avança. Cada novo bloco liberado vira um pequeno "presente" de evolução. 🎁

---

## 🎁 O que está aberto neste repositório

As receitas são da **Thaís**. Este repositório compartilha a **solução**, não o acervo completo.

O arquivo `Index.html` daqui traz **só o bloco Receitas interativas** (103 receitas, com fotos), que a Thaís liberou para todo mundo. É o suficiente para você rodar o app de verdade, ver o login, o painel e o filtro por blocos funcionando, e depois trocar pelo seu próprio acervo.

Os outros blocos continuam exclusivos dos pacientes dela. 😉

---

## 🔒 Segurança (do jeito que deu pra fazer no Apps Script)

- Senhas guardadas como **HMAC-SHA256 com salt** por usuário e um segredo nas Propriedades do script. Nenhuma senha fica em texto na planilha.
- Sessão por **token aleatório** guardado no CacheService (6 horas). Alterar o cadastro de alguém derruba as sessões antigas dessa pessoa.
- **5 tentativas erradas** bloqueiam a conta por 15 minutos.
- Senha nova com no mínimo 10 caracteres, maiúscula, minúscula, número e símbolo.
- **O filtro roda no servidor**: o navegador só recebe as receitas dos blocos liberados. Se a estrutura do `Index.html` não for a esperada, o app prefere não liberar nada a liberar demais.

---

## 🚀 Como colocar o seu no ar

1. Acesse [script.google.com](https://script.google.com) e crie um **novo projeto**.
2. Crie os arquivos `Código.gs`, `Login.html` e `Index.html` e cole o conteúdo de cada um. Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto" e cole o `appsscript.json`.
3. No `Código.gs`, troque `seu_email_aqui@exemplo.com` pelo seu e-mail (você será a administradora).
4. Troque `SENHA_PROVISORIA` pela senha provisória que quiser dar às pessoas, **no `Código.gs` e no `Login.html`** (ela aparece nos textos do painel).
5. Rode a configuração inicial. Como `configurarSistema_` é privada, ela não aparece no menu Executar. Crie uma função temporária:
   ```js
   function CONFIGURAR_UMA_VEZ(){ return configurarSistema_(); }
   ```
   Salve, execute, autorize. Depois **apague essa função e salve de novo**. Ela cria a planilha de usuários e manda a sua senha de administradora por e-mail.
6. **Implantar → Nova implantação → App da Web**, com "Executar como: Eu" e "Quem pode acessar: Qualquer pessoa com uma Conta do Google".
7. Abra o link, entre com seu e-mail e a senha que chegou por e-mail, troque a senha e comece a cadastrar as pessoas. ✅

Para publicar ajustes depois, use **Implantar → Gerenciar implantações → Editar → Nova versão**. Assim o link não muda.

---

## 🍳 Usando o seu próprio acervo

O `Index.html` precisa manter a mesma estrutura:

- um catálogo `window.RECEITAS=[...]`, em que cada receita tem `id` e `categories` com o nome dos blocos;
- uma `<section class="group" data-group="Nome do bloco">` por bloco;
- uma ficha `<article class="tile" data-card="ID">` por receita.

Dica: o editor do Apps Script não gosta de arquivos muito grandes. Fotos em **WebP de 360 px** deixam o acervo leve. Com mais de 400 receitas, o nosso ficou em torno de 6 MB.

---

## 📁 Arquivos

| Arquivo | Para que serve |
|---|---|
| `Código.gs` | Servidor: login, sessões, painel de usuários e filtro de receitas por bloco |
| `Login.html` | Tela de entrada, troca de senha e painel da administradora |
| `Index.html` | Acervo de exemplo (só Receitas interativas) |
| `appsscript.json` | Configurações do projeto (fuso horário e implantação) |

---

## 💛 Créditos

- **Receitas:** Thaís, nutricionista. Obrigada por abrir as Receitas interativas para todo mundo!
- **Solução:** Mari ([@MarinevesExplorer](https://github.com/MarinevesExplorer)), com uma boa ajuda do Claude.

Fique à vontade para usar, copiar e adaptar. Se fizer uma versão sua, me conta! 🥰
