(function () {
  "use strict";

  var materiaId = localStorage.getItem("focogentil_materia_atual");
  var materia = (typeof getMateria === "function") ? getMateria(materiaId) : null;
  var EXAM_URL = materia ? materia.examUrl : "data/exam1.json";
  var STORAGE_KEY = "focogentil_" + (materiaId || "exam1") + "_respostas";
  var STORAGE_START = "focogentil_" + (materiaId || "exam1") + "_inicio";

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
    hintDissertativa: document.getElementById("hintDissertativa"),
    opcoesContainer: document.getElementById("opcoesContainer"),
    hintAlternativa: document.getElementById("hintAlternativa"),
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

  function apiBase() {
    var apiUrl = (window.FOCOGENTIL_CONFIG && window.FOCOGENTIL_CONFIG.API_URL) || "";
    if (!apiUrl || apiUrl.indexOf("__API_URL__") !== -1) return null;
    return apiUrl.replace(/\/submit$/, "");
  }

  function respostasAnsweredCount(lista) {
    return lista.filter(function (r) {
      return r && (r.resposta || "").trim().length > 0;
    }).length;
  }

  function enviarRascunho(useKeepalive) {
    var base = apiBase();
    var token = window.FocoGentilAuth ? window.FocoGentilAuth.getToken() : null;
    if (!base || !token || !exam) return;

    var payload = {
      materiaId: materiaId || "exam1",
      prova: exam.titulo,
      current: current,
      respostas: exam.questoes.map(function (q) {
        return { id: q.id, pergunta: q.pergunta, resposta: respostas[q.id] || "" };
      })
    };

    fetch(base + "/progresso", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload),
      keepalive: !!useKeepalive
    }).catch(function () {
      // Sem sinal agora tudo bem: continua salvo no localStorage deste aparelho.
    });
  }

  function carregarRascunhoRemoto() {
    var base = apiBase();
    var token = window.FocoGentilAuth ? window.FocoGentilAuth.getToken() : null;
    if (!base || !token) return Promise.resolve();

    return fetch(base + "/progresso?materiaId=" + encodeURIComponent(materiaId || "exam1"), {
      headers: { Authorization: "Bearer " + token }
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (!data || !data.existe || !Array.isArray(data.respostas)) return;

        var localCount = respostasAnsweredCount(
          Object.keys(respostas).map(function (id) {
            return { resposta: respostas[id] };
          })
        );
        var remotoCount = respostasAnsweredCount(data.respostas);

        // Quem tem mais respostas venceu (é o dispositivo com mais progresso).
        if (remotoCount > localCount) {
          respostas = {};
          data.respostas.forEach(function (r) {
            if (r.id) respostas[r.id] = r.resposta || "";
          });
          if (typeof data.current === "number") {
            current = Math.max(0, Math.min(exam.questoes.length - 1, data.current));
          }
          saveRespostas();
        }
      })
      .catch(function () {
        // Sem sinal: segue só com o que tem salvo neste aparelho.
      });
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

  function isAlternativa(q) {
    return q.tipo === "alternativa" && Array.isArray(q.opcoes);
  }

  function opcaoTexto(opcao) {
    return opcao.letra + ") " + opcao.texto;
  }

  function refreshOpcoesSelecionadas() {
    var items = el.opcoesContainer.querySelectorAll(".opcao-item");
    for (var i = 0; i < items.length; i++) {
      var input = items[i].querySelector("input");
      items[i].classList.toggle("selected", !!input.checked);
    }
  }

  function buildOpcoes(q) {
    el.opcoesContainer.innerHTML = "";
    var respostaAtual = respostas[q.id] || "";

    q.opcoes.forEach(function (opcao) {
      var texto = opcaoTexto(opcao);

      var label = document.createElement("label");
      label.className = "opcao-item";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "opcao-" + q.id;
      input.value = texto;
      input.checked = respostaAtual === texto;
      input.addEventListener("change", function () {
        respostas[q.id] = texto;
        saveRespostas();
        enviarRascunho();
        refreshOpcoesSelecionadas();
        refreshDots();
      });

      var span = document.createElement("span");
      span.textContent = texto;

      label.appendChild(input);
      label.appendChild(span);
      label.classList.toggle("selected", respostaAtual === texto);

      el.opcoesContainer.appendChild(label);
    });
  }

  function render() {
    var q = exam.questoes[current];
    el.materiaTag.textContent = q.materia;
    el.capituloTag.textContent = q.capitulo;
    el.perguntaTexto.textContent = q.pergunta;

    if (isAlternativa(q)) {
      el.respostaTexto.style.display = "none";
      el.hintDissertativa.style.display = "none";
      el.opcoesContainer.style.display = "flex";
      el.hintAlternativa.style.display = "block";
      buildOpcoes(q);
    } else {
      el.respostaTexto.style.display = "block";
      el.hintDissertativa.style.display = "block";
      el.opcoesContainer.style.display = "none";
      el.hintAlternativa.style.display = "none";
      el.opcoesContainer.innerHTML = "";
      el.respostaTexto.value = respostas[q.id] || "";
    }

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
    if (!isAlternativa(q)) {
      el.respostaTexto.focus();
    }
  }

  function saveCurrentAnswer() {
    var q = exam.questoes[current];
    if (isAlternativa(q)) return; // já salva no clique da opção
    respostas[q.id] = el.respostaTexto.value;
    saveRespostas();
  }

  function goTo(index) {
    saveCurrentAnswer();
    enviarRascunho();
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
    var textoFala = q.pergunta;
    if (isAlternativa(q)) {
      textoFala += ". " + q.opcoes.map(opcaoTexto).join(". ");
    }
    var utter = new SpeechSynthesisUtterance(textoFala);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  function buildPayload() {
    var respostasArray = exam.questoes.map(function (q) {
      return {
        pergunta: q.pergunta,
        resposta: (respostas[q.id] || "").trim()
      };
    });
    return {
      prova: exam.titulo,
      materiaId: materiaId || "exam1",
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
    var payload = buildPayload();

    el.btnFinalizar.disabled = true;
    el.btnFinalizar.textContent = "Enviando...";

    var apiUrl = (window.FOCOGENTIL_CONFIG && window.FOCOGENTIL_CONFIG.API_URL) || "";
    var isConfigured = apiUrl && apiUrl.indexOf("__API_URL__") === -1;
    var token = window.FocoGentilAuth ? window.FocoGentilAuth.getToken() : null;

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

    if (!token) {
      el.btnFinalizar.disabled = false;
      el.btnFinalizar.textContent = "Finalizar simulado ✓";
      showStatus("Sua sessão expirou. Vamos te levar de volta para o login (suas respostas continuam salvas aqui).", "error");
      setTimeout(function () {
        window.location.href = "login.html";
      }, 2500);
      return;
    }

    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.status === 401) {
          var authError = new Error("nao autenticado");
          authError.isAuthError = true;
          throw authError;
        }
        if (!res.ok) throw new Error("Falha no envio (" + res.status + ")");
        finish();
      })
      .catch(function (err) {
        console.error(err);
        el.btnFinalizar.disabled = false;
        el.btnFinalizar.textContent = "Finalizar simulado ✓";
        if (err.isAuthError) {
          showStatus("Sua sessão expirou. Vamos te levar de volta para o login (suas respostas continuam salvas aqui).", "error");
          setTimeout(function () {
            window.location.href = "login.html";
          }, 2500);
        } else {
          showStatus("Não consegui enviar agora. Suas respostas continuam salvas neste navegador — pode tentar de novo em instantes.", "error");
        }
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
        return carregarRascunhoRemoto();
      })
      .then(function () {
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

    window.addEventListener("beforeunload", function () {
      saveCurrentAnswer();
      enviarRascunho(true);
    });
  }

  init();
})();
