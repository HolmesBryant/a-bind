/**
 * @file a-testresults.js
 * @description A custom element to display test results and live progress from ATestRunner.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @version 1.0.0
 * @license MIT
 */
class ATestResults extends HTMLElement {
  static eventComplete = 'a-complete';
  static eventResult = 'a-testresult';
  static eventProgress = 'a-progress'; // Added progress event
  static verdictGroupStart = 'GROUP_START';
  static verdictGroupEnd = 'GROUP_END';
  static verdictInfo = 'INFO';

  #root; #summary; #title; #templates = {}; #progress = {};

  #stats = { pass: 0, fail: 0, error: 0, total: 0 };
  #groupContextStack = [];

  static #template = document.createElement('template');
  static {
    this.#template.innerHTML = `
      <style>
        :host {
          --bg1-color: snow; --bg2-color: linen; --border-color: silver;
          --accent-color: dimgray; --text-color: rgb(40,40,40);
          --pass: #28a745; --fail: #dc3545; --error: #e83e8c; --info: #fd7e14;
          --border-radius: .25em; --gap: .5rem; --pad: 1rem;
          display: block; font-family: monospace; font-size: 14px;
          background-color: var(--bg1-color); border: 1px solid var(--border-color);
          border-radius: var(--border-radius); overflow: hidden; color: var(--text-color);
        }
        :host(.verdict-pass) { border-color: var(--pass); }
        :host(.verdict-fail), :host(.fail) { border-color: var(--fail); }
        header, .row { border-bottom: 1px solid var(--border-color); }
        pre, header { background-color: var(--bg2-color); }
        pre { border-radius: var(--border-radius); }
        #root > div:last-child { border-bottom: none; }
        .pass { color: var(--pass); } .fail { color: var(--fail); } .error { color: var(--error); } .info { color: var(--info); }
        summary { color: var(--accent-color); cursor: pointer; }
        .group-title { padding: 4px 8px; transition: color 0.2s; }
        .group-title.pass { color: var(--pass); }
        .group-title.fail { color: var(--fail); }
        .final, .group-title, .verdict, #summary, #title { font-weight: bold; }
        .verdict { text-transform: uppercase; flex: 0 0 70px; }
        header, .final, pre { padding: var(--pad); }
        .gist { flex: 1; } .final { text-align: center; }
        .group-content { margin-left: calc(var(--gap) * 2); padding-left: var(--pad); border-left: 3px solid var(--border-color); transition: border-color 0.2s; }
        .group-content.pass { border-left-color: var(--pass); }
        .group-content.fail { border-left-color: var(--fail); }
        .row { display: flex; flex-direction: column; padding: 6px 4px; }
        .main { display: flex; align-items: center; gap: var(--gap); }
        #root { max-height: 70vh; overflow-y: auto; }

        /* --- Progress Bar Styles --- */
        #progress-container { display: flex; align-items: center; gap: 1em; margin-top: .75em; }
        #progress-bar { flex: 1; -webkit-appearance: none; appearance: none; height: 10px; border: none; border-radius: var(--border-radius); overflow: hidden; }
        #progress-bar::-webkit-progress-bar { background-color: #ced4da; }
        #progress-bar::-moz-progress-bar { background-color: #ced4da; }
        #progress-bar::-webkit-progress-value { background-color: var(--pass); transition: background-color 0.2s, width 0.2s; }
        :host(.fail) #progress-bar::-webkit-progress-value { background-color: var(--fail); }
        #progress-bar::-moz-progress-bar { background-color: var(--pass); transition: background-color 0.2s; }
        :host(.fail) #progress-bar::-moz-progress-bar { background-color: var(--fail); }
        #progress-text { flex: 0 0 180px; display: flex; justify-content: space-between; font-weight: bold; }
      </style>
      <header>
        <div id="title"></div>
        <div id="summary"></div>
        <div id="progress-container">
          <progress id="progress-bar" max="1" value="0"></progress>
        </div>
      </header>
      <div id="root"></div>
      <template id="tpl-group"><details class="group"><summary class="group-title"></summary><div class="group-content"></div></details></template>
      <template id="tpl-info"><div class="row info"><div class="main"><span class="verdict">INFO</span><span class="gist"></span></div></div></template>
      <template id="tpl-test"><div class="row"><div class="main"><span class="verdict"></span><span class="gist"></span></div><details><summary>Details</summary><pre><code></code></pre></details></div></template>
    `;
  }

  constructor() { super(); this.attachShadow({ mode: 'open' }); this.handleEvent = this.handleEvent.bind(this); }

  connectedCallback() {
    const fragment = ATestResults.#template.content.cloneNode(true);
    this.#root = fragment.getElementById('root');
    this.#summary = fragment.getElementById('summary');
    this.#title = fragment.getElementById('title');
    // progress bar elements
    this.#progress.bar = fragment.getElementById('progress-bar');
    // templates
    this.#templates.group = fragment.getElementById('tpl-group').content;
    this.#templates.info = fragment.getElementById('tpl-info').content;
    this.#templates.test = fragment.getElementById('tpl-test').content;
    this.shadowRoot.appendChild(fragment);

    this.#reset();
    this.addEventListener(ATestResults.eventResult, this.handleEvent);
    this.addEventListener(ATestResults.eventComplete, this.handleEvent);
    this.addEventListener(ATestResults.eventProgress, this.handleEvent); // Add listener
  }

  disconnectedCallback() {
    this.removeEventListener(ATestResults.eventResult, this.handleEvent);
    this.removeEventListener(ATestResults.eventComplete, this.handleEvent);
    this.removeEventListener(ATestResults.eventProgress, this.handleEvent); // Clean up listener
  }

  handleEvent(event) {
    event.stopPropagation();
    const { detail } = event;
    switch (event.type) {
      case ATestResults.eventComplete: return this.#renderComplete(detail);
      case ATestResults.eventProgress: return this.#updateProgress(event); // Handle progress event
      case ATestResults.eventResult:
        switch (detail.verdict) {
          case ATestResults.verdictGroupStart: return this.#renderGroup(detail);
          case ATestResults.verdictGroupEnd: return this.#endGroup();
          case ATestResults.verdictInfo: return this.#renderInfo(detail);
          default: return this.#renderTest(detail);
        }
    }
  }

  #reset() {
    this.#stats = { pass: 0, fail: 0, error: 0, total: 0 };
    this.#groupContextStack = [];
    this.#root.innerHTML = '';
    this.className = '';
    this.#progress.bar.max = 1;
    this.#progress.bar.value = 0;
    this.#title.textContent = this.getAttribute('title') || 'Test Results';
    this.#updateSummary();
  }

  /**
   * Updates the progress bar UI based on the progress event.
   * @param {ProgressEvent} event
   * @private
   */
  #updateProgress(event) {
    const { loaded, total } = event;
    if (total > 0) {
      this.#progress.bar.max = total;
      this.#progress.bar.value = loaded;
      const percent = Math.round((loaded / total) * 100);
    }
  }

  #getCurrentGroupContainer() {
    return this.#groupContextStack.length > 0 ? this.#groupContextStack[this.#groupContextStack.length - 1].container : this.#root;
  }

  #renderGroup({ gist }) {
    const fragment = this.#templates.group.cloneNode(true);
    const titleEl = fragment.querySelector('.group-title');
    const container = fragment.querySelector('.group-content');
    titleEl.textContent = gist;
    this.#getCurrentGroupContainer().appendChild(fragment);
    this.#groupContextStack.push({ titleEl, container, verdict: 'pass' });
  }

  #endGroup() {
    const endedGroupContext = this.#groupContextStack.pop();
    if (!endedGroupContext) return;
    endedGroupContext.container.classList.add(endedGroupContext.verdict);
    endedGroupContext.titleEl.classList.add(endedGroupContext.verdict);
    if (endedGroupContext.verdict === 'fail' && this.#groupContextStack.length > 0) {
      this.#groupContextStack[this.#groupContextStack.length - 1].verdict = 'fail';
    }
  }

  #renderInfo({ gist }) {
    const fragment = this.#templates.info.cloneNode(true);
    fragment.querySelector('.gist').textContent = gist;
    this.#getCurrentGroupContainer().appendChild(fragment);
  }

  #renderTest(detail) {
    this.#stats.total++;
    const verdict = detail.verdict.toLowerCase();
    if (this.#stats[verdict] !== undefined) this.#stats[verdict]++;
    if ((verdict === 'fail' || verdict === 'error') && this.#groupContextStack.length > 0) {
      this.#groupContextStack[this.#groupContextStack.length - 1].verdict = 'fail';
    }
    const fragment = this.#templates.test.cloneNode(true);
    const row = fragment.querySelector('.row');
    const details = fragment.querySelector('details');
    row.classList.add(verdict);
    fragment.querySelector('.verdict').textContent = detail.verdict;
    fragment.querySelector('.gist').textContent = detail.gist;
    if (detail.result !== undefined || detail.expect !== undefined || detail.line) { const content = `Result:   ${this.#formatValue(detail.result)}\nExpected: ${this.#formatValue(detail.expect)}${detail.line ? `\nLine:     ${detail.line}` : ''}`; fragment.querySelector('code').textContent = content; } else { details.remove(); }
    this.#getCurrentGroupContainer().appendChild(fragment);
    this.#updateSummary();
  }

  #renderComplete({ verdict }) {
    // Also apply a .fail class for progress bar styling consistency
    if (verdict === 'fail') this.classList.add('fail');
    this.classList.add('finished', `verdict-${verdict}`);
    const finalMsg = document.createElement('div');
    finalMsg.className = `final ${verdict}`;
    finalMsg.textContent = 'DONE';
    this.#root.appendChild(finalMsg);
  }

  #formatValue(v) {
    if (v instanceof Error) return v.stack || v.message;
    if (typeof v === 'object' && v !== null) return JSON.stringify(v, null, 2); return String(v);
  }

  #updateSummary() {
    this.#summary.innerHTML = `
      <span>Total:${this.#stats.total}</span>&nbsp;
      <span class="pass">Passed:${this.#stats.pass}</span>&nbsp;
      <span class="fail">Failed:${this.#stats.fail}</span>&nbsp;
      <span class="error">Errors:${this.#stats.error}</span>
    `;
  }
}

if (!customElements.get('a-testresults')) {
  customElements.define('a-testresults', ATestResults);
}
