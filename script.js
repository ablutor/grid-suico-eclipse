// Modelo 21 · Eclipse
Xatspace.aoCarregar(function (d) {
  var todos = function (sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  };

  // Ano atual
  todos("[data-xs-ano]", function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Autor da citação abreviado: "Mario Quintana" vira "M. Quintana"
  var autor = (d.citacao.autor || "").trim();
  var partes = autor.split(/\s+/);
  if (partes.length > 1) autor = partes[0].charAt(0) + ". " + partes.slice(1).join(" ");
  todos("[data-xs-autor]", function (el) {
    el.textContent = autor;
  });
  if (!d.citacao.texto) todos(".foot .cit", function (el) { el.hidden = true; });

  // Frase com a última palavra em itálico na cor de destaque
  todos(".q", function (el) {
    var frase = (d.frase || "").trim();
    var i = frase.lastIndexOf(" ");
    el.textContent = i > 0 ? frase.slice(0, i + 1) : "";
    var destaque = document.createElement("span");
    destaque.className = "red";
    var em = document.createElement("em");
    em.textContent = i > 0 ? frase.slice(i + 1) : frase;
    destaque.appendChild(em);
    el.appendChild(destaque);
  });

  // Frases longas diminuem para não passar da linha de baixo
  function encolher(el, alturaMax) {
    if (!el) return;
    var tamanho = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollHeight > alturaMax && tamanho > 12) {
      tamanho *= 0.95;
      el.style.fontSize = tamanho + "px";
    }
  }
  encolher(document.querySelector(".desk .q"), 175);
  encolher(document.querySelector(".mob .q"), 82);

  // Nomes longos diminuem para não encostar na foto
  Xatspace.caber(document.querySelector(".desk h1"), 1220);
  Xatspace.caber(document.querySelector(".mob h1"), 360);

  // As duas fotos de perfil se revezam, com uma dissolução entre elas
  if (d.fotos && d.fotos.perfil2) {
    window.setInterval(function () {
      todos(".photo", function (el) { el.classList.toggle("trocada"); });
    }, 3000);
  }
});
