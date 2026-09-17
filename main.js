/* ==========================================================================
   Voss Têxtil · comportamento do site
   HTML + CSS + JS puros, sem dependências.
   Animações declaradas em CSS e disparadas aqui pela posição no scroll.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     INTERRUPTOR DAS ANIMAÇÕES

     false  = todas as animações aparecem para todo mundo (padrão atual).
     true   = o site obedece o "reduzir movimento" do sistema do visitante
              (Windows: Configurações > Acessibilidade > Efeitos visuais >
              Efeitos de animação). Nesse modo, quem tiver a opção desligada
              vê só um fade suave, sem deslocamento, zoom, parallax nem a
              faixa rolante.

     Está em false porque muitos Windows vêm com os efeitos de animação
     desligados de fábrica, e aí o site parecia estático.
     ------------------------------------------------------------------------ */
  var RESPEITAR_MOVIMENTO_REDUZIDO = false;

  // Altura útil da janela. Em iframe/webview sem layout, innerHeight pode vir
  // 0 e derrubaria toda a detecção de scroll, por isso os dois fallbacks.
  function vh() {
    return window.innerHeight ||
           document.documentElement.clientHeight ||
           800;
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isReduced = function () {
    return RESPEITAR_MOVIMENTO_REDUZIDO && reduce.matches;
  };

  // a classe libera as regras de CSS que a media query cortaria
  if (!RESPEITAR_MOVIMENTO_REDUZIDO) {
    document.documentElement.classList.add('mov-livre');
  }

  /* ====================================================== header ======= */
  // O header fica fixo o tempo todo. Só ganha filete e sombra ao sair do topo.
  var hdr = document.getElementById('hdr');
  var waFloat = document.getElementById('waFloat');
  var progress = document.getElementById('progress');
  var barTicking = false;

  function headerScroll() {
    var y = window.scrollY;

    if (hdr) hdr.classList.toggle('is-scrolled', y > 8);
    if (waFloat) waFloat.classList.toggle('is-on', y > vh() * 0.55);

    if (progress && !barTicking) {
      barTicking = true;
      requestAnimationFrame(function () {
        var max = document.documentElement.scrollHeight - vh();
        var p = max > 0 ? Math.min(y / max, 1) : 0;
        progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        barTicking = false;
      });
    }
  }
  headerScroll();
  window.addEventListener('scroll', headerScroll, { passive: true });
  window.addEventListener('resize', headerScroll);

  /* ====================================================== menu mobile == */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function navAberto() { return document.body.classList.contains('nav-open'); }

  function closeNav(devolverFoco) {
    var estava = navAberto();
    document.body.classList.remove('nav-open');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Abrir menu');
      if (estava && devolverFoco) burger.focus();
    }
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      if (open) {
        // leva o foco para dentro do painel, senão o teclado continua no topo
        var primeiro = nav.querySelector('a');
        if (primeiro) primeiro.focus();
      } else {
        burger.focus();
      }
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav(false);
    });

    // o foco não escapa do painel enquanto ele cobre a tela
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !navAberto()) return;
      var foco = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
      if (!foco.length) return;
      var primeiro = foco[0], ultimo = foco[foco.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    // ao passar para largura de desktop o painel deixa de existir:
    // sem isso o body ficava com o scroll travado e o botão marcado como aberto
    var largo = window.matchMedia('(min-width:900px)');
    var aoTrocar = function (e) { if (e.matches) closeNav(false); };
    if (largo.addEventListener) largo.addEventListener('change', aoTrocar);
    else if (largo.addListener) largo.addListener(aoTrocar);
  }

  /* ================================= títulos divididos palavra a palavra = */
  // Cada palavra vira <span class="w"><span class="wi">…</span></span> para
  // poder subir de dentro de uma máscara, com atraso progressivo.
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var step = parseInt(el.dataset.split, 10) || 55;
    var out = document.createDocumentFragment();
    var i = 0;

    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) { out.appendChild(node.cloneNode(true)); return; }

      node.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { out.appendChild(document.createTextNode(' ')); return; }

        var w = document.createElement('span');
        w.className = 'w';
        var wi = document.createElement('span');
        wi.className = 'wi';
        wi.textContent = chunk;
        wi.style.setProperty('--wd', (i * step) + 'ms');
        w.appendChild(wi);
        out.appendChild(w);
        i++;
      });
    });

    el.textContent = '';
    el.appendChild(out);
    el.classList.add('split');
  });

  /* ============================================ escalonamento automático = */
  // Em qualquer container com [data-stagger], os filhos .rv recebem
  // um atraso progressivo sem precisar de style inline no HTML.
  document.querySelectorAll('[data-stagger]').forEach(function (box) {
    var step = parseInt(box.dataset.stagger, 10) || 80;
    var kids = box.querySelectorAll(':scope > .rv, :scope > * > .rv');
    kids.forEach(function (kid, i) {
      if (!kid.style.getPropertyValue('--d')) {
        kid.style.setProperty('--d', (i * step) + 'ms');
      }
    });
  });

  /* ================================================ revelação ao entrar = */
  // Detecção pela posição no scroll, e não por observer: o observer depende
  // do ciclo de renderização e, com o desenho estrangulado, pode não disparar,
  // deixando a página em branco. Aqui a conta é feita na mão, a lista encolhe
  // conforme revela e ainda existe uma rede de segurança por tempo.
  // A revelação acontece ao rolar SEMPRE, inclusive com movimento reduzido:
  // nesse caso o CSS apenas troca o deslocamento por um fade.
  var pending = Array.prototype.slice.call(
    document.querySelectorAll('.rv, .proc__track')
  );
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));

  function show(el) { el.classList.add('is-in'); }

  function sweep() {
    var limit = vh() * 0.94;

    if (pending.length) {
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top >= limit) return true;
        show(el);
        return false;
      });
    }

    if (counters.length) {
      var half = vh() * 0.85;
      counters = counters.filter(function (el) {
        if (el.getBoundingClientRect().top >= half) return true;
        runCount(el);
        return false;
      });
    }
  }

  counters.forEach(function (el) { el.textContent = '0'; });

  // Throttle com borda de saída: sem a chamada final, a última posição do
  // scroll pode nunca ser varrida e a seção fica invisível.
  var sweepAt = 0;
  var sweepTimer = null;

  function run() {
    sweepAt = Date.now();
    sweep();
    pxUpdate();
  }

  function onScroll() {
    var wait = 60 - (Date.now() - sweepAt);
    if (wait <= 0) { run(); return; }
    if (sweepTimer) return;
    sweepTimer = window.setTimeout(function () {
      sweepTimer = null;
      run();
    }, wait);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  document.addEventListener('visibilitychange', onScroll);
  run();

  // rede de segurança: se por qualquer motivo nada revelou, mostra tudo
  window.setTimeout(function () {
    if (!document.querySelector('.rv.is-in')) {
      pending.forEach(show);
      pending = [];
      counters.forEach(function (el) { el.textContent = el.dataset.count; });
      counters = [];
    }
  }, 2500);

  /* ======================================================== parallax ==== */
  // Deslocamento vertical discreto em [data-parallax]. São poucos elementos,
  // então o cálculo roda direto no scroll, sem observer.
  var pxItems = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var pxOn = pxItems.length && !isReduced() &&
             window.matchMedia('(min-width:900px)').matches;

  function pxUpdate() {
    if (!pxOn) return;
    var h = vh();
    pxItems.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      var mid = r.top + r.height / 2;
      var progress = (mid - h / 2) / (h / 2 + r.height / 2); // -1 .. 1
      var amount = parseFloat(el.dataset.parallax) || 26;
      el.style.transform = 'translate3d(0,' + (progress * amount).toFixed(2) + 'px,0)';
    });
  }

  /* ================================================ contagem numérica === */
  function runCount(el) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    if (isReduced() || !window.requestAnimationFrame) {
      el.textContent = String(target);
      return;
    }

    var dur = 1100;
    var t0 = null;

    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ================================================ filtro do catálogo == */
  var filters = document.querySelectorAll('.filters button');
  var cards = document.querySelectorAll('#grid .card');
  var count = document.getElementById('gridCount');

  if (filters.length && cards.length) {
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.dataset.filter;
        var shown = 0;

        filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

        cards.forEach(function (card) {
          var show = cat === 'todos' || card.dataset.cat === cat;
          card.classList.toggle('is-hidden', !show);
          if (show) shown++;
        });

        if (count) count.textContent = shown + (shown === 1 ? ' material' : ' materiais');
      });
    });
  }

  /* ========================================== lightbox da inspiração === */
  // A galeria vira uma sequência navegável: setas, teclado e gesto no toque.
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbCount = document.getElementById('lbCount');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var masonry = document.getElementById('masonry');
  var lastFocus = null;

  var shots = masonry
    ? Array.prototype.slice.call(masonry.querySelectorAll('button'))
    : [];
  var atShot = 0;

  function paintLb(i) {
    if (!shots.length) return;
    atShot = (i + shots.length) % shots.length;
    var btn = shots[atShot];
    var img = btn.querySelector('img');
    if (!img) return;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = btn.dataset.cap || '';
    if (lbCount) lbCount.textContent = (atShot + 1) + ' / ' + shots.length;
  }

  function openLb(i) {
    if (!lb || !shots.length) return;
    lastFocus = document.activeElement;
    paintLb(i);
    lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function hideLb() {
    if (!lb) return;
    lb.removeAttribute('open');
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  var lbOpen = function () { return lb && lb.hasAttribute('open'); };

  if (masonry && lb) {
    masonry.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      openLb(shots.indexOf(btn));
    });

    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lbImg.parentNode) hideLb();
    });
    lbClose.addEventListener('click', hideLb);
    if (lbPrev) lbPrev.addEventListener('click', function () { paintLb(atShot - 1); });
    if (lbNext) lbNext.addEventListener('click', function () { paintLb(atShot + 1); });

    // arrastar de lado para trocar de foto
    var swipeX = null;
    lb.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      swipeX = e.clientX;
    });
    lb.addEventListener('pointerup', function (e) {
      if (swipeX === null) return;
      var dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 48) paintLb(atShot + (dx < 0 ? 1 : -1));
    });
    lb.addEventListener('pointercancel', function () { swipeX = null; });
    lbImg.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lbOpen()) hideLb();
      closeNav(true);
      return;
    }
    if (!lbOpen()) return;

    if (e.key === 'ArrowRight') { e.preventDefault(); paintLb(atShot + 1); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); paintLb(atShot - 1); return; }

    // o foco não escapa da caixa enquanto ela está aberta
    if (e.key === 'Tab') {
      var foco = [lbClose, lbPrev, lbNext].filter(Boolean);
      var i = foco.indexOf(document.activeElement);
      e.preventDefault();
      var passo = e.shiftKey ? -1 : 1;
      foco[((i < 0 ? 0 : i + passo) + foco.length) % foco.length].focus();
    }
  });

  /* ============================================================== ano == */
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
