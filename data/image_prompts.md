# Prompts para o Grok Imagine

Imagens usadas nos simulados (Geografia e Língua Portuguesa). Gere cada uma no Grok Imagine, baixe o resultado e salve com o **nome de arquivo exato** indicado dentro de `site/assets/images/` (formato `.jpg` — é o padrão configurado em `site/js/app.js`; se usar `.png`, ajuste a extensão lá).

Estilo geral pedido em todos os prompts: ilustração simples, colorida, tipo livro didático infantil, sem excesso de detalhes ou poluição visual (a leitora tem TDAH — imagens muito carregadas distraem), traços limpos, boa legibilidade, sem texto embutido na imagem.

---

## Geografia (Simulado 01)

## 1. mapa-oceanos.jpg
**Questão:** geo-07-02 — localizar os cinco oceanos do planeta.

**Prompt:**
> Mapa-múndi ilustrado em estilo simples e colorido, tipo livro didático infantil, mostrando os cinco oceanos do planeta (Atlântico, Pacífico, Índico, Glacial Ártico e Glacial Antártico) em tons diferentes de azul, com o nome de cada oceano escrito de forma grande e legível sobre a área correspondente. Continentes em verde claro, sem muitos detalhes internos, fundo branco, traços limpos, sem poluição visual, estilo flat design.

---

## 2. diagrama-rio.jpg
**Questão:** geo-07-03 — partes de um rio (nascente, leito, afluentes, meandro, foz).

**Prompt:**
> Ilustração simples e colorida, estilo livro didático infantil, mostrando o esquema de um rio visto de cima, desde a nascente (pequena fonte de água numa montanha) até a foz (onde o rio encontra o mar), passando por curvas (meandros) e um afluente menor se juntando ao rio principal. Cada parte identificada com uma etiqueta grande e legível: Nascente, Leito, Afluente, Meandro, Foz. Cores vivas, traços limpos, fundo claro, sem excesso de detalhes.

---

## 3. queimada-floresta.jpg
**Questão:** geo-10-06 — problemas ambientais causados por queimadas.

**Prompt:**
> Ilustração simples, estilo livro didático infantil, mostrando uma floresta com uma área em chamas (queimada), fumaça subindo ao céu, e ao lado uma área verde e preservada da mesma floresta para contraste. Cores fortes mas não assustadoras (evitar imagem realista ou perturbadora, manter tom educativo e leve), traços limpos, sem excesso de detalhes, adequada para uma criança de 11 anos.

---

## 4. praia-poluida.jpg
**Questão:** geo-07-09 — poluição marinha por plástico.

**Prompt:**
> Ilustração simples e colorida, estilo livro didático infantil, mostrando uma praia com areia clara e mar ao fundo, com alguns itens de lixo plástico (garrafas, sacolas) espalhados pela areia e boiando na água, sem exagero ou aspecto chocante — tom educativo e leve. Traços limpos, cores vivas mas suaves, sem excesso de detalhes, adequada para uma criança de 11 anos.

---

## Língua Portuguesa (Simulado 01)

## 5. personagem-para-descrever.jpg
**Questão:** lp-04-01 — escrever adjetivos descrevendo um personagem.

**Prompt:**
> Ilustração simples e colorida, estilo livro didático infantil, retrato de corpo inteiro de uma criança inventada e simpática (pode ser um personagem fantasioso, tipo aventureiro ou exploradora), com roupas e expressão facial marcantes que sugiram características de personalidade (por exemplo: postura confiante, sorriso largo, roupas coloridas e cheias de bolsos, um chapéu divertido). Fundo simples e neutro, sem texto, traços limpos, sem excesso de detalhes, adequada para uma criança de 11 anos descrever com adjetivos.

---

## 6. esquema-pronomes.jpg
**Questão:** lp-05-02 — função dos pronomes no texto (coesão referencial).

**Prompt:**
> Ilustração simples e colorida, estilo infográfico para livro didático infantil, mostrando a frase "A Ana foi ao parque" à esquerda e, um pouco abaixo à direita, a palavra "ela" dentro de um balão colorido, ligada à palavra "Ana" por uma seta curva grande e clara — representando o pronome "apontando" para a palavra que substitui. Fundo branco, poucas cores (2 ou 3), letras grandes e bem legíveis, sem poluição visual, traços limpos.

---

## Ícones das matérias

Usados na tela de escolha de matéria (depois do login), como um ícone quadrado simples — pense em ícone de aplicativo: um símbolo central, fundo de cor sólida ou gradiente suave, **sem texto nenhum na imagem** (a leitora tem dislexia — texto dentro de ícone não ajuda e pode até confundir). Salve como `.jpg` em `site/assets/icons/`.

## 7. geografia.jpg
**Prompt:**
> Ícone quadrado estilo flat design, minimalista, para um app infantil: um globo terrestre estilizado e colorido (continentes em verde, oceano em azul), centralizado sobre um fundo em gradiente suave de azul pastel, cantos levemente arredondados, sem texto, sem sombras pesadas, traços limpos e poucos detalhes, visual amigável e acolhedor.

## 8. lingua_portuguesa.jpg
**Prompt:**
> Ícone quadrado estilo flat design, minimalista, para um app infantil: um livro aberto colorido com um lápis apoiado sobre ele (ou saindo de dentro dele), centralizado sobre um fundo em gradiente suave de azul pastel, cantos levemente arredondados, sem texto, sem sombras pesadas, traços limpos e poucos detalhes, visual amigável e acolhedor — mesmo estilo do ícone de Geografia, para os dois ficarem parecidos lado a lado.

---

## Como adicionar imagens em simulados futuros

1. Escreva um novo prompt seguindo o mesmo estilo (simples, colorido, sem poluição visual).
2. Gere a imagem no Grok Imagine e salve em `site/assets/images/` com um nome curto em minúsculas, sem espaços e sem acentos (ex.: `climograma-manaus.jpg`).
3. No arquivo `data/exams/exam1.json` (ou no próximo simulado), defina o campo `"imagem"` da questão com esse mesmo nome, sem extensão (ex.: `"imagem": "climograma-manaus"`).
4. Se a imagem ainda não existir no momento do simulado, não tem problema — a questão aparece normalmente, sem a imagem, até o arquivo ser adicionado.
