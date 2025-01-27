let clickCount = 0;
let lastClickTime = 0;
const CLICK_THRESHOLD = 800;
let confettiContainer = null;
let activeAnimations = new Set();
let lastClickedGrade = '5';

function createConfettiContainer() {
    if (!confettiContainer) {
        confettiContainer = document.createElement('div');
        confettiContainer.style.position = 'fixed';
        confettiContainer.style.top = '0';
        confettiContainer.style.left = '0';
        confettiContainer.style.width = '100%';
        confettiContainer.style.height = '100%';
        confettiContainer.style.pointerEvents = 'none';
        confettiContainer.style.zIndex = '9999';
        document.body.appendChild(confettiContainer);
    }
    return confettiContainer;
}

function createGrade() {
    const grade = document.createElement('div');
    grade.textContent = lastClickedGrade;
    grade.style.position = 'absolute';
    grade.style.left = Math.random() * (window.innerWidth - 50) + 'px';
    grade.style.top = '-50px';
    grade.style.fontSize = Math.random() * 30 + 40 + 'px';
    grade.style.fontWeight = 'bold';
    switch(lastClickedGrade) {
        case '5':
            grade.style.color = '#ffd700';
            break;
        case '4':
            grade.style.color = '#c0c0c0';
            break;
        case '3':
            grade.style.color = '#cd7f32';
            break;
        case '2':
            grade.style.color = '#ff4444';
            break;
    }
    grade.style.textShadow = '3px 3px 6px rgba(0,0,0,0.4)';
    grade.style.transform = `rotate(${Math.random() * 360}deg)`;
    grade.style.willChange = 'transform';
    grade.style.opacity = '0.9';
    grade.style.userSelect = 'none';
    return grade;
}

function animateGrade(grade) {
    const gradeSize = parseFloat(grade.style.fontSize);
    let posY = -50;
    let posX = parseFloat(grade.style.left);
    let rotation = Math.random() * 360;
    let horizontalMovement = (Math.random() - 0.5) * 3;
    let rotationSpeed = (Math.random() - 0.5) * 4;
    let bounceStrength = 0.65;
    let gravity = 0.35;
    let verticalSpeed = 2;
    let animationId;
    let bottomOffset = window.innerHeight - 20;
    let fadeOutStarted = false;

    function fall() {
        if (!activeAnimations.has(grade)) {
            cancelAnimationFrame(animationId);
            return;
        }

        verticalSpeed += gravity;
        posY += verticalSpeed;
        posX += horizontalMovement;
        rotation += rotationSpeed;

        if (posY >= bottomOffset) {
            posY = bottomOffset;
            verticalSpeed = -verticalSpeed * bounceStrength;
            horizontalMovement *= 0.8;
            
            if (Math.abs(verticalSpeed) < 1 && !fadeOutStarted) {
                fadeOutStarted = true;
                setTimeout(() => {
                    activeAnimations.delete(grade);
                    grade.style.transition = 'opacity 1.5s';
                    grade.style.opacity = '0';
                    setTimeout(() => grade.remove(), 1500);
                }, 3000);
            }
        }

        if (posX < 0) {
            posX = 0;
            horizontalMovement = Math.abs(horizontalMovement) * 0.8;
        } else if (posX > window.innerWidth - gradeSize) {
            posX = window.innerWidth - gradeSize;
            horizontalMovement = -Math.abs(horizontalMovement) * 0.8;
        }

        grade.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation}deg)`;
        animationId = requestAnimationFrame(fall);
    }

    activeAnimations.add(grade);
    fall();
}

function handleGradeClick(event) {
    event.preventDefault();
    
    const gradeContainer = event.currentTarget;
    const gradeText = gradeContainer.querySelector('h3').textContent;
    const gradeCount = parseInt(gradeContainer.querySelector('p').textContent.replace(/\D/g, ''));
    
    lastClickedGrade = gradeText.includes('Пятерок') ? '5' :
                      gradeText.includes('Четверок') ? '4' :
                      gradeText.includes('Троек') ? '3' :
                      gradeText.includes('Двоек') ? '2' : '5';
    
    const container = createConfettiContainer();
    container.innerHTML = '';
    
    for (let i = 0; i < gradeCount; i++) {
        setTimeout(() => {
            const grade = createGrade();
            container.appendChild(grade);
            animateGrade(grade);
        }, i * 15);
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        activeAnimations.clear();
        if (confettiContainer) {
            confettiContainer.innerHTML = '';
        }
    }
});

function checkNightTime() {
    const hour = new Date().getHours();
    
    if (hour >= 2 && hour < 6) {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '10px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '18px';
        notification.style.backdropFilter = 'blur(5px)';
        notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        notification.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        notification.innerHTML = 'Может, хватит зубрить? 🦉 Иди поспи!';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gradeElements = document.querySelectorAll('.grade-element');
    gradeElements.forEach(element => {
        element.addEventListener('click', handleGradeClick);
    });
    
    checkNightTime();
}); 