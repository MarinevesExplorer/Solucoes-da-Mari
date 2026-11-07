# 🌱 Campo & Campus

**Do campo para o campus:** um app para os compradores dos campi do IFSP descobrirem quem são os **agricultores familiares da sua região** e quais alimentos do cardápio eles podem fornecer.

Ele nasceu de um problema bem real: as informações estavam espalhadas em várias planilhas soltas e num painel de BI. Juntei tudo numa consulta só, simples de usar, pensada para quem precisa montar uma compra da agricultura familiar (como no PNAE) e não sabe por onde começar. 🧺

---

## ✨ O que ele faz

- **Escolha o campus** e veja os fornecedores do município ou do **município + região imediata** (recorte geográfico do IBGE).
- **Busque por alimento ou por fornecedor**, e filtre pelo **status do CAF** (Cadastro Nacional da Agricultura Familiar).
- Marque **"Com contato"** para ver só quem tem e-mail ou telefone informado. Telefones viram link direto para o WhatsApp.
- **Panorama CATI**: um resumo do levantamento regional, com número de produtores familiares, produtos da região e organizações citadas.
- **Exportar consulta** para levar o resultado para a planilha de pesquisa de preços.
- Mostra **de onde veio cada informação** e o quanto o contato é confiável ("público na fonte", "compartilhado entre cadastros", "não localizado"...), para ninguém confundir possibilidade de fornecimento com garantia de entrega.

---

## 🔐 Sobre os dados deste repositório

A base real tem contatos de centenas de agricultores, muitos deles **pessoas físicas**, e parte veio de indicações recebidas por e-mail. Por respeito a eles (e à LGPD), **este repositório traz uma base de exemplo**:

- `data.json`: os **58 campi**, os **645 municípios de SP** com suas regiões imediatas (IBGE) e os **49 alimentos** do cardápio são reais. Os **12 fornecedores são fictícios** (todos com "Exemplo" no nome e e-mails no domínio reservado example.org).
- `cati.json`: números e produtos do levantamento regional por campus, com os **nomes das organizações trocados por exemplos**.

Assim dá para rodar o app de verdade e ver tudo funcionando, sem expor ninguém. 😉

---

## 🗂️ Fontes usadas para montar a base real

- [Painel de BI da Secretaria de Agricultura e Abastecimento do Estado de SP](https://app.powerbi.com/view?r=eyJrIjoiY2ZmNjM2NWUtMjQ2MS00ODQ4LWI1YTctOWJkZmViODQwNGJmIiwidCI6IjNhNzhiMGNkLTdjOGUtNDkyOS04M2Q1LTE5MGE2Y2MwMTM2NSJ9)
- [CAF: transparência do Cadastro Nacional da Agricultura Familiar (MDA)](https://www.gov.br/mda/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/cadastro-nacional-da-agricultura-familiar/transparencia)
- [CNPO: Cadastro Nacional de Produtores Orgânicos (MAPA)](https://www.gov.br/agricultura/pt-br/assuntos/sustentabilidade/organicos/cadastro-nacional-de-produtores-organicos-cnpo)
- Levantamento das regionais da **CATI** por campus
- [Municípios de SP e regiões imediatas (API de localidades do IBGE)](https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios)
- Chamadas públicas e contratos de agricultura familiar publicados por prefeituras e pelo Estado

---

## 🚀 Como rodar

É um site estático: só HTML, CSS e JavaScript, sem servidor e sem instalação.

1. Baixe esta pasta.
2. Como o app carrega os arquivos `.json`, abra com um servidor local (abrir o `index.html` direto no navegador não funciona). Por exemplo:
   ```bash
   python -m http.server 8000
   ```
   e acesse http://localhost:8000.
3. Para publicar, qualquer hospedagem de site estático serve, inclusive o **GitHub Pages**.

---

## 🧩 Como montar a sua base

Troque o `data.json` mantendo esta estrutura:

- `campi`: nome, município (`municipalityId` do IBGE) e região imediata (`regionId`) de cada campus;
- `municipalities`: municípios com `municipalityId`, `region` e `regionId`;
- `foods`: a lista de alimentos do cardápio;
- `suppliers`: um item por fornecedor, com `name`, `city`, `municipalityId`, `regionId`, `caf` e `cafStatus` (`registered`, `reported` ou `pending`), contatos, `contactQuality`, `sources` e `products` (cada produto com `food`, `sources` e `notes`).

O jeito mais fácil é olhar os fornecedores de exemplo e seguir o mesmo formato. 🙂

---

## 📁 Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura da página |
| `app.js` | Toda a lógica: filtros, busca, cálculo da região, cartões e exportação |
| `style.css` | Visual do app |
| `data.json` | Base de exemplo (campi, municípios, alimentos e fornecedores fictícios) |
| `cati.json` | Panorama regional da CATI por campus (organizações de exemplo) |

---

## 💚 Créditos

Feito por **Mari** ([@MarinevesExplorer](https://github.com/MarinevesExplorer)), nutricionista, para aproximar a agricultura familiar da alimentação estudantil do IFSP.

Os registros são **possibilidades de fornecimento**: confirme disponibilidade, entrega e CAF antes de contratar.

Fique à vontade para usar, copiar e adaptar para a sua rede, o seu município ou a sua escola. Se fizer uma versão sua, me conta! 🥰
