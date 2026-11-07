/**
 * RECEITINHAS DA THAÍS — CONTROLE DE ACESSO POR GOOGLE SHEETS
 * Complemento da versão 9 (também prevê o bloco Receitas interativas).
 * Substitui Code.gs; preserva o Index.html original com o acervo.
 * Adicione um novo arquivo HTML Login.html.
 *
 * CONFIGURAÇÃO: informe seu e-mail e execute configurarSistema_() no editor.
 * NÃO publique antes de testar a filtragem com uma conta limitada.
 */
const RECEITINHAS_CONFIG = {
  EMAIL_ADMIN_INICIAL: 'seu_email_aqui@exemplo.com', // ALTERAR ANTES DE EXECUTAR configurarSistema
  SENHA_INICIAL_USUARIO: 'SENHA_PROVISORIA',
  ABA_USUARIOS: 'Usuarios',
  BLOQUEIO_MINUTOS: 15,
  MAX_TENTATIVAS: 5,
  SESSAO_SEGUNDOS: 21600, // 6 horas
  BLOCOS: [
    'Café da manhã', 'Lancheira', 'Almoço', 'Lanche da tarde',
    'Jantar', 'Festas saudáveis', 'Receitas infantis', 'Receitas interativas'
  ]
};
const COL = {EMAIL:1,NOME:2,PERFIL:3,ATIVO:4,TROCAR:5,HASH:6,SALT:7,TENTATIVAS:8,BLOQUEADO:9,VERSAO:10,ATUALIZADO:11,BLOCOS_INICIO:12};
const HEADERS = ['Email','Nome','Perfil','Ativo','Trocar senha','Hash da senha','Salt','Tentativas','Bloqueado até','Versão da sessão','Atualizado em'].concat(RECEITINHAS_CONFIG.BLOCOS);

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Login')
    .setTitle('Entrar | Receitinhas da Thaís')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // permite abrir dentro da página com o ícone (Netlify)
}

/** Execute uma única vez como proprietária no editor do Apps Script. */
function configurarSistema_() {
  const email = normalizarEmail_(RECEITINHAS_CONFIG.EMAIL_ADMIN_INICIAL);
  if (!email || email.includes('seu_email_aqui')) throw new Error('Defina EMAIL_ADMIN_INICIAL no Code.gs.');
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('RECEITINHAS_PLANILHA_ID');
  if (existing) return 'Sistema já configurado: ' + SpreadsheetApp.openById(existing).getUrl();
  const planilha = SpreadsheetApp.create('Receitinhas da Thaís — Controle de usuários');
  const aba = planilha.getSheets()[0];
  aba.setName(RECEITINHAS_CONFIG.ABA_USUARIOS);
  aba.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  aba.getRange(1,1,1,HEADERS.length).setBackground('#177c73').setFontColor('#ffffff').setFontWeight('bold');
  aba.setFrozenRows(1);
  aba.getRange('D2:E1000').insertCheckboxes();
  aba.getRange(2,COL.BLOCOS_INICIO,999,RECEITINHAS_CONFIG.BLOCOS.length).insertCheckboxes();
  aba.getRange(1,1,1000,HEADERS.length).setVerticalAlignment('middle');
  aba.setColumnWidth(1,260); aba.setColumnWidth(2,170);
  for(let i=3;i<=11;i++) aba.setColumnWidth(i,125);
  for(let i=12;i<=HEADERS.length;i++) aba.setColumnWidth(i,150);
  aba.getRange(1,1,1,HEADERS.length).createFilter();
  props.setProperty('RECEITINHAS_SEGREDO', Utilities.getUuid() + Utilities.getUuid());
  props.setProperty('RECEITINHAS_PLANILHA_ID',planilha.getId());
  const senhaAdmin = Utilities.getUuid().replace(/-/g,'')+'!Aa7';
  const cred = gerarCredencial_(senhaAdmin);
  const data = criarLinha_(email,'Administradora','ADMIN',true,true,cred,RECEITINHAS_CONFIG.BLOCOS,1);
  aba.getRange(2,1,1,HEADERS.length).setValues([data]);
  try {
    MailApp.sendEmail(email,'Acesso administrativo — Receitinhas da Thaís',
      'Sua senha administrativa provisória (uso único) é:\n\n'+senhaAdmin+
      '\n\nAo entrar, você precisará alterá-la.\nPlanilha: '+planilha.getUrl());
  } catch (erro) {
    throw new Error('Planilha criada em '+planilha.getUrl()+'. Não foi possível enviar a senha administrativa por e-mail. Não execute novamente: revise as autorizações do MailApp e use redefinirSenhaAdministradorPeloEditor_().');
  }
  return 'Planilha criada: '+planilha.getUrl()+' | Senha administrativa enviada por e-mail.';
}

/** Recuperação somente pelo editor, nunca pela interface pública. */
function redefinirSenhaAdministradorPeloEditor_() {
  const email = normalizarEmail_(RECEITINHAS_CONFIG.EMAIL_ADMIN_INICIAL);
  return comLock_(() => {
    const u = buscarUsuario_(email);
    if (!u || u.perfil!=='ADMIN') throw new Error('Administrador não encontrado.');
    const senha = Utilities.getUuid().replace(/-/g,'')+'!Aa7';
    const c = gerarCredencial_(senha);
    const v = u.valores.slice();
    v[COL.HASH-1]=c.hash; v[COL.SALT-1]=c.salt;
    v[COL.TROCAR-1]=true; v[COL.TENTATIVAS-1]=0; v[COL.BLOQUEADO-1]='';
    v[COL.VERSAO-1]=u.versao+1; v[COL.ATUALIZADO-1]=new Date();
    salvarLinha_(u.linha,v);
    MailApp.sendEmail(email,'Nova senha administrativa — Receitinhas da Thaís',
      'Senha provisória:\n\n'+senha+'\n\nTroque-a após entrar.');
    return 'Senha administrativa redefinida e enviada ao e-mail.';
  });
}

/**
 * Login SEM a trava geral: ler a planilha e conferir a senha não precisa de trava.
 * A trava só é usada para gravar (tentativas erradas, primeiro acesso ou desbloqueio),
 * e por pouco tempo. Assim um login lento não derruba o login das outras pessoas.
 */
function apiEntrar(email,senha) {
  const t0=Date.now();
  const mensagem='E-mail ou senha inválidos, conta inativa ou temporariamente bloqueada.';
  const u = buscarUsuario_(normalizarEmail_(email));
  console.log('apiEntrar: planilha lida em '+(Date.now()-t0)+' ms');
  if (!u || !u.ativo) throw new Error(mensagem);
  const agora=Date.now();
  if (u.bloqueadoAte > agora) throw new Error(mensagem);
  const s=String(senha||'');
  const valido = u.hash ? verificarSenha_(s,u.salt,u.hash)
    : s===RECEITINHAS_CONFIG.SENHA_INICIAL_USUARIO && u.perfil!=='ADMIN';
  const v=u.valores.slice();
  if(!valido){
    const falhas = (Number(v[COL.TENTATIVAS-1])||0)+1;
    v[COL.TENTATIVAS-1]=falhas>=RECEITINHAS_CONFIG.MAX_TENTATIVAS?0:falhas;
    v[COL.BLOQUEADO-1]=falhas>=RECEITINHAS_CONFIG.MAX_TENTATIVAS?
      new Date(agora+RECEITINHAS_CONFIG.BLOQUEIO_MINUTOS*60000):'';
    gravarLinhaRapido_(u.linha,v);
    throw new Error(mensagem);
  }
  const precisaGravar = !u.hash || (Number(v[COL.TENTATIVAS-1])||0)>0 || String(v[COL.BLOQUEADO-1]||'')!=='';
  if (!u.hash) {
    const c=gerarCredencial_(RECEITINHAS_CONFIG.SENHA_INICIAL_USUARIO);
    v[COL.HASH-1]=c.hash;v[COL.SALT-1]=c.salt;v[COL.TROCAR-1]=true;
  }
  if (precisaGravar) { v[COL.TENTATIVAS-1]=0;v[COL.BLOQUEADO-1]='';gravarLinhaRapido_(u.linha,v); }
  const token=criarSessao_(u.email,u.versao);
  console.log('apiEntrar: concluído em '+(Date.now()-t0)+' ms');
  return {token,usuario:{email:u.email,nome:u.nome,perfil:u.perfil,trocarSenha:verdadeiro_(v[COL.TROCAR-1]),blocos:u.blocos}};
}

/** Grava uma linha com trava curta; se a trava estiver ocupada, não bloqueia o login. */
function gravarLinhaRapido_(linha,v){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000)){console.warn('gravarLinhaRapido_: trava ocupada; gravação da linha '+linha+' não foi feita.');return false;}
  try{salvarLinha_(linha,v);return true;}finally{lock.releaseLock();}
}

function apiSessao(token) {
  const u=validarSessao_(token);
  return {email:u.email,nome:u.nome,perfil:u.perfil,trocarSenha:u.trocarSenha,blocos:u.blocos};
}

function apiTrocarSenha(token,senhaAtual,senhaNova) {
  return comLock_(() => {
    const u=validarSessao_(token);
    if(!verificarSenha_(String(senhaAtual||''),u.salt,u.hash)) throw new Error('Senha atual incorreta.');
    const nova=String(senhaNova||'');
    if(nova.length<10 || !/[a-z]/.test(nova)||!/[A-Z]/.test(nova)||!/[0-9]/.test(nova)||!/[^a-zA-Z0-9]/.test(nova))
      throw new Error('A nova senha deve ter 10 caracteres ou mais, com maiúscula, minúscula, número e símbolo.');
    if(nova===String(senhaAtual)) throw new Error('Escolha uma senha diferente da anterior.');
    const cred=gerarCredencial_(nova), v=u.valores.slice();
    v[COL.HASH-1]=cred.hash;v[COL.SALT-1]=cred.salt;v[COL.TROCAR-1]=false;
    v[COL.VERSAO-1]=u.versao+1;v[COL.TENTATIVAS-1]=0;v[COL.BLOQUEADO-1]='';v[COL.ATUALIZADO-1]=new Date();
    salvarLinha_(u.linha,v);
    apagarSessao_(token);
    return {token:criarSessao_(u.email,u.versao+1),usuario:{email:u.email,nome:u.nome,perfil:u.perfil,trocarSenha:false,blocos:u.blocos}};
  });
}

/** Devolve a tela de login/painel para os botões da página de receitas. */
function apiPaginaLogin(){return HtmlService.createHtmlOutputFromFile('Login').getContent();}

function apiSair(token) {apagarSessao_(token);return true;}

/** Acesso às receitas SOMENTE após validação. Conteúdo é filtrado ANTES de sair do servidor. */
function apiAbrirReceitas(token) {
  const u=validarSessao_(token);
  if(u.trocarSenha) throw new Error('Você precisa alterar a senha provisória antes de continuar.');
  const blocos = u.perfil==='ADMIN'?RECEITINHAS_CONFIG.BLOCOS:u.blocos;
  return filtrarHtmlReceitas_(HtmlService.createHtmlOutputFromFile('Index').getContent(),blocos,u.perfil==='ADMIN');
}

function apiListarUsuarios(token) {
  const admin=validarAdmin_(token);
  const vals=abaUsuarios_().getDataRange().getValues();
  return vals.slice(1).filter(r=>String(r[0]||'').trim())
    .map(r=>({email:normalizarEmail_(r[0]),nome:String(r[1]||''),perfil:String(r[2]||'USER'),ativo:verdadeiro_(r[3]),trocarSenha:verdadeiro_(r[4]),
      blocos:RECEITINHAS_CONFIG.BLOCOS.filter((x,i)=>verdadeiro_(r[COL.BLOCOS_INICIO-1+i]))}));
}

function apiSalvarUsuario(token,dados) {
  return comLock_(() => {
    validarAdmin_(token);
    dados=dados||{};
    const email=normalizarEmail_(dados.email);
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Digite um e-mail válido.');
    const nome=String(dados.nome||'').trim().slice(0,120);
    const blocos=RECEITINHAS_CONFIG.BLOCOS.filter(x=>Array.isArray(dados.blocos)&&dados.blocos.includes(x));
    const ativo=dados.ativo===true;
    const antigo=buscarUsuario_(email);
    if(antigo){
      if(antigo.perfil==='ADMIN') throw new Error('A conta administrativa não pode ser editada neste painel.');
      const v=antigo.valores.slice();
      v[COL.NOME-1]=nome;v[COL.ATIVO-1]=ativo;
      RECEITINHAS_CONFIG.BLOCOS.forEach((x,i)=>v[COL.BLOCOS_INICIO-1+i]=blocos.includes(x));
      v[COL.VERSAO-1]=antigo.versao+1;v[COL.ATUALIZADO-1]=new Date();
      salvarLinha_(antigo.linha,v);
    } else {
      const cred=gerarCredencial_(RECEITINHAS_CONFIG.SENHA_INICIAL_USUARIO);
      abaUsuarios_().appendRow(criarLinha_(email,nome,'USER',ativo,true,cred,blocos,1));
    }
    return {ok:true,email};
  });
}

function apiRedefinirSenha(token,email) {
  return comLock_(() => {
    validarAdmin_(token);
    const u=buscarUsuario_(normalizarEmail_(email));
    if(!u || u.perfil==='ADMIN') throw new Error('Conta não encontrada ou não permitida.');
    const cred=gerarCredencial_(RECEITINHAS_CONFIG.SENHA_INICIAL_USUARIO),v=u.valores.slice();
    v[COL.HASH-1]=cred.hash;v[COL.SALT-1]=cred.salt;v[COL.TROCAR-1]=true;
    v[COL.TENTATIVAS-1]=0;v[COL.BLOQUEADO-1]='';v[COL.VERSAO-1]=u.versao+1;v[COL.ATUALIZADO-1]=new Date();
    salvarLinha_(u.linha,v);
    return {ok:true};
  });
}

function filtrarHtmlReceitas_(html,blocos,admin) {
  const permitidos=new Set(RECEITINHAS_CONFIG.BLOCOS.filter(x=>blocos.includes(x)));
  const permitidoNome=(n)=>permitidos.has(blocoCanonico_(n));
  const marcador='window.RECEITAS=';
  const inicio=html.indexOf(marcador);
  const fim=inicio>=0?html.indexOf('];',inicio):-1;
  if(inicio<0 || fim<0) throw new Error('O formato do Index.html mudou; bloqueio de conteúdo não pôde ser verificado.');
  let receitas;
  try{receitas=JSON.parse(html.slice(inicio+marcador.length,fim+1));}catch(e){throw new Error('Falha de leitura do catálogo; nenhum conteúdo foi liberado.');}
  if(!Array.isArray(receitas)||!receitas.length) throw new Error('Catálogo inválido.');
  const autorizadas=receitas.filter(r=>{
    const categorias=Array.isArray(r.categories)?r.categories:[r.category];
    return categorias.some(c=>permitidoNome(c));
  }).map(r=>{
    const c=Object.assign({},r);
    const categorias=(Array.isArray(r.categories)?r.categories:[r.category]).filter(x=>permitidoNome(x));
    c.categories=categorias;c.category=categorias[0];
    // Não mostrar versões de livros que correspondam a blocos não liberados.
    c.alsoIn=(Array.isArray(r.alsoIn)?r.alsoIn:[]).filter(v=>{
      const b=blocoDaFonte_(v.source&&v.source.book);
      return b&&permitidos.has(b);
    });
    const origem=blocoDaFonte_(r.source&&r.source.book);
    if(!origem||!permitidos.has(origem))c.source={book:'Coleção autorizada',page:'—'};
    return c;
  });
  const ids=new Set(autorizadas.map(r=>String(r.id)));
  html=html.slice(0,inicio)+marcador+JSON.stringify(autorizadas)+html.slice(fim+1);
  let grupos=0;const totalGrupos=(html.match(/<section class="group" data-group="/g)||[]).length;
  html=html.replace(/<section class="group" data-group="([^"]+)">[\s\S]*?<\/section>/g,(sec,grupo)=>{
    grupos++;
    if(!permitidoNome(grupo))return '';
    return sec.replace(/<article class="tile" data-card="([^"]+)"[\s\S]*?<\/article>/g,(card,id)=>ids.has(id)?card:'');
  });
  if(!totalGrupos||grupos!==totalGrupos) throw new Error('A estrutura da galeria mudou; bloqueio de conteúdo não validado.');
  html=html.replace(/<button type="button" class="chip[^\"]*" data-category="([^"]+)"[\s\S]*?<\/button>/g,(tag,grupo)=>grupo==='Todas'||permitidoNome(grupo)?tag:'');
  // O script original da v9 tinha sete categorias fixas; torná-las dinâmicas.
  html=html.replace(/const sums=\{[^}]+\};allCards\.forEach\(/,
    "const sums=Object.fromEntries(qa('[data-group]').map(g=>[g.dataset.group,0]));allCards.forEach(");
  if(html.indexOf('const mainIds=')<0) html=html.replace("let allCards=qa('[data-card]');", "let allCards=qa('[data-card]');const mainIds=new Set(allCards.filter(c=>c.dataset.alias!=='1').map(c=>c.dataset.card));");
  html=html.replace("category==='Todas'?!isAlias:","category==='Todas'?(!isAlias||!mainIds.has(id)):");
  html=html.replace(/(<span class="head-count" id="header-count">)\d+ receitas/,'$1'+autorizadas.length+' receitas');
  // Botões do topo: voltam para a tela de login/painel sem recarregar o quadro (location.reload deixava a página em branco).
  const estilo='border:1px solid #cbded8;border-radius:10px;padding:7px 10px;background:white;color:#11655e;font-weight:700;cursor:pointer;margin-left:8px';
  const botao=(admin?'<button id="painel-acesso" type="button" onclick="receitinhasVoltar(false)" style="'+estilo+'">Painel</button>':'')+
    '<button id="senha-acesso" type="button" onclick="sessionStorage.setItem(\'receitinhas_abrir_troca\',\'1\');receitinhasVoltar(false)" style="'+estilo+'">Minha senha</button>'+
    '<button id="logout-acesso" type="button" onclick="receitinhasVoltar(true)" style="'+estilo+'">Sair</button>';
  html=html.replace(/(<span class="head-count" id="header-count">[^<]*<\/span>)/,'$1'+botao);
  const voltarJs='<script>function receitinhasVoltar(sair){var t=sessionStorage.getItem(\'receitinhas_token\')||\'\';if(sair){sessionStorage.removeItem(\'receitinhas_token\');sessionStorage.removeItem(\'receitinhas_abrir_troca\');if(t)google.script.run.apiSair(t);}google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){alert(\'Não foi possível voltar. Recarregue a página.\');}).apiPaginaLogin();}<\/script>';
  if(html.indexOf('</body>')<0) throw new Error('Estrutura da página mudou; botões de saída não puderam ser instalados.');
  html=html.replace('</body>',voltarJs+'</body>');
  // Confere se nenhuma receita fora dos blocos liberados ficou na pagina.
  const restantes=(html.match(/<article class="tile" data-card="[^"]+"/g)||[]).map(s=>s.split('data-card="')[1].slice(0,-1));
  if(restantes.some(id=>!ids.has(id))) throw new Error('Falha no filtro de receitas; nenhum conteúdo foi liberado.');
  return html;
}

function blocoCanonico_(nome) {
  const n=String(nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  if(n.includes('interativ')) return 'Receitas interativas';
  const k=RECEITINHAS_CONFIG.BLOCOS.find(b=>b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')===n);
  return k||nome;
}

function blocoDaFonte_(nome) {
  const s=String(nome||'').toLowerCase();
  if(s.includes('café')||s.includes('cafe da man'))return 'Café da manhã';
  if(s.includes('lancheira'))return 'Lancheira';
  if(s.includes('almoço')||s.includes('almoco'))return 'Almoço';
  if(s.includes('lanche da tarde'))return 'Lanche da tarde';
  if(s.includes('jantar'))return 'Jantar';
  if(s.includes('festas'))return 'Festas saudáveis';
  if(s.includes('infantil'))return 'Receitas infantis';
  if(s.includes('interativ'))return 'Receitas interativas';
  return null;
}

function criarLinha_(email,nome,perfil,ativo,trocar,cred,blocos,versao){
  return [email,nome,perfil,ativo,trocar,cred.hash,cred.salt,0,'',versao,new Date()]
    .concat(RECEITINHAS_CONFIG.BLOCOS.map(b=>blocos.includes(b)));
}
function planilhaId_(){const id=PropertiesService.getScriptProperties().getProperty('RECEITINHAS_PLANILHA_ID');if(!id)throw new Error('Sistema não configurado: execute configurarSistema_ no editor.');return id;}
function abaUsuarios_(){return SpreadsheetApp.openById(planilhaId_()).getSheetByName(RECEITINHAS_CONFIG.ABA_USUARIOS);}
function buscarUsuario_(email){
  if(!email)return null;
  const a=abaUsuarios_(),dados=a.getDataRange().getValues();
  for(let i=1;i<dados.length;i++){
    const v=dados[i]; if(normalizarEmail_(v[0])!==email)continue;
    const data=v[COL.BLOQUEADO-1],until=data instanceof Date?data.getTime():Date.parse(String(data||''))||0;
    return {linha:i+1,valores:v,email,nome:String(v[COL.NOME-1]||''),perfil:String(v[COL.PERFIL-1]||'USER').toUpperCase(),
      ativo:verdadeiro_(v[COL.ATIVO-1]),trocarSenha:verdadeiro_(v[COL.TROCAR-1]),hash:String(v[COL.HASH-1]||''),salt:String(v[COL.SALT-1]||''),
      bloqueadoAte:until,versao:Number(v[COL.VERSAO-1])||1,
      blocos:RECEITINHAS_CONFIG.BLOCOS.filter((b,j)=>verdadeiro_(v[COL.BLOCOS_INICIO-1+j]))};
  }
  return null;
}
function salvarLinha_(linha,v){abaUsuarios_().getRange(linha,1,1,HEADERS.length).setValues([v.slice(0,HEADERS.length)]);}
function normalizarEmail_(v){return String(v||'').trim().toLowerCase();}
function verdadeiro_(v){return v===true||String(v).toUpperCase()==='TRUE'||String(v).toUpperCase()==='VERDADEIRO';}
function comLock_(f){const lock=LockService.getScriptLock();lock.waitLock(15000);try{return f();}finally{lock.releaseLock();}}
function hex_(bytes){return bytes.map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function hashToken_(token){return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(token)));}
function gerarCredencial_(senha){const salt=Utilities.getUuid();return {salt,hash:hashSenha_(senha,salt)};}
function hashSenha_(senha,salt){const p=PropertiesService.getScriptProperties().getProperty('RECEITINHAS_SEGREDO');if(!p)throw new Error('Segredo não configurado.');return hex_(Utilities.computeHmacSha256Signature(salt+'|'+String(senha),p));}
function verificarSenha_(senha,salt,hash){return !!hash&&hashSenha_(senha,salt)===hash;}
function criarSessao_(email,versao){
  const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  CacheService.getScriptCache().put('r_'+hashToken_(token),JSON.stringify({email,versao}),RECEITINHAS_CONFIG.SESSAO_SEGUNDOS);
  return token;
}
function apagarSessao_(token){if(token)CacheService.getScriptCache().remove('r_'+hashToken_(token));}
function validarSessao_(token){
  if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token))throw new Error('Sessão inválida. Faça login novamente.');
  const txt=CacheService.getScriptCache().get('r_'+hashToken_(token));
  if(!txt)throw new Error('Sessão expirada. Faça login novamente.');
  const sess=JSON.parse(txt),u=buscarUsuario_(sess.email);
  if(!u||!u.ativo||u.versao!==sess.versao)throw new Error('Seu acesso foi alterado. Faça login novamente.');
  return u;
}
function validarAdmin_(token){const u=validarSessao_(token);if(u.perfil!=='ADMIN'||u.trocarSenha)throw new Error('Acesso administrativo não permitido.');return u;}
