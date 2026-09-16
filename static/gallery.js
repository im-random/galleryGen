'use strict';
const picker = document.querySelector('#images');
const basePath = document.querySelector('#base-path');
const lazy = document.querySelector('#lazy');
const list = document.querySelector('#image-list');
const output = document.querySelector('#output');
const download = document.querySelector('#download');
const pathError = document.querySelector('#path-error');
let images = [];

function escapeAttribute(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
}
function absoluteLocation(value) {
    if (/^\/(?!\/)/.test(value)) return true;
    try {
        const url = new URL(value);
        return ['http:', 'https:', 'file:'].includes(url.protocol);
    } catch { return false; }
}
function imageLocation(folder, filename) {
    folder = folder.trim();
    if (!folder) return '';
    // Convert Windows filesystem paths into browser-compatible absolute file URLs.
    if (/^[a-z]:[\\/]/i.test(folder)) folder = 'file:///' + folder.replace(/\\/g, '/');
    if (/^\\\\/.test(folder)) folder = 'file://' + folder.slice(2).replace(/\\/g, '/');
    return folder.replace(/\/+$/, '') + '/' + encodeURIComponent(filename);
}
function buildHTML() {
    return '<ul>\n' + images.map(item => `  <li>\n    <img src="${escapeAttribute(item.src)}" alt="${escapeAttribute(item.alt)}"${lazy.checked ? ' loading="lazy"' : ''}>\n  </li>`).join('\n') + (images.length ? '\n' : '') + '</ul>\n';
}
function refresh() {
    const invalid = images.some(item => !absoluteLocation(item.src));
    pathError.textContent = invalid ? 'Enter an absolute folder or a valid absolute location for every image to enable download.' : '';
    download.disabled = !images.length || invalid;
    output.textContent = buildHTML();
    document.querySelector('#count').textContent = `${images.length} image${images.length === 1 ? '' : 's'}`;
    document.querySelector('#empty').hidden = images.length > 0;
}
picker.addEventListener('change', () => {
    if (!picker.files.length) return;
    images.forEach(item => URL.revokeObjectURL(item.preview));
    images = Array.from(picker.files, file => ({
        name: file.name, alt: '', src: imageLocation(basePath.value, file.name),
        preview: URL.createObjectURL(file), customPath: false
    }));
    list.replaceChildren();
    document.querySelector('#status').textContent = '';
    images.forEach((item, index) => {
        const row = document.createElement('li');
        const thumbnail = document.createElement('img');
        thumbnail.className = 'thumbnail';
        thumbnail.src = item.preview;
        thumbnail.alt = '';
        thumbnail.addEventListener('error', () => {
            const fallback = document.createElement('span');
            fallback.className = 'thumbnail thumbnail-fallback';
            fallback.textContent = 'No preview';
            thumbnail.replaceWith(fallback);
        });
        const details = document.createElement('div');
        const filename = document.createElement('strong');
        filename.className = 'filename';
        filename.textContent = item.name;
        const sourceLabel = document.createElement('label');
        sourceLabel.htmlFor = `src-${index}`;
        sourceLabel.textContent = 'Absolute image location';
        const source = document.createElement('input');
        source.type = 'text'; source.id = sourceLabel.htmlFor; source.value = item.src;
        source.spellcheck = false;
        source.placeholder = 'Set the folder above or enter a full URL';
        source.addEventListener('input', () => { item.src = source.value.trim(); item.customPath = true; refresh(); });
        item.sourceInput = source;
        details.append(filename, sourceLabel, source);
        const altField = document.createElement('div');
        altField.className = 'alt-field';
        const altLabel = document.createElement('label');
        altLabel.htmlFor = `alt-${index}`; altLabel.textContent = 'Alt text';
        const alt = document.createElement('textarea');
        alt.id = altLabel.htmlFor; alt.rows = 2;
        alt.placeholder = 'Describe the image (leave blank if decorative)';
        alt.addEventListener('input', () => { item.alt = alt.value; refresh(); });
        altField.append(altLabel, alt);
        row.append(thumbnail, details, altField);
        list.append(row);
    });
    refresh();
});
basePath.addEventListener('input', () => {
    images.forEach(item => {
        if (!item.customPath) { item.src = imageLocation(basePath.value, item.name); item.sourceInput.value = item.src; }
    });
    refresh();
});
basePath.addEventListener('blur', () => {
    const folder = basePath.value.trim();
    if (folder) {
        basePath.value = folder.replace(/[\\/]+$/, '') + '/';
        basePath.dispatchEvent(new Event('input'));
    }
});
lazy.addEventListener('change', refresh);
download.addEventListener('click', () => {
    if (download.disabled) return;
    const url = URL.createObjectURL(new Blob([buildHTML()], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'list.html';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('#status').textContent = 'Download requested: list.html';
});
refresh();
