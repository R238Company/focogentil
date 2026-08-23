# Foco Gentil

Gerador de simulados de prova com questões dissertativas, feito a partir de material didático próprio. Pensado para crianças neurodivergentes (TDAH, dislexia): uma questão por vez, fonte legível, leitura em voz alta, sem cronômetro de pressão, e nada se perde se a página for fechada no meio.

Foi criado para uso pessoal (um pai adaptando o material de estudo da própria filha) e publicado aqui para que outras famílias possam usar ou adaptar a ideia.

## Estrutura

```
fontes/              conteúdo didático original (aqui, exemplos de Geografia)
data/
  questions/          banco de questões extraídas/adaptadas de cada matéria
  exams/exam1.json    o simulado atual (20 questões)
  image_prompts.md    prompts prontos para gerar as imagens de apoio no Grok Imagine
site/                 o site em si (HTML/CSS/JS puro)
  data/exam1.json     cópia do simulado usada pelo site (mantenha sincronizada com data/exams/)
  assets/images/       imagens geradas no Grok Imagine entram aqui
  js/config.example.js modelo de configuração (config.js real é gerado pelo deploy e não vai pro git)
infra/
  template.yaml       CloudFormation: S3 (site + respostas), CloudFront, Lambda, API
  lambda/submit_answers/handler.py   código da Lambda (mesma versão embutida no template)
  deploy.ps1           script de deploy
```

## Rodando localmente

```bash
cd site
python -m http.server 8765
```

Abra `http://localhost:8765/index.html`. Sem `site/js/config.js` (gerado só pelo deploy — veja abaixo), o botão "Finalizar simulado" simula o envio, mostrando o payload no console do navegador. Assim dá para testar o fluxo inteiro sem precisar da AWS.

## Como funciona o envio das respostas

1. O(a) estudante responde uma questão por vez em `exam.html`; cada resposta é salva automaticamente no `localStorage` do navegador.
2. Ao finalizar, o site faz um `POST` para a API (URL guardada em `site/js/config.js`) com `{ aluno, prova, data, respostas: [{ pergunta, resposta }, ...] }`.
3. Uma função Lambda valida o payload e grava um arquivo JSON no bucket S3 de respostas, em `respostas/AAAA-MM-DD/<id>.json`.
4. A correção não é automática — os arquivos ficam no S3 para serem lidos/corrigidos depois.

## Deploy na AWS

Pré-requisito: AWS CLI configurado (`aws sts get-caller-identity` funcionando).

```powershell
powershell -File infra/deploy.ps1
```

Isso cria/atualiza a stack CloudFormation (nome padrão `focogentil`), grava a URL real da API em `site/js/config.js` (arquivo gitignorado — nunca é commitado, pois é um endpoint de escrita ativo da sua implantação), sincroniza `site/` para o bucket S3 e invalida o cache do CloudFront. No final, imprime a URL `https://xxxxxxx.cloudfront.net` do site.

Para reimplantar depois de qualquer mudança no site ou nas questões, rode o mesmo comando de novo.

## Adicionando um novo simulado ou trocando as questões

1. Edite os bancos em `data/questions/*.json` (adicione novas questões extraídas do seu material) ou crie um novo arquivo em `data/exams/`.
2. Monte o JSON do simulado escolhido (20 questões, com `id`, `materia`, `capitulo`, `pergunta` e `imagem` opcional).
3. Copie o arquivo para `site/data/exam1.json` (ou aponte `EXAM_URL` em `site/js/app.js` para o novo arquivo).
4. Se alguma questão pedir imagem, veja `data/image_prompts.md` para o padrão de prompt e onde salvar o arquivo gerado.
5. Rode `infra/deploy.ps1` de novo para publicar.

## Segurança

- Nenhuma credencial AWS fica no repositório — o deploy usa as credenciais já configuradas no seu `aws configure` local.
- `site/js/config.js` (URL real da API) é gerado pelo deploy e está no `.gitignore`; o repositório só traz `config.example.js` como modelo.
- O bucket S3 de respostas é privado; só a Lambda tem permissão de escrita nele (`s3:PutObject` restrito ao prefixo `respostas/`).
- O bucket do site é privado e só é servido através do CloudFront (Origin Access Control), nunca exposto diretamente.

## Observação sobre a conta AWS

Este projeto foi implantado originalmente usando as credenciais **root** da conta AWS configurada no CLI. Funciona, mas não é o ideal a longo prazo — o recomendado é criar um usuário IAM com permissões restritas para uso do dia a dia, guardando as credenciais root só para emergências.
