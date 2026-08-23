# Foco Gentil

Gerador de simulados de prova com questões dissertativas, feito a partir de material didático próprio. Pensado para crianças neurodivergentes (TDAH, dislexia): uma questão por vez, fonte legível, leitura em voz alta, sem cronômetro de pressão, e nada se perde se a página for fechada no meio.

Foi criado para uso pessoal (um pai adaptando o material de estudo da própria filha) e publicado aqui para que outras famílias possam usar ou adaptar a ideia.

## Estrutura

```
fontes/              conteúdo didático original (Geografia, Língua Portuguesa)
data/
  questions/          banco de questões extraídas/adaptadas de cada matéria
  exams/               um simulado por matéria (exam1.json = Geografia, exam2.json = Língua Portuguesa)
  image_prompts.md    prompts prontos para gerar imagens e ícones no Grok Imagine
site/                 o site em si (HTML/CSS/JS puro, sem build/SDK)
  login.html          tela de login (Cognito)
  materias.html       escolha da matéria (depois do login)
  index.html          boas-vindas da matéria escolhida (exige sessão válida)
  exam.html           simulado, uma questão por vez
  data/exam*.json     cópias dos simulados usadas pelo site (mantenha sincronizadas com data/exams/)
  assets/images/       imagens de apoio às questões (Grok Imagine)
  assets/icons/         ícones de cada matéria, usados em materias.html (Grok Imagine)
  js/auth.js           login/sessão via API pública do Cognito (sem SDK)
  js/materias.js        catálogo de matérias (nome, ícone, simulado) usado por materias.html/index.html/app.js
  js/config.example.js modelo de configuração (config.js real é gerado pelo deploy e não vai pro git)
infra/
  template.yaml       CloudFormation: S3, CloudFront, Cognito, DynamoDB, Lambda, API
  lambda/submit_answers/handler.py   código da Lambda (mesma versão embutida no template)
  deploy.ps1 / deploy.sh   scripts de deploy (Windows / CI-Linux)
```

## Arquitetura

- **Frontend**: HTML/CSS/JS puro, hospedado em S3 + servido via CloudFront (HTTPS).
- **Autenticação**: Amazon Cognito (User Pool). O login chama a API pública do Cognito (`InitiateAuth`) diretamente via `fetch`, sem SDK/bundler — token guardado em `sessionStorage`. Sem autocadastro: cada aluno é criado manualmente (ver "Criando o usuário do aluno" abaixo).
- **API**: API Gateway (HTTP API) com um autorizador JWT ligado ao User Pool — qualquer requisição sem token válido é rejeitada com `401` antes de chegar na Lambda.
- **Backend**: uma função Lambda (Python) que lê a identidade do aluno a partir do token já validado (claim `sub`), nunca de um campo digitado no navegador, e grava cada tentativa:
  - no **DynamoDB** (partition key `alunoId`, sort key `tentativaId`) — fonte de verdade, já separada por aluno;
  - e também no **S3** (bucket de respostas), como redundância/histórico.
- Tudo serverless (sem EC2): S3, CloudFront, Cognito, API Gateway, Lambda e DynamoDB.

## Rodando localmente

```bash
cd site
python -m http.server 8765
```

Abra `http://localhost:8765/login.html`. Sem `site/js/config.js` (gerado só pelo deploy — veja abaixo), o login não tem como se conectar ao Cognito real; para testar o fluxo de perguntas sem AWS, abra `exam.html` direto — sem token, o envio final mostra o payload no console em vez de enviar de verdade.

## Como funciona o envio das respostas

1. O(a) estudante faz login em `login.html` (usuário/senha do Cognito).
2. Responde uma questão por vez em `exam.html`; cada resposta é salva automaticamente no `localStorage` do navegador.
3. Ao finalizar, o site faz um `POST` autenticado (`Authorization: Bearer <token>`) para a API com `{ prova, data, respostas: [{ pergunta, resposta }, ...] }`.
4. A Lambda valida o token (feito pelo API Gateway antes mesmo dela rodar), identifica o aluno pelo `sub` do token, e grava a tentativa no DynamoDB e no S3.
5. A correção não é automática — os dados ficam guardados para serem lidos/corrigidos depois.

## Deploy na AWS

Pré-requisito: AWS CLI configurado (`aws sts get-caller-identity` funcionando).

```powershell
powershell -File infra/deploy.ps1
```

Isso cria/atualiza a stack CloudFormation (nome padrão `focogentil`: S3, CloudFront, Cognito, DynamoDB, Lambda, API), grava a configuração real (URL da API + dados do Cognito) em `site/js/config.js` (arquivo gitignorado — nunca é commitado), sincroniza `site/` para o bucket S3 e invalida o cache do CloudFront. No final, imprime a URL do site e o comando para criar o usuário do aluno.

Para reimplantar depois de qualquer mudança no site ou nas questões, rode o mesmo comando de novo.

### Criando o usuário do aluno

Não existe cadastro público — cada aluno é um usuário criado manualmente no Cognito (o `deploy.ps1` imprime esse comando no final, com o `user-pool-id` já preenchido):

```bash
aws cognito-idp admin-create-user --user-pool-id <ID> --username <usuario> --message-action SUPPRESS --region us-east-1
aws cognito-idp admin-set-user-password --user-pool-id <ID> --username <usuario> --password "<senha>" --permanent --region us-east-1
```

## Adicionando uma nova matéria (ou trocando as questões de uma existente)

1. Edite os bancos em `data/questions/*.json` (adicione novas questões extraídas do seu material) ou crie um novo arquivo.
2. Monte o JSON do simulado em `data/exams/` (20 questões, com `id`, `materia`, `capitulo`, `pergunta` e `imagem` opcional) e copie para `site/data/`.
3. Adicione uma entrada nova em `site/js/materias.js` (`id`, `nome`, `emoji`, `icone`, `examUrl`, `descricao`) — ela aparece automaticamente na tela de escolha de matéria.
4. Se alguma questão pedir imagem, ou quiser um ícone para a matéria, veja `data/image_prompts.md` para o padrão de prompt e onde salvar o arquivo gerado (`site/assets/images/` ou `site/assets/icons/`). Sem o ícone gerado ainda, a tela usa um emoji como alternativa — nada quebra.
5. Rode `infra/deploy.ps1` (ou faça merge em `main` — o CI cuida do resto) para publicar.

## CI/CD

Fluxo de branches: trabalho acontece em `develop`, e o merge em `main` implanta automaticamente.

- **`develop` → PR para `main`**: workflow [`validate.yml`](.github/workflows/validate.yml) roda `cfn-lint` nos templates CloudFormation e valida o JSON dos bancos de questões/simulados. Não precisa de credenciais AWS (só lint local, sem custo, roda até em PRs de fora).
- **Push/merge em `main`**: workflow [`deploy.yml`](.github/workflows/deploy.yml) assume uma IAM Role via **OIDC** (sem chave de acesso armazenada em lugar nenhum) e roda [`infra/deploy.sh`](infra/deploy.sh) — o mesmo passo a passo do `deploy.ps1`, mas em bash: `cloudformation deploy` → grava `site/js/config.js` → `s3 sync` → invalida o CloudFront.

A role que o GitHub Actions assume é criada por um template separado, [`infra/cicd-bootstrap.yaml`](infra/cicd-bootstrap.yaml) (deploy único, manual, feito uma vez fora do pipeline — é o "ovo antes da galinha": a role que faz deploy automatizado não pode ser criada pelo próprio pipeline automatizado). A confiança é restrita à branch `main` deste repositório específico via a claim `sub` do token OIDC — nenhuma outra branch, PR ou repositório consegue assumir essa role.

```bash
aws cloudformation deploy \
  --template-file infra/cicd-bootstrap.yaml \
  --stack-name focogentil-cicd-bootstrap \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides GitHubOrg=<org> GitHubRepo=<repo> AllowedBranch=main
```

A ARN da role resultante (não é segredo — a segurança vem da condição OIDC, não de sigilo) fica salva como variável do repositório (`Settings → Secrets and variables → Actions → Variables`): `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `AWS_STACK_NAME`.

## Segurança

- Nenhuma credencial AWS fica no repositório — o deploy usa as credenciais já configuradas no seu `aws configure` local.
- `site/js/config.js` (URL da API + IDs do Cognito) é gerado pelo deploy e está no `.gitignore`; o repositório só traz `config.example.js` como modelo. Nenhum desses valores é segredo por si só (são identificadores públicos por design do Cognito/API Gateway), mas mantê-los fora do repositório evita expor o endpoint ativo da sua implantação.
- A API exige um token JWT válido do Cognito em toda escrita (`POST /submit`) — o API Gateway rejeita com `401` antes mesmo de invocar a Lambda.
- A identidade do aluno vem do token já validado (claim `sub`), nunca de um campo enviado pelo navegador — evita qualquer um se passar por outro aluno.
- O bucket S3 de respostas e a tabela DynamoDB são privados; só a Lambda tem permissão de escrita (`s3:PutObject` restrito ao prefixo `respostas/`, `dynamodb:PutItem` restrito à tabela).
- O bucket do site é privado e só é servido através do CloudFront (Origin Access Control), nunca exposto diretamente.
- Trade-off consciente: o login usa o fluxo `USER_PASSWORD_AUTH` do Cognito (mais simples de implementar sem SDK/bundler) em vez de `USER_SRP_AUTH` (mais robusto, mas exige criptografia no cliente via Amplify). Aceitável aqui por rodar inteiramente sobre HTTPS e ser uso familiar de baixo risco.

## Observação sobre a conta AWS

Este projeto foi implantado originalmente usando as credenciais **root** da conta AWS configurada no CLI. Funciona, mas não é o ideal a longo prazo — o recomendado é criar um usuário IAM com permissões restritas para uso do dia a dia, guardando as credenciais root só para emergências.
