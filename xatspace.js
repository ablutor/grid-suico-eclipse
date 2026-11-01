/*
  Núcleo compartilhado por todos os modelos.

  1. Descobre o cliente (?c=nome no link) e carrega clientes/<nome>.js
  2. Preenche a página com os dados (atributos data-xs-*)
  3. Aplica a cor (?cor=nome no link, ou "cor" nos dados do cliente)
  4. Ajusta o tamanho do palco (desktop e mobile)
  5. Liga o player de música do YouTube
  6. Coloca a marca d'água

  Para trocar de onde vêm os dados (planilha, Supabase...), só a função
  carregarCliente() precisa mudar.
*/
(function () {
  var config = window.XATSPACE_CONFIG || {};
  var raiz = document.documentElement;
  var base = new URL("./", document.currentScript.src).href;
  var aoCarregar = [];
  var dados = null;

  window.Xatspace = {
    // Chamado pelo arquivo do cliente: Xatspace.cliente({ ... })
    cliente: function (d) {
      if (dados) return;
      dados = preparar(d);
      iniciar();
    },
    // Chamado pelo script.js do modelo para ajustes próprios
    aoCarregar: function (fn) {
      if (dados) fn(dados);
      else aoCarregar.push(fn);
    },
    get: get,
    arquivo: arquivo,
    caber: caber
  };

  // Diminui a fonte até o texto caber na largura máxima (nomes longos).
  // Mede de novo quando as fontes terminam de carregar: a fonte reserva tem outra largura.
  function caber(el, larguraMax, minimo) {
    if (!el) return;
    if (document.fonts && document.fonts.status !== "loaded") {
      document.fonts.ready.then(function () { caber(el, larguraMax, minimo); });
    }
    minimo = minimo || 6;
    el.style.fontSize = "";
    var tamanho = parseFloat(getComputedStyle(el).fontSize);
    // Mede como inline-block; se o modelo já tinha trocado o display (ex.: block), devolve
    var display = el.style.display;
    el.style.whiteSpace = "nowrap";
    el.style.display = "inline-block";
    while (el.scrollWidth > larguraMax && tamanho > minimo) {
      tamanho *= 0.95;
      el.style.fontSize = tamanho + "px";
    }
    if (display) el.style.display = display;
  }

  var params = new URLSearchParams(location.search);

  // ---------- Dados ----------

  function carregarCliente(id) {
    var s = document.createElement("script");
    s.src = base + "clientes/" + encodeURIComponent(id) + ".js";
    s.onerror = function () {
      console.warn("[xatspace] cliente não encontrado:", id);
      mostrar();
    };
    document.head.appendChild(s);
  }

  function get(obj, caminho) {
    return caminho.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  // Caminho relativo vira caminho dentro de clientes/; links completos ficam como estão
  function arquivo(caminho) {
    if (!caminho) return "";
    if (/^(https?:|data:|\/)/.test(caminho)) return caminho;
    return base + caminho;
  }

  // Campos calculados a partir dos dados do cliente
  function preparar(d) {
    var nome = d.nome || "";
    var sobrenome = d.sobrenome || "";
    var fem = d.genero === "f";
    d.nomeCompleto = (nome + " " + sobrenome).trim();
    d.iniciais = (nome.charAt(0) + sobrenome.charAt(0)).toUpperCase();
    d.instagramUrl = d.instagram ? "https://instagram.com/" + d.instagram : "";
    d.gostos = d.gostos || [];
    d.fotos = d.fotos || {};
    d.musica = d.musica || {};
    d.citacao = d.citacao || {};
    d.titulo = d.titulo || "Deveres de Casa";
    d.destaque = d.destaque || d.frase;
    d.o = fem ? "a" : "o";
    d.local = d.local || "";
    d.localDe = comPreposicao(d.local);
    return d;
  }

  // "do Rio de Janeiro", "do Recife", "de São Paulo"...
  function comPreposicao(local) {
    if (!local) return "";
    if (/^(Rio|Recife|Porto|Crato|Cabo|Gama|Guarujá)\b/i.test(local)) return "do " + local;
    return "de " + local;
  }

  // ---------- Preenchimento ----------

  function preencher(d) {
    each("[data-xs]", function (el) {
      var v = get(d, el.dataset.xs);
      if (v != null && v !== "") el.textContent = v;
    });
    each("[data-xs-lista]", function (el) {
      var v = get(d, el.dataset.xsLista) || [];
      el.textContent = v.join(el.dataset.xsSep || ", ");
    });
    each("[data-xs-bg]", function (el) {
      var v = get(d, el.dataset.xsBg);
      if (v) el.style.backgroundImage = "url('" + arquivo(v) + "')";
    });
    each("[data-xs-img]", function (el) {
      var v = get(d, el.dataset.xsImg);
      if (v) el.src = arquivo(v);
    });
    each("[data-xs-link]", function (el) {
      var v = get(d, el.dataset.xsLink);
      if (v) {
        el.href = v;
        el.target = "_blank";
        el.rel = "noopener";
      }
    });
    each("[data-xs-se]", function (el) {
      if (!get(d, el.dataset.xsSe)) el.hidden = true;
    });
    if (d.nomeCompleto) document.title = d.nomeCompleto;
  }

  function aplicarCor(d) {
    var cores = (raiz.dataset.cores || "").split(/\s+/).filter(Boolean);
    // "cor" pode ser uma só para todos os modelos ou uma por modelo:
    // { "10-cartao-postal": "pastel-areia", padrao: "" }
    var corDados = d.cor;
    if (corDados && typeof corDados === "object") {
      // O modelo é a pasta logo depois de "modelos/" no endereço
      var partes = location.pathname.split("/");
      var modelo = partes[partes.lastIndexOf("modelos") + 1] || "";
      corDados = corDados[modelo] || corDados.padrao;
    }
    var pedida = params.get("cor") || corDados;
    var cor = cores.indexOf(pedida) >= 0 ? pedida : cores[0];
    if (pedida && pedida !== cor) console.warn("[xatspace] cor não existe neste modelo:", pedida, "— usando", cor);
    raiz.dataset.cor = cor;
  }

  function each(sel, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), fn);
  }

  // ---------- Palco ----------

  // Cada layout foi desenhado num tamanho fixo (ex.: 1920×900 e 390×844)
  // e é ampliado ou reduzido para caber na tela.
  function ajustarPalco() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var mobile = w < 760 || w / h < 0.75;
    raiz.classList.toggle("xs-mobile", mobile);

    each(".xs-palco", function (palco) {
      var pw = Number(palco.dataset.largura);
      var ph = Number(palco.dataset.altura);
      var ehMobile = palco.classList.contains("xs-palco--mobile");
      if (ehMobile !== mobile) return;

      if (ehMobile) {
        // No celular ocupa a largura toda e cresce para baixo se precisar
        var e = w / pw;
        var altura = Math.max(ph, h / e);
        palco.style.height = altura + "px";
        palco.style.transform = "scale(" + e + ")";
        palco.style.left = "0px";
        palco.style.top = "0px";
        document.body.style.height = altura * e + "px";
      } else {
        var esc = Math.min(w / pw, h / ph);
        palco.style.height = ph + "px";
        palco.style.transform = "scale(" + esc + ")";
        palco.style.left = (w - pw * esc) / 2 + "px";
        palco.style.top = (h - ph * esc) / 2 + "px";
        document.body.style.height = "";
      }
    });
  }

  // ---------- Música ----------

  var player = null;
  var pausadoPeloUsuario = false;
  var video = null;

  // Dentro do xat o som só libera com um clique no próprio vídeo do YouTube
  var emMoldura = true;
  try {
    emMoldura = window.self !== window.top;
  } catch (e) {}

  // Até a música começar, o vídeo fica atrás da página inteira, cobrindo a tela,
  // e a página deixa os cliques passarem: qualquer clique cai no vídeo e dá o play.
  // Uma capa com o mesmo fundo da página esconde o vídeo.
  function ligarToque(ligar) {
    raiz.classList.toggle("xs-toque", ligar);
  }

  function criarCapa() {
    var capa = document.createElement("div");
    capa.className = "xs-capa-toque";
    var fundo = getComputedStyle(document.body);
    if (fundo.backgroundImage === "none" && fundo.backgroundColor === "rgba(0, 0, 0, 0)") {
      fundo = getComputedStyle(raiz);
    }
    ["backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat"].forEach(function (k) {
      capa.style[k] = fundo[k];
    });
    // Logo depois do vídeo, para ficar por cima dele
    video.parentNode.insertBefore(capa, video.nextSibling);
  }

  function marcarPlayers(classe, ligar) {
    each("[data-xs-player]", function (el) {
      el.classList.toggle(classe, ligar);
    });
  }

  function tocando() {
    return player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING;
  }

  function setTocando(sim) {
    marcarPlayers("is-playing", sim);
    raiz.classList.toggle("xs-tocando", sim);
    each("[data-xs-tocar]", function (b) {
      b.setAttribute("aria-label", sim ? "Pausar música" : "Tocar música");
    });
    if (sim) ligarToque(false);
  }

  function tempo(s) {
    s = Math.floor(s || 0);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  // Numa playlist, o nome da música e do canal vêm do próprio YouTube a cada troca
  function atualizarFaixa(d) {
    var info = player.getVideoData ? player.getVideoData() : null;
    if (!info || !info.title) return;
    d.musica.titulo = info.title;
    d.musica.artista = info.author || "";
    each('[data-xs="musica.titulo"]', function (el) { el.textContent = d.musica.titulo; });
    each('[data-xs="musica.artista"]', function (el) { el.textContent = d.musica.artista; });
  }

  function iniciarMusica(d) {
    var id = d.musica.youtube;
    var lista = d.musica.playlist;
    var fila = Array.isArray(d.musica.faixas) ? d.musica.faixas.filter(Boolean) : [];
    var usandoFila = fila.length > 0;
    var aleatorio = !!((lista || usandoFila) && d.musica.aleatorio);
    var embaralhada = false;
    if ((!id && !lista && !usandoFila) || !document.querySelector("[data-xs-player]")) return;
    // Os botões de anterior/próxima só aparecem quando é playlist
    raiz.classList.toggle("xs-playlist", !!(lista || usandoFila));

    video = document.createElement("div");
    video.className = "xs-yt";
    video.innerHTML = '<div id="xs-yt-player"></div>';
    document.body.insertBefore(video, document.body.firstChild);
    if (emMoldura) {
      criarCapa();
      ligarToque(true);
      // Se o clique não fizer a música tocar (ex.: vídeo bloqueado), a página volta
      // a responder normalmente para não ficar "travada"
      window.addEventListener("blur", function () {
        setTimeout(function () {
          if (!tocando()) ligarToque(false);
        }, 2500);
      }, { once: true });
    }

    each("[data-xs-tocar]", function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!player) return;
        if (tocando()) {
          pausadoPeloUsuario = true;
          player.pauseVideo();
        } else {
          pausadoPeloUsuario = false;
          player.playVideo();
        }
      });
    });

    // O navegador só deixa tocar som depois que a pessoa interage com a página
    function tocarNaPrimeiraInteracao() {
      function start() {
        document.removeEventListener("pointerdown", start);
        document.removeEventListener("keydown", start);
        if (player && !pausadoPeloUsuario && !tocando()) player.playVideo();
      }
      document.addEventListener("pointerdown", start);
      document.addEventListener("keydown", start);
    }

    function pular(sel, passo) {
      each(sel, function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!player) return;
          pausadoPeloUsuario = false;
          if (usandoFila) {
            avancar(passo);
            return;
          }
          var metodo = passo > 0 ? "nextVideo" : "previousVideo";
          if (player[metodo]) player[metodo]();
        });
      });
    }
    pular("[data-xs-anterior]", -1);
    pular("[data-xs-proxima]", 1);

    // Uma música só repete sozinha; a playlist toca em ordem e recomeça no fim.
    // Com a fila local o avanço é nosso, então o loop do YouTube fica desligado.
    var vars = { autoplay: 1, loop: usandoFila ? 0 : 1, controls: 0, playsinline: 1 };
    if (!usandoFila && lista) {
      vars.listType = "playlist";
      vars.list = lista;
    } else if (!usandoFila) {
      vars.playlist = id;
    }

    // Modo aleatório: embaralha assim que o YouTube carrega a lista e começa
    // pela primeira da ordem nova, para a música inicial também ser sorteada
    function embaralhar() {
      if (!aleatorio || embaralhada || !player.getPlaylist) return;
      var musicas = player.getPlaylist();
      if (!musicas || !musicas.length) return;
      embaralhada = true;
      player.setShuffle(true);
      player.playVideoAt(0);
    }

    // Vídeos que o dono não deixa tocar fora do YouTube.
    var recusadas = {};
    var cursor = 0;

    function idAtual() {
      var info = player.getVideoData ? player.getVideoData() : null;
      return info && info.video_id ? info.video_id : "";
    }

    function tocarIndice(i) {
      cursor = ((i % fila.length) + fila.length) % fila.length;
      player.loadVideoById(fila[cursor]);
    }

    // Passo 1 segue, -1 volta. Pula as que já recusaram. Devolve false se nenhuma sobrou.
    function avancar(passo) {
      var tentativas = 0;
      var j = cursor;
      while (tentativas < fila.length) {
        j = (j + passo) % fila.length;
        if (j < 0) j += fila.length;
        tentativas++;
        if (!recusadas[fila[j]]) {
          tocarIndice(j);
          return true;
        }
      }
      return false;
    }

    var pulosLista = 0;

    function pularRecusada() {
      var atual = idAtual();
      if (usandoFila) {
        if (!atual) atual = fila[cursor];
        if (!atual || recusadas[atual]) return;
        recusadas[atual] = true;
        var idx = fila.indexOf(atual);
        if (idx >= 0) cursor = idx;
        if (!avancar(1)) ligarToque(false);
        return;
      }
      if (player && player.nextVideo && pulosLista < 25) {
        pulosLista++;
        player.nextVideo();
        return;
      }
      ligarToque(false);
    }

    window.onYouTubeIframeAPIReady = function () {
      var opcoes = {
        width: "100%",
        height: "100%",
        playerVars: vars,
        events: {
          onReady: function (e) {
            e.target.setVolume(config.volume || 60);
            if (usandoFila) {
              var inicio = !aleatorio && id ? fila.indexOf(id) : 0;
              tocarIndice(inicio >= 0 ? inicio : 0);
            } else {
              e.target.playVideo();
              embaralhar();
            }
            setTimeout(function () {
              if (!tocando()) tocarNaPrimeiraInteracao();
            }, 1200);
          },
          onStateChange: function (e) {
            setTocando(e.data === YT.PlayerState.PLAYING);
            if (!usandoFila) embaralhar();
            if (lista || usandoFila) atualizarFaixa(d);
            if (usandoFila && e.data === YT.PlayerState.ENDED) avancar(1);
          },
          onError: function (e) {
            var codigo = e && e.data;
            if (codigo !== 100 && codigo !== 101 && codigo !== 150) return;
            if (!usandoFila && !lista) {
              ligarToque(false);
              return;
            }
            pularRecusada();
          }
        }
      };
      if (id && !lista && !usandoFila) opcoes.videoId = id;
      player = new YT.Player("xs-yt-player", opcoes);

      setInterval(function () {
        if (!player || !player.getDuration) return;
        var total = player.getDuration();
        if (!total) return;
        var agora = player.getCurrentTime();
        raiz.style.setProperty("--xs-progresso", (agora / total) * 100 + "%");
        each("[data-xs-tempo]", function (el) { el.textContent = tempo(agora); });
        each("[data-xs-duracao]", function (el) { el.textContent = tempo(total); });
      }, 500);
    };

    var api = document.createElement("script");
    api.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(api);
  }

  // ---------- Marca d'água ----------

  // Selo no canto: um ícone que abre o convite ao passar o mouse
  function marcaDagua(d) {
    if (d.semMarca) return;
    var a = document.createElement("a");
    a.className = "xs-marca";
    a.href = config.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = config.convite;
    a.setAttribute("aria-label", config.convite);
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z"/><path d="M19 15.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" opacity=".6"/></svg>' +
      '<span class="xs-marca__t"></span>';
    a.querySelector(".xs-marca__t").textContent = config.convite;
    document.body.appendChild(a);

    // Mostra o convite aberto por alguns segundos, depois de a página aparecer,
    // e de novo de tempos em tempos, para quem chega saber que o selo existe
    function espiar() {
      a.classList.add("is-aberta");
      setTimeout(function () { a.classList.remove("is-aberta"); }, 4000);
    }
    setTimeout(espiar, 1500);
    setInterval(espiar, 30000);
  }

  // ---------- Início ----------

  function mostrar() {
    raiz.classList.add("xs-pronto");
  }

  function iniciar() {
    var go = function () {
      aplicarCor(dados);
      preencher(dados);
      aoCarregar.forEach(function (fn) { fn(dados); });
      marcaDagua(dados);
      ajustarPalco();
      iniciarMusica(dados);
      mostrar();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }

  window.addEventListener("resize", ajustarPalco);
  // Se algo der errado, mostra a página mesmo assim
  setTimeout(mostrar, 4000);

  // Os dados desta cópia vêm de dados.js, na mesma pasta.
})();
