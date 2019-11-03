'use strict';

const utils = {
  element: function(type) {
    const e = document.createElement(type);
    return e;
  },

  div: function(className, parent) {
    const d = utils.element('div');
    d.className = className;
    if (parent) {
      parent.appendChild(d);
    }
    return d;
  },

  span: function(className) {
    const s = utils.element('span');
    s.className = className;
    return s;
  },

  img: function(url) {
    const i = utils.element('img');
    i.src = url;
    return i;
  },

  anchor: function(url, text) {
    const a = utils.element('a');
    a.textContent = text;
    a.setAttribute('href', url);
    return a;
  },

  // Function based on MDN's example:
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
  isWebGLAvailable: function() {
    // Create canvas element. The canvas is not added to the
    // document itself, so it is never displayed in the
    // browser window.
    const canvas = document.createElement('canvas');
    // Get WebGLRenderingContext from canvas element.
    const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    // Report the result.
    return gl && gl instanceof WebGLRenderingContext;
  },
};
