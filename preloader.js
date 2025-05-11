(function() {
    if (sessionStorage.getItem('preloaderShown') === 'true') {
        return;
    }

    const preloaderHTML = `
        <div class="preloader">
            <div class="preloader-particles"></div>
            <div class="preloader-cat">
                <div class="preloader-glow"></div>
                <img src="images/cat.png" alt="ystuRASP Cat">
            </div>
            <div class="preloader-text">Загрузка ystuRASP...</div>
            <div class="preloader-progress">
                <div class="preloader-bar"></div>
            </div>
        </div>
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .preloader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0f172a;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        .preloader-cat {
            width: 120px;
            height: 120px;
            position: relative;
            margin-bottom: 20px;
            opacity: 0;
            transform: scale(0.5);
        }

        .preloader-cat img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            position: relative;
            z-index: 2;
        }

        .preloader-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.2);
            filter: blur(20px);
            transform: translate(-50%, -50%);
            z-index: 1;
        }

        .preloader-text {
            color: #fff;
            font-size: 1.2rem;
            font-weight: 500;
            opacity: 0;
            margin-top: 1rem;
            transform: translateY(20px);
        }

        .preloader-progress {
            width: 200px;
            height: 4px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 2px;
            margin-top: 1rem;
            overflow: hidden;
            position: relative;
        }

        .preloader-bar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 2px;
        }

        .preloader-particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }

        .preloader-particle {
            position: absolute;
            background: #3b82f6;
            border-radius: 50%;
        }
    `;

    document.head.appendChild(styleSheet);

    const preloaderContainer = document.createElement('div');
    preloaderContainer.innerHTML = preloaderHTML;
    
    if (document.body) {
        document.body.insertBefore(preloaderContainer.firstElementChild, document.body.firstChild);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.insertBefore(preloaderContainer.firstElementChild, document.body.firstChild);
        });
    }
})();

function initPreloaderAnimation() {
    if (sessionStorage.getItem('preloaderShown') === 'true') {
        return;
    }

    const particlesContainer = document.querySelector('.preloader-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'preloader-particle';
        particle.style.width = anime.random(4, 8) + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = anime.random(0, 100) + '%';
        particle.style.top = anime.random(0, 100) + '%';
        particle.style.opacity = 0;
        particlesContainer.appendChild(particle);
    }

    const preloaderAnimation = anime.timeline({
        easing: 'easeOutExpo'
    });

    preloaderAnimation
        .add({
            targets: '.preloader-cat',
            scale: [0.5, 1],
            opacity: [0, 1],
            duration: 1000
        })
        .add({
            targets: '.preloader-text',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 800
        }, '-=400')
        .add({
            targets: '.preloader-bar',
            width: '100%',
            duration: 1500,
        }, '-=800');

    anime({
        targets: '.preloader-particle',
        opacity: [0, 0.4, 0],
        scale: [1, 1.5, 1],
        translateX: () => anime.random(-50, 50),
        translateY: () => anime.random(-50, 50),
        delay: anime.stagger(200),
        duration: 1000,
        loop: true,
        easing: 'easeInOutQuad'
    });

    anime({
        targets: '.preloader-glow',
        scale: [1, 1.2],
        opacity: [0.2, 0.4],
        duration: 500,
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutQuad'
    });

    anime({
        targets: '.preloader-cat img',
        translateY: [-10, 10],
        duration: 1000,
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutQuad'
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            const preloader = document.querySelector('.preloader');
            if (!preloader) return;

            anime({
                targets: '.preloader',
                opacity: 0,
                duration: 1000,
                easing: 'easeOutExpo',
                complete: function() {
                    preloader.style.display = 'none';
                    sessionStorage.setItem('preloaderShown', 'true');
                }
            });
        }, 500);
    });
}

if (window.anime) {
    initPreloaderAnimation();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.anime) {
            initPreloaderAnimation();
        }
    });
}