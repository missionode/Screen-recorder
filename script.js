const toggleRecordingBtn = document.getElementById('toggleRecording');
const recordingList = document.getElementById('recordingList');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const logoInput = document.getElementById('logoInput');
const logoUploadButton = document.getElementById('logoUploadButton');
const changeLogoButton = document.getElementById('changeLogoButton');
const removeLogoButton = document.getElementById('removeLogoButton');
const brandLogo = document.getElementById('brandLogo');
const recordingCount = document.getElementById('recordingCount');
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const panelBackdrop = document.getElementById('panelBackdrop');
const logoHistorySection = document.getElementById('logoHistorySection');
const logoHistoryGrid = document.getElementById('logoHistoryGrid');
const clearLogoHistoryButton = document.getElementById('clearLogoHistoryButton');
const setupBackdrop = document.getElementById('setupBackdrop');
const setupDialog = document.getElementById('setupDialog');
const setupCloseButton = document.getElementById('setupCloseButton');
const setupFacecamToggle = document.getElementById('setupFacecamToggle');
const setupMicrophoneToggle = document.getElementById('setupMicrophoneToggle');
const chooseDestinationButton = document.getElementById('chooseDestinationButton');
const confirmRecordingButton = document.getElementById('confirmRecordingButton');
const destinationName = document.getElementById('destinationName');
const destinationDetail = document.getElementById('destinationDetail');
const popoutFacecamButton = document.getElementById('popoutFacecamButton');
const slide = document.querySelector('.slide');
const topicCloud = document.getElementById('topicCloud');
const addedTagReadout = document.getElementById('addedTagReadout');
const screenshotButton = document.getElementById('screenshotButton');
const screenshotStatus = document.getElementById('screenshotStatus');
const plannerInputView = document.getElementById('plannerInputView');
const plannerInput = document.getElementById('plannerInput');
const prepareTopicsButton = document.getElementById('prepareTopicsButton');
const plannerReview = document.getElementById('plannerReview');
const plannerProgress = document.getElementById('plannerProgress');
const plannerSuggestion = document.getElementById('plannerSuggestion');
const skipTopicButton = document.getElementById('skipTopicButton');
const addTopicButton = document.getElementById('addTopicButton');
const plannerButton = document.getElementById('plannerButton');
const plannerBackdrop = document.getElementById('plannerBackdrop');
const cloudPlannerPanel = document.getElementById('cloudPlannerPanel');
const closePlannerButton = document.getElementById('closePlannerButton');
const plannerContext = document.getElementById('plannerContext');
const plannerCsvInput = document.getElementById('plannerCsvInput');
const uploadPlannerCsvButton = document.getElementById('uploadPlannerCsvButton');
const downloadLatestCsvButton = document.getElementById('downloadLatestCsvButton');
const plannerGroupsElement = document.getElementById('plannerGroups');
const plannerEmpty = document.getElementById('plannerEmpty');
const addPlannerTopicButton = document.getElementById('addPlannerTopicButton');
const plannerSearch = document.getElementById('plannerSearch');
const plannerSearchStatus = document.getElementById('plannerSearchStatus');
const openPresenterButton = document.getElementById('openPresenterButton');
const selectedTermCount = document.getElementById('selectedTermCount');
const slidePresenter = document.getElementById('slidePresenter');
const slidePresenterTopic = document.getElementById('slidePresenterTopic');
const slidePresenterProgress = document.getElementById('slidePresenterProgress');
const slidePresenterInput = document.getElementById('slidePresenterInput');
const slidePresenterSkip = document.getElementById('slidePresenterSkip');
const slidePresenterAdd = document.getElementById('slidePresenterAdd');
const clearCloudButton = document.getElementById('clearCloudButton');

let isRecording = false;
let mediaRecorder;
let stream;
let recordedChunks = [];
let writableStream = null;
let facecamStream = null;
let facecamVideo = null;
let startTime;
let pendingFileHandle = null;
let activeTopicEntry = null;
let topicTags = [];
let plannedTopics = [];
let plannedTopicIndex = 0;
let plannerData = [];
let topicClusterCenters = new Map();
let completedTopicLabels = new Map();
let topicClusterLayouts = new Map();
let addedTagReadoutTimer = null;

const RECORDING_STORAGE_KEY = 'screenRecordings';
const CUSTOMIZATION_STORAGE_KEY = 'screenRecorderCustomization';
const CLOUD_PLANNER_STORAGE_KEY = 'screenRecorderCloudPlanner';
const CLOUD_PLANNER_SELECTION_MODE_KEY = 'screenRecorderCloudPlannerSelectionMode';
const MAX_LOGO_HISTORY = 8;
const TOPIC_COLORS = ['#547f9f', '#687da8', '#4f898f', '#7478a4', '#5d8194'];
const TOPIC_SYMBOLS = ['●', '◆', '▲', '■', '✦', '⬢'];
const TOPIC_SYMBOL_COLORS = ['#3b82f6', '#7c6ee6', '#1597a5', '#5b7fd6', '#8b6fc2', '#2686b8'];
const CENTER_CLOUD_SAFE_WIDTH = 650;
const PROTECTED_CLOUD_SELECTORS = [
    '.privacy-note', '.logo-area', '.eyebrow', '#heroTitle', '#heroSubtitle',
    '.controls', '.local-note', '.settings-button', '.planner-button',
    '.screenshot-button', '.clear-cloud-button', '.slide-presenter', '.slide-number'
];
let cloudSlots = createTopicSlots();
const topicClusterSymbols = new Map();

function createTopicSlots() {
    const slots = [];
    while (slots.length < 2200) {
        const x = 4 + Math.random() * 92;
        const y = 6 + Math.random() * 88;
        const rawAngle = (Math.random() - .5) * 14;
        const angle = Math.abs(rawAngle) < 1.5 ? 0 : rawAngle;
        slots.push([x, y, angle]);
    }
    return slots;
}

function rectanglesIntersect(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
}

function pruneFreeRectangles(rectangles) {
    return rectangles.filter((rect, index) => rect.width > 1 && rect.height > 1 &&
        !rectangles.some((other, otherIndex) => otherIndex !== index &&
            rect.x >= other.x && rect.y >= other.y &&
            rect.x + rect.width <= other.x + other.width &&
            rect.y + rect.height <= other.y + other.height
        ));
}

function splitFreeRectangles(rectangles, placed) {
    const next = [];
    rectangles.forEach(free => {
        if (!rectanglesIntersect(free, placed)) {
            next.push(free);
            return;
        }
        if (placed.x > free.x) {
            next.push({ x: free.x, y: free.y, width: placed.x - free.x, height: free.height });
        }
        if (placed.x + placed.width < free.x + free.width) {
            next.push({
                x: placed.x + placed.width,
                y: free.y,
                width: free.x + free.width - placed.x - placed.width,
                height: free.height
            });
        }
        if (placed.y > free.y) {
            next.push({ x: free.x, y: free.y, width: free.width, height: placed.y - free.y });
        }
        if (placed.y + placed.height < free.y + free.height) {
            next.push({
                x: free.x,
                y: placed.y + placed.height,
                width: free.width,
                height: free.y + free.height - placed.y - placed.height
            });
        }
    });
    return pruneFreeRectangles(next);
}

function estimateTopicCluster(group, sideWidth) {
    const longestText = Math.max(
        group.topic.length,
        group.description.length * .55,
        ...group.terms.map(term => term.term.length)
    );
    const preferredWidth = Math.max(150, Math.min(sideWidth - 12, 150 + longestText * 2.1 + Math.sqrt(group.count) * 18));
    const tagArea = group.terms.reduce((area, term) => {
        const estimatedWidth = Math.max(42, Math.min(180, 28 + term.term.length * 5.7));
        const lines = Math.max(1, term.term.split('\n').length);
        return area + estimatedWidth * (18 + (lines - 1) * 10) * 1.32;
    }, 0);
    const headerHeight = 62 + Math.min(52, Math.ceil(group.description.length / 38) * 13);
    const preferredHeight = Math.max(105, headerHeight + tagArea / Math.max(90, preferredWidth * .72));
    return { width: preferredWidth, height: preferredHeight };
}

function tryPackTopicClusters(clusterSpecs, bins, scale) {
    const binStates = bins.map(bin => ({ ...bin, free: [{ ...bin }] }));
    const placements = new Map();
    const sorted = [...clusterSpecs].sort((a, b) =>
        b.base.width * b.base.height - a.base.width * a.base.height
    );

    for (const spec of sorted) {
        const width = Math.max(92, spec.base.width * scale);
        const height = Math.max(76, spec.base.height * scale);
        let best = null;

        binStates.forEach((bin, binIndex) => {
            bin.free.forEach(free => {
                if (width > free.width || height > free.height) return;
                const shortSide = Math.min(free.width - width, free.height - height);
                const areaWaste = free.width * free.height - width * height;
                const score = shortSide * 100000 + areaWaste;
                if (!best || score < best.score) {
                    best = { binIndex, x: free.x, y: free.y, width, height, score };
                }
            });
        });

        if (!best) return null;
        const placed = { x: best.x, y: best.y, width: best.width, height: best.height };
        binStates[best.binIndex].free = splitFreeRectangles(binStates[best.binIndex].free, placed);
        placements.set(spec.groupId, { ...placed, scale });
    }
    return placements;
}

function hashTopicId(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createDeterministicClusterSlots(layout, groupId, canvasWidth, canvasHeight) {
    const count = 720;
    const seed = hashTopicId(groupId);
    const phase = (seed % 6283) / 1000;
    const halfWidth = Math.max(1, (layout.right - layout.left) / 2);
    const halfHeight = Math.max(1, (layout.bottom - layout.top) / 2);
    const centerX = (layout.left + layout.right) / 2;
    const centerY = (layout.top + layout.bottom) / 2;
    const slots = [];

    for (let index = 0; index < count; index += 1) {
        const progress = count === 1 ? 0 : index / (count - 1);
        const radius = .16 + Math.sqrt(progress) * .81;
        const angle = phase + index * 2.399963229728653;
        const x = centerX + Math.cos(angle) * halfWidth * radius;
        const y = centerY + Math.sin(angle) * halfHeight * radius;
        const rotationSeed = ((seed + index * 1103515245) >>> 0) % 900;
        const rotation = (rotationSeed / 900 - .5) * 8;
        slots.push([x / canvasWidth * 100, y / canvasHeight * 100, rotation]);
    }
    return slots;
}

function precalculateTopicGrid(items) {
    topicClusterLayouts.clear();
    topicClusterCenters.clear();
    const groups = new Map();
    items.forEach(item => {
        if (!item.groupId) return;
        if (!groups.has(item.groupId)) {
            groups.set(item.groupId, {
                count: 0,
                topic: item.context || '',
                description: item.description || '',
                terms: []
            });
        }
        const group = groups.get(item.groupId);
        group.count += 1;
        group.terms.push(item);
    });
    const groupIndexes = new Map();
    items.forEach(item => {
        if (!item.groupId) return;
        item.gridIndex = groupIndexes.get(item.groupId) || 0;
        item.gridCount = groups.get(item.groupId).count;
        groupIndexes.set(item.groupId, item.gridIndex + 1);
    });
    const entries = [...groups.entries()];
    if (!entries.length) return;

    const width = topicCloud.clientWidth;
    const height = topicCloud.clientHeight;
    const corridorWidth = Math.min(CENTER_CLOUD_SAFE_WIDTH, Math.max(0, width - 240));
    const sideWidth = (width - corridorWidth) / 2;
    const edgeInset = Math.max(52, Math.min(78, height * .11));
    const binMargin = Math.max(8, Math.min(16, sideWidth * .045));
    const binHeight = Math.max(1, height - edgeInset * 2);
    const bins = [
        { x: binMargin, y: edgeInset, width: Math.max(1, sideWidth - binMargin * 2), height: binHeight },
        { x: width - sideWidth + binMargin, y: edgeInset, width: Math.max(1, sideWidth - binMargin * 2), height: binHeight }
    ];
    const specs = entries.map(([groupId, group]) => ({
        groupId,
        group,
        base: estimateTopicCluster(group, bins[0].width)
    }));

    let low = .28;
    let high = 1;
    let bestPlacements = tryPackTopicClusters(specs, bins, low);
    for (let iteration = 0; iteration < 12; iteration += 1) {
        const scale = (low + high) / 2;
        const placements = tryPackTopicClusters(specs, bins, scale);
        if (placements) {
            bestPlacements = placements;
            low = scale;
        } else {
            high = scale;
        }
    }

    if (!bestPlacements) {
        // Last-resort deterministic rows preserve every topic when the minimum scale cannot pack.
        const rowsPerSide = Math.ceil(entries.length / 2);
        entries.forEach(([groupId], index) => {
            const isLeft = index % 2 === 0;
            const row = Math.floor(index / 2);
            const bin = bins[isLeft ? 0 : 1];
            bestPlacements ||= new Map();
            bestPlacements.set(groupId, {
                x: bin.x,
                y: bin.y + bin.height * row / rowsPerSide,
                width: bin.width,
                height: bin.height / rowsPerSide,
                scale: .28
            });
        });
    }

    bestPlacements.forEach((placement, groupId) => {
        const inset = Math.max(4, 8 * placement.scale);
        const left = placement.x + inset;
        const right = placement.x + placement.width - inset;
        const top = placement.y + inset;
        const bottom = placement.y + placement.height - inset;
        topicClusterLayouts.set(groupId, {
            left, right, top, bottom,
            scale: placement.scale,
            x: (left + right) / 2 / width * 100,
            y: (top + bottom) / 2 / height * 100
        });
    });
    topicClusterLayouts.forEach((layout, groupId) => {
        layout.slots = createDeterministicClusterSlots(layout, groupId, width, height);
    });
}

function getTopicCluster(groupId) {
    if (!groupId) return null;
    if (topicClusterCenters.has(groupId)) return topicClusterCenters.get(groupId);
    if (!topicClusterSymbols.has(groupId)) {
        topicClusterSymbols.set(groupId, TOPIC_SYMBOLS[topicClusterSymbols.size % TOPIC_SYMBOLS.length]);
    }

    const existing = [...topicClusterCenters.values()];
    const reservedLayout = topicClusterLayouts.get(groupId);
    const slideWidth = slide.clientWidth || 1200;
    const centerSafeWidth = Math.min(CENTER_CLOUD_SAFE_WIDTH, Math.max(0, slideWidth - 240));
    const sideBoundary = (slideWidth - centerSafeWidth) / 2 / slideWidth * 100;
    const candidates = cloudSlots.filter(slot =>
        slot[0] > 6 && slot[0] < 94 && slot[1] > 12 && slot[1] < 88 &&
        (slot[0] < sideBoundary || slot[0] > 100 - sideBoundary)
    );
    const distanceFromNearestCluster = slot => existing.length
        ? Math.min(...existing.map(cluster => Math.hypot(slot[0] - cluster.x, slot[1] - cluster.y)))
        : 100;
    const wellSpaced = candidates.filter(slot => distanceFromNearestCluster(slot) >= 30);
    const pool = wellSpaced.length ? wellSpaced : [...candidates].sort((a, b) =>
        distanceFromNearestCluster(b) - distanceFromNearestCluster(a)
    ).slice(0, Math.max(1, Math.ceil(candidates.length * .08)));
    const selected = reservedLayout
        ? [reservedLayout.x, reservedLayout.y]
        : pool[Math.floor(Math.random() * pool.length)] || [50, 50];
    const symbol = topicClusterSymbols.get(groupId);
    const cluster = {
        x: selected[0],
        y: selected[1],
        color: TOPIC_COLORS[topicClusterCenters.size % TOPIC_COLORS.length],
        phase: hashTopicId(groupId) % 6283 / 1000,
        symbol,
        symbolColor: TOPIC_SYMBOL_COLORS[TOPIC_SYMBOLS.indexOf(symbol) % TOPIC_SYMBOL_COLORS.length]
    };
    topicClusterCenters.set(groupId, cluster);
    return cluster;
}

function positionCompletedTopicLabel(groupId, animate = false) {
    const label = completedTopicLabels.get(groupId);
    const cluster = getTopicCluster(groupId);
    if (!label || !cluster) return;
    const layout = topicClusterLayouts.get(groupId);
    if (!animate) label.classList.add('clustered');
    label.style.left = `${cluster.x}%`;
    label.style.top = `${cluster.y}%`;
    label.style.setProperty('--cluster-color', cluster.color);
    label.style.setProperty('--topic-symbol-color', cluster.symbolColor);
    if (layout) {
        label.style.width = `${Math.max(80, layout.right - layout.left - 8)}px`;
        label.style.setProperty('--cloud-density', String(layout.scale));
    }
    const marker = label.querySelector('.completed-topic-symbol');
    if (marker) marker.textContent = cluster.symbol;
}

function setCompletedTopicTitle(title, text, symbol) {
    const marker = document.createElement('span');
    marker.className = 'completed-topic-symbol';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = symbol;
    const titleText = document.createElement('span');
    titleText.className = 'completed-topic-title-text';
    titleText.textContent = text;
    title.replaceChildren(marker, titleText);
}

function moveClusterToSafeLabelPosition(groupId, label) {
    const cluster = getTopicCluster(groupId);
    if (topicClusterLayouts.has(groupId)) return;
    const slideBounds = slide.getBoundingClientRect();
    const safety = 42;
    const width = label.offsetWidth;
    const height = label.offsetHeight;
    const tagCount = topicTags.filter(tag => tag.dataset.topicGroup === groupId).length;
    const orbitHalo = Math.min(72, 48 + tagCount * 2);
    const blocked = [
        ...PROTECTED_CLOUD_SELECTORS.map(selector => slide.querySelector(selector)).filter(Boolean),
        ...topicCloud.querySelectorAll('.completed-topic-label')
    ].filter(element => element !== label).map(element => {
        const bounds = element.getBoundingClientRect();
        return {
            left: bounds.left - slideBounds.left - safety,
            right: bounds.right - slideBounds.left + safety,
            top: bounds.top - slideBounds.top - safety,
            bottom: bounds.bottom - slideBounds.top + safety
        };
    });
    const centerSafeWidth = Math.min(CENTER_CLOUD_SAFE_WIDTH, Math.max(0, slide.clientWidth - 240));
    blocked.push({
        left: (slide.clientWidth - centerSafeWidth) / 2,
        right: (slide.clientWidth + centerSafeWidth) / 2,
        top: 0,
        bottom: slide.clientHeight
    });
    const candidates = [...cloudSlots].sort((a, b) =>
        Math.hypot(a[0] - cluster.x, a[1] - cluster.y) -
        Math.hypot(b[0] - cluster.x, b[1] - cluster.y)
    );
    const safe = candidates.find(slot => {
        const centerX = slide.clientWidth * slot[0] / 100;
        const centerY = slide.clientHeight * slot[1] / 100;
        const bounds = {
            left: centerX - width / 2 - orbitHalo,
            right: centerX + width / 2 + orbitHalo,
            top: centerY - height / 2 - orbitHalo,
            bottom: centerY + height / 2 + orbitHalo
        };
        const intersects = other => !(
            bounds.right <= other.left || bounds.left >= other.right ||
            bounds.bottom <= other.top || bounds.top >= other.bottom
        );
        return bounds.left >= safety && bounds.right <= slide.clientWidth - safety &&
            bounds.top >= safety && bounds.bottom <= slide.clientHeight - safety &&
            !blocked.some(intersects);
    });
    if (safe) {
        cluster.x = safe[0];
        cluster.y = safe[1];
    }
}

function finalizeTopicCluster(topic) {
    if (!topic?.groupId || !topic.context) return;
    const existing = completedTopicLabels.get(topic.groupId);
    if (existing) {
        const cluster = getTopicCluster(topic.groupId);
        setCompletedTopicTitle(existing.querySelector('strong'), topic.context, cluster.symbol);
        const description = existing.querySelector('span');
        description.textContent = topic.description || '';
        description.hidden = !description.textContent;
        moveClusterToSafeLabelPosition(topic.groupId, existing);
        positionCompletedTopicLabel(topic.groupId);
        return;
    }

    const slideBounds = slide.getBoundingClientRect();
    const titleBounds = heroTitle.getBoundingClientRect();
    const subtitleBounds = heroSubtitle.getBoundingClientRect();
    const label = document.createElement('section');
    label.className = 'completed-topic-label';
    label.dataset.topicGroup = topic.groupId;
    label.style.left = `${titleBounds.left - slideBounds.left + titleBounds.width / 2}px`;
    label.style.top = `${(titleBounds.top + subtitleBounds.bottom) / 2 - slideBounds.top}px`;
    const title = document.createElement('strong');
    setCompletedTopicTitle(title, topic.context, getTopicCluster(topic.groupId).symbol);
    const description = document.createElement('span');
    description.textContent = topic.description || '';
    description.hidden = !description.textContent;
    label.append(title, description);
    topicCloud.appendChild(label);
    completedTopicLabels.set(topic.groupId, label);
    moveClusterToSafeLabelPosition(topic.groupId, label);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        label.classList.add('clustered');
        positionCompletedTopicLabel(topic.groupId, true);
        setTimeout(arrangeTopicCloud, 700);
    }));
}

slide.addEventListener('click', event => {
    if (event.target.closest('.slide-content, button, input, label, [contenteditable="true"], .settings-button, .planner-button, .topic-entry')) return;
    openTopicEntry(event.clientX, event.clientY);
});

slide.addEventListener('dblclick', event => {
    if (event.target.closest('.slide-content, button, input, label, [contenteditable="true"], .settings-button, .planner-button')) return;
    event.preventDefault();
    cancelTopicEntry();
    rearrangeTopicCloud();
});

function openTopicEntry(clientX, clientY) {
    if (activeTopicEntry?.input.value.trim()) commitTopicEntry();
    else cancelTopicEntry();
    const bounds = slide.getBoundingClientRect();
    const x = Math.max(18, Math.min(clientX - bounds.left, bounds.width - 225));
    const y = Math.max(35, Math.min(clientY - bounds.top, bounds.height - 35));
    const input = document.createElement('input');
    const dot = document.createElement('span');
    input.className = 'topic-entry';
    input.type = 'text';
    input.maxLength = 36;
    input.placeholder = 'Type a topic…';
    input.setAttribute('aria-label', 'Add a topic tag');
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    dot.className = 'topic-entry-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    slide.append(dot, input);
    activeTopicEntry = { input, dot, x, y };
    input.focus();
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitTopicEntry();
        }
        if (event.key === 'Escape') cancelTopicEntry();
    });
    input.addEventListener('blur', () => setTimeout(() => {
        if (!activeTopicEntry || activeTopicEntry.input !== input) return;
        if (input.value.trim()) commitTopicEntry();
        else cancelTopicEntry();
    }, 0));
}

function commitTopicEntry() {
    if (!activeTopicEntry) return;
    const { input, dot, x, y } = activeTopicEntry;
    const text = input.value.trim();
    activeTopicEntry = null;
    input.remove();
    dot.remove();
    if (!text) return;

    createTopicTag(text, x, y);
}

function createTopicTag(text, x, y, topic = null) {
    const tag = document.createElement('span');
    tag.className = 'topic-tag settling';
    const tagText = document.createElement('span');
    tagText.className = 'topic-tag-text';
    tagText.textContent = text;
    tag.appendChild(tagText);
    tag.style.left = `${x}px`;
    tag.style.top = `${y}px`;
    tag.dataset.cloudSource = topic?.groupId ? 'planner' : 'direct';
    if (topic?.groupId) tag.dataset.topicGroup = topic.groupId;
    if (Number.isInteger(topic?.gridIndex)) tag.dataset.gridIndex = String(topic.gridIndex);
    if (Number.isInteger(topic?.gridCount)) tag.dataset.gridCount = String(topic.gridCount);
    const topicCluster = getTopicCluster(topic?.groupId);
    if (topicCluster) {
        tag.dataset.topicSymbol = topicCluster.symbol;
        tag.style.setProperty('--topic-symbol-color', topicCluster.symbolColor);
        const marker = document.createElement('span');
        marker.className = 'topic-tag-symbol';
        marker.setAttribute('aria-hidden', 'true');
        marker.textContent = topicCluster.symbol;
        tag.replaceChildren(marker, tagText);
    }
    tag.style.setProperty('--tag-color', topicCluster?.color || TOPIC_COLORS[topicTags.length % TOPIC_COLORS.length]);
    const visualScale = Math.random();
    tag.dataset.visualScale = visualScale.toFixed(3);
    tag.style.setProperty('--tag-size', `${10 + Math.round(visualScale * 10)}px`);
    tag.style.setProperty('--tag-pad-y', `${6 + Math.round(visualScale * 3)}px`);
    tag.style.setProperty('--tag-pad-x', `${10 + Math.round(visualScale * 5)}px`);
    tag.style.setProperty('--tag-weight', `${580 + Math.round(visualScale * 160)}`);
    tag.style.setProperty('--tag-opacity', `${.68 + visualScale * .18}`);
    tag.style.setProperty('--float-distance', `${6 + Math.round(Math.random() * 6)}px`);
    tag.style.setProperty('--float-duration', `${4.5 + Math.random() * 3}s`);
    tag.style.setProperty('--float-delay', `${Math.random() * -3}s`);
    topicCloud.appendChild(tag);
    topicTags.push(tag);
    clearTimeout(addedTagReadoutTimer);
    addedTagReadout.textContent = text;
    addedTagReadout.hidden = false;
    screenshotButton.hidden = false;
    clearCloudButton.hidden = false;
    setTimeout(() => {
        tag.classList.remove('settling');
        arrangeTopicCloud();
        setTimeout(() => tag.classList.add('clouded'), 1200);
    }, 650);
}

function cancelTopicEntry() {
    if (!activeTopicEntry) return;
    activeTopicEntry.input.remove();
    activeTopicEntry.dot.remove();
    activeTopicEntry = null;
}

function arrangeTopicCloud() {
    const cloudWidth = topicCloud.clientWidth;
    const cloudHeight = topicCloud.clientHeight;
    const placedBounds = [];
    const slideBounds = slide.getBoundingClientRect();
    const protectedBounds = [...PROTECTED_CLOUD_SELECTORS, '.completed-topic-label']
        .flatMap(selector => [...slide.querySelectorAll(selector)])
        .map(element => {
            const bounds = element.getBoundingClientRect();
            const safety = element.matches('.privacy-note')
                ? 58
                : element.matches('.logo-area, #heroTitle, #heroSubtitle, .controls, .local-note')
                    ? 34
                    : 22;
            return {
                left: bounds.left - slideBounds.left - safety,
                right: bounds.right - slideBounds.left + safety,
                top: bounds.top - slideBounds.top - safety,
                bottom: bounds.bottom - slideBounds.top + safety
            };
        });
    const centerSafeWidth = Math.min(CENTER_CLOUD_SAFE_WIDTH, Math.max(0, cloudWidth - 240));
    protectedBounds.push({
        left: (cloudWidth - centerSafeWidth) / 2,
        right: (cloudWidth + centerSafeWidth) / 2,
        top: 0,
        bottom: cloudHeight
    });

    const plannerTags = topicTags.filter(tag => tag.dataset.cloudSource === 'planner');
    const directTags = topicTags.filter(tag => tag.dataset.cloudSource !== 'planner');
    const groupedCounts = new Map();
    plannerTags.forEach(tag => {
        const groupId = tag.dataset.topicGroup;
        if (groupId) groupedCounts.set(groupId, (groupedCounts.get(groupId) || 0) + 1);
    });
    const largestGroup = Math.max(0, ...groupedCounts.values());
    const plannerDensity = Math.max(.34, Math.min(1,
        1.08 - plannerTags.length * .007 - groupedCounts.size * .02 - largestGroup * .03
    ));
    const directDensity = Math.max(.34, Math.min(1, 1.08 - directTags.length * .012));
    topicCloud.style.setProperty('--cloud-density', plannerDensity.toFixed(2));

    const arrangedTags = [
        ...plannerTags,
        ...directTags
    ];

    arrangedTags.forEach((tag, index) => {
        const reservedLayout = topicClusterLayouts.get(tag.dataset.topicGroup);
        const tagDensity = tag.dataset.cloudSource === 'planner'
            ? reservedLayout?.scale || plannerDensity
            : directDensity;
        const visualScale = Number(tag.dataset.visualScale || .5);
        const plannerCompactness = tag.dataset.cloudSource === 'planner' ? .82 : 1;
        const baseSize = Math.max(4.5, (9 + visualScale * 9) * tagDensity * plannerCompactness);
        const basePadY = Math.max(1.2, (5 + visualScale * 3) * tagDensity * plannerCompactness);
        const basePadX = Math.max(2.5, (9 + visualScale * 5) * tagDensity * plannerCompactness);
        const baseMaxWidth = Math.max(58, 190 * tagDensity * plannerCompactness);
        tag.style.setProperty('--tag-size', `${baseSize.toFixed(1)}px`);
        tag.style.setProperty('--tag-pad-y', `${basePadY.toFixed(1)}px`);
        tag.style.setProperty('--tag-pad-x', `${basePadX.toFixed(1)}px`);
        tag.style.setProperty('--tag-max-width', `${baseMaxWidth.toFixed(0)}px`);
        let selected = null;

        const cluster = getTopicCluster(tag.dataset.topicGroup);
        const groupTags = cluster
            ? topicTags.filter(item => item.dataset.topicGroup === tag.dataset.topicGroup)
            : [];
        const groupIndex = Number.isInteger(Number(tag.dataset.gridIndex))
            ? Number(tag.dataset.gridIndex)
            : groupTags.indexOf(tag);
        const orbitCount = Math.max(1, Number(tag.dataset.gridCount) || groupTags.length);
        const clusterLabel = cluster ? completedTopicLabels.get(tag.dataset.topicGroup) : null;
        const labelHalfWidth = clusterLabel ? clusterLabel.offsetWidth / 2 : 115 * tagDensity;
        const labelHalfHeight = clusterLabel ? clusterLabel.offsetHeight / 2 : 35 * tagDensity;
        const outwardX = cluster ? (cluster.x - 50) * cloudWidth / 100 : 0;
        const outwardY = cluster ? (cluster.y - 50) * cloudHeight / 100 : 0;
        const outwardLength = Math.max(1, Math.hypot(outwardX, outwardY));
        const outwardUnitX = outwardX / outwardLength;
        const outwardUnitY = outwardY / outwardLength;
        const outwardAngle = Math.atan2(outwardY, outwardX);
        const outwardSpread = Math.PI * 1.08;
        const angle = cluster
            ? orbitCount === 1
                ? outwardAngle
                : outwardAngle - outwardSpread / 2 + outwardSpread * groupIndex / (orbitCount - 1)
            : 0;
        const absCos = Math.abs(Math.cos(angle));
        const absSin = Math.abs(Math.sin(angle));
        const edgeDistance = Math.min(
            absCos > .001 ? labelHalfWidth / absCos : Infinity,
            absSin > .001 ? labelHalfHeight / absSin : Infinity
        );
        const fixedOrbitGap = 14;
        const idealRadius = edgeDistance + fixedOrbitGap;
        const idealX = cluster ? cluster.x + Math.cos(angle) * idealRadius / cloudWidth * 100 : 0;
        const idealY = cluster ? cluster.y + Math.sin(angle) * idealRadius / cloudHeight * 100 : 0;
        const otherClusters = cluster
            ? [...topicClusterCenters.values()].filter(item => item !== cluster)
            : [];
        const candidateSlots = cluster
            ? (reservedLayout?.slots || cloudSlots).filter(slot => {
                const slotCenterX = cloudWidth * slot[0] / 100;
                const slotCenterY = cloudHeight * slot[1] / 100;
                if (reservedLayout && (
                    slotCenterX < reservedLayout.left || slotCenterX > reservedLayout.right ||
                    slotCenterY < reservedLayout.top || slotCenterY > reservedLayout.bottom
                )) return false;
                const slotX = cloudWidth * (slot[0] - cluster.x) / 100;
                const slotY = cloudHeight * (slot[1] - cluster.y) / 100;
                const distanceFromMiniature = Math.hypot(
                    Math.max(0, Math.abs(slotX) - labelHalfWidth),
                    Math.max(0, Math.abs(slotY) - labelHalfHeight)
                );
                const outwardProgress = slotX * outwardUnitX + slotY * outwardUnitY;
                return (reservedLayout || distanceFromMiniature <= 96) &&
                    (reservedLayout || outwardProgress >= -12) &&
                    (reservedLayout || otherClusters.every(other =>
                    Math.hypot(slot[0] - cluster.x, slot[1] - cluster.y) + 2 <=
                    Math.hypot(slot[0] - other.x, slot[1] - other.y)
                ));
            }).sort((a, b) =>
                Math.hypot((a[0] - idealX) * cloudWidth / 100, (a[1] - idealY) * cloudHeight / 100) -
                Math.hypot((b[0] - idealX) * cloudWidth / 100, (b[1] - idealY) * cloudHeight / 100)
            )
            : cloudSlots.filter(slot => [...topicClusterCenters.entries()].every(([groupId, item]) => {
                const label = completedTopicLabels.get(groupId);
                const halfWidth = label ? label.offsetWidth / 2 : 115 * plannerDensity;
                const halfHeight = label ? label.offsetHeight / 2 : 35 * plannerDensity;
                const slotX = cloudWidth * (slot[0] - item.x) / 100;
                const slotY = cloudHeight * (slot[1] - item.y) / 100;
                return Math.hypot(
                    Math.max(0, Math.abs(slotX) - halfWidth),
                    Math.max(0, Math.abs(slotY) - halfHeight)
                ) > 116;
            }));

        const findOpenSlot = slots => {
            const width = tag.offsetWidth;
            const height = tag.offsetHeight;
            const padding = Math.max(1.5, 7 * tagDensity);
            for (const slot of slots) {
                const angleInRadians = slot[2] * Math.PI / 180;
                const rotatedWidth = Math.abs(width * Math.cos(angleInRadians)) + Math.abs(height * Math.sin(angleInRadians));
                const rotatedHeight = Math.abs(width * Math.sin(angleInRadians)) + Math.abs(height * Math.cos(angleInRadians));
                const centerX = Math.max(rotatedWidth / 2 + padding, Math.min(cloudWidth - rotatedWidth / 2 - padding, cloudWidth * slot[0] / 100));
                const centerY = Math.max(rotatedHeight / 2 + padding, Math.min(cloudHeight - rotatedHeight / 2 - padding, cloudHeight * slot[1] / 100));
                const bounds = {
                    left: centerX - rotatedWidth / 2 - padding,
                    right: centerX + rotatedWidth / 2 + padding,
                    top: centerY - rotatedHeight / 2 - padding,
                    bottom: centerY + rotatedHeight / 2 + padding
                };
                const intersects = other => !(
                    bounds.right <= other.left || bounds.left >= other.right ||
                    bounds.bottom <= other.top || bounds.top >= other.bottom
                );
                if (!placedBounds.some(intersects) && !protectedBounds.some(intersects)) {
                    return { centerX, centerY, bounds, rotation: slot[2] };
                }
            }
            return null;
        };

        const applyTagScale = factor => {
            tag.style.setProperty('--tag-size', `${Math.max(3.5, baseSize * factor).toFixed(1)}px`);
            tag.style.setProperty('--tag-pad-y', `${Math.max(.5, basePadY * factor).toFixed(1)}px`);
            tag.style.setProperty('--tag-pad-x', `${Math.max(1, basePadX * factor).toFixed(1)}px`);
            tag.style.setProperty('--tag-max-width', `${Math.max(34, baseMaxWidth * factor).toFixed(0)}px`);
        };
        let selectedFactor = null;
        for (const factor of [.28, .38, .5, .66, .82, 1]) {
            applyTagScale(factor);
            const largerSelection = findOpenSlot(candidateSlots);
            if (!largerSelection) {
                if (selected) break;
                continue;
            }
            selected = largerSelection;
            selectedFactor = factor;
        }
        if (selectedFactor !== null) applyTagScale(selectedFactor);
        if (!selected) {
            tag.style.setProperty('--tag-size', '3px');
            tag.style.setProperty('--tag-pad-y', '0px');
            tag.style.setProperty('--tag-pad-x', '0px');
            tag.style.setProperty('--tag-max-width', '28px');
            selected = findOpenSlot(reservedLayout ? candidateSlots : cloudSlots);
        }
        if (!selected) {
            // Preserve the last visible position only when the entire slide is saturated.
            tag.style.removeProperty('opacity');
            return;
        }

        tag.style.removeProperty('opacity');
        tag.style.left = `${selected.centerX}px`;
        tag.style.top = `${selected.centerY}px`;
        tag.style.setProperty('--tag-rotation', `${selected.rotation}deg`);
        placedBounds.push(selected.bounds);
    });
}

function rearrangeTopicCloud() {
    cloudSlots = createTopicSlots();
    topicClusterCenters.clear();
    completedTopicLabels.forEach((label, groupId) => {
        moveClusterToSafeLabelPosition(groupId, label);
        positionCompletedTopicLabel(groupId);
    });
    for (let index = cloudSlots.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [cloudSlots[index], cloudSlots[swapIndex]] = [cloudSlots[swapIndex], cloudSlots[index]];
    }
    topicCloud.classList.add('rearranging');
    arrangeTopicCloud();
    setTimeout(() => topicCloud.classList.remove('rearranging'), 650);
}

window.addEventListener('resize', arrangeTopicCloud);

screenshotButton.addEventListener('click', copySlideScreenshot);

async function copySlideScreenshot() {
    if (typeof html2canvas === 'undefined') {
        showScreenshotStatus('Screenshot tool unavailable');
        return;
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        showScreenshotStatus('Image clipboard unavailable');
        return;
    }
    if (activeTopicEntry?.input.value.trim()) commitTopicEntry();
    else cancelTopicEntry();

    screenshotButton.disabled = true;
    slide.classList.add('capture-mode');
    try {
        const imagePromise = (async () => {
            if (document.fonts?.ready) await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const captureScale = Math.max(4, (window.devicePixelRatio || 1) * 2);
            const canvas = await html2canvas(slide, {
                backgroundColor: null,
                scale: captureScale,
                useCORS: true,
                logging: false,
                onclone: clonedDocument => {
                    const typographyProperties = [
                        'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
                        'letterSpacing', 'lineHeight', 'textAlign', 'textTransform',
                        'width', 'maxWidth', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'
                    ];
                    [
                        [heroTitle, clonedDocument.getElementById('heroTitle')],
                        [heroSubtitle, clonedDocument.getElementById('heroSubtitle')]
                    ].forEach(([original, clone]) => {
                        if (!clone) return;
                        const computed = getComputedStyle(original);
                        typographyProperties.forEach(property => {
                            clone.style[property] = computed[property];
                        });
                        clone.textContent = original.textContent;
                        clone.removeAttribute('contenteditable');
                        clone.removeAttribute('spellcheck');
                    });
                }
            });
            return new Promise((resolve, reject) => {
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create screenshot')), 'image/png');
            });
        })();

        // Start the clipboard operation directly from the click so browser permission remains valid.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagePromise })]);
        showScreenshotStatus('Copied to clipboard');
    } catch (error) {
        console.error('Could not copy the slide screenshot:', error);
        showScreenshotStatus('Clipboard access was blocked');
    } finally {
        slide.classList.remove('capture-mode');
        screenshotButton.disabled = false;
    }
}

function showScreenshotStatus(message) {
    screenshotStatus.textContent = message;
    screenshotStatus.classList.add('show');
    clearTimeout(showScreenshotStatus.timer);
    showScreenshotStatus.timer = setTimeout(() => screenshotStatus.classList.remove('show'), 2400);
}

function createPlannerId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function savePlannerData() {
    localStorage.setItem(CLOUD_PLANNER_STORAGE_KEY, JSON.stringify(plannerData));
    updatePlannerSelection();
}

function loadPlannerData() {
    try {
        const saved = JSON.parse(localStorage.getItem(CLOUD_PLANNER_STORAGE_KEY) || '[]');
        plannerData = Array.isArray(saved) ? saved : [];
        if (localStorage.getItem(CLOUD_PLANNER_SELECTION_MODE_KEY) !== 'opt-in-v1') {
            plannerData.forEach(group => group.terms?.forEach(term => { term.selected = false; }));
            localStorage.setItem(CLOUD_PLANNER_SELECTION_MODE_KEY, 'opt-in-v1');
            localStorage.setItem(CLOUD_PLANNER_STORAGE_KEY, JSON.stringify(plannerData));
        }
    } catch (_) {
        plannerData = [];
    }
    renderPlannerWorkspace();
}

function renderPlannerWorkspace() {
    plannerGroupsElement.innerHTML = '';
    const query = plannerSearch.value.trim().toLocaleLowerCase();
    const visibleGroups = query
        ? plannerData.filter(group => [
            group.topic,
            group.description,
            ...group.terms.map(term => term.text)
        ].some(value => (value || '').toLocaleLowerCase().includes(query)))
        : plannerData;
    plannerEmpty.hidden = visibleGroups.length > 0;
    const emptyTitle = plannerEmpty.querySelector('strong');
    const emptyDescription = plannerEmpty.querySelector('span');
    if (query && plannerData.length) {
        emptyTitle.textContent = 'No matching topics';
        emptyDescription.textContent = 'Try another topic, description, or cloud term.';
    } else {
        emptyTitle.textContent = 'No topics prepared yet';
        emptyDescription.textContent = 'Upload a CSV or add your first topic manually.';
    }
    plannerSearchStatus.textContent = query
        ? `${visibleGroups.length} of ${plannerData.length} topics`
        : `${plannerData.length} ${plannerData.length === 1 ? 'topic' : 'topics'}`;

    visibleGroups.forEach(group => {
        const card = document.createElement('section');
        card.className = 'planner-group';
        card.dataset.groupId = group.id;
        const header = document.createElement('div');
        header.className = 'planner-group-header';
        const topicCheckbox = document.createElement('input');
        topicCheckbox.type = 'checkbox';
        topicCheckbox.className = 'planner-topic-select';
        topicCheckbox.setAttribute('aria-label', `Select all terms in ${group.topic || 'topic'}`);
        const updateTopicSelectionState = () => {
            const selectedCount = group.terms.filter(term => term.selected).length;
            topicCheckbox.checked = group.terms.length > 0 && selectedCount === group.terms.length;
            topicCheckbox.indeterminate = selectedCount > 0 && selectedCount < group.terms.length;
        };
        topicCheckbox.addEventListener('change', () => {
            group.terms.forEach(term => { term.selected = topicCheckbox.checked; });
            savePlannerData();
            renderPlannerWorkspace();
        });
        const title = document.createElement('input');
        title.className = 'planner-group-title';
        title.value = group.topic;
        title.placeholder = 'Topic name';
        title.setAttribute('aria-label', 'Topic name');
        title.addEventListener('input', () => {
            group.topic = title.value;
            savePlannerData();
        });
        const removeGroup = document.createElement('button');
        removeGroup.className = 'planner-delete';
        removeGroup.type = 'button';
        removeGroup.textContent = '×';
        removeGroup.setAttribute('aria-label', `Delete ${group.topic || 'topic'}`);
        removeGroup.addEventListener('click', () => {
            plannerData = plannerData.filter(item => item.id !== group.id);
            savePlannerData();
            renderPlannerWorkspace();
        });
        header.append(topicCheckbox, title, removeGroup);

        const description = document.createElement('textarea');
        description.className = 'planner-group-description';
        description.rows = 2;
        description.value = group.description || '';
        description.placeholder = 'Describe this topic for the slide subtitle';
        description.setAttribute('aria-label', `Description for ${group.topic || 'topic'}`);
        description.addEventListener('input', () => {
            group.description = description.value;
            savePlannerData();
        });

        const terms = document.createElement('div');
        terms.className = 'planner-terms';
        group.terms.forEach(term => {
            const row = document.createElement('label');
            row.className = 'planner-term';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(term.selected);
            checkbox.setAttribute('aria-label', `Select ${term.text}`);
            checkbox.addEventListener('change', () => {
                term.selected = checkbox.checked;
                savePlannerData();
                updateTopicSelectionState();
            });
            const input = document.createElement('textarea');
            input.className = 'planner-term-text';
            input.rows = 1;
            input.value = term.text;
            input.placeholder = 'Cloud term';
            const resizeTermInput = () => {
                input.style.height = 'auto';
                input.style.height = `${input.scrollHeight}px`;
            };
            input.addEventListener('input', () => {
                term.text = input.value;
                resizeTermInput();
                savePlannerData();
            });
            requestAnimationFrame(resizeTermInput);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'planner-term-remove';
            remove.textContent = '×';
            remove.setAttribute('aria-label', `Remove ${term.text}`);
            remove.addEventListener('click', event => {
                event.preventDefault();
                group.terms = group.terms.filter(item => item.id !== term.id);
                savePlannerData();
                renderPlannerWorkspace();
            });
            row.append(checkbox, input, remove);
            terms.appendChild(row);
        });

        const addTerm = document.createElement('button');
        addTerm.type = 'button';
        addTerm.className = 'planner-add-term';
        addTerm.textContent = '+ Add cloud term';
        addTerm.addEventListener('click', () => {
            group.terms.push({ id: createPlannerId(), text: '', selected: false });
            savePlannerData();
            renderPlannerWorkspace();
            plannerGroupsElement.querySelector(`[data-group-id="${group.id}"] .planner-term:last-child .planner-term-text`)?.focus();
        });
        updateTopicSelectionState();
        card.append(header, description, terms, addTerm);
        plannerGroupsElement.appendChild(card);
    });
    updatePlannerSelection();
}

plannerSearch.addEventListener('input', renderPlannerWorkspace);

function updatePlannerSelection() {
    const count = plannerData.reduce((total, group) => total + group.terms.filter(term => term.selected && term.text.trim()).length, 0);
    selectedTermCount.textContent = count;
    openPresenterButton.disabled = count === 0;
    downloadLatestCsvButton.disabled = plannerData.length === 0;
}

addPlannerTopicButton.addEventListener('click', () => {
    plannerSearch.value = '';
    plannerData.push({
        id: createPlannerId(),
        topic: 'New topic',
        description: '',
        terms: [{ id: createPlannerId(), text: '', selected: false }]
    });
    savePlannerData();
    renderPlannerWorkspace();
    plannerGroupsElement.lastElementChild?.querySelector('.planner-group-title')?.select();
});

openPresenterButton.addEventListener('click', () => {
    plannedTopics = plannerData.flatMap(group => group.terms
        .filter(term => term.selected && term.text.trim())
        .map(term => ({ term: term.text.trim(), context: group.topic.trim(), description: (group.description || '').trim(), groupId: group.id })));
    plannedTopicIndex = 0;
    if (!plannedTopics.length) return;
    precalculateTopicGrid(plannedTopics);
    renderPlannedTopic();
    setPlannerOpen(false);
    slidePresenter.hidden = false;
    slide.classList.add('presenter-active');
    requestAnimationFrame(arrangeTopicCloud);
});

slidePresenterSkip.addEventListener('click', advancePlannedTopic);
slidePresenterAdd.addEventListener('click', () => {
    const value = slidePresenterInput.value.trim();
    if (!value) return;
    createTopicTag(value, slide.clientWidth * .5, slide.clientHeight - 90, plannedTopics[plannedTopicIndex]);
    advancePlannedTopic();
});
slidePresenterInput.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') slidePresenterAdd.click();
});

prepareTopicsButton.addEventListener('click', () => {
    const uniqueTopics = [...new Set(
        plannerInput.value
            .split(/[,\n]+/)
            .map(topic => topic.trim())
            .filter(Boolean)
    )].slice(0, 50);
    if (!uniqueTopics.length) {
        plannerInput.focus();
        return;
    }
    plannedTopics = uniqueTopics.map(term => ({ term, context: '' }));
    plannedTopicIndex = 0;
    plannerInputView.hidden = true;
    plannerReview.hidden = false;
    renderPlannedTopic();
});

addTopicButton.addEventListener('click', () => {
    const suggestion = plannedTopics[plannedTopicIndex];
    if (!suggestion) return;
    createTopicTag(suggestion.term, slide.clientWidth - 45, slide.clientHeight * .5, suggestion);
    advancePlannedTopic();
});

skipTopicButton.addEventListener('click', advancePlannedTopic);

function advancePlannedTopic() {
    const completedTopic = plannedTopics[plannedTopicIndex];
    const nextTopic = plannedTopics[plannedTopicIndex + 1];
    if (completedTopic?.groupId && completedTopic.groupId !== nextTopic?.groupId) {
        finalizeTopicCluster(completedTopic);
    }
    plannedTopicIndex += 1;
    if (plannedTopicIndex >= plannedTopics.length) {
        plannerReview.hidden = true;
        plannedTopics = [];
        plannedTopicIndex = 0;
        slidePresenter.hidden = true;
        slide.classList.remove('presenter-active');
        clearTimeout(addedTagReadoutTimer);
        addedTagReadoutTimer = setTimeout(() => {
            addedTagReadout.hidden = true;
            addedTagReadout.textContent = '';
        }, 25000);
        heroTitle.textContent = 'Turn your ideas into moments worth sharing.';
        heroSubtitle.textContent = 'Capture your screen, tell your story, and share your best work—right from your browser.';
        requestAnimationFrame(arrangeTopicCloud);
        return;
    }
    renderPlannedTopic();
}

function renderPlannedTopic() {
    plannerProgress.textContent = `${plannedTopicIndex + 1} of ${plannedTopics.length}`;
    const suggestion = plannedTopics[plannedTopicIndex];
    plannerSuggestion.textContent = suggestion.term;
    plannerContext.textContent = suggestion.context ? `Topic · ${suggestion.context}` : '';
    slidePresenterInput.value = suggestion.term;
    slidePresenterTopic.textContent = suggestion.context || 'Next cloud term';
    slidePresenterProgress.textContent = `${plannedTopicIndex + 1}/${plannedTopics.length}`;
    if (suggestion.context) {
        heroTitle.textContent = suggestion.context;
        heroSubtitle.textContent = suggestion.description || '';
    }
    slidePresenter.hidden = false;
    requestAnimationFrame(arrangeTopicCloud);
}

function setPlannerOpen(isOpen) {
    if (isOpen) {
        setSettingsOpen(false);
        plannerData.forEach(group => group.terms.forEach(term => { term.selected = false; }));
        savePlannerData();
        renderPlannerWorkspace();
    }
    cloudPlannerPanel.classList.toggle('open', isOpen);
    cloudPlannerPanel.setAttribute('aria-hidden', String(!isOpen));
    plannerButton.setAttribute('aria-expanded', String(isOpen));
    plannerBackdrop.hidden = !isOpen;
    if (isOpen) closePlannerButton.focus();
}

plannerButton.addEventListener('click', () => setPlannerOpen(true));
closePlannerButton.addEventListener('click', () => setPlannerOpen(false));
plannerBackdrop.addEventListener('click', () => setPlannerOpen(false));
uploadPlannerCsvButton.addEventListener('click', () => plannerCsvInput.click());

clearCloudButton.addEventListener('click', () => {
    cancelTopicEntry();
    topicCloud.classList.add('clearing');
    setTimeout(() => {
        topicTags.forEach(tag => tag.remove());
        topicTags = [];
        topicClusterCenters.clear();
        topicClusterSymbols.clear();
        topicClusterLayouts.clear();
        completedTopicLabels.forEach(label => label.remove());
        completedTopicLabels.clear();
        topicCloud.style.removeProperty('--cloud-density');
        clearTimeout(addedTagReadoutTimer);
        addedTagReadout.hidden = true;
        addedTagReadout.textContent = '';
        topicCloud.classList.remove('clearing');
        screenshotButton.hidden = true;
        clearCloudButton.hidden = true;
    }, 280);
});

plannerCsvInput.addEventListener('change', async () => {
    const file = plannerCsvInput.files[0];
    if (!file) return;
    try {
        const rows = parseCsv(await file.text());
        if (rows.length < 2) throw new Error('CSV has no topic rows');
        const headers = rows[0].map(header => header.trim().toLowerCase().replace(/[_-]+/g, ' '));
        const topicColumn = headers.indexOf('topic');
        const descriptionColumn = headers.indexOf('description');
        const termsColumn = headers.findIndex(header => header === 'cloud terms' || header === 'cloud term');
        if (topicColumn < 0 || termsColumn < 0) throw new Error('Expected topic and cloud terms columns');

        const importedGroups = new Map();
        rows.slice(1).forEach(row => {
            const context = (row[topicColumn] || '').trim();
            const description = descriptionColumn >= 0 ? (row[descriptionColumn] || '').trim() : '';
            const termsValue = termsColumn === row.length - 1 ? row[termsColumn] : row.slice(termsColumn).join(',');
            if (!context) return;
            if (!importedGroups.has(context.toLowerCase())) {
                importedGroups.set(context.toLowerCase(), { id: createPlannerId(), topic: context, description, terms: [] });
            }
            const group = importedGroups.get(context.toLowerCase());
            String(termsValue || '').split(/[,;|\n]+/).forEach(value => {
                const term = value.trim();
                if (term && !group.terms.some(item => item.text.toLowerCase() === term.toLowerCase())) {
                    group.terms.push({ id: createPlannerId(), text: term, selected: false });
                }
            });
        });
        const imported = [...importedGroups.values()].filter(group => group.terms.length);
        if (!imported.length) throw new Error('No cloud terms found');
        imported.forEach(incoming => {
            const existing = plannerData.find(group => group.topic.trim().toLowerCase() === incoming.topic.toLowerCase());
            if (!existing) plannerData.push(incoming);
            else {
                if (incoming.description) existing.description = incoming.description;
                incoming.terms.forEach(term => {
                    if (!existing.terms.some(item => item.text.trim().toLowerCase() === term.text.toLowerCase())) existing.terms.push(term);
                });
            }
        });
        savePlannerData();
        renderPlannerWorkspace();
    } catch (error) {
        console.error('Could not import cloud planner CSV:', error);
        alert('Could not read this CSV. Use the columns: topic, description, cloud terms.');
    } finally {
        plannerCsvInput.value = '';
    }
});

downloadLatestCsvButton.addEventListener('click', () => {
    const rows = [['topic', 'description', 'cloud terms']];
    plannerData.forEach(group => {
        rows.push([
            group.topic || '',
            group.description || '',
            group.terms.map(term => term.text.trim()).filter(Boolean).join(', ')
        ]);
    });
    const csv = `${rows.map(row => row.map(escapeCsvCell).join(',')).join('\n')}\n`;
    const date = new Date().toISOString().slice(0, 10);
    downloadPlannerCsv(csv, `cloud-planner-${date}.csv`);
});

function escapeCsvCell(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadPlannerCsv(content, fileName) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character === '"') {
            if (quoted && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else quoted = !quoted;
        } else if (character === ',' && !quoted) {
            row.push(cell);
            cell = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && text[index + 1] === '\n') index += 1;
            row.push(cell);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            cell = '';
        } else cell += character;
    }
    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row);
    return rows;
}

function setSettingsOpen(isOpen) {
    if (isOpen) setPlannerOpen(false);
    settingsPanel.classList.toggle('open', isOpen);
    settingsPanel.setAttribute('aria-hidden', String(!isOpen));
    settingsButton.setAttribute('aria-expanded', String(isOpen));
    panelBackdrop.hidden = !isOpen;
    if (isOpen) closeSettingsButton.focus();
}

settingsButton.addEventListener('click', () => setSettingsOpen(true));
closeSettingsButton.addEventListener('click', () => setSettingsOpen(false));
panelBackdrop.addEventListener('click', () => setSettingsOpen(false));
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settingsPanel.classList.contains('open')) setSettingsOpen(false);
    if (event.key === 'Escape' && cloudPlannerPanel.classList.contains('open')) setPlannerOpen(false);
    if (event.key === 'Escape' && setupDialog.classList.contains('open')) closeRecordingSetup();
});

// Load recordings from localStorage on page load
window.addEventListener('load', () => {
    loadRecordings();
    loadCustomization();
    loadPlannerData();
});

function loadCustomization() {
    const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    if (saved.title) heroTitle.textContent = saved.title;
    if (saved.subtitle) heroSubtitle.textContent = saved.subtitle;
    if (saved.logo) showLogo(saved.logo);
    if (saved.logo && !saved.logoHistory?.includes(saved.logo)) {
        saved.logoHistory = [saved.logo, ...(saved.logoHistory || [])].slice(0, MAX_LOGO_HISTORY);
        localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(saved));
    }
    renderLogoHistory();
}

function saveCustomization() {
    const current = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify({
        ...current,
        title: heroTitle.textContent.trim(),
        subtitle: heroSubtitle.textContent.trim()
    }));
}

[heroTitle, heroSubtitle].forEach(field => {
    field.addEventListener('input', saveCustomization);
    field.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            field.blur();
        }
    });
});

[logoUploadButton, changeLogoButton].forEach(button => {
    button.addEventListener('click', () => logoInput.click());
});

logoInput.addEventListener('change', () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        alert('Please choose a logo smaller than 2 MB.');
        logoInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
        saved.logo = reader.result;
        saved.logoHistory = [reader.result, ...(saved.logoHistory || []).filter(logo => logo !== reader.result)]
            .slice(0, MAX_LOGO_HISTORY);
        try {
            localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(saved));
        } catch (error) {
            alert('There is not enough browser storage for this logo. Try a smaller image or clear your logo history.');
            return;
        }
        showLogo(reader.result);
        renderLogoHistory();
    };
    reader.readAsDataURL(file);
});

removeLogoButton.addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    delete saved.logo;
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(saved));
    brandLogo.removeAttribute('src');
    brandLogo.classList.remove('visible');
    logoUploadButton.classList.remove('hidden');
    removeLogoButton.hidden = true;
    logoInput.value = '';
    renderLogoHistory();
});

function showLogo(source) {
    brandLogo.src = source;
    brandLogo.classList.add('visible');
    logoUploadButton.classList.add('hidden');
    removeLogoButton.hidden = false;
    renderLogoHistory();
}

function renderLogoHistory() {
    const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    const history = saved.logoHistory || [];
    logoHistorySection.hidden = history.length === 0;
    logoHistoryGrid.innerHTML = '';

    history.forEach((source, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `saved-logo${saved.logo === source ? ' active' : ''}`;
        button.setAttribute('aria-label', `Use recent logo ${index + 1}`);
        const image = document.createElement('img');
        image.src = source;
        image.alt = '';
        button.appendChild(image);
        button.addEventListener('click', () => selectSavedLogo(source));
        logoHistoryGrid.appendChild(button);
    });
}

function selectSavedLogo(source) {
    const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    saved.logo = source;
    saved.logoHistory = [source, ...(saved.logoHistory || []).filter(logo => logo !== source)];
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(saved));
    showLogo(source);
}

clearLogoHistoryButton.addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY) || '{}');
    saved.logoHistory = saved.logo ? [saved.logo] : [];
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(saved));
    renderLogoHistory();
});

toggleRecordingBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        openRecordingSetup();
    }
});

function openRecordingSetup() {
    setSettingsOpen(false);
    pendingFileHandle = null;
    chooseDestinationButton.textContent = 'Choose';
    destinationName.textContent = 'Choose where to save';
    destinationDetail.textContent = 'Select a file before recording starts';
    const supportsDirectSave = 'showSaveFilePicker' in window;
    chooseDestinationButton.hidden = !supportsDirectSave;
    confirmRecordingButton.disabled = supportsDirectSave;
    if (!supportsDirectSave) {
        destinationName.textContent = 'Browser download';
        destinationDetail.textContent = 'Direct file sync is unavailable in this browser';
    }
    setupBackdrop.hidden = false;
    setupDialog.classList.add('open');
    setupDialog.setAttribute('aria-hidden', 'false');
    setupCloseButton.focus();
}

function closeRecordingSetup() {
    setupDialog.classList.remove('open');
    setupDialog.setAttribute('aria-hidden', 'true');
    setupBackdrop.hidden = true;
}

setupCloseButton.addEventListener('click', closeRecordingSetup);
setupBackdrop.addEventListener('click', closeRecordingSetup);

chooseDestinationButton.addEventListener('click', async () => {
    try {
        pendingFileHandle = await getOutputFileHandle();
        destinationName.textContent = pendingFileHandle.name;
        destinationDetail.textContent = 'Recording will sync to this file';
        chooseDestinationButton.textContent = 'Change';
        confirmRecordingButton.disabled = false;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Could not choose a save location:', error);
            destinationDetail.textContent = 'Could not access this location. Please try again.';
        }
    }
});

confirmRecordingButton.addEventListener('click', () => {
    const selectedHandle = pendingFileHandle;
    closeRecordingSetup();
    startRecording(selectedHandle, {
        facecam: setupFacecamToggle.checked,
        microphone: setupMicrophoneToggle.checked
    });
});

async function openFacecamPictureInPicture() {
    if (!facecamVideo || !('documentPictureInPicture' in window)) return;
    if (window.currentPiPWindow && !window.currentPiPWindow.closed) return;
    try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 280,
            height: 210,
            disallowReturnToOpener: true,
            preferInitialWindowPlacement: true
        });
        window.currentPiPWindow = pipWindow;

        const pipStyle = pipWindow.document.createElement('style');
        pipStyle.textContent = `
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; }
            body { padding: 6px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            .presenter-shell {
                width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px;
            }
            .facecam-shell {
                position: relative; flex: 1; min-height: 0;
                width: 100%;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,.52);
                border-radius: 22px;
                background: rgba(15,30,48,.16);
                box-shadow: 0 12px 30px rgba(15,35,60,.24), inset 0 0 0 1px rgba(25,80,140,.08);
            }
            video {
                position: static !important;
                width: 100% !important;
                height: 100% !important;
                display: block;
                border: 0 !important;
                border-radius: 0 !important;
                object-fit: cover;
                transform: scaleX(-1);
                cursor: default !important;
            }
            .live-dot {
                position: absolute;
                top: 13px;
                right: 13px;
                width: 8px;
                height: 8px;
                border: 2px solid rgba(255,255,255,.9);
                border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 2px 8px rgba(20,30,45,.28), 0 0 0 3px rgba(239,68,68,.18);
                pointer-events: none;
            }
            .presenter-shell.has-suggestion .facecam-shell { flex: 0 0 48%; }
            .pip-suggestion {
                flex: 1; min-height: 0; padding: 12px; border: 1px solid rgba(215,229,242,.9);
                border-radius: 17px; background: rgba(250,253,255,.96); box-shadow: 0 8px 24px rgba(21,56,91,.12);
            }
            .pip-meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
            .pip-topic, .pip-progress { overflow: hidden; color: #8295a8; font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; text-overflow: ellipsis; white-space: nowrap; }
            .pip-topic { flex: 1; }
            .pip-suggestion textarea { width: 100%; min-height: 62px; resize: none; padding: 9px 10px; border: 1px solid #d7e5f1; border-radius: 9px; outline: none; color: #426987; background: white; font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1.3; }
            .pip-suggestion textarea:focus { border-color: #79aede; box-shadow: 0 0 0 3px rgba(96,165,250,.12); }
            .pip-actions { display: grid; grid-template-columns: .7fr 1.3fr; gap: 7px; margin-top: 8px; }
            .pip-actions button { padding: 8px; border: 1px solid #d8e4ee; border-radius: 8px; color: #6f8396; background: white; font-family: inherit; font-size: 9px; font-weight: 700; line-height: 1; cursor: pointer; }
            .pip-actions .pip-add { border-color: #4f8bc4; color: white; background: #4f8bc4; }
        `;
        pipWindow.document.head.appendChild(pipStyle);

        const presenterShell = pipWindow.document.createElement('div');
        presenterShell.className = 'presenter-shell';
        const facecamShell = pipWindow.document.createElement('div');
        facecamShell.className = 'facecam-shell';
        const liveDot = pipWindow.document.createElement('span');
        liveDot.className = 'live-dot';
        facecamVideo.style.cssText = '';
        if (facecamVideo) facecamShell.append(facecamVideo, liveDot);
        else facecamShell.hidden = true;

        const suggestionPanel = pipWindow.document.createElement('section');
        suggestionPanel.className = 'pip-suggestion';
        suggestionPanel.innerHTML = '<div class="pip-meta"><span class="pip-topic"></span><span class="pip-progress"></span></div><textarea rows="3" maxlength="500" aria-label="Edit cloud suggestion"></textarea><div class="pip-actions"><button class="pip-skip" type="button">Skip</button><button class="pip-add" type="button">Add to cloud</button></div>';
        suggestionPanel.querySelector('.pip-skip').addEventListener('click', advancePlannedTopic);
        suggestionPanel.querySelector('.pip-add').addEventListener('click', () => {
            const value = suggestionPanel.querySelector('textarea').value.trim();
            if (!value) return;
            createTopicTag(value, slide.clientWidth - 45, slide.clientHeight * .5, plannedTopics[plannedTopicIndex]);
            advancePlannedTopic();
        });
        suggestionPanel.querySelector('textarea').addEventListener('keydown', event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') suggestionPanel.querySelector('.pip-add').click();
        });
        presenterShell.append(facecamShell);
        pipWindow.document.body.appendChild(presenterShell);
        popoutFacecamButton.hidden = true;
        pipWindow.addEventListener('pagehide', () => {
            window.currentPiPWindow = null;
            if (!isRecording || !facecamVideo) return;
            facecamVideo.style.cssText = '';
            facecamVideo.style.top = `${window.innerHeight - 180}px`;
            facecamVideo.style.left = `${window.innerWidth - 180}px`;
            document.body.appendChild(facecamVideo);
            popoutFacecamButton.hidden = false;
        }, { once: true });
    } catch (error) {
        console.warn('Could not open the floating facecam:', error);
    }
}

popoutFacecamButton.addEventListener('click', openFacecamPictureInPicture);

function loadRecordings() {
    const recordings = JSON.parse(localStorage.getItem(RECORDING_STORAGE_KEY)) || [];
    recordingList.innerHTML = '';
    recordingCount.textContent = recordings.length;
    if (recordings.length === 0) {
        recordingList.innerHTML = '<li class="empty-state"><span class="empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-2v8l-4-2"/></svg></span><span>No recordings yet.<br>Your captures will appear here.</span></li>';
        return;
    }
    recordings.forEach(rec => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = rec.name;
        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = rec.date;
        li.appendChild(nameSpan);
        li.appendChild(dateSpan);
        recordingList.appendChild(li);
    });
}

function saveRecordingToList(fileName) {
    const recordings = JSON.parse(localStorage.getItem(RECORDING_STORAGE_KEY)) || [];
    const newRecording = {
        name: fileName,
        date: new Date().toLocaleString()
    };
    recordings.unshift(newRecording); // Add to the beginning
    localStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(recordings));
    loadRecordings();
}

async function startRecording(fileHandle, options) {
    let audioStream;

    try {
        // Screen selection runs first and directly from the confirmation click.
        const videoStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        if (options.facecam) {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({
                    audio: options.microphone,
                    video: true
                });
                if (options.microphone) audioStream = new MediaStream(cameraStream.getAudioTracks());
                facecamStream = new MediaStream(cameraStream.getVideoTracks());
            } catch (err) {
                console.warn('Could not get camera or microphone. Continuing with screen only.', err);
                if (options.microphone) {
                    try {
                        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    } catch (audioError) {
                        console.warn('Could not get microphone audio. Recording without audio.', audioError);
                    }
                }
            }
        } else if (options.microphone) {
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.warn('Could not get microphone audio. Recording without audio.', err);
            }
        }

        const videoTrack = videoStream.getVideoTracks()[0];
        videoTrack.onended = stopRecording;

        const tracks = [...videoStream.getTracks()];
        if (audioStream) tracks.push(...audioStream.getAudioTracks());

        stream = new MediaStream(tracks);

        if (facecamStream) {
            facecamVideo = document.createElement('video');
            facecamVideo.id = 'facecamVideo';
            facecamVideo.srcObject = facecamStream;
            facecamVideo.autoplay = true;
            facecamVideo.playsInline = true;
            facecamVideo.muted = true;
            facecamVideo.style.top = `${window.innerHeight - 180}px`;
            facecamVideo.style.left = `${window.innerWidth - 180}px`;
            document.body.appendChild(facecamVideo);
            makeDraggable(facecamVideo);
            popoutFacecamButton.hidden = !('documentPictureInPicture' in window);
        }

        if ('mediaSession' in navigator && (facecamStream || (plannedTopics.length && audioStream))) {
            try {
                navigator.mediaSession.setActionHandler('enterpictureinpicture', openFacecamPictureInPicture);
            } catch (error) {
                console.warn('Automatic presenter Picture-in-Picture is not supported:', error);
            }
        }

        // Show recording indicator if sharing the current tab
        const videoTrackSettings = stream.getVideoTracks()[0].getSettings();
        if (videoTrackSettings.displaySurface === 'browser') {
            const indicator = document.createElement('div');
            indicator.id = 'recording-indicator';
            indicator.className = 'recording-indicator';
            document.body.appendChild(indicator);
        }

        await runCountdown(3);
        if (videoTrack.readyState === 'ended' || !stream) return;

        if (fileHandle) {
            await startRecordingWithFileSystemAccess(fileHandle);
        } else {
            // Fallback for other browsers (Firefox/Safari)
            startRecordingWithFallback();
        }

    } catch (err) {
        console.error('Error starting recording:', err);
        if (audioStream) audioStream.getTracks().forEach(track => track.stop());
        if (facecamStream) facecamStream.getTracks().forEach(track => track.stop());
        if (stream) stream.getTracks().forEach(track => track.stop());
        popoutFacecamButton.hidden = true;
    }
}

async function getOutputFileHandle() {
    // Let errors bubble up so strictly handle "user cancelled" vs "not allowed" in caller
    const suggestedName = `recording-${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}.webm`;
    const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
            description: 'WebM Video File',
            accept: { 'video/webm': ['.webm'] },
        }],
    });
    return fileHandle;
}

async function startRecordingWithFileSystemAccess(fileHandle) {
    try {
        startTime = Date.now();
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            try {
                const seekableBlob = await makeSeekable(recordedBlob);
                writableStream = await fileHandle.createWritable();
                const activeWriter = writableStream;
                await activeWriter.write(seekableBlob);
                await activeWriter.close();
                if (writableStream === activeWriter) writableStream = null;
                saveRecordingToList(fileHandle.name);
            } catch (error) {
                console.error('Could not finalize the recording:', error);
                try { await writableStream?.abort(); } catch (_) { /* Stream may already be closed. */ }
                alert('The recording could not be fully saved. Check available disk space and try again.');
            } finally {
                writableStream = null;
                recordedChunks = [];
            }
        };

        mediaRecorder.start(1000);
        isRecording = true;
        toggleRecordingBtn.querySelector('.record-label').textContent = 'Stop recording';
        toggleRecordingBtn.classList.add('recording');

    } catch (err) {
        console.error("File System Access API error: ", err);
        alert("File System Access API error: " + err.message);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
}

function startRecordingWithFallback() {
    recordedChunks = [];
    startTime = Date.now();
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        try {
            const fixedBlob = await makeSeekable(blob);
            downloadBlob(fixedBlob);
        } catch (err) {
            console.error("Error fixing seekability:", err);
            downloadBlob(blob);
        }
    };

    function downloadBlob(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const fileName = `recording-${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}.webm`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        saveRecordingToList(fileName);
    }

    mediaRecorder.start(1000);
    isRecording = true;
    toggleRecordingBtn.querySelector('.record-label').textContent = 'Stop recording';
    toggleRecordingBtn.classList.add('recording');
}

async function makeSeekable(blob) {
    if (typeof EBML === 'undefined') {
        console.warn('EBML library not loaded. Cannot fix seekability.');
        return blob;
    }

    const decoder = new EBML.Decoder();
    const reader = new EBML.Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    const buffer = await blob.arrayBuffer();
    const ebmlElms = decoder.decode(buffer);

    ebmlElms.forEach((elm) => {
        reader.read(elm);
    });

    reader.stop();

    const refinedMetadataBuf = EBML.tools.makeMetadataSeekable(
        reader.metadatas,
        reader.duration,
        reader.cues
    );

    const body = buffer.slice(reader.metadataSize);
    return new Blob([refinedMetadataBuf, body], { type: blob.type });
}

function stopRecording() {
    popoutFacecamButton.hidden = true;
    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('enterpictureinpicture', null);
        } catch (_) { /* The action is not supported in this browser. */ }
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Stop facecam stream and remove video element
    if (facecamStream) {
        facecamStream.getTracks().forEach(track => track.stop());
        facecamStream = null;
    }
    if (facecamVideo) {
        facecamVideo.remove();
        facecamVideo = null;
    }

    // Close PiP window
    if (window.currentPiPWindow) {
        window.currentPiPWindow.close();
        window.currentPiPWindow = null;
    }

    // Remove recording indicator
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
        indicator.remove();
    }

    isRecording = false;
    toggleRecordingBtn.querySelector('.record-label').textContent = 'Record screen';
    toggleRecordingBtn.classList.remove('recording');
    stream = null;
    mediaRecorder = null;
}

function makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Constrain to viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));

        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Keyboard Shortcut Visualization
const shortcutDisplay = document.getElementById('shortcut-display');
let shortcutTimeout;

window.addEventListener('keydown', (e) => {
    // Ignore if typing in an input field (though we don't have text inputs yet, it's good practice)
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
    }

    // Capture the key
    let key = e.key;

    // Make special keys more readable
    if (key === ' ') {
        key = 'Space';
    } else if (key.length === 1) {
        key = key.toUpperCase();
    }

    // If modifiers are pressed, show combination
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Cmd'); // Command key on Mac

    if (modifiers.length > 0 && !modifiers.includes(key)) {
        // Avoid duplicates like "Shift + Shift"
        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
            // Just show modifiers if only modifier is pressed (or keep accumulating)
            // For simplicity, let's just show what we have so far
            shortcutDisplay.textContent = modifiers.join(' + ');
        } else {
            shortcutDisplay.textContent = modifiers.join(' + ') + ' + ' + key;
        }
    } else {
        // Filter out isolated modifier key presses if we want, or show them.
        // User asked for "types on keyboard", usually means characters, but shortcuts include modifiers.
        // Let's show everything.
        shortcutDisplay.textContent = key;
    }

    // Show the display
    shortcutDisplay.classList.add('show');

    // Reset fade out timer
    clearTimeout(shortcutTimeout);
    shortcutTimeout = setTimeout(() => {
        shortcutDisplay.classList.remove('show');
    }, 1500); // Fade out after 1.5 seconds
});

function playBeep() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000 Hz
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // 10% volume

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1); // Beep for 0.1 seconds
}

function runCountdown(seconds) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        document.body.appendChild(overlay);

        let count = seconds;
        overlay.textContent = count;
        playBeep();

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                overlay.textContent = count;
                playBeep();
            } else {
                clearInterval(interval);
                overlay.remove();
                resolve();
            }
        }, 1000);
    });
}
