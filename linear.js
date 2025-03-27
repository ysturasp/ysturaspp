document.getElementById('createLessonIssue')?.addEventListener('click', async () => {
    const modal = document.getElementById('lessonDetailsModal');
    const titleInput = modal.querySelector('#lessonIssueTitle');
    const descriptionInput = modal.querySelector('#lessonIssueDescription');
    const teamWrapper = modal.querySelector('.team-wrapper');
    const stateWrapper = modal.querySelector('.state-wrapper');
    const priorityWrapper = modal.querySelector('.priority-wrapper');
    const dueDateWrapper = modal.querySelector('.due-date-wrapper');

    const title = titleInput?.value;
    const description = descriptionInput?.value;
    const teamId = teamWrapper?.dataset.teamId;
    const stateId = stateWrapper?.dataset.stateId;
    const priority = parseInt(priorityWrapper?.dataset.priority || '0');
    const dueDate = dueDateWrapper?.dataset.date;
    const apiKey = localStorage.getItem('linearApiKey');
    const subjectLabel = document.querySelector('.lesson-title')?.textContent;

    if (!title || !teamId || !stateId) {
        showCustomNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }

    try {
        const checkLabelResponse = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    query GetLabel($name: String!) {
                        issueLabels(filter: { name: { eq: $name } }) {
                            nodes {
                                id
                            }
                        }
                    }
                `,
                variables: {
                    name: `subject:${cleanSubjectName(subjectLabel)}`
                }
            })
        });

        const existingLabel = await checkLabelResponse.json();
        let labelId = existingLabel.data?.issueLabels?.nodes?.[0]?.id;

        if (!labelId) {
            const createLabelResponse = await fetch(`${getLinearApiUrl()}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    query: `
                        mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
                            issueLabelCreate(input: $input) {
                                issueLabel {
                                    id
                                }
                                success
                            }
                        }
                    `,
                    variables: {
                        input: {
                            name: `subject:${cleanSubjectName(subjectLabel)}`,
                            teamId: teamId,
                            color: "#0366d6"
                        }
                    }
                })
            });

            const labelData = await createLabelResponse.json();
            labelId = labelData.data?.issueLabelCreate?.issueLabel?.id;
        }

        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    mutation CreateIssue(
                        $title: String!
                        $description: String
                        $teamId: String!
                        $stateId: String!
                        $priority: Int
                        $dueDate: TimelessDate
                        $labelIds: [String!]
                    ) {
                        issueCreate(input: {
                            title: $title
                            description: $description
                            teamId: $teamId
                            stateId: $stateId
                            priority: $priority
                            dueDate: $dueDate
                            labelIds: $labelIds
                        }) {
                            success
                            issue {
                                id
                                url
                            }
                        }
                    }
                `,
                variables: {
                    title,
                    description,
                    teamId,
                    stateId,
                    priority: priority > 0 ? priority : null,
                    dueDate: dueDate ? dueDate.split('T')[0] : null,
                    labelIds: labelId ? [labelId] : []
                }
            })
        });

        const data = await response.json();

        if (data.data?.issueCreate?.success) {
            showCustomNotification('Задача успешно создана', 'success');
            document.getElementById('lessonDetailsModal').classList.add('hidden');
            updateRelatedIssues(subjectLabel, apiKey);
        } else {
            throw new Error('Не удалось создать задачу');
        }
    } catch (error) {
        console.error('Ошибка при создании задачи:', error);
        showCustomNotification('Ошибка при создании задачи', 'error');
    }
});

document.getElementById('closeLessonDetails')?.addEventListener('click', () => {
    document.getElementById('lessonDetailsModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
});

document.getElementById('closeLinearSettings')?.addEventListener('click', () => {
    document.getElementById('linearSettingsModal').classList.add('hidden');
});

document.addEventListener('click', (e) => {
    const lessonModal = document.getElementById('lessonDetailsModal');
    const linearModal = document.getElementById('linearSettingsModal');
    
    if (e.target === lessonModal) {
        lessonModal.classList.add('hidden');
    }
    if (e.target === linearModal) {
        linearModal.classList.add('hidden');
    }
});

document.querySelectorAll('.modal-content').forEach(modal => {
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('lessonDetailsModal')?.classList.add('hidden');
        document.getElementById('linearSettingsModal')?.classList.add('hidden');
    }
});

async function updateRelatedIssues(subject, apiKey) {
    try {
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    query GetIssuesWithLabel($labelName: String!) {
                        issues(filter: { labels: { name: { eq: $labelName } } }) {
                            nodes {
                                id
                                title
                                description
                                state {
                                    name
                                    color
                                }
                                priority
                                dueDate
                                url
                            }
                        }
                    }
                `,
                variables: {
                    labelName: `subject:${cleanSubjectName(subject)}`
                }
            })
        });

        const issuesData = await response.json();
        const relatedIssues = document.getElementById('relatedIssues');
        
        if (!relatedIssues) return;
        
        if (issuesData.data?.issues?.nodes?.length) {
            relatedIssues.innerHTML = issuesData.data.issues.nodes
                .map(issue => `
                    <div class="bg-slate-800 p-3 rounded-lg mb-2 hover:bg-slate-700 transition-all relative group">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between">
                            <div class="flex items-center gap-3 min-w-0">
                                ${getStateIcon(issue.state.name, issue.state.color)}
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="issue-title cursor-pointer text-white hover:text-blue-300 font-medium truncate" 
                                          data-issue-id="${issue.id}"
                                          onclick="makeEditable(this, '${issue.id}')">
                                        ${issue.title}
                                    </span>
                                    <a href="${issue.url}" 
                                       target="_blank" 
                                       class="text-slate-400 hover:text-white flex-shrink-0">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                        </svg>
                                    </a>
                                    <button class="delete-issue-btn transition-opacity text-red-500 hover:text-red-400 p-1"
                                            onclick="deleteIssue('${issue.id}', '${apiKey}')">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <div class="priority-wrapper cursor-pointer" 
                                     onclick="showIssuePriorityPopup(this, '${issue.id}', ${issue.priority})">
                                    <span class="text-sm px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-2">
                                        <span class="text-slate-300">${getPriorityIcon(issue.priority)}</span>
                                        <span class="text-slate-300">${
                                            issue.priority === 1 ? 'Срочно' :
                                            issue.priority === 2 ? 'Высокий' :
                                            issue.priority === 3 ? 'Средний' :
                                            issue.priority === 4 ? 'Низкий' :
                                            'Без приоритета'
                                        }</span>
                                    </span>
                                </div>
                                <div class="due-date-wrapper cursor-pointer" 
                                     onclick="showIssueDatePicker(this, '${issue.id}', '${issue.dueDate || ''}')">
                                    ${issue.dueDate ? `
                                        <span class="text-sm px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">
                                            ${new Date(issue.dueDate).toLocaleDateString()}
                                        </span>
                                    ` : `
                                        <span class="text-sm px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 opacity-50">
                                            Указать дату
                                        </span>
                                    `}
                                </div>
                                <div class="state-wrapper cursor-pointer" 
                                     onclick="showStatePopup(this, '${issue.id}', '${issue.state.name}')">
                                    <span class="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity" 
                                          style="background-color: ${issue.state.color}20; color: ${issue.state.color}">
                                        ${issue.state.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ${issue.description ? `
                            <p class="text-sm text-slate-400 line-clamp-2">${issue.description}</p>
                        ` : ''}
                    </div>
                `)
                .join('');
        } else {
            relatedIssues.innerHTML = `
                <div class="text-center py-2">
                    <p class="text-slate-400 mb-2">Для этого предмета задач пока не создано</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка при получении связанных задач:', error);
    }
}

function showConfirmation(message, onConfirm, onCancel) {
    const notification = document.createElement('div');
    notification.id = 'confirmationNotification';
    notification.className = 'fixed bottom-5 right-5 left-5 sm:right-10 sm:left-auto bg-red-500 text-white py-4 px-6 rounded-lg notification shadow-xl';
    
    notification.innerHTML = `
        <div class="flex flex-col gap-4">
            <p class="text-center">${message}</p>
            <div class="flex justify-center gap-4">
                <button class="px-4 py-2 border-red-200 border-2 text-white rounded-lg hover:bg-red-700 transition-all">Отмена</button>
                <button class="px-4 py-2 border-red-400 border-2 text-white rounded-lg hover:bg-red-700 transition-all">Подтвердить</button>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    notification.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });

    const [cancelBtn, confirmBtn] = notification.querySelectorAll('button');

    cancelBtn.addEventListener('click', () => {
        closeNotification(notification);
        if (onCancel) onCancel();
    });

    confirmBtn.addEventListener('click', () => {
        closeNotification(notification);
        if (onConfirm) onConfirm();
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
            closeNotification(notification);
            if (moveX > 0) {
                if (onCancel) onCancel();
            } else {
                if (onConfirm) onConfirm();
            }
        } else {
            notification.style.transition = 'transform 0.3s ease';
            notification.style.transform = 'translateX(0)';
        }
    });

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    function closeNotification(notification) {
        notification.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            notification.remove();
        }, 500);
    }
}

async function deleteIssue(issueId, apiKey) {
    showConfirmation('Вы уверены, что хотите удалить эту задачу?', async () => {
        try {
            const response = await fetch(`${getLinearApiUrl()}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    query: `
                        mutation DeleteIssue($issueId: String!) {
                            issueDelete(id: $issueId) {
                                success
                            }
                        }
                    `,
                    variables: {
                        issueId
                    }
                })
            });

            const data = await response.json();

            if (data.data?.issueDelete?.success) {
                showCustomNotification('Задача успешно удалена', 'success');
                const subjectLabel = document.querySelector('.lesson-title')?.textContent;
                if (subjectLabel) {
                    updateRelatedIssues(subjectLabel, apiKey);
                }
            } else {
                throw new Error('Не удалось удалить задачу');
            }
        } catch (error) {
            console.error('Ошибка при удалении задачи:', error);
            showCustomNotification('Ошибка при удалении задачи', 'error');
        }
    });
}

function getStateIcon(stateName, color) {
    const baseStyle = `style="--icon-color: ${color}"`;
    
    switch(stateName.toLowerCase()) {
        case 'backlog':
            return `<svg class="color-override" width="14" height="14" viewBox="0 0 14 14" fill="${color}" role="img" ${baseStyle}>
                <path d="M13.9408 7.91426L11.9576 7.65557C11.9855 7.4419 12 7.22314 12 7C12 6.77686 11.9855 6.5581 11.9576 6.34443L13.9408 6.08573C13.9799 6.38496 14 6.69013 14 7C14 7.30987 13.9799 7.61504 13.9408 7.91426ZM13.4688 4.32049C13.2328 3.7514 12.9239 3.22019 12.5538 2.73851L10.968 3.95716C11.2328 4.30185 11.4533 4.68119 11.6214 5.08659L13.4688 4.32049ZM11.2615 1.4462L10.0428 3.03204C9.69815 2.76716 9.31881 2.54673 8.91341 2.37862L9.67951 0.531163C10.2486 0.767153 10.7798 1.07605 11.2615 1.4462ZM7.91426 0.0591659L7.65557 2.04237C7.4419 2.01449 7.22314 2 7 2C6.77686 2 6.5581 2.01449 6.34443 2.04237L6.08574 0.059166C6.38496 0.0201343 6.69013 0 7 0C7.30987 0 7.61504 0.0201343 7.91426 0.0591659ZM4.32049 0.531164L5.08659 2.37862C4.68119 2.54673 4.30185 2.76716 3.95716 3.03204L2.73851 1.4462C3.22019 1.07605 3.7514 0.767153 4.32049 0.531164ZM1.4462 2.73851L3.03204 3.95716C2.76716 4.30185 2.54673 4.68119 2.37862 5.08659L0.531164 4.32049C0.767153 3.7514 1.07605 3.22019 1.4462 2.73851ZM0.0591659 6.08574C0.0201343 6.38496 0 6.69013 0 7C0 7.30987 0.0201343 7.61504 0.059166 7.91426L2.04237 7.65557C2.01449 7.4419 2 7.22314 2 7C2 6.77686 2.01449 6.5581 2.04237 6.34443L0.0591659 6.08574ZM0.531164 9.67951L2.37862 8.91341C2.54673 9.31881 2.76716 9.69815 3.03204 10.0428L1.4462 11.2615C1.07605 10.7798 0.767153 10.2486 0.531164 9.67951ZM2.73851 12.5538L3.95716 10.968C4.30185 11.2328 4.68119 11.4533 5.08659 11.6214L4.32049 13.4688C3.7514 13.2328 3.22019 12.9239 2.73851 12.5538ZM6.08574 13.9408L6.34443 11.9576C6.5581 11.9855 6.77686 12 7 12C7.22314 12 7.4419 11.9855 7.65557 11.9576L7.91427 13.9408C7.61504 13.9799 7.30987 14 7 14C6.69013 14 6.38496 13.9799 6.08574 13.9408ZM9.67951 13.4688L8.91341 11.6214C9.31881 11.4533 9.69815 11.2328 10.0428 10.968L11.2615 12.5538C10.7798 12.9239 10.2486 13.2328 9.67951 13.4688ZM12.5538 11.2615L10.968 10.0428C11.2328 9.69815 11.4533 9.31881 11.6214 8.91341L13.4688 9.67951C13.2328 10.2486 12.924 10.7798 12.5538 11.2615Z" stroke="none"/>
            </svg>`;
        case 'todo':
            return `<svg aria-label="Todo" class="color-override" width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" ${baseStyle}>
                <rect x="1" y="1" width="12" height="12" rx="6" stroke="${color}" stroke-width="1.5" fill="none"/>
                <path fill="${color}" stroke="none" d="M 3.5,3.5 L3.5,0 A3.5,3.5 0 0,1 3.5, 0 z" transform="translate(3.5,3.5)"/>
            </svg>`;
        case 'in progress':
            return `<svg aria-label="In Progress" class="color-override" width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" ${baseStyle}>
                <rect x="1" y="1" width="12" height="12" rx="6" stroke="${color}" stroke-width="1.5" fill="none"/>
                <path fill="${color}" stroke="none" d="M 3.5,3.5 L3.5,0 A3.5,3.5 0 0,1 3.5, 7 z" transform="translate(3.5,3.5)"/>
            </svg>`;
        case 'done':
            return `<svg class="color-override" width="14" height="14" viewBox="0 0 14 14" fill="${color}" role="img" ${baseStyle}>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0ZM11.101 5.10104C11.433 4.76909 11.433 4.23091 11.101 3.89896C10.7691 3.56701 10.2309 3.56701 9.89896 3.89896L5.5 8.29792L4.10104 6.89896C3.7691 6.56701 3.2309 6.56701 2.89896 6.89896C2.56701 7.2309 2.56701 7.7691 2.89896 8.10104L4.89896 10.101C5.2309 10.433 5.7691 10.433 6.10104 10.101L11.101 5.10104Z"/>
            </svg>`;
        case 'canceled':
        case 'duplicate':
            return `<svg class="color-override" width="14" height="14" viewBox="0 0 14 14" fill="${color}" role="img" ${baseStyle}>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14ZM5.03033 3.96967C4.73744 3.67678 4.26256 3.67678 3.96967 3.96967C3.67678 4.26256 3.67678 4.73744 3.96967 5.03033L5.93934 7L3.96967 8.96967C3.67678 9.26256 3.67678 9.73744 3.96967 10.0303C4.26256 10.3232 4.73744 10.3232 5.03033 10.0303L7 8.06066L8.96967 10.0303C9.26256 10.3232 9.73744 10.3232 10.0303 10.0303C10.3232 9.73744 10.3232 9.26256 10.0303 8.96967L8.06066 7L10.0303 5.03033C10.3232 4.73744 10.3232 4.26256 10.0303 3.96967C9.73744 3.67678 9.26256 3.67678 8.96967 3.96967L7 5.93934L5.03033 3.96967Z"/>
            </svg>`;
        default:
            return `<div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>`;
    }
}

function makeEditable(element, issueId) {
    const existingInput = document.querySelector('.editing-input');
    if (existingInput) {
        existingInput.blur();
    }

    const currentText = element.textContent.trim();
    const input = document.createElement('input');
    input.value = currentText;
    input.className = 'bg-gray-800 text-blue-300 rounded px-2 py-1 w-full editing-input';
    
    const handleBlur = async () => {
        if (input.value !== currentText) {
            await updateIssueTitle(issueId, input.value);
        }
        element.textContent = input.value;
        input.remove();
        document.removeEventListener('click', handleClickOutside);
    };

    const handleClickOutside = (e) => {
        if (!input.contains(e.target)) {
            input.blur();
        }
    };

    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
        if (e.key === 'Escape') {
            input.value = currentText;
            input.blur();
        }
    });

    element.textContent = '';
    element.appendChild(input);
    input.focus();
    
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 0);
}

function closeAllPopups() {
    document.querySelectorAll('.popup-menu').forEach(popup => {
        const dateInput = popup.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.removeEventListener('blur', dateInput.blurHandler);
            dateInput.removeEventListener('keydown', dateInput.keydownHandler);
        }
        popup.remove();
    });
    document.removeEventListener('click', handleGlobalClick);
    document.removeEventListener('mousedown', handleGlobalClick);
}

function handleGlobalClick(e) {
    const popup = e.target.closest('.popup-menu');
    const trigger = e.target.closest('.priority-wrapper, .due-date-wrapper, .state-wrapper, .issue-title');
    const dateInput = e.target.closest('input[type="date"]');
    
    if (!popup && !trigger && !dateInput) {
        closeAllPopups();
    }
}

function setupPopup(popup, element) {
    popup.classList.add('popup-menu');
    document.body.appendChild(popup);
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popupHeight = popup.offsetHeight;
    
    if (spaceBelow >= popupHeight || spaceBelow >= spaceAbove) {
        popup.style.top = `${rect.bottom + window.scrollY}px`;
        popup.classList.add('origin-top');
    } else {
        popup.style.top = `${rect.top + window.scrollY - popupHeight}px`;
        popup.classList.add('origin-bottom');
    }
    
    popup.style.left = `${rect.left + window.scrollX}px`;
    
    const isEditingIssue = element.closest('.bg-slate-800') !== null;
    popup.style.width = `${rect.width + (isEditingIssue ? 100 : 0)}px`;
    
    const clickOutsideHandler = (e) => {
        if (!popup.contains(e.target) && !element.contains(e.target)) {
            closeAllPopups();
            document.removeEventListener('click', clickOutsideHandler);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
    }, 100);

    const scrollHandler = () => {
        closeAllPopups();
        window.removeEventListener('scroll', scrollHandler);
    };
    window.addEventListener('scroll', scrollHandler);
    
    const scrollableParents = getScrollableParents(element);
    scrollableParents.forEach(parent => {
        parent.addEventListener('scroll', scrollHandler);
    });
    
    requestAnimationFrame(() => {
        popup.classList.add('popup-show');
    });
}

function showTeamPopup(element) {
    const modal = document.getElementById('lessonDetailsModal');
    const teams = JSON.parse(modal.dataset.teams || '[]');
    
    closeAllPopups();
    
    if (!element.dataset.teamId && teams.length > 0) {
        const firstTeam = teams[0];
        element.querySelector('span').textContent = firstTeam.name;
        element.dataset.teamId = firstTeam.id;
        
        if (firstTeam.states?.nodes?.length) {
            const stateWrapper = element.closest('.grid').querySelector('.state-wrapper span');
            updateStates(firstTeam.states.nodes, stateWrapper);
        }
    }
    
    const popup = document.createElement('div');
    popup.className = 'absolute z-50 mt-2 bg-gray-800 rounded-lg shadow-lg py-2';
    
    popup.innerHTML = teams.map(team => `
        <div class="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 
             ${team.id === element.dataset.teamId ? 'bg-slate-700' : ''}"
             data-team-id="${team.id}">
            <span class="text-slate-300">${team.name}</span>
            ${team.id === element.dataset.teamId ? `
                <svg class="w-4 h-4 ml-auto text-blue-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.336 13.6a1.049 1.049 0 0 1-.8-.376L2.632 9.736a.992.992 0 0 1 .152-1.424 1.056 1.056 0 0 1 1.456.152l2.008 2.4 5.448-8a1.048 1.048 0 0 1 1.432-.288A.992.992 0 0 1 13.424 4L7.2 13.144a1.04 1.04 0 0 1-.8.456h-.064Z"/>
                </svg>
            ` : ''}
        </div>
    `).join('');

    popup.addEventListener('click', async (e) => {
        const teamElement = e.target.closest('[data-team-id]');
        if (teamElement) {
            const teamId = teamElement.dataset.teamId;
            const team = teams.find(t => t.id === teamId);
            
            element.querySelector('span').textContent = team.name;
            element.dataset.teamId = teamId;
            
            if (team.states?.nodes?.length) {
                const stateWrapper = element.closest('.grid').querySelector('.state-wrapper span');
                updateStates(team.states.nodes, stateWrapper);
            }
            
            closeAllPopups();
        }
    });

    setupPopup(popup, element);
}

function showPriorityPopup(element) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'absolute right-0 mt-2 bg-gray-800 ring-1 rounded-lg shadow-lg z-50 py-2 popup-menu';
    
    const priorities = [
        { value: 0, label: 'Без приоритета', icon: getPriorityIcon(0) },
        { value: 1, label: 'Срочно', icon: getPriorityIcon(1) },
        { value: 2, label: 'Высокий', icon: getPriorityIcon(2) },
        { value: 3, label: 'Средний', icon: getPriorityIcon(3) },
        { value: 4, label: 'Низкий', icon: getPriorityIcon(4) }
    ];

    popup.innerHTML = priorities.map(priority => `
        <div class="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3"
             data-priority="${priority.value}">
            <span class="text-slate-300">${priority.icon}</span>
            <span class="text-slate-300">${priority.label}</span>
        </div>
    `).join('');

    popup.addEventListener('click', (e) => {
        const priorityElement = e.target.closest('[data-priority]');
        if (priorityElement) {
            const priorityValue = parseInt(priorityElement.dataset.priority);
            const priorityLabel = priorityElement.querySelector('span:last-child').textContent;
            
            element.innerHTML = `
                <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                    <span class="text-slate-300">${getPriorityIcon(priorityValue)}</span>
                    <span class="text-slate-300">${priorityLabel}</span>
                </span>
            `;
            element.dataset.priority = priorityValue;
            
            closeAllPopups();
        }
    });

    setupPopup(popup, element);
}

function showIssuePriorityPopup(element, issueId, currentPriority) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 py-2 popup-menu';
    
    const priorities = [
        { value: 0, label: 'Без приоритета', icon: getPriorityIcon(0) },
        { value: 1, label: 'Срочно', icon: getPriorityIcon(1) },
        { value: 2, label: 'Высокий', icon: getPriorityIcon(2) },
        { value: 3, label: 'Средний', icon: getPriorityIcon(3) },
        { value: 4, label: 'Низкий', icon: getPriorityIcon(4) }
    ];

    popup.innerHTML = priorities
        .map(priority => `
            <div class="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 ${priority.value === currentPriority ? 'bg-slate-700' : ''}"
                 data-priority="${priority.value}">
                <span class="text-slate-300">${priority.icon}</span>
                <span class="text-slate-300">${priority.label}</span>
                ${priority.value === currentPriority ? `
                    <svg class="w-4 h-4 ml-auto text-blue-400" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6.336 13.6a1.049 1.049 0 0 1-.8-.376L2.632 9.736a.992.992 0 0 1 .152-1.424 1.056 1.056 0 0 1 1.456.152l2.008 2.4 5.448-8a1.048 1.048 0 0 1 1.432-.288A.992.992 0 0 1 13.424 4L7.2 13.144a1.04 1.04 0 0 1-.8.456h-.064Z"/>
                    </svg>
                ` : ''}
            </div>
        `)
        .join('');

    popup.addEventListener('click', async (e) => {
        const priorityElement = e.target.closest('[data-priority]');
        if (priorityElement) {
            const newPriority = parseInt(priorityElement.dataset.priority);
            await updateIssuePriority(issueId, newPriority);
            closeAllPopups();
        }
    });

    setupPopup(popup, element);
}

function showDatePicker(element) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 p-4 popup-menu';
    
    const currentDate = element.dataset.date ? new Date(element.dataset.date) : new Date();
    
    popup.innerHTML = `
        <input type="date" 
               class="bg-slate-900 text-white rounded px-2 py-1" 
               value="${currentDate.toISOString().split('T')[0]}">
        <button class="ml-2 text-slate-400 hover:text-white clear-date">
            Очистить
        </button>
    `;

    const dateInput = popup.querySelector('input[type="date"]');
    const clearButton = popup.querySelector('.clear-date');

    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    let isSubmitting = false;

    dateInput.blurHandler = () => {
        if (dateInput.value && !isSubmitting) {
            isSubmitting = true;
            const date = new Date(dateInput.value);
            element.innerHTML = `
                <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                    <span class="text-slate-300">${date.toLocaleDateString()}</span>
                </span>
            `;
            element.dataset.date = date.toISOString();
            closeAllPopups();
        }
    };

    dateInput.keydownHandler = (e) => {
        if (e.key === 'Enter' && dateInput.value && !isSubmitting) {
            isSubmitting = true;
            const date = new Date(dateInput.value);
            element.innerHTML = `
                <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                    <span class="text-slate-300">${date.toLocaleDateString()}</span>
                </span>
            `;
            element.dataset.date = date.toISOString();
            closeAllPopups();
        }
        if (e.key === 'Escape') {
            closeAllPopups();
        }
    };

    dateInput.addEventListener('input', (e) => {
        e.stopPropagation();
    });

    dateInput.addEventListener('blur', dateInput.blurHandler);
    dateInput.addEventListener('keydown', dateInput.keydownHandler);

    clearButton.addEventListener('click', () => {
        if (!isSubmitting) {
            isSubmitting = true;
            element.innerHTML = `
                <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                    <span class="text-slate-300">Выберите дату</span>
                </span>
            `;
            delete element.dataset.date;
            closeAllPopups();
        }
    });

    setupPopup(popup, element);
    
    setTimeout(() => {
        dateInput.focus();
    }, 0);
}

function showIssueDatePicker(element, issueId, currentDate) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 p-4 popup-menu';
    
    popup.innerHTML = `
        <input type="date" 
               class="bg-slate-900 text-white rounded px-2 py-1" 
               value="${currentDate ? currentDate.split('T')[0] : ''}">
        <button class="ml-2 text-slate-400 hover:text-white clear-date">
            Очистить
        </button>
    `;

    const dateInput = popup.querySelector('input[type="date"]');
    const clearButton = popup.querySelector('.clear-date');

    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    let isSubmitting = false;

    dateInput.blurHandler = async () => {
        if (dateInput.value && !isSubmitting) {
            isSubmitting = true;
            await updateIssueDueDate(issueId, dateInput.value);
            closeAllPopups();
        }
    };

    dateInput.keydownHandler = async (e) => {
        if (e.key === 'Enter' && dateInput.value && !isSubmitting) {
            isSubmitting = true;
            await updateIssueDueDate(issueId, dateInput.value);
            closeAllPopups();
        }
        if (e.key === 'Escape') {
            closeAllPopups();
        }
    };

    dateInput.addEventListener('blur', dateInput.blurHandler);
    dateInput.addEventListener('keydown', dateInput.keydownHandler);

    clearButton.addEventListener('click', async () => {
        if (!isSubmitting) {
            isSubmitting = true;
            await updateIssueDueDate(issueId, null);
            closeAllPopups();
        }
    });

    setupPopup(popup, element);
    
    setTimeout(() => {
        dateInput.focus();
    }, 0);
}

async function showStatePopup(element, issueId, currentState) {
    closeAllPopups();
    
    try {
        const apiKey = localStorage.getItem('linearApiKey');
        
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    query {
                        workflowStates {
                            nodes {
                                id
                                name
                                color
                            }
                        }
                    }
                `
            })
        });

        const data = await response.json();
        const states = data.data.workflowStates.nodes;

        if (!issueId && !element.closest('.state-wrapper').dataset.stateId) {
            const todoState = states.find(s => s.name.toLowerCase() === 'todo');
            if (todoState) {
                const stateWrapper = element.closest('.state-wrapper');
                stateWrapper.innerHTML = `
                    <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                        <span class="text-slate-300" style="color: ${todoState.color}">
                            ${todoState.name}
                        </span>
                    </span>
                `;
                stateWrapper.dataset.stateId = todoState.id;
            }
        }

        const popup = document.createElement('div');
        popup.className = 'absolute right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 py-2 popup-menu';

        popup.innerHTML = states
            .map(state => `
                <div class="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center gap-3 
                    ${issueId ? 
                        (state.name === currentState ? 'bg-slate-700' : '') : 
                        (state.name.toLowerCase() === 'todo' ? 'bg-slate-700' : '')}"
                     data-state-id="${state.id}">
                    ${getStateIcon(state.name, state.color)}
                    <span class="text-slate-300">${state.name}</span>
                    ${(issueId && state.name === currentState) || (!issueId && state.name.toLowerCase() === 'todo') ? `
                        <svg class="w-4 h-4 ml-auto text-blue-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6.336 13.6a1.049 1.049 0 0 1-.8-.376L2.632 9.736a.992.992 0 0 1 .152-1.424 1.056 1.056 0 0 1 1.456.152l2.008 2.4 5.448-8a1.048 1.048 0 0 1 1.432-.288A.992.992 0 0 1 13.424 4L7.2 13.144a1.04 1.04 0 0 1-.8.456h-.064Z"/>
                        </svg>
                    ` : ''}
                </div>
            `)
            .join('');

        popup.addEventListener('click', async (e) => {
            const stateElement = e.target.closest('[data-state-id]');
            if (stateElement) {
                const stateId = stateElement.dataset.stateId;
                if (issueId) {
                    await updateIssueState(issueId, stateId);
                } else {
                    const stateWrapper = element.closest('.state-wrapper');
                    if (stateWrapper) {
                        const selectedState = states.find(s => s.id === stateId);
                        if (selectedState) {
                            stateWrapper.innerHTML = `
                                <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                                    <span class="text-slate-300" style="color: ${selectedState.color}">
                                        ${selectedState.name}
                                    </span>
                                </span>
                            `;
                            stateWrapper.dataset.stateId = stateId;
                        }
                    }
                }
                closeAllPopups();
            }
        });

        setupPopup(popup, element);

    } catch (error) {
        console.error('Ошибка при получении состояний:', error);
        showCustomNotification('Ошибка при получении состояний', 'error');
    }
}

async function updateIssueTitle(issueId, newTitle) {
    const apiKey = localStorage.getItem('linearApiKey');
    try {
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    mutation UpdateIssue($issueId: String!, $title: String!) {
                        issueUpdate(id: $issueId, input: { title: $title }) {
                            success
                        }
                    }
                `,
                variables: {
                    issueId,
                    title: newTitle
                }
            })
        });

        const data = await response.json();
        if (data.data?.issueUpdate?.success) {
            showCustomNotification('Название задачи обновлено', 'success');
        } else {
            throw new Error('Не удалось обновить название');
        }
    } catch (error) {
        console.error('Ошибка при обновлении названия:', error);
        showCustomNotification('Ошибка при обновлении названия', 'error');
    }
}

async function updateIssuePriority(issueId, priority) {
    const apiKey = localStorage.getItem('linearApiKey');
    try {
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    mutation UpdateIssue($issueId: String!, $priority: Int!) {
                        issueUpdate(id: $issueId, input: { priority: $priority }) {
                            success
                            issue {
                                id
                                priority
                            }
                        }
                    }
                `,
                variables: {
                    issueId,
                    priority: priority || 0
                }
            })
        });

        const data = await response.json();
        if (data.data?.issueUpdate?.success) {
            showCustomNotification('Приоритет обновлен', 'success');
            
            const priorityWrapper = document.querySelector(`[data-issue-id="${issueId}"]`)
                ?.closest('.flex')
                ?.querySelector('.priority-wrapper');
                
            if (priorityWrapper) {
                priorityWrapper.innerHTML = `
                    <span class="text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2">
                        <span class="text-slate-300">${getPriorityIcon(priority)}</span>
                        <span class="text-slate-300">${
                            priority === 1 ? 'Срочно' :
                            priority === 2 ? 'Высокий' :
                            priority === 3 ? 'Средний' :
                            priority === 4 ? 'Низкий' :
                            'Без приоритета'
                        }</span>
                    </span>
                `;
            }

            const subject = document.querySelector('.lesson-title').textContent;
            updateRelatedIssues(subject, apiKey);
        } else {
            throw new Error('Не удалось обновить приоритет');
        }
    } catch (error) {
        console.error('Ошибка при обновлении приоритета:', error);
        showCustomNotification('Ошибка при обновлении приоритета', 'error');
    }
}

async function updateIssueDueDate(issueId, dueDate) {
    const apiKey = localStorage.getItem('linearApiKey');
    try {
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    mutation UpdateIssue($issueId: String!, $dueDate: TimelessDate) {
                        issueUpdate(id: $issueId, input: { dueDate: $dueDate }) {
                            success
                            issue {
                                id
                                dueDate
                            }
                        }
                    }
                `,
                variables: {
                    issueId,
                    dueDate: dueDate || null
                }
            })
        });

        const data = await response.json();
        if (data.data?.issueUpdate?.success) {
            showCustomNotification('Дата обновлена', 'success');
            
            const issueElement = document.querySelector(`[data-issue-id="${issueId}"]`);
            const dueDateWrapper = issueElement
                ?.closest('.bg-slate-800')
                ?.querySelector('.due-date-wrapper');
                
            if (dueDateWrapper) {
                dueDateWrapper.innerHTML = `
                    <span class="text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700${!dueDate ? ' opacity-50' : ''}">
                        ${dueDate ? new Date(dueDate).toLocaleDateString() : 'Указать дату'}
                    </span>
                `;
                
                dueDateWrapper.setAttribute('onclick', `showIssueDatePicker(this, '${issueId}', '${dueDate || ''}')`);
            }
        } else {
            throw new Error('Не удалось обновить дату');
        }
    } catch (error) {
        console.error('Ошибка при обновлении даты:', error);
        showCustomNotification('Ошибка при обновлении даты', 'error');
    }
}

async function updateIssueState(issueId, stateId) {
    const apiKey = localStorage.getItem('linearApiKey');
    try {
        const response = await fetch(`${getLinearApiUrl()}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey
            },
            body: JSON.stringify({
                query: `
                    mutation UpdateIssue($issueId: String!, $stateId: String!) {
                        issueUpdate(id: $issueId, input: { stateId: $stateId }) {
                            success
                            issue {
                                id
                                state {
                                    id
                                    name
                                    color
                                }
                            }
                        }
                    }
                `,
                variables: {
                    issueId,
                    stateId
                }
            })
        });

        const data = await response.json();
        if (data.data?.issueUpdate?.success) {
            showCustomNotification('Статус обновлен', 'success');

            const stateWrapper = document.querySelector(`[data-issue-id="${issueId}"]`)
                ?.closest('.flex')
                ?.querySelector('.state-wrapper');

            if (stateWrapper && data.data.issueUpdate.issue.state) {
                const newState = data.data.issueUpdate.issue.state;
                stateWrapper.innerHTML = `
                    <span class="text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 flex items-center gap-2 w-full">
                        <span class="text-slate-300" style="color: ${newState.color}">
                            ${newState.name}
                        </span>
                    </span>
                `;
            }

            const subject = document.querySelector('.lesson-title').textContent;
            updateRelatedIssues(subject, apiKey);
        } else {
            throw new Error('Не удалось обновить статус');
        }
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        showCustomNotification('Ошибка при обновлении статуса', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const linearSettingsModal = document.getElementById('linearSettingsModal');
    const createIssueModal = document.getElementById('createIssueModal');
    const createIssueBtn = document.getElementById('createIssueBtn');
    
    // const apiKey = localStorage.getItem('linearApiKey');
    // if (!apiKey) {
    //     linearSettingsModal.classList.remove('hidden');
    // }
    
    document.getElementById('closeLinearSettings').addEventListener('click', () => {
        linearSettingsModal.classList.add('hidden');
    });
    
    document.getElementById('saveLinearSettings').addEventListener('click', async () => {
        const apiKey = document.getElementById('linearApiKey').value;
        if (!apiKey) {
            showCustomNotification('Пожалуйста, введите API ключ', 'error');
            return;
        }

        try {
            const response = await fetch(`${getLinearApiUrl()}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    query: `
                        query {
                            viewer {
                                id
                            }
                        }
                    `
                })
            });

            const data = await response.json();
            
            if (data.errors || !data.data?.viewer?.id) {
                throw new Error('Неверный API ключ');
            }

            localStorage.setItem('linearApiKey', apiKey);
            
            const taskCreationSection = document.getElementById('taskCreationSection');
            const relatedIssuesContainer = document.getElementById('relatedIssues');
            
            taskCreationSection.style.display = 'block';
            
            if (relatedIssuesContainer) {
                relatedIssuesContainer.innerHTML = `
                    <div class="flex items-center justify-center p-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span class="ml-2 text-slate-400">Загрузка связанных задач...</span>
                    </div>
                `;

                const subjectLabel = document.querySelector('.lesson-title')?.textContent;
                if (subjectLabel) {
                    updateRelatedIssues(subjectLabel, apiKey);
                }
            }
            
            showCustomNotification('API ключ успешно сохранен', 'success');
            linearSettingsModal.classList.add('hidden');

        } catch (error) {
            console.error('Ошибка при проверке API ключа:', error);
            showCustomNotification('Неверный API ключ', 'error');
        }
    });
    
    createIssueBtn.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('linearApiKey');
        if (!apiKey) {
            linearSettingsModal.classList.remove('hidden');
            return;
        }
        
        try {
            const subjectLabel = document.querySelector('.lesson-title')?.textContent;
            if (subjectLabel) {
                updateRelatedIssues(subjectLabel, apiKey);
            }

            const teamsResponse = await fetch(`${getLinearApiUrl()}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    query: `
                        query {
                            teams {
                                nodes {
                                    id
                                    name
                                }
                            }
                        }
                    `
                })
            });

            const teamsData = await teamsResponse.json();
            const teamSelect = document.getElementById('teamSelect');
            
            if (teamsData.data?.teams?.nodes?.length) {
                teamSelect.innerHTML = teamsData.data.teams.nodes
                    .map(team => `<option value="${team.id}">${team.name}</option>`)
                    .join('');
                
                const firstTeam = teamsData.data.teams.nodes[0];
                teamSelect.value = firstTeam.id;
                teamSelect.closest('.team-wrapper').dataset.teamId = firstTeam.id;
            } else {
                teamSelect.innerHTML = '<option value="">Нет доступных команд</option>';
            }
        } catch (error) {
            console.error('Ошибка при получении списка команд:', error);
            showCustomNotification('Ошибка при получении списка команд', 'error');
            return;
        }

        createIssueModal.classList.remove('hidden');
    });
    
    document.getElementById('closeCreateIssue').addEventListener('click', () => {
        createIssueModal.classList.add('hidden');
    });
    
    document.getElementById('submitIssue').addEventListener('click', async () => {
        const title = document.getElementById('issueTitle').value;
        const description = document.getElementById('issueDescription').value;
        const teamId = document.getElementById('teamSelect').value;
        const apiKey = localStorage.getItem('linearApiKey');
        
        if (!title) {
            showCustomNotification('Пожалуйста, введите заголовок задачи', 'error');
            return;
        }
        
        if (!teamId) {
            showCustomNotification('Пожалуйста, выберите команду', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${getLinearApiUrl()}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': apiKey
                },
                body: JSON.stringify({
                    query: `
                        mutation CreateIssue($title: String!, $description: String, $teamId: String!) {
                            issueCreate(input: {
                                title: $title,
                                description: $description,
                                teamId: $teamId
                            }) {
                                success
                                issue {
                                    id
                                    url
                                }
                            }
                        }
                    `,
                    variables: {
                        title,
                        description,
                        teamId
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.data?.issueCreate?.success) {
                showCustomNotification('Задача успешно создана', 'success');
                createIssueModal.classList.add('hidden');
                document.getElementById('issueTitle').value = '';
                document.getElementById('issueDescription').value = '';
            } else {
                throw new Error('Не удалось создать задачу');
            }
        } catch (error) {
            console.error('Ошибка при создании задачи:', error);
            showCustomNotification('Ошибка при создании задачи', 'error');
        }
    });
    
    
});

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

const style = document.createElement('style');
style.textContent = `
    .popup-menu {
        transform: scale(0.95);
        opacity: 0;
        transition: transform 0.1s ease, opacity 0.1s ease;
    }
    
    .popup-show {
        transform: scale(1);
        opacity: 1;
    }
    
    .origin-top {
        transform-origin: top;
    }
    
    .origin-bottom {
        transform-origin: bottom;
    }
`;
document.head.appendChild(style);

function updateStates(states) {
    const stateSelect = document.getElementById('issueState');
    if (!stateSelect) return;
    
    stateSelect.innerHTML = states
        .map(state => `
            <option value="${state.id}" style="color: ${state.color}">
                ${state.name}
            </option>
        `)
        .join('');
}

const getPriorityIcon = (priority) => {
    switch(priority) {
        case 1:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="#FF8C42">
                <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z"/>
            </svg>`;
        case 2:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1.5" y="8" width="3" height="6" rx="1"/>
                <rect x="6.5" y="5" width="3" height="9" rx="1"/>
                <rect x="11.5" y="2" width="3" height="12" rx="1"/>
            </svg>`;
        case 3:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1.5" y="8" width="3" height="6" rx="1"/>
                <rect x="6.5" y="5" width="3" height="9" rx="1"/>
                <rect x="11.5" y="2" width="3" height="12" rx="1" fill-opacity="0.4"/>
            </svg>`;
        case 4:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1.5" y="8" width="3" height="6" rx="1"/>
                <rect x="6.5" y="5" width="3" height="9" rx="1" fill-opacity="0.4"/>
                <rect x="11.5" y="2" width="3" height="12" rx="1" fill-opacity="0.4"/>
            </svg>`;
        default:
            return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"/>
                <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"/>
                <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"/>
            </svg>`;
    }
};

function cleanSubjectName(subjectName) {
    if (!subjectName) return 'Название предмета не указано';
    return subjectName.replace(/\s*\(Подгруппа \d+\)/, '');
}