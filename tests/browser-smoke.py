"""Run against `python -m http.server 8765 --bind 127.0.0.1`.

Requires Python Playwright and its Chromium browser. No npm dependencies.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:8765'
RESULTS = Path(__file__).resolve().parent.parent / 'test-results'
RESULTS.mkdir(exist_ok=True)


def ready(page):
    page.goto(BASE, wait_until='domcontentloaded')
    expect(page.locator('#page-loader')).to_be_hidden(timeout=120000)
    expect(page.locator('#book')).to_have_attribute('data-state', 'idle', timeout=120000)


def open_play(page, entry='#btn-play-entry'):
    page.locator(entry).click()
    expect(page.locator('#play-panel')).to_have_class('dock-panel play-panel is-open')
    expect(page.locator('[data-play-theme="free"]')).to_be_focused(timeout=3000)


def draw(page):
    page.locator('#btn-play-draw').click()
    expect(page.locator('#play-sign')).to_be_visible(timeout=3000)
    return page.locator('#play-sign').inner_text()


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1280, 'height': 1000})
    context.grant_permissions(['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    ready(page)
    today = page.locator('#book').get_attribute('data-date')
    page.screenshot(path=str(RESULTS / 'desktop-calendar.png'))
    open_play(page)
    expect(page.locator('#play-date')).to_contain_text(today.replace('-', ' / '))
    free_sign = draw(page)
    assert draw(page) == free_sign, 'Re-reading must preserve the daily sign'
    page.locator('#btn-play-copy').click()
    expect(page.locator('#play-status')).to_contain_text('已复制')
    assert today in page.evaluate('navigator.clipboard.readText()')
    page.locator('[data-play-theme="focus"]').click()
    expect(page.locator('#play-sign')).to_be_hidden()
    assert draw(page) != free_sign, 'Themes must have their own sign pools'
    page.locator('#btn-play-stamp').click()
    expect(page.locator('#btn-play-stamp')).to_be_disabled()
    expect(page.locator('#play-stats')).to_have_text('共 1 枚 · 连续 1 天')
    expect(page.locator('.play-day.is-stamped')).to_have_count(1)
    page.locator('.dock-content').filter(has=page.locator('#play-date')).evaluate('(el) => el.scrollTop = 0')
    page.screenshot(path=str(RESULTS / 'desktop-play.png'), animations='disabled')
    page.keyboard.press('Escape')
    expect(page.locator('#btn-play-entry')).to_be_focused()
    expect(page.locator('#play-panel')).to_be_hidden(timeout=3000)
    ready(page)
    open_play(page)
    expect(page.locator('#play-stats')).to_have_text('共 1 枚 · 连续 1 天')
    expect(page.locator('#btn-play-stamp')).to_be_disabled()
    assert draw(page) == free_sign, 'Refresh must preserve the generated sign'

    # Tool panels close each other and preserve original date/export functionality.
    page.locator('#btn-date').click()
    expect(page.locator('#play-panel')).to_be_hidden()
    expect(page.locator('#date-panel')).to_be_visible()
    page.locator('#btn-export').click()
    expect(page.locator('#date-panel')).to_be_hidden()
    expect(page.locator('#export-panel')).to_be_visible()
    open_play(page, '#btn-play')
    expect(page.locator('#export-panel')).to_be_hidden()

    # Flip the actual calendar backwards, then verify the shared date and readonly challenge.
    page.keyboard.press('Escape')
    page.locator('#btn-prev').click()
    expect(page.locator('#book')).not_to_have_attribute('data-date', today, timeout=120000)
    expect(page.locator('#book')).to_have_attribute('data-state', 'idle', timeout=120000)
    previous = page.locator('#book').get_attribute('data-date')
    open_play(page)
    expect(page.locator('#play-date')).to_contain_text(previous.replace('-', ' / '))
    expect(page.locator('#btn-play-stamp')).to_be_disabled()
    expect(page.locator('#btn-play-stamp')).to_have_text('翻回今天，再来盖章')
    expect(page.locator('#play-stats')).to_have_text('共 1 枚 · 连续 1 天')
    draw(page)
    page.locator('#btn-play-today').click()
    expect(page.locator('#book')).to_have_attribute('data-date', today, timeout=120000)
    expect(page.locator('#book')).to_have_attribute('data-state', 'idle', timeout=120000)
    assert not errors, errors
    print('Desktop: draw, theme, copy, stamp, persistence, panels, Escape and real date flip passed.', flush=True)

    mobile_context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True,
                                         has_touch=True, device_scale_factor=1, reduced_motion='reduce')
    mobile = mobile_context.new_page()
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    ready(mobile)
    open_play(mobile)
    draw(mobile)
    mobile.locator('#btn-play-stamp').click()
    expect(mobile.locator('#btn-play-stamp')).to_be_disabled()
    mobile.locator('#play-panel .dock-content').evaluate('(el) => el.scrollTop = 0')
    panel_box = mobile.locator('#play-panel').bounding_box()
    assert panel_box['x'] >= 0 and panel_box['x'] + panel_box['width'] <= 390
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.screenshot(path=str(RESULTS / 'mobile-play.png'))
    mobile.locator('#play-panel .dock-content').evaluate('(el) => el.scrollTop = el.scrollHeight')
    expect(mobile.locator('#btn-play-close')).to_be_in_viewport()
    mobile.screenshot(path=str(RESULTS / 'mobile-collection.png'))
    mobile.locator('#play-panel .dock-content').evaluate('(el) => el.scrollTop = 0')

    # Clipboard denied: a visible, selected text field still lets the user share.
    mobile.evaluate("Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('denied'))}, configurable: true})")
    mobile.locator('#btn-play-copy').click()
    expect(mobile.locator('#play-share-text')).to_be_visible()
    assert mobile.locator('#play-share-text').input_value().startswith('老黄历 · 今日小馆')
    mobile.locator('#btn-play-close').click()
    expect(mobile.locator('#play-panel')).to_be_hidden()
    expect(mobile.locator('#btn-play-entry')).to_be_focused()
    assert not errors, errors
    print('Mobile: layout, reduced motion, scroll, stamp, clipboard fallback and close passed.', flush=True)

    # Storage unavailable: no startup crash and a clear session-only record.
    denied_context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    denied_context.add_init_script("Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});")
    denied = denied_context.new_page()
    denied.on('pageerror', lambda error: errors.append(str(error)))
    ready(denied)
    open_play(denied)
    denied.locator('#btn-play-stamp').click()
    expect(denied.locator('#play-storage-note')).to_contain_text('仅在当前页面保留')
    expect(denied.locator('#play-stats')).to_have_text('共 1 枚 · 连续 1 天')
    assert not errors, errors
    print('Blocked storage: session play works without page errors.', flush=True)
    browser.close()
