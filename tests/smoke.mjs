import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'fc-zago-test-'));
const pageUrl = pathToFileURL(resolve('index.html')).href;
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, pageUrl,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let socket;

try {
  let port;
  for (let attempt = 0; attempt < 80; attempt++) {
    const file = join(profile, 'DevToolsActivePort');
    if (existsSync(file)) {
      port = readFileSync(file, 'utf8').split('\n')[0];
      break;
    }
    await sleep(100);
  }
  assert.ok(port, 'Chrome did not start a debugging session');

  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find((item) => item.type === 'page' && item.url === pageUrl);
  assert.ok(page, 'Site tab was not opened');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve: done, reject: fail } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? fail(new Error(message.error.message)) : done(message.result);
  });
  const send = (method, params = {}) => new Promise((done, fail) => {
    const id = ++nextId;
    pending.set(id, { resolve: done, reject: fail });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const screenshot = async (name, selector) => {
    await evaluate(`(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior: 'instant', block: 'start'}); })()`);
    await sleep(150);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(tmpdir(), name), Buffer.from(result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate('document.readyState === "complete" && document.querySelectorAll(".day-card").length > 0')) break;
    await sleep(100);
  }

  assert.equal(await evaluate('document.querySelectorAll(".location-button").length'), 8);
  assert.equal(await evaluate('document.querySelectorAll(".day-card").length'), 3);
  assert.equal(await evaluate(`[...document.querySelectorAll('a[href^="#"]')].every(a => document.querySelector(a.getAttribute('href')))`), true);

  const expected = {
    rafieva: [3, 7], pritytskogo: [2, 4], chizhovka: [2, 6], filimonova: [4, 8],
    slesarnaya: [2, 4], pobediteley: [2, 4], surganova: [3, 8], daumana: [3, 6],
  };
  for (const [key, [days, sessions]] of Object.entries(expected)) {
    const state = await evaluate(`(() => {
      document.querySelector('[data-location="${key}"]').click();
      return {
        selected: document.querySelectorAll('.location-button[aria-pressed="true"]').length,
        active: document.querySelector('[data-location="${key}"]').classList.contains('is-active'),
        days: document.querySelectorAll('.day-card').length,
        sessions: document.querySelectorAll('.session').length,
        title: document.querySelector('#result-title').textContent,
      };
    })()`);
    assert.equal(state.selected, 1, `${key}: single active filter`);
    assert.equal(state.active, true, `${key}: selected filter`);
    assert.equal(state.days, days, `${key}: days`);
    assert.equal(state.sessions, sessions, `${key}: sessions`);
    assert.ok(state.title, `${key}: title`);
  }

  for (const width of [320, 375, 390, 600, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 820 });
    const metrics = await evaluate(`({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, menu: getComputedStyle(document.querySelector('.menu-toggle')).display })`);
    assert.ok(metrics.scroll <= metrics.viewport, `${width}px: horizontal overflow (${metrics.scroll} > ${metrics.viewport})`);
    assert.equal(metrics.menu === 'none', width > 820, `${width}px: navigation breakpoint`);
    const marquee = await evaluate(`(() => {
      const [first, second] = document.querySelectorAll('.ticker-segment');
      const animation = document.querySelector('.ticker-track').getAnimations()[0];
      animation.pause();
      const duration = animation.effect.getTiming().duration;
      const coverage = [0, .25, .5, .75, .999].map((progress) => {
        animation.currentTime = duration * progress;
        const a = first.getBoundingClientRect();
        const b = second.getBoundingClientRect();
        return a.left <= .5 && a.right >= b.left - .5 && b.right >= innerWidth - .5;
      });
      return { identical: first.textContent === second.textContent,
        firstWidth: first.getBoundingClientRect().width,
        secondWidth: second.getBoundingClientRect().width,
        coverage };
    })()`);
    assert.equal(marquee.identical, true, `${width}px: ticker copies match`);
    assert.ok(marquee.firstWidth >= width - 1, `${width}px: ticker segment covers viewport`);
    assert.ok(Math.abs(marquee.firstWidth - marquee.secondWidth) < 1, `${width}px: ticker segments match widths`);
    assert.ok(marquee.coverage.every(Boolean), `${width}px: ticker has no gaps across animation`);
    console.log(`${width}px: no overflow`);
    if (width === 390) {
      await screenshot('fc-zago-ticker-mobile-tested.png', '.ticker');
      await screenshot('fc-zago-schedule-tested.png', '#schedule');
      await screenshot('fc-zago-schedule-card-tested.png', '#schedule-result');
      await screenshot('fc-zago-groups-mobile-tested.png', '#groups');
      await screenshot('fc-zago-contact-mobile-tested.png', '#contacts');
      assert.equal(await evaluate(`(() => {document.querySelector('.menu-toggle').click(); return document.querySelector('.menu-toggle').getAttribute('aria-expanded')})()`), 'true');
      assert.equal(await evaluate(`(() => {document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); return document.querySelector('.menu-toggle').getAttribute('aria-expanded')})()`), 'false');
    }
    if (width === 320) await screenshot('fc-zago-320-tested.png', '#home');
    if (width === 1440) {
      await screenshot('fc-zago-ticker-desktop-tested.png', '.ticker');
      await screenshot('fc-zago-groups-desktop-tested.png', '#groups');
    }
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.ticker-track')).animationName`), 'none');
  console.log('All schedule, navigation and responsive checks passed.');
} finally {
  socket?.close();
  if (chrome.exitCode === null) {
    chrome.kill();
    await Promise.race([new Promise((done) => chrome.once('exit', done)), sleep(3000)]);
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
}
