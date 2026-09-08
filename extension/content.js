(function () {
    const BUTTON_ID = 'repomind-analyze-container';
    const DEFAULT_BASE_URL = 'http://localhost:3000';

    function isValidSegment(str) {
        return /^[a-zA-Z0-9_-]+$/.test(str) && str !== '..' && str !== '.';
    }

    function getTargetBaseUrl(callback) {
        if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['baseUrl'], (res) => {
                callback(res.baseUrl || DEFAULT_BASE_URL);
            });
        } else {
            callback(DEFAULT_BASE_URL);
        }
    }

    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length < 2) return;

        const [owner, repo] = pathParts;
        const reserved = ['settings', 'pulls', 'issues', 'actions', 'security', 'pulse', 'discussions'];
        if (reserved.includes(owner) || reserved.includes(repo)) return;
        if (!isValidSegment(owner) || !isValidSegment(repo)) return;

        const targetHeader =
            document.querySelector('#repository-container-header ul') ||
            document.querySelector('.pagehead-actions') ||
            document.querySelector('#repository-container-header');

        if (!targetHeader) return;

        getTargetBaseUrl((baseUrl) => {
            // Çift çağrı kontrolü
            if (document.getElementById(BUTTON_ID)) return;

            const safeOwner = encodeURIComponent(owner.trim());
            const safeRepo = encodeURIComponent(repo.trim());

            const li = document.createElement('li');
            li.id = BUTTON_ID;
            li.style.display = 'inline-block';
            li.style.marginLeft = '8px';

            const a = document.createElement('a');
            a.id = 'repomind-analyze-btn';
            a.href = `${baseUrl}/?url=https://github.com/${safeOwner}/${safeRepo}`;
            a.target = '_blank';
            a.className = 'btn btn-sm';
            a.style.cssText =
                'background: #4f46e5; color: #ffffff; border: 1px solid #6366f1; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; font-size: 12px; text-decoration: none;';

            const iconSpan = document.createElement('span');
            iconSpan.textContent = '🧠';
            const textSpan = document.createElement('span');
            textSpan.textContent = ' Analyze in RepoMind';

            a.append(iconSpan, textSpan);
            li.appendChild(a);
            targetHeader.prepend(li);
        });
    }

    // GitHub Turbo / SPA hooks
    ['turbo:render', 'turbo:load', 'pjax:end'].forEach((event) => {
        document.addEventListener(event, injectButton);
    });

    const observer = new MutationObserver(() => injectButton());
    observer.observe(document.body, { childList: true, subtree: true });

    injectButton();
})();
