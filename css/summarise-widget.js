/* =====================================================
   summarise-widget.js
   Self-contained "Summarise with [LLM]" floating widget.

   No build step, no dependencies. Drops into any static
   HTML page that also links /css/summarise-widget.css.

   Markup is built at runtime so the page is fully usable
   without JS — the widget simply doesn't appear.

   Optional config on the script tag:
     data-theme="dark" | "light"   (default: "dark")
     data-page-url="https://..."   (override; default: window.location.href)

   Analytics: each click fires a CustomEvent
   `summarise-widget:click` on document AND logs to
   window.dataLayer / console as a fallback.
===================================================== */

(function () {
  'use strict';

  // Bail on viewports under 768px (defence in depth: CSS already hides it).
  // We still attach so the widget appears if the user later enlarges,
  // because CSS media queries handle visibility per-frame.

  if (document.getElementById('summarise-widget-root')) {
    return; // Already mounted (script included twice).
  }

  // --- Config --------------------------------------------------------------
  var script = document.currentScript;
  var theme = (script && script.getAttribute('data-theme')) || 'dark';
  var pageUrlOverride = script && script.getAttribute('data-page-url');

  function getPageUrl() {
    // Prefer canonical URL when one is set on the page.
    var canonical = document.querySelector('link[rel="canonical"]');
    if (pageUrlOverride) return pageUrlOverride;
    if (canonical && canonical.href) return canonical.href;
    return window.location.href;
  }

  function buildPrompt(url) {
    return 'Summarise and analyse the key insights from ' + url + ' in a short, concise response.';
  }

  // --- LLM targets ---------------------------------------------------------
  // Each entry returns a fresh URL on demand so we always pick up the
  // current page (handy for single-page nav, or canonical rewrites).
  var TARGETS = [
    {
      id: 'chatgpt',
      label: 'ChatGPT',
      build: function (prompt) {
        return 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
      },
      // OpenAI "blossom" mark — monochrome, single-path rendering of the
      // official OpenAI logomark. Sourced from the openai.com brand mark
      // (Simple Icons / Lucide / Phosphor do not ship an OpenAI icon).
      icon:
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073Zm-9.022 12.598a4.483 4.483 0 0 1-2.876-1.04l.142-.08 4.774-2.757a.777.777 0 0 0 .392-.681v-6.736l2.018 1.168a.072.072 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.488 4.491ZM3.6 18.304a4.473 4.473 0 0 1-.535-3.013l.142.085 4.774 2.756a.768.768 0 0 0 .778 0l5.832-3.366v2.34a.072.072 0 0 1-.028.061l-4.83 2.787A4.504 4.504 0 0 1 3.6 18.305Zm-1.252-10.4a4.487 4.487 0 0 1 2.342-1.974l-.001.165v5.512a.766.766 0 0 0 .388.674l5.799 3.348-2.018 1.165a.073.073 0 0 1-.068.005L4.987 14.04a4.504 4.504 0 0 1-1.64-6.137Zm16.572 3.85L13.108 8.4l2.018-1.164a.073.073 0 0 1 .068-.005l4.823 2.786a4.5 4.5 0 0 1-.677 8.123v-5.68a.788.788 0 0 0-.392-.67Zm2.009-3.025l-.142-.085-4.774-2.756a.776.776 0 0 0-.78 0L9.397 9.66V7.31a.072.072 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.668 4.626ZM8.295 12.91 6.277 11.74a.072.072 0 0 1-.038-.058V6.105a4.5 4.5 0 0 1 7.378-3.453l-.142.08L8.7 5.49a.777.777 0 0 0-.392.68Zm1.097-2.365 2.605-1.5 2.605 1.5v3l-2.605 1.5-2.605-1.5Z"/>' +
        '</svg>'
    },
    {
      id: 'perplexity',
      label: 'Perplexity',
      build: function (prompt) {
        return 'https://www.perplexity.ai/search/new?q=' + encodeURIComponent(prompt);
      },
      // Perplexity wordmark glyph (Simple Icons, slug: perplexity).
      icon:
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z"/>' +
        '</svg>'
    },
    {
      id: 'claude',
      label: 'Claude',
      build: function (prompt) {
        return 'https://claude.ai/new?q=' + encodeURIComponent(prompt);
      },
      // Anthropic Claude mark (Simple Icons, slug: claude).
      icon:
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/>' +
        '</svg>'
    },
    {
      id: 'grok',
      label: 'Grok',
      build: function (prompt) {
        return 'https://grok.com/?q=' + encodeURIComponent(prompt);
      },
      // X / xAI mark (Simple Icons, slug: x). Grok sits inside xAI / X.
      // The Simple Icons X path spans roughly (0.26, 0) to (22.98, 24);
      // viewBox is tightened to that bounding box so the slim diagonal
      // cross optically matches the denser marks beside it.
      icon:
        '<svg viewBox="0 0 23.24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/>' +
        '</svg>'
    },
    {
      id: 'google-ai',
      label: 'Google AI Mode',
      build: function (prompt) {
        return 'https://www.google.com/search?q=' + encodeURIComponent(prompt) + '&udm=50';
      },
      // Google "G" mark (Simple Icons, slug: google).
      icon:
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
          '<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>' +
        '</svg>'
    }
  ];

  // --- Element factory -----------------------------------------------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'html') node.innerHTML = attrs[key];
        else if (key.indexOf('on') === 0 && typeof attrs[key] === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  // --- Analytics -----------------------------------------------------------
  function trackClick(target) {
    var detail = {
      llm: target.id,
      label: target.label,
      pageUrl: getPageUrl()
    };

    // 1. CustomEvent for any listeners on the page.
    try {
      document.dispatchEvent(new CustomEvent('summarise-widget:click', { detail: detail }));
    } catch (_) { /* old browsers, ignore */ }

    // 2. dataLayer push for GTM-style setups.
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({
        event: 'summarise_widget_click',
        summarise_llm: detail.llm,
        summarise_page_url: detail.pageUrl
      });
    }

    // 3. Console fallback so it's visible in dev.
    if (window.console && console.log) {
      console.log('[summarise-widget] click', detail);
    }
  }

  // --- Build markup --------------------------------------------------------
  var root = el('div', {
    id: 'summarise-widget-root',
    class: 'sw-root',
    'data-theme': theme
  });

  var menu = el('div', {
    class: 'sw-menu',
    id: 'sw-menu',
    role: 'menu',
    'aria-label': 'Summarise this page with',
    tabindex: '-1'
  });

  menu.appendChild(el('div', { class: 'sw-menu-label' }, 'Summarise with'));

  var menuItems = TARGETS.map(function (target) {
    var link = el('a', {
      class: 'sw-menu-item',
      role: 'menuitem',
      target: '_blank',
      rel: 'noopener noreferrer',
      href: '#', // Updated lazily on open so URL reflects current page.
      'data-llm': target.id,
      'aria-label': 'Summarise this page with ' + target.label
    });

    link.appendChild(el('span', {
      class: 'sw-menu-item-icon',
      'aria-hidden': 'true',
      html: target.icon
    }));

    link.appendChild(el('span', { class: 'sw-menu-item-label' }, target.label));

    link.appendChild(el('span', {
      class: 'sw-menu-item-arrow',
      'aria-hidden': 'true',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>'
    }));

    link.addEventListener('click', function (e) {
      // Refresh href just in case (defence in depth — opener also updates on menu open).
      var url = target.build(buildPrompt(getPageUrl()));
      link.setAttribute('href', url);
      trackClick(target);
      closeMenu();
    });

    menu.appendChild(link);
    return link;
  });

  // Trigger button.
  var triggerIcon =
    '<svg class="sw-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2 13.6 8.4 20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z"/>' +
    '</svg>';
  var caret =
    '<svg class="sw-trigger-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="6 9 12 15 18 9"/>' +
    '</svg>';

  var trigger = el('button', {
    type: 'button',
    class: 'sw-trigger',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'aria-controls': 'sw-menu',
    'aria-label': 'Summarise this page with an AI assistant',
    html: triggerIcon + '<span>Summarise</span>' + caret
  });

  root.appendChild(menu);
  root.appendChild(trigger);

  // --- Open/close behaviour ------------------------------------------------
  var isOpen = false;
  var lastFocused = null;

  function refreshHrefs() {
    var prompt = buildPrompt(getPageUrl());
    menuItems.forEach(function (link, idx) {
      link.setAttribute('href', TARGETS[idx].build(prompt));
    });
  }

  function openMenu() {
    if (isOpen) return;
    refreshHrefs();
    lastFocused = document.activeElement;
    menu.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    isOpen = true;
    // Focus the first item for keyboard users.
    setTimeout(function () {
      var first = menu.querySelector('.sw-menu-item');
      if (first) first.focus();
    }, 0);
  }

  function closeMenu(returnFocus) {
    if (!isOpen) return;
    menu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    isOpen = false;
    if (returnFocus !== false) {
      try { trigger.focus(); } catch (_) { /* ignore */ }
    }
  }

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (isOpen) closeMenu();
    else openMenu();
  });

  // Click outside closes.
  document.addEventListener('click', function (e) {
    if (!isOpen) return;
    if (root.contains(e.target)) return;
    closeMenu(false);
  });

  // Keyboard handling.
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var items = Array.prototype.slice.call(menu.querySelectorAll('.sw-menu-item'));
      if (!items.length) return;
      var idx = items.indexOf(document.activeElement);
      var next;
      if (e.key === 'ArrowDown') {
        next = idx < 0 ? 0 : (idx + 1) % items.length;
      } else {
        next = idx <= 0 ? items.length - 1 : idx - 1;
      }
      items[next].focus();
    }
    if (e.key === 'Home') {
      e.preventDefault();
      var firstItem = menu.querySelector('.sw-menu-item');
      if (firstItem) firstItem.focus();
    }
    if (e.key === 'End') {
      e.preventDefault();
      var allItems = menu.querySelectorAll('.sw-menu-item');
      if (allItems.length) allItems[allItems.length - 1].focus();
    }
  });

  // --- Mount ---------------------------------------------------------------
  function mount() {
    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
