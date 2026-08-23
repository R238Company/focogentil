// Catálogo de matérias disponíveis. Para adicionar uma nova matéria:
// 1. Crie o banco de questões e o simulado em data/, copie pra site/data/.
// 2. Gere um ícone (veja data/image_prompts.md) e salve em site/assets/icons/.
// 3. Adicione uma entrada aqui.
window.FOCOGENTIL_MATERIAS = [
  {
    id: "geografia",
    nome: "Geografia",
    emoji: "🌎",
    icone: "assets/icons/geografia.jpg",
    examUrl: "data/exam1.json",
    descricao: "20 perguntas sobre água, clima e vegetação."
  },
  {
    id: "lingua_portuguesa",
    nome: "Língua Portuguesa",
    emoji: "📖",
    icone: "assets/icons/lingua_portuguesa.jpg",
    examUrl: "data/exam2.json",
    descricao: "20 perguntas sobre adjetivos, artigos e pronomes."
  }
];

function getMateria(id) {
  var lista = window.FOCOGENTIL_MATERIAS || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) return lista[i];
  }
  return null;
}

function renderMaterias(container, onSelect) {
  container.innerHTML = "";
  (window.FOCOGENTIL_MATERIAS || []).forEach(function (materia) {
    var card = document.createElement("button");
    card.className = "materia-card";
    card.type = "button";

    var iconWrap = document.createElement("div");
    iconWrap.className = "materia-icon";
    iconWrap.textContent = materia.emoji;

    var img = document.createElement("img");
    img.src = materia.icone;
    img.alt = "";
    img.onload = function () {
      iconWrap.textContent = "";
      iconWrap.appendChild(img);
    };
    img.onerror = function () {
      // Sem ícone gerado ainda: fica só o emoji, sem quebrar nada.
    };

    var nome = document.createElement("div");
    nome.className = "materia-nome";
    nome.textContent = materia.nome;

    var desc = document.createElement("div");
    desc.className = "materia-desc";
    desc.textContent = materia.descricao;

    card.appendChild(iconWrap);
    card.appendChild(nome);
    card.appendChild(desc);
    card.addEventListener("click", function () {
      onSelect(materia.id);
    });

    container.appendChild(card);
  });
}
