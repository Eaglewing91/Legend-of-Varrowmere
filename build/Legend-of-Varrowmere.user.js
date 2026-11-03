// ==UserScript==
// @name         Legend of Varrowmere
// @namespace    eaglewing.legend-of-varrowmere
// @version      1.1.0
// @description  Legend of Varrowmere is temporarily paused while Torn staff review it. This version only shows a notice from the Tampermonkey menu. It runs no game, makes no requests of any kind and stores nothing. Your saved files are kept on your device.
// @author       Eaglewing [571041]
// @copyright    2026, Eaglewing [571041]. All rights reserved.
// @license      All Rights Reserved - for use on Torn (torn.com) only; no copying, modifying, redistribution or use elsewhere (see LICENCE)
// @homepageURL  https://github.com/Eaglewing91/Legend-of-Varrowmere
// @updateURL    https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js
// @downloadURL  https://github.com/Eaglewing91/Legend-of-Varrowmere/raw/main/build/Legend-of-Varrowmere.user.js
// @match        https://www.torn.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==
/*
 * LEGEND OF VARROWMERE by Eaglewing [571041]
 * Licence: all rights reserved, for use on Torn only (full text: LICENCE in the GitHub repo). Torn's own names and
 * material belong to Torn's owners. Unofficial fan project, not affiliated with Torn.
 *
 * LEGEND OF VARROWMERE IS PAUSED
 * Legend of Varrowmere is temporarily paused while Torn staff review it (together with Torn Arcade), so that it fully
 * complies with Torn's scripting rules and advertising rules. Until the review is finished, this version does only
 * this: its Tampermonkey menu entry shows a notice that the game is paused. It runs no game, never reads, clicks or
 * changes Torn's page, makes no requests of any kind, and stores nothing. Your saved files from earlier versions are
 * not read, changed or deleted: they stay on your device for when the game returns.
 *
 * TERMS OF SERVICE (this version)
 * | Data Storage          | No                    |
 * | Data Sharing          | Nobody                |
 * | Purpose of Use        | Other: shows a notice |
 * | Key Storage & Sharing | Not stored / Not shared (no API key is used) |
 * | Key Access Level      | None                  |
 */
(function () {
  'use strict';
  if (window.top !== window.self) return;
  let box = null;
  function show() {
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Legend of Varrowmere is paused');
      box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(6,10,16,.72);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif';
      box.innerHTML = '<div style="width:min(360px,calc(100vw - 32px));border-radius:16px;padding:30px 22px 24px;background:radial-gradient(ellipse at top,#1c2a1c,#0e150e 70%);border:1px solid #3a5a34;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#e4eedc;text-align:center">' +
        '<div style="font-size:42px;line-height:1">⚔️</div><h2 style="margin:12px 0 8px;font-size:19px;color:#fff">Legend of Varrowmere is temporarily down</h2>' +
        '<p style="margin:0 0 10px;color:#c2d0b8;font-size:13.5px">The game is paused while it is reviewed by Torn staff, to make sure it fully meets Torn\'s scripting and advertising rules.</p>' +
        '<p style="margin:0 0 10px;color:#c2d0b8;font-size:13.5px">It will be back as soon as the review is finished. Your saved files are safe on this device.</p>' +
        '<small style="display:block;color:#8a9a80;font-size:12px">This version runs no game and makes no requests.</small>' +
        '<button type="button" style="margin-top:14px;padding:8px 22px;border-radius:999px;border:1px solid #4a8a3a;background:#4a8a3a;color:#fff;font:600 13px system-ui,Arial,sans-serif;cursor:pointer">Close</button></div>';
      box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'BUTTON') box.style.display = 'none'; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box) box.style.display = 'none'; });
      (document.body || document.documentElement).append(box);
    }
    box.style.display = 'grid';
  }
  try { GM_registerMenuCommand('Legend of Varrowmere (paused)', show); } catch (e) {}
})();
