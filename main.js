let currentPlatform = '';
let currentType = 'Games';
let currentRating = 'Everyone';
let currentSwf = null;

const listContainer = document.getElementById('list-container');
const playerArea = document.getElementById('player-area');

function showList() {
    listContainer.style.display = 'block';
    playerArea.style.display = 'none';
}

function showPlayer() {
    listContainer.style.display = 'none';
    playerArea.style.display = 'flex';
}

async function tryLoadFolder(basePath) {
    const apiUrl = `https://api.github.com/repos/unit489/Flashbacked/contents/${basePath}`;
    try {
        const r = await fetch(apiUrl, { cache: 'no-store' });
        if (!r.ok) return { success: false, items: [] };
        const items = await r.json();
        if (!Array.isArray(items)) return { success: false, items: [] };

        const swfs = items.filter(i => i.type === 'file' && i.name.toLowerCase().endsWith('.swf'));
        return { success: true, items: swfs };
    } catch (err) {
        console.warn(`Fetch failed for ${basePath}:`, err);
        return { success: false, items: [] };
    }
}

async function loadCurrent() {
    currentPlatform = document.getElementById('platform').value;
    currentType = document.getElementById('type').value;
    currentRating = document.getElementById('rating').value;

    if (!currentPlatform) {
        document.getElementById('path').textContent = 'Select a platform...';
        document.getElementById('list').innerHTML = '<li>Select a platform to browse</li>';
        return;
    }

    let displayPath = `${currentPlatform} / ${currentType} / ${currentRating}`;
    let basePath = `${encodeURIComponent(currentPlatform)}/${encodeURIComponent(currentType)}/${encodeURIComponent(currentRating)}`;
    let { success, items: swfs } = await tryLoadFolder(basePath);

    // Fallback 1: Try without rating folder
    if (!success || swfs.length === 0) {
        displayPath = `${currentPlatform} / ${currentType}`;
        basePath = `${encodeURIComponent(currentPlatform)}/${encodeURIComponent(currentType)}`;
        const fallback1 = await tryLoadFolder(basePath);
        success = fallback1.success;
        swfs = fallback1.items;
    }

    // Fallback 2: Try platform root directly
    if (!success || swfs.length === 0) {
        displayPath = currentPlatform;
        basePath = encodeURIComponent(currentPlatform);
        const fallback2 = await tryLoadFolder(basePath);
        success = fallback2.success;
        swfs = fallback2.items;
    }

    document.getElementById('path').textContent = displayPath;

    let html = '';
    if (!success) {
        html = '<li>Folder not accessible or error — try another platform</li>';
    } else if (swfs.length === 0) {
        html = '<li>No .swf files found in this location (or subfolders may exist)</li>';
    } else {
        swfs.forEach(swf => {
            const encodedFileName = encodeURIComponent(swf.name);
            const url = `https://unit489.github.io/Flashbacked/${basePath}/${encodedFileName}`;
            html += `<li onclick="selectSwf('${url}', '${swf.name.replace(/'/g, "\\'")}')">
                ${swf.name}
            </li>`;
        });
    }

    document.getElementById('list').innerHTML = html || '<li>No files found</li>';
}

async function populatePlatforms() {
    const apiUrl = 'https://api.github.com/repos/unit489/Flashbacked/contents/';
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Failed to fetch repo contents');
        const items = await res.json();

        const platforms = items
            .filter(i => i.type === 'dir' && !i.name.startsWith('.'))
            .map(i => i.name)
            .sort();

        const select = document.getElementById('platform');
        select.innerHTML = '<option value="">Select Platform</option>';
        platforms.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            if (p === 'Newgrounds') opt.selected = true;
            select.appendChild(opt);
        });

        if (platforms.length > 0) {
            currentPlatform = platforms.includes('Newgrounds') ? 'Newgrounds' : platforms[0];
            select.value = currentPlatform;
            loadCurrent();
        }
    } catch (err) {
        console.error('Failed to load platforms:', err);
        document.getElementById('platform').innerHTML = '<option>Error loading platforms</option>';
    }
}

function selectSwf(url, name) {
    currentSwf = { url, name };

    const container = document.getElementById('player');
    container.innerHTML = '';

    const ruffle = window.RufflePlayer.newest();
    if (!ruffle) {
        container.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Ruffle not loaded – check console.</p>';
        return;
    }

    const player = ruffle.createPlayer();

    player.config = {
        letterbox: "on",
        scale: "showall",
        quality: "high",
        autoplay: "on",
        unmuteOverlay: "hidden",
        backgroundColor: "#000000",
        logLevel: "info"
    };

    container.appendChild(player);

    player.load(url).catch(err => {
        console.error("Failed to load SWF:", err);
        container.innerHTML += '<p style="color:red;">Load failed – check console/URL.</p>';
    });

    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);

    showPlayer();
}

function clearPlayer() {
    document.getElementById('player').innerHTML = '';
    currentSwf = null;
    showList();
}

window.addEventListener('load', () => {
    populatePlatforms();
    showList();
});