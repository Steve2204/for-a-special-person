/*!
 * WOW - v1.1.2 - 2016-04-08
 * Copyright (c) 2016 Matthieu Aussaguel
 */
(function () {
  var Util, WeakMap, MutationObserver, getComputedStyle, camelCaseRE;

  // Utility functions
  Util = function () {
    function Util() {}
    Util.prototype.extend = function (target, source) {
      for (var key in source) {
        if (source.hasOwnProperty(key) && target[key] == null) {
          target[key] = source[key];
        }
      }
      return target;
    };
    Util.prototype.isMobile = function (userAgent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    Util.prototype.createEvent = function (event, bubbles, cancelable, detail) {
      if (bubbles == null) bubbles = false;
      if (cancelable == null) cancelable = false;
      if (detail == null) detail = null;
      var evt;
      if (document.createEvent) {
        evt = document.createEvent("CustomEvent");
        evt.initCustomEvent(event, bubbles, cancelable, detail);
      } else if (document.createEventObject) {
        evt = document.createEventObject();
        evt.eventType = event;
      } else {
        evt.eventName = event;
      }
      return evt;
    };
    Util.prototype.emitEvent = function (el, evt) {
      if (el.dispatchEvent) {
        return el.dispatchEvent(evt);
      } else if (evt in el) {
        return el[evt]();
      } else if ("on" + evt in el) {
        return el["on" + evt]();
      }
    };
    Util.prototype.addEvent = function (el, type, handler) {
      if (el.addEventListener) {
        el.addEventListener(type, handler, false);
      } else if (el.attachEvent) {
        el.attachEvent("on" + type, handler);
      } else {
        el[type] = handler;
      }
    };
    Util.prototype.removeEvent = function (el, type, handler) {
      if (el.removeEventListener) {
        el.removeEventListener(type, handler, false);
      } else if (el.detachEvent) {
        el.detachEvent("on" + type, handler);
      } else {
        delete el[type];
      }
    };
    Util.prototype.innerHeight = function () {
      return "innerHeight" in window ? window.innerHeight : document.documentElement.clientHeight;
    };
    return Util;
  }();

  // WeakMap polyfill
  WeakMap = this.WeakMap || this.MozWeakMap || (function () {
    function WeakMap() {
      this.keys = [];
      this.values = [];
    }
    WeakMap.prototype.get = function (key) {
      for (var i = 0; i < this.keys.length; i++) {
        if (this.keys[i] === key) return this.values[i];
      }
    };
    WeakMap.prototype.set = function (key, value) {
      for (var i = 0; i < this.keys.length; i++) {
        if (this.keys[i] === key) {
          this.values[i] = value;
          return;
        }
      }
      this.keys.push(key);
      this.values.push(value);
    };
    return WeakMap;
  })();

  // MutationObserver polyfill
  MutationObserver = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (function () {
    function MutationObserver() {
      if (typeof console !== "undefined" && console !== null) {
        console.warn("MutationObserver is not supported by your browser.");
        console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.");
      }
    }
    MutationObserver.notSupported = true;
    MutationObserver.prototype.observe = function () {};
    return MutationObserver;
  })();

  // getComputedStyle polyfill
  getComputedStyle = this.getComputedStyle || function (el) {
    this.getPropertyValue = function (prop) {
      if (prop === "float") prop = "styleFloat";
      if (camelCaseRE.test(prop)) {
        prop = prop.replace(camelCaseRE, function (_, letter) {
          return letter.toUpperCase();
        });
      }
      return el.currentStyle ? el.currentStyle[prop] : null;
    };
    return this;
  };

  camelCaseRE = /(\-([a-z]){1})/g;

  // WOW main class
  this.WOW = function () {
    function WOW(options) {
      if (options == null) options = {};
      this.scrollCallback = this.scrollCallback.bind(this);
      this.scrollHandler = this.scrollHandler.bind(this);
      this.resetAnimation = this.resetAnimation.bind(this);
      this.start = this.start.bind(this);
      this.scrolled = true;
      this.config = (new Util()).extend(options, this.defaults);
      if (options.scrollContainer != null) {
        this.config.scrollContainer = document.querySelector(options.scrollContainer);
      }
      this.animationNameCache = new WeakMap();
      this.wowEvent = (new Util()).createEvent(this.config.boxClass);
    }
    WOW.prototype.defaults = {
      boxClass: "wow",
      animateClass: "animated",
      offset: 0,
      mobile: true,
      live: true,
      callback: null,
      scrollContainer: null
    };
    WOW.prototype.init = function () {
      var readyState = document.readyState;
      this.element = window.document.documentElement;
      if (readyState === "interactive" || readyState === "complete") {
        this.start();
      } else {
        (new Util()).addEvent(document, "DOMContentLoaded", this.start);
      }
      this.finished = [];
    };
    WOW.prototype.start = function () {
      var self = this;
      this.stopped = false;
      this.boxes = Array.prototype.slice.call(this.element.querySelectorAll("." + this.config.boxClass));
      this.all = this.boxes.slice();
      if (this.boxes.length) {
        if (this.disabled()) {
          this.resetStyle();
        } else {
          this.boxes.forEach(function (box) {
            self.applyStyle(box, true);
          });
        }
      }
      if (!this.disabled()) {
        (new Util()).addEvent(this.config.scrollContainer || window, "scroll", this.scrollHandler);
        (new Util()).addEvent(window, "resize", this.scrollHandler);
        this.interval = setInterval(this.scrollCallback, 50);
      }
      if (this.config.live) {
        new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
              self.doSync(node);
            });
          });
        }).observe(document.body, { childList: true, subtree: true });
      }
    };
    WOW.prototype.stop = function () {
      this.stopped = true;
      (new Util()).removeEvent(this.config.scrollContainer || window, "scroll", this.scrollHandler);
      (new Util()).removeEvent(window, "resize", this.scrollHandler);
      if (this.interval != null) clearInterval(this.interval);
    };
    WOW.prototype.sync = function (element) {
      if (MutationObserver.notSupported) {
        this.doSync(this.element);
      }
    };
    WOW.prototype.doSync = function (element) {
      if (element == null) element = this.element;
      if (element.nodeType === 1) {
        var boxes = element.parentNode ? element.parentNode.querySelectorAll("." + this.config.boxClass) : [];
        for (var i = 0; i < boxes.length; i++) {
          var box = boxes[i];
          if (this.all.indexOf(box) < 0) {
            this.boxes.push(box);
            this.all.push(box);
            if (!this.stopped && !this.disabled()) {
              this.applyStyle(box, true);
            }
            this.scrolled = true;
          }
        }
      }
    };
    WOW.prototype.show = function (box) {
      this.applyStyle(box);
      box.className = box.className + " " + this.config.animateClass;
      if (this.config.callback != null) this.config.callback(box);
      (new Util()).emitEvent(box, this.wowEvent);
      (new Util()).addEvent(box, "animationend", this.resetAnimation);
      (new Util()).addEvent(box, "oanimationend", this.resetAnimation);
      (new Util()).addEvent(box, "webkitAnimationEnd", this.resetAnimation);
      (new Util()).addEvent(box, "MSAnimationEnd", this.resetAnimation);
      return box;
    };
    WOW.prototype.applyStyle = function (box, hidden) {
      var duration = box.getAttribute("data-wow-duration");
      var delay = box.getAttribute("data-wow-delay");
      var iteration = box.getAttribute("data-wow-iteration");
      this.animate(function () {
        this.customStyle(box, hidden, duration, delay, iteration);
      }.bind(this));
    };
    WOW.prototype.animate = function () {
      if ("requestAnimationFrame" in window) {
        return function (callback) { window.requestAnimationFrame(callback); };
      } else {
        return function (callback) { callback(); };
      }
    }();
    WOW.prototype.resetStyle = function () {
      this.boxes.forEach(function (box) {
        box.style.visibility = "visible";
      });
    };
    WOW.prototype.resetAnimation = function (event) {
      if (event.type.toLowerCase().indexOf("animationend") >= 0) {
        var target = event.target || event.srcElement;
        target.className = target.className.replace(this.config.animateClass, "").trim();
      }
    };
    WOW.prototype.customStyle = function (box, hidden, duration, delay, iteration) {
      if (hidden) this.cacheAnimationName(box);
      box.style.visibility = hidden ? "hidden" : "visible";
      if (duration) this.vendorSet(box.style, { animationDuration: duration });
      if (delay) this.vendorSet(box.style, { animationDelay: delay });
      if (iteration) this.vendorSet(box.style, { animationIterationCount: iteration });
      this.vendorSet(box.style, { animationName: hidden ? "none" : this.cachedAnimationName(box) });
    };
    WOW.prototype.vendors = ["moz", "webkit"];
    WOW.prototype.vendorSet = function (style, properties) {
      for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
          var value = properties[key];
          style[key] = value;
          this.vendors.forEach(function (vendor) {
            style[vendor + key.charAt(0).toUpperCase() + key.substr(1)] = value;
          });
        }
      }
    };
    WOW.prototype.vendorCSS = function (el, prop) {
      var style = getComputedStyle(el);
      var value = style.getPropertyCSSValue(prop);
      for (var i = 0; i < this.vendors.length; i++) {
        value = value || style.getPropertyCSSValue("-" + this.vendors[i] + "-" + prop);
      }
      return value;
    };
    WOW.prototype.animationName = function (el) {
      var name;
      try {
        name = this.vendorCSS(el, "animation-name").cssText;
      } catch (e) {
        name = getComputedStyle(el).getPropertyValue("animation-name");
      }
      return name === "none" ? "" : name;
    };
    WOW.prototype.cacheAnimationName = function (el) {
      this.animationNameCache.set(el, this.animationName(el));
    };
    WOW.prototype.cachedAnimationName = function (el) {
      return this.animationNameCache.get(el);
    };
    WOW.prototype.scrollHandler = function () {
      this.scrolled = true;
    };
    WOW.prototype.scrollCallback = function () {
      if (!this.scrolled) return;
      this.scrolled = false;
      var visibleBoxes = [];
      for (var i = 0; i < this.boxes.length; i++) {
        var box = this.boxes[i];
        if (box && this.isVisible(box)) {
          this.show(box);
        } else {
          visibleBoxes.push(box);
        }
      }
      this.boxes = visibleBoxes;
      if (!this.boxes.length && !this.config.live) {
        this.stop();
      }
    };
    WOW.prototype.offsetTop = function (el) {
      var top = el.offsetTop;
      while (el = el.offsetParent) {
        top += el.offsetTop;
      }
      return top;
    };
    WOW.prototype.isVisible = function (el) {
      var offset = el.getAttribute("data-wow-offset") || this.config.offset;
      var scrollTop = (this.config.scrollContainer && this.config.scrollContainer.scrollTop) || window.pageYOffset;
      var viewBottom = scrollTop + Math.min(this.element.clientHeight, (new Util()).innerHeight()) - offset;
      var elTop = this.offsetTop(el);
      var elBottom = elTop + el.clientHeight;
      return viewBottom >= elTop && elBottom >= scrollTop;
    };
    WOW.prototype.util = function () {
      if (this._util != null) return this._util;
      this._util = new Util();
      return this._util;
    };
    WOW.prototype.disabled = function () {
      return !this.config.mobile && (new Util()).isMobile(navigator.userAgent);
    };
    return WOW;
  }();
}).call(this);
