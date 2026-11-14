/* rpccore.js: classifies a JSON-RPC 2.0 message and checks its shape (the format MCP uses on its data layer). Browser: window.RpcCore. Node: module.exports. Tested by test_rpc.js against the real messages recorded by verify.py. */
(function (root) {
  'use strict';
  function check(text) {
    var m, out = { kind: null, problems: [], notes: [] };
    try { m = JSON.parse(text); } catch (e) { out.problems.push('This is not valid JSON: ' + e.message); return out; }
    if (Array.isArray(m)) { out.kind = 'batch'; out.notes.push('A list of ' + m.length + ' messages. Check each one on its own.'); return out; }
    if (m === null || typeof m !== 'object') { out.problems.push('A JSON-RPC message is a JSON object.'); return out; }
    if (m.jsonrpc !== '2.0') out.problems.push('"jsonrpc" must be the text "2.0".');
    var hasId = Object.prototype.hasOwnProperty.call(m, 'id'), hasM = typeof m.method === 'string', hasR = 'result' in m, hasE = 'error' in m;
    if (hasM) {
      out.kind = hasId ? 'request' : 'notification';
      if (hasId && !(typeof m.id === 'string' || typeof m.id === 'number')) out.problems.push('"id" must be a string or a number.');
      if ('params' in m && (m.params === null || typeof m.params !== 'object')) out.problems.push('"params" must be an object or a list.');
      if (hasR || hasE) out.problems.push('A request or notification has no "result" or "error".');
      if (/^tools\/call$/.test(m.method) && !(m.params && typeof m.params.name === 'string')) out.problems.push('tools/call needs params.name (the tool\'s name).');
      if (m.method === 'tools/call' && m.params && m.params.arguments !== undefined && (typeof m.params.arguments !== 'object' || m.params.arguments === null)) out.problems.push('params.arguments must be an object.');
      if (m.method === 'initialize' && !(m.params && m.params.protocolVersion)) out.problems.push('initialize needs params.protocolVersion.');
      if (!hasId) out.notes.push('A notification expects no answer.');
    } else if (hasR || hasE) {
      out.kind = hasE ? 'error response' : 'response';
      if (!hasId) out.problems.push('A response needs an "id" that matches its request.');
      if (hasR && hasE) out.problems.push('A response has either "result" or "error", not both.');
      if (hasE && !(m.error && typeof m.error.code === 'number' && typeof m.error.message === 'string')) out.problems.push('"error" needs a numeric "code" and a text "message".');
      if (hasR && m.result && m.result.isError === true) out.notes.push('The server answered normally but says the tool call failed (isError is true): MCP reports tool errors inside the result so the model can read them.');
    } else { out.problems.push('There is no "method", "result" or "error": this is not a request, notification or response.'); }
    return out;
  }
  var api = { check: check };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RpcCore = api;
})(typeof window !== 'undefined' ? window : this);
