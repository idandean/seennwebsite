/**
 * The "Book a Demo" modal on index.html and he/index.html closes when its dark
 * backdrop is clicked. A text selection that starts in a form field and is
 * released over the backdrop also fires its click on the backdrop, and used to
 * close the modal and throw the half-filled form away.
 *
 * Runs the committed modal markup from each page, inline handlers and all,
 * against the committed modal functions from js/script.js.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative: string): string => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const SCRIPT_JS = read('js/script.js');

/** The page's own window, where the inline onclick/onmousedown handlers resolve names. */
const pageWindow = (
  globalThis as unknown as { jsdom: { window: { eval(code: string): void; openDemoModal(): void } } }
).jsdom.window;

/** openDemoModal, closeDemoModal and the backdrop handlers, verbatim. */
function modalFunctions(): string {
  const start = SCRIPT_JS.indexOf('// Demo Modal Functions');
  const end = SCRIPT_JS.indexOf('window.SeennLeads =');
  if (start < 0 || end < start) throw new Error('could not locate the demo modal functions');
  return SCRIPT_JS.slice(start, end);
}

function openModal(page: string) {
  const markup = new DOMParser().parseFromString(read(page), 'text/html').getElementById('demoModal');
  if (!markup) throw new Error(`no #demoModal in ${page}`);
  document.body.innerHTML = markup.outerHTML;
  pageWindow.eval(modalFunctions());
  pageWindow.openDemoModal();

  const modal = document.getElementById('demoModal') as HTMLElement;
  const backdrop = modal.firstElementChild as HTMLElement;
  const card = backdrop.firstElementChild as HTMLElement;

  return {
    backdrop,
    card,
    field: modal.querySelector('input') as HTMLInputElement,
    closeButton: card.querySelector('button[onclick="closeDemoModal()"]') as HTMLElement,
    press: (el: Element) => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
    click: (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    isOpen: () => modal.style.display !== 'none',
  };
}

describe.each(['index.html', 'he/index.html'])('demo modal backdrop on %s', (page) => {
  it('stays open when a text selection starts in a field and ends on the backdrop', () => {
    const m = openModal(page);
    m.press(m.field);
    m.click(m.backdrop);
    expect(m.isOpen()).toBe(true);
  });

  it('closes on an ordinary click on the backdrop', () => {
    const m = openModal(page);
    m.press(m.backdrop);
    m.click(m.backdrop);
    expect(m.isOpen()).toBe(false);
  });

  it('stays open on a click inside the card', () => {
    const m = openModal(page);
    m.press(m.card);
    m.click(m.card);
    expect(m.isOpen()).toBe(true);
  });

  it('still closes from the × button', () => {
    const m = openModal(page);
    m.press(m.closeButton);
    m.click(m.closeButton);
    expect(m.isOpen()).toBe(false);
  });
});
