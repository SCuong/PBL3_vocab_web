(() => {
    const dataElement = document.getElementById("minitest-data");
    if (!dataElement) {
        return;
    }

    let questions = [];
    try {
        questions = JSON.parse(dataElement.textContent || "[]");
    }
    catch {
        return;
    }

    const elements = getElements();
    if (!elements) {
        return;
    }

    const matchingQuestions = questions.filter(item => item.isMatchingQuestion);
    const fillingQuestions = questions.filter(item => !item.isMatchingQuestion);
    const selectedAnswerInputs = buildSelectedAnswerInputMap(questions);

    const state = {
        answeredCount: 0,
        score: 0,
        streak: 0,
        timerValue: 30,
        timerId: null,
        totalTasks: matchingQuestions.length + fillingQuestions.length,
        isMatchingOnly: matchingQuestions.length > 0 && fillingQuestions.length === 0,
        matchingStartedAt: Date.now()
    };

    const matchingModule = createMatchingModule(matchingQuestions, selectedAnswerInputs, elements, state, startFillingPhase, showMatchingCompletion);
    const fillingModule = createFillingModule(fillingQuestions, selectedAnswerInputs, elements, state, stopTimer, startTimer);

    function normalize(value) {
        return (value || "").trim().toUpperCase();
    }

    function shuffle(items) {
        return [...items].sort(() => Math.random() - 0.5);
    }

    function updateDashboard() {
        elements.progressText.textContent = `${state.answeredCount} / ${state.totalTasks}`;
        elements.scoreText.textContent = `${state.score}`;
        elements.streakText.textContent = `${state.streak}`;

        const percent = state.totalTasks === 0 ? 100 : Math.round((state.answeredCount * 100) / state.totalTasks);
        elements.progressBar.style.width = `${percent}%`;
        elements.progressBar.setAttribute("aria-valuenow", `${percent}`);

        const done = state.totalTasks === 0 || state.answeredCount >= state.totalTasks;
        elements.submitButton.disabled = !done;
        if (done) {
            stopTimer();
            elements.timerText.textContent = "Done";
        }
    }

    function markQuestion(index, selectedAnswer) {
        const input = selectedAnswerInputs.get(index);
        if (input) {
            input.value = selectedAnswer || "";
        }
    }

    function stopTimer() {
        if (state.timerId) {
            window.clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function startTimer(onTimeout) {
        stopTimer();
        state.timerValue = 30;
        elements.timerText.textContent = `${state.timerValue}s`;
        state.timerId = window.setInterval(() => {
            state.timerValue -= 1;
            elements.timerText.textContent = `${state.timerValue}s`;
            if (state.timerValue <= 0) {
                stopTimer();
                onTimeout();
            }
        }, 1000);
    }

    function startFillingPhase() {
        fillingModule.start();
    }

    function formatElapsedTime(elapsedMilliseconds) {
        const totalSeconds = Math.max(0, Math.round(elapsedMilliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes <= 0) {
            return `${seconds}s`;
        }

        return `${minutes}m ${seconds}s`;
    }

    function showMatchingCompletion() {
        if (!state.isMatchingOnly) {
            return;
        }

        const elapsedLabel = document.getElementById("matching-elapsed-time");
        if (elapsedLabel) {
            elapsedLabel.textContent = formatElapsedTime(Date.now() - state.matchingStartedAt);
        }

        const modalElement = document.getElementById("matchingCompleteModal");
        if (modalElement && typeof bootstrap !== "undefined" && bootstrap.Modal) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement, {
                backdrop: "static",
                keyboard: false
            });
            modal.show();
        }
    }

    function createMatchingModule(questionsForMatching, inputs, ui, appState, onCompleted, onAllMatched) {
        const moduleState = {
            selectedLeft: null,
            selectedRight: null,
            matchedPairIds: new Set(),
            wrongPairs: []
        };

        function start() {
            if (questionsForMatching.length === 0 || !ui.matchingSection || !ui.leftList || !ui.rightList || !ui.matchingStatus) {
                if (ui.matchingSection) {
                    ui.matchingSection.hidden = true;
                }

                onCompleted();
                return;
            }

            ui.leftList.innerHTML = "";
            ui.rightList.innerHTML = "";

            questionsForMatching.forEach(question => {
                ui.leftList.appendChild(buildMatchButton(question.vocabId, question.word, selectLeft));
            });

            shuffle(questionsForMatching).forEach(question => {
                ui.rightList.appendChild(buildMatchButton(question.vocabId, question.matchPrompt, selectRight));
            });

            ui.matchingStatus.textContent = `${moduleState.matchedPairIds.size} / ${questionsForMatching.length} matched`;
            ui.timerText.textContent = "--";
        }

        function buildMatchButton(vocabId, text, onSelect) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn learning-match-item";
            button.dataset.id = `${vocabId}`;
            button.textContent = text;
            button.addEventListener("click", () => onSelect(vocabId));
            return button;
        }

        function setMatchSelection(list, id, className) {
            list.querySelectorAll(".learning-match-item").forEach(button => {
                if (button.dataset.id === `${id}` && !button.classList.contains("is-matched")) {
                    button.classList.add(className);
                }
                else {
                    button.classList.remove(className);
                }
            });
        }

        function selectLeft(vocabId) {
            if (!ui.leftList || moduleState.matchedPairIds.has(vocabId)) {
                return;
            }

            moduleState.selectedLeft = vocabId;
            setMatchSelection(ui.leftList, vocabId, "is-selected");
            tryResolvePair();
        }

        function selectRight(vocabId) {
            if (!ui.rightList || moduleState.matchedPairIds.has(vocabId)) {
                return;
            }

            moduleState.selectedRight = vocabId;
            setMatchSelection(ui.rightList, vocabId, "is-selected");
            tryResolvePair();
        }

        function tryResolvePair() {
            if (moduleState.selectedLeft === null || moduleState.selectedRight === null || !ui.matchingStatus) {
                return;
            }

            if (moduleState.selectedLeft === moduleState.selectedRight) {
                const question = questionsForMatching.find(item => item.vocabId === moduleState.selectedLeft);
                if (question) {
                    moduleState.matchedPairIds.add(question.vocabId);
                    markMatched(question.vocabId);
                    const input = inputs.get(question.index);
                    if (input) {
                        input.value = question.meaning;
                    }
                    appState.answeredCount += 1;
                    appState.score += 1;
                    appState.streak += 1;
                }
            }
            else {
                appState.streak = 0;
                showWrongPair(moduleState.selectedLeft, moduleState.selectedRight);
            }

            moduleState.selectedLeft = null;
            moduleState.selectedRight = null;
            ui.matchingStatus.textContent = `${moduleState.matchedPairIds.size} / ${questionsForMatching.length} matched`;
            updateDashboard();

            if (moduleState.matchedPairIds.size >= questionsForMatching.length) {
                if (ui.matchingSection) {
                    ui.matchingSection.hidden = true;
                }

                onCompleted();
                onAllMatched();
            }
        }

        function markMatched(vocabId) {
            if (!ui.leftList || !ui.rightList) {
                return;
            }

            const leftButton = ui.leftList.querySelector(`.learning-match-item[data-id='${vocabId}']`);
            const rightButton = ui.rightList.querySelector(`.learning-match-item[data-id='${vocabId}']`);

            leftButton?.classList.remove("is-selected");
            rightButton?.classList.remove("is-selected");
            leftButton?.classList.add("is-matched");
            rightButton?.classList.add("is-matched");
            leftButton?.setAttribute("disabled", "disabled");
            rightButton?.setAttribute("disabled", "disabled");
        }

        function showWrongPair(leftId, rightId) {
            if (!ui.leftList || !ui.rightList) {
                return;
            }

            moduleState.wrongPairs = [{ leftId, rightId }];

            const leftButton = ui.leftList.querySelector(`.learning-match-item[data-id='${leftId}']`);
            const rightButton = ui.rightList.querySelector(`.learning-match-item[data-id='${rightId}']`);

            leftButton?.classList.add("is-wrong");
            rightButton?.classList.add("is-wrong");

            window.setTimeout(() => {
                leftButton?.classList.remove("is-wrong", "is-selected");
                rightButton?.classList.remove("is-wrong", "is-selected");
                moduleState.wrongPairs = [];
            }, 500);
        }

        return { start };
    }

    function createFillingModule(questionsForFilling, inputs, ui, appState, stopAppTimer, startAppTimer) {
        const moduleState = {
            questionIndex: 0,
            isAnswered: false
        };

        function start() {
            if (questionsForFilling.length === 0) {
                if (ui.fillingSection) {
                    ui.fillingSection.hidden = true;
                }

                updateDashboard();
                return;
            }

            if (ui.fillingSection) {
                ui.fillingSection.hidden = false;
            }

            renderCurrentQuestion();
        }

        function renderCurrentQuestion() {
            ui.fillingFeedback.textContent = "";
            ui.fillingFeedback.className = "small fw-semibold mb-3";
            ui.fillingNextButton.disabled = true;

            if (moduleState.questionIndex >= questionsForFilling.length) {
                ui.fillingStatus.textContent = `Question ${questionsForFilling.length} / ${questionsForFilling.length}`;
                ui.fillingContainer.innerHTML = "<div class='alert alert-success mb-0'>All filling questions are completed.</div>";
                stopAppTimer();
                ui.timerText.textContent = "Done";
                updateDashboard();
                return;
            }

            const question = questionsForFilling[moduleState.questionIndex];
            moduleState.isAnswered = false;
            ui.fillingStatus.textContent = `Question ${moduleState.questionIndex + 1} / ${questionsForFilling.length}`;

            ui.fillingContainer.innerHTML = "";

            const sentence = document.createElement("p");
            sentence.className = "fs-5 mb-3";
            sentence.textContent = question.fillingSentence;
            ui.fillingContainer.appendChild(sentence);

            const optionsWrapper = document.createElement("div");
            optionsWrapper.className = "d-grid gap-2";

            question.options.forEach(option => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "btn learning-fill-option text-start";
                button.innerHTML = `<span>${option.displayText}</span><span class='learning-fill-icon'></span>`;
                button.addEventListener("click", () => answer(question, option, button, optionsWrapper));
                optionsWrapper.appendChild(button);
            });

            ui.fillingContainer.appendChild(optionsWrapper);
            startAppTimer(() => timeout(question, optionsWrapper));
        }

        function disableOptions(optionsWrapper) {
            optionsWrapper.querySelectorAll(".learning-fill-option").forEach(button => {
                button.setAttribute("disabled", "disabled");
            });
        }

        function setFeedback(message, isSuccess) {
            ui.fillingFeedback.textContent = message;
            ui.fillingFeedback.classList.remove("text-success", "text-danger");
            ui.fillingFeedback.classList.add(isSuccess ? "text-success" : "text-danger");
        }

        function setOptionIcon(button, iconText) {
            const icon = button.querySelector(".learning-fill-icon");
            if (icon) {
                icon.textContent = iconText;
            }
        }

        function getOptionDisplayText(button) {
            return button.querySelector("span")?.textContent ?? "";
        }

        function timeout(question, optionsWrapper) {
            if (moduleState.isAnswered) {
                return;
            }

            moduleState.isAnswered = true;
            appState.streak = 0;
            appState.answeredCount += 1;

            const input = inputs.get(question.index);
            if (input) {
                input.value = "";
            }

            disableOptions(optionsWrapper);
            setFeedback("Time is up.", false);
            ui.fillingNextButton.disabled = false;
            updateDashboard();
        }

        function answer(question, option, selectedButton, optionsWrapper) {
            if (moduleState.isAnswered) {
                return;
            }

            moduleState.isAnswered = true;
            stopAppTimer();

            const isCorrect = normalize(option.value) === normalize(question.meaning);
            markQuestion(question.index, option.value);
            appState.answeredCount += 1;

            disableOptions(optionsWrapper);

            if (isCorrect) {
                appState.score += 1;
                appState.streak += 1;
                selectedButton.classList.add("is-correct");
                setOptionIcon(selectedButton, "✔");
                setFeedback("Correct answer.", true);
            }
            else {
                appState.streak = 0;
                selectedButton.classList.add("is-wrong");
                setOptionIcon(selectedButton, "✖");

                optionsWrapper.querySelectorAll(".learning-fill-option").forEach(button => {
                    const optionText = getOptionDisplayText(button);
                    const matchedOption = question.options.find(item => item.displayText === optionText);
                    if (matchedOption && normalize(matchedOption.value) === normalize(question.meaning)) {
                        button.classList.add("is-correct");
                        setOptionIcon(button, "✔");
                    }
                });

                setFeedback("Incorrect answer.", false);
            }

            ui.fillingNextButton.disabled = false;
            updateDashboard();
        }

        ui.fillingNextButton.addEventListener("click", () => {
            if (moduleState.questionIndex < questionsForFilling.length) {
                moduleState.questionIndex += 1;
                renderCurrentQuestion();
            }
        });

        return { start };
    }

    function buildSelectedAnswerInputMap(questionItems) {
        const map = new Map();
        questionItems.forEach(item => {
            map.set(item.index, document.getElementById(`selected-answer-${item.index}`));
        });
        return map;
    }

    function getElements() {
        const elements = {
            submitButton: document.getElementById("submit-minitest"),
            progressText: document.getElementById("exercise-progress-text"),
            progressBar: document.getElementById("exercise-progress-bar"),
            scoreText: document.getElementById("exercise-score"),
            streakText: document.getElementById("exercise-streak"),
            timerText: document.getElementById("exercise-timer"),
            matchingSection: document.getElementById("matching-section"),
            matchingStatus: document.getElementById("matching-status"),
            leftList: document.getElementById("matching-left-list"),
            rightList: document.getElementById("matching-right-list"),
            fillingSection: document.getElementById("filling-section"),
            fillingStatus: document.getElementById("filling-status"),
            fillingContainer: document.getElementById("filling-question-container"),
            fillingFeedback: document.getElementById("filling-feedback"),
            fillingNextButton: document.getElementById("filling-next-button")
        };

        if (!elements.submitButton
            || !elements.progressText
            || !elements.progressBar
            || !elements.scoreText
            || !elements.streakText
            || !elements.timerText
            || !elements.fillingStatus
            || !elements.fillingContainer
            || !elements.fillingFeedback
            || !elements.fillingNextButton) {
            return null;
        }

        return elements;
    }

    matchingModule.start();
    updateDashboard();
})();
