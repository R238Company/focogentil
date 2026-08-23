(function () {
  "use strict";

  var EXAM_URL = "data/exam1.json";
  var STORAGE_KEY = "focogentil_exam1_respostas";
  var STORAGE_START = "focogentil_exam1_inicio";

  var exam = null;
  var current = 0;
  var respostas = {}; // id -> texto
  var startedAt = null;
  var timerInterval = null;

  var el = {
    progressoTexto: document.getElementById("progressoTexto"),
    progressoFill: document.getElementById("progressoFill"),
    tempoDecorrido: document.getElementById("tempoDecorrido"),
    materiaTag: document.getElementById("materiaTag"),
    capituloTag: document.getElementById("capituloTag"),
    questaoImg: document.getElementById("questaoImg"),
    perguntaTexto: document.getElementById("perguntaTexto"),
    respostaTexto: document.getElementById("respostaTexto"),
    btnAnterior: document.getElementById("btnAnterior"),
    btnProxima: document.getElementById("btnProxima"),
    btnFinalizar: document.getElementById("btnFinalizar"),
    btnOuvir: document.getElementById("btnOuvir"),
    dots: document.getElementById("dots"),
    statusMsg: document.getElementById("statusMsg"),
    confirmBox: document.getElementById("confirmBox"),
    confirmMsg: document.getElementById("confirmMsg"),
    btnConfirmCancelar: document.getElementById("btnConfirmCancelar"),
    btnConfirmEnviar: document.getElementById("btnConfirmEnviar")
  };

  function showStatus(text, kind) {
    el.statusMsg.textContent = text;
    el.statusMsg.className = "status-msg" + (kind ? " " + kind : "");
    el.statusMsg.style.display = text ? "block" : "none";
  }

  function loadRespostas() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      respostas = raw ? JSON.parse(raw) : {};
    } catch (e) {
      respostas = {};
    }
  }

  function saveRespostas() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(respostas));
  }

  function startTimer() {
    startedAt = localStorage.getItem(STORAGE_START);
    if (!startedAt) {
      startedAt = Date.now().toString();
      localStorage.setItem(STORAGE_START, startedAt);
    }
    startedAt = parseInt(startedAt, 10);
    timerInterval = setInterval(updateTimer, 1000 * 15);
    updateTimer();
  }

  function updateTimer() {
    var mins = Math.floor((Date.now() - startedAt) / 60000);
    el.tempoDecorrido.textContent = mins <= 0 ? "menos de 1 min" : mins + " min";
  }

  function buildDots() {
    el.dots.innerHTML = "";
    exam.questoes.forEach(function (q, i) {
      var d = document.createElement("div");
      d.className = "dot-item";
      d.textContent = (i + 1).toString();
      d.title = q.materia;
      d.addEventListener("click", function () {
        goTo(i);
      });
      el.dots.appendChild(d);
    });
    refreshDots();
  }

  function refreshDots() {
    var children = el.dots.children;
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      c.classList.toggle("current", i === current);
      var q = exam.questoes[i];
      c.classList.toggle("answered", !!(respostas[q.id] && respostas[q.id].trim().length > 0));
    }
  }

  function render() {
    var q = exam.questoes[current];
    el.materiaTag.textContent = q.materia;
    el.capituloTag.textContent = q.capitulo;
    el.perguntaTexto.textContent = q.pergunta;
    el.respostaTexto.value = respostas[q.id] || "";

    if (q.imagem) {
      el.questaoImg.src = "assets/images/" + q.imagem + ".jpg";
      el.questaoImg.style.display = "block";
      el.questaoImg.onerror = function () {
        el.questaoImg.style.display = "none";
      };
    } else {
      el.questaoImg.style.display = "none";
    }

    var total = exam.questoes.length;
    el.progressoTexto.textContent = "Questão " + (current + 1) + " de " + total;
    el.progressoFill.style.width = (((current + 1) / total) * 100) + "%";

    el.btnAnterior.disabled = current === 0;
    var isLast = current === total - 1;
    el.btnProxima.style.display = isLast ? "none" : "inline-flex";
    el.btnFinalizar.style.display = isLast ? "inline-flex" : "none";

    refreshDots();
    el.confirmBox.style.display = "none";
    showStatus("");
    window.speechSynthesis && window.speechSynthesis.cancel();
    el.respostaTexto.focus();
  }

  function saveCurrentAnswer() {
    var q = exam.questoes[current];
    respostas[q.id] = el.respostaTexto.value;
    saveRespostas();
  }

  function goTo(index) {
    saveCurrentAnswer();
    current = Math.max(0, Math.min(exam.questoes.length - 1, index));
    render();
  }

  function speak() {
    if (!("speechSynthesis" in window)) {
      showStatus("Esse navegador não tem leitura em voz alta disponível.", "error");
      return;
    }
    window.speechSynthesis.cancel();
    var q = exam.questoes[current];
    var utter = new SpeechSynthesisUtterance(q.pergunta);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  function buildPayload(nome) {
    var respostasArray = exam.questoes.map(function (q) {
      return {
        pergunta: q.pergunta,
        resposta: (respostas[q.id] || "").trim()
      };
    });
    return {
      aluno: nome,
      prova: exam.titulo,
      data: new Date().toISOString(),
      respostas: respostasArray
    };
  }

  function finalizar() {
    saveCurrentAnswer();

    var semResposta = exam.questoes.filter(function (q) {
      return !(respostas[q.id] && respostas[q.id].trim().length > 0);
    }).length;

    if (semResposta > 0) {
      el.confirmMsg.textContent =
        "Você ainda não respondeu " + semResposta +
        (semResposta === 1 ? " questão." : " questões.") +
        " Tudo bem enviar assim mesmo?";
      el.confirmBox.style.display = "block";
      el.confirmBox.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    enviar();
  }

  function enviar() {
    el.confirmBox.style.display = "none";
    var nome = localStorage.getItem("focogentil_nome") || "Aluna";
    var payload = buildPayload(nome);

    el.btnFinalizar.disabled = true;
    el.btnFinalizar.textContent = "Enviando...";

    var apiUrl = (window.FOCOGENTIL_CONFIG && window.FOCOGENTIL_CONFIG.API_URL) || "";
    var isConfigured = apiUrl && apiUrl.indexOf("__API_URL__") === -1;

    var finish = function () {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_START);
      window.location.href = "obrigado.html";
    };

    if (!isConfigured) {
      // Ambiente local/sem API configurada ainda: não perde o trabalho da aluna.
      console.warn("API não configurada. Payload que seria enviado:", payload);
      setTimeout(finish, 400);
      return;
    }

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Falha no envio (" + res.status + ")");
        finish();
      })
      .catch(function (err) {
        console.error(err);
        el.btnFinalizar.disabled = false;
        el.btnFinalizar.textContent = "Finalizar simulado ✓";
        showStatus("Não consegui enviar agora. Suas respostas continuam salvas neste navegador — pode tentar de novo em instantes.", "error");
      });
  }

  function init() {
    loadRespostas();
    startTimer();

    fetch(EXAM_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("Não consegui carregar as questões.");
        return r.json();
      })
      .then(function (data) {
        exam = data;
        buildDots();
        render();
      })
      .catch(function (err) {
        el.perguntaTexto.textContent = "Ops, não consegui carregar o simulado. Recarregue a página.";
        console.error(err);
      });

    el.btnAnterior.addEventListener("click", function () {
      goTo(current - 1);
    });
    el.btnProxima.addEventListener("click", function () {
      goTo(current + 1);
    });
    el.btnFinalizar.addEventListener("click", finalizar);
    el.btnOuvir.addEventListener("click", speak);
    el.btnConfirmCancelar.addEventListener("click", function () {
      el.confirmBox.style.display = "none";
    });
    el.btnConfirmEnviar.addEventListener("click", enviar);

    el.respostaTexto.addEventListener("input", function () {
      saveCurrentAnswer();
      refreshDots();
    });

    window.addEventListener("beforeunload", saveCurrentAnswer);
  }

  init();
})();
