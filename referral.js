const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbAl--AM5WqHdw49XNpGSNSxL4jHDEHhLD6YAgwgZQAnB4-Id0fKfyxQ--85Mljco1/exec';

function showCustomNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-5 right-5 left-5 sm:right-10 sm:left-auto py-2 px-4 rounded-lg notification ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white`;
    notification.style.zIndex = '1001';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    notification.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });

    let touchStartX = 0;
    let currentX = 0;
    let moveX = 0;
    let isSwiping = false;

    notification.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        isSwiping = true;
        notification.style.transition = '';
    });

    notification.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;

        currentX = e.changedTouches[0].screenX;
        moveX = currentX - touchStartX;

        notification.style.transform = `translateX(${moveX}px)`;
    });

    notification.addEventListener('touchend', () => {
        if (!isSwiping) return;

        isSwiping = false;
        if (Math.abs(moveX) > 100) {
            const direction = moveX < 0 ? '-110%' : '110%';
            notification.style.transition = 'transform 0.5s ease';
            notification.style.transform = `translateX(${direction})`;

            setTimeout(() => {
                notification.remove();
            }, 500);
        } else {
            notification.style.transition = 'transform 0.3s ease';
            notification.style.transform = 'translateX(0)';
        }
    });

    notification.addEventListener('click', () => {
        triggerHapticFeedback('impact', 'light');
        notification.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notification.remove();
        }, 500);
    });

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');

        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

class ReferralSystem {
    constructor() {
        this.userId = this.getUserId();
        this._cachedRemainingViews = undefined;
        this.checkReferral();
        this.updateReferralStats();
        this.updateRemainingViews();
        
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    handleResize() {
        const referralLink = document.getElementById('referralLink');
        const coloredLinkContainer = document.getElementById('coloredReferralLink');
        
        if (referralLink && coloredLinkContainer) {
            referralLink.style.display = 'none';
            coloredLinkContainer.classList.remove('hidden');
        }
    }

    async checkReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const referrerId = urlParams.get('ref');
        
        if (referrerId && referrerId !== this.userId) {
            try {
                const response = await this.makeRequest('addReferral', {
                    userId: this.userId,
                    referrerId: referrerId,
                    ip: await this.getIP()
                });

                if (response.success) {
                    showCustomNotification('Спасибо за использование реферальной ссылки!', 'success');
                    history.pushState({}, '', window.location.pathname);
                } else if (response.message === 'Cheating attempt detected') {
                    showCustomNotification('Обнаружена попытка обмана! Рефералы с одного IP-адреса не принимаются', 'error');
                    history.pushState({}, '', window.location.pathname);
                } else if (response.message === 'User already referred') {
                    showCustomNotification('Вы уже использовали реферальную ссылку ранее', 'error');
                    history.pushState({}, '', window.location.pathname);
                } else if (response.message === 'IP limit reached') {
                    showCustomNotification('Достигнут лимит рефералов с вашего IP-адреса', 'error');
                    history.pushState({}, '', window.location.pathname);
                }
            } catch (error) {
                console.error('Error processing referral:', error);
            }
        }
    }

    async updateReferralStats() {
        try {
            const response = await this.makeRequest('getReferrals', {
                userId: this.userId
            });

            if (response.success) {
                const referralCount = document.getElementById('referralCount');
                const statsLimit = document.getElementById('statsLimit');
                const referralLink = document.getElementById('referralLink');
                const coloredLinkContainer = document.getElementById('coloredReferralLink');

                referralCount.textContent = response.count;
                statsLimit.textContent = response.dailyLimit;
                
                const fullUrl = `${window.location.origin}${window.location.pathname}?ref=${this.userId}`;
                referralLink.value = fullUrl;
                
                referralLink.style.fontFamily = "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace";
                
                const coloredLink = this.createColoredLink(fullUrl);
                
                if (coloredLinkContainer) {
                    coloredLinkContainer.innerHTML = coloredLink;
                    
                    referralLink.style.display = 'none';
                    coloredLinkContainer.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error updating referral stats:', error);
        }
    }
    
    createColoredLink(url) {
        const protocol = url.split('://')[0];
        const rest = url.split('://')[1];
        const domain = rest.split('/')[0];
        const path = rest.substring(domain.length);
        
        return `
            <span class="token literal-property -mr-2" style="color: rgb(255, 121, 198);">${protocol}</span>
            <span class="token -mr-2" style="color: rgb(248, 248, 242);">://</span>
            <span class="token regex-source -mr-2" style="color: rgb(255, 184, 108);">${domain}</span>
            <span class="token" style="color: rgb(248, 248, 242);">${path}</span>
        `;
    }

    async updateRemainingViews() {
        try {
            if (this._cachedRemainingViews !== undefined) {
                this._updateRemainingViewsDisplay(this._cachedRemainingViews);
                return this._cachedRemainingViews;
            }
            
            const response = await this.makeRequest('checkLimit', {
                userId: this.userId,
                ip: await this.getIP(),
                isCheckOnly: 'true'
            });

            if (response.success) {
                this._cachedRemainingViews = response.remaining;
                this._updateRemainingViewsDisplay(response.remaining);
                return response.remaining;
            } else {
                this._cachedRemainingViews = 0;
                this._updateRemainingViewsDisplay(0);
                return 0;
            }
        } catch (error) {
            console.error('Error updating remaining views:', error);
            return 0;
        }
    }

    _updateRemainingViewsDisplay(remaining) {
        const remainingViewsElement = document.getElementById('remainingViews');
        if (remainingViewsElement) {
            remainingViewsElement.textContent = remaining;
            remainingViewsElement.className = remaining > 0 ? 
                'text-white font-bold text-xl' : 
                'text-red-500 font-bold text-xl';
        }
    }

    async checkViewLimit() {
        try {
            const response = await this.makeRequest('checkLimit', {
                userId: this.userId,
                ip: await this.getIP(),
                isCheckOnly: 'false'
            });

            if (!response.success) {
                this._cachedRemainingViews = 0;
                this._updateRemainingViewsDisplay(0);
                showCustomNotification(`Достигнут дневной лимит просмотров (${response.limit}). Пригласите друзей, чтобы увеличить лимит!`, 'error');
                return false;
            }

            this._cachedRemainingViews = response.remaining;
            this._updateRemainingViewsDisplay(response.remaining);
            
            if (this._cachedRemainingViews < 5) {
                showCustomNotification(`Осталось ${this._cachedRemainingViews} просмотров на сегодня`, 'warning');
            }
            
            return true;
        } catch (error) {
            console.error('Error checking view limit:', error);
            return false;
        }
    }

    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = this.generateUserId();
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    generateUserId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    async getIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting IP:', error);
            return 'unknown';
        }
    }

    async makeRequest(action, params) {
        const queryParams = new URLSearchParams({
            action,
            ...params
        });

        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?${queryParams}`);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

const referralSystem = new ReferralSystem();

window.referralSystem = referralSystem;