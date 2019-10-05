// Function based on MDN's example:
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
function isWebGLAvailable() {
  // Create canvas element. The canvas is not added to the
  // document itself, so it is never displayed in the
  // browser window.
  var canvas = document.createElement('canvas');
  // Get WebGLRenderingContext from canvas element.
  var gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  // Report the result.
  return gl && gl instanceof WebGLRenderingContext;
}
