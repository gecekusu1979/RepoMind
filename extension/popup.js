const DEFAULTS = {
    local: 'http://localhost:3000',
    prod: 'https://repomind.dev',
};

const radioLocal = document.getElementById('radio-local');
const radioProd = document.getElementById('radio-prod');
const radioCustom = document.getElementById('radio-custom');
const customWrapper = document.getElementById('custom-wrapper');
const customInput = document.getElementById('custom-url');
const saveBtn = document.getElementById('btn-save');
const statusDiv = document.getElementById('status');

const cards = {
    local: document.getElementById('card-local'),
    prod: document.getElementById('card-prod'),
    custom: document.getElementById('card-custom'),
};

function updateActiveCard(selectedMode) {
    Object.keys(cards).forEach((mode) => {
        if (mode === selectedMode) {
            cards[mode].classList.add('active');
        } else {
            cards[mode].classList.remove('active');
        }
    });

    if (selectedMode === 'custom') {
        customWrapper.classList.remove('hidden');
        customInput.focus();
    } else {
        customWrapper.classList.add('hidden');
    }
}

// Kayıtlı ayarları yükle
chrome.storage.sync.get(['targetMode', 'customUrl'], (data) => {
    const mode = data.targetMode || 'local';
    if (mode === 'prod') radioProd.checked = true;
    else if (mode === 'custom') radioCustom.checked = true;
    else radioLocal.checked = true;

    if (data.customUrl) {
        customInput.value = data.customUrl;
    }

    updateActiveCard(mode);
});

// Radio değişim dinleyicileri
document.querySelectorAll('input[name="target"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
        updateActiveCard(e.target.value);
    });
});

// Kaydetme işlemi
saveBtn.addEventListener('click', () => {
    const selectedMode = document.querySelector('input[name="target"]:checked').value;
    let finalBaseUrl = DEFAULTS.local;

    if (selectedMode === 'prod') {
        finalBaseUrl = DEFAULTS.prod;
    } else if (selectedMode === 'custom') {
        const rawVal = customInput.value.trim().replace(/\/$/, '');
        if (!/^https?:\/\//i.test(rawVal)) {
            statusDiv.style.color = '#f87171';
            statusDiv.textContent = 'URL http:// veya https:// ile başlamalıdır!';
            return;
        }
        finalBaseUrl = rawVal;
    }

    chrome.storage.sync.set(
        {
            targetMode: selectedMode,
            customUrl: customInput.value.trim(),
            baseUrl: finalBaseUrl,
        },
        () => {
            statusDiv.style.color = '#34d399';
            statusDiv.textContent = 'Hedef sunucu kaydedildi!';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        }
    );
});
