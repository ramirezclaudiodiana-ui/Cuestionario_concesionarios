document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos DOM
    const btnStart = document.getElementById('btn-start');
    const screenWelcome = document.getElementById('screen-welcome');
    const screenForm = document.getElementById('screen-form');
    const screenThanks = document.getElementById('screen-thanks');
    const form = document.getElementById('amg-form');
    const progressBar = document.getElementById('progressBar');
    
    // Navegación
    const sections = Array.from(document.querySelectorAll('.form-section'));
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    
    let currentSectionIndex = 0;
    const totalSteps = sections.length + 1; // +1 para la pantalla de gracias (progreso)

    // Eventos iniciales
    btnStart.addEventListener('click', () => {
        screenWelcome.classList.remove('active');
        screenWelcome.classList.add('hidden');
        screenForm.classList.remove('hidden');
        screenForm.classList.add('active');
        updateUI();
    });

    btnPrev.addEventListener('click', () => {
        if (currentSectionIndex > 0) {
            sections[currentSectionIndex].classList.remove('active');
            sections[currentSectionIndex].classList.add('hidden');
            currentSectionIndex--;
            sections[currentSectionIndex].classList.remove('hidden');
            sections[currentSectionIndex].classList.add('active');
            updateUI();
        }
    });

    btnNext.addEventListener('click', () => {
        if (validateCurrentSection()) {
            sections[currentSectionIndex].classList.remove('active');
            sections[currentSectionIndex].classList.add('hidden');
            currentSectionIndex++;
            sections[currentSectionIndex].classList.remove('hidden');
            sections[currentSectionIndex].classList.add('active');
            updateUI();
        }
    });

    // Envío del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (validateCurrentSection()) {
            // Recopilar datos
            const formData = new FormData(form);
            const answers = {};
            
            // Procesar datos (manejar checkboxes múltiples)
            for (let [key, value] of formData.entries()) {
                if (answers[key]) {
                    if (!Array.isArray(answers[key])) {
                        answers[key] = [answers[key]];
                    }
                    answers[key].push(value);
                } else {
                    answers[key] = value;
                }
            }

            // Preparar datos planos para Excel/SheetDB
            // Las llaves deben coincidir EXACTAMENTE con los encabezados (fila 1) de tu Google Sheet
            const flatData = {
                "Fecha": new Date().toLocaleString(),
                "Segmento": "Premium_AMG",
                "Pregunta 1": answers.p1 || "",
                "Pregunta 2": answers.p2 || "",
                "Pregunta 3": answers.p3 || "",
                "Pregunta 4": answers.p4 || "",
                "Pregunta 5": answers.p5 || "",
                "Pregunta 6": answers.p6 || "",
                "Pregunta 7": answers.p7 || "",
                "Pregunta 8": answers.p8 ? (answers.p8 + (answers.p8_reason ? ' - Motivo: ' + answers.p8_reason : '')) : "",
                "Pregunta 9": Array.isArray(answers.p9) ? answers.p9.join(', ') : (answers.p9 || ""),
                "Pregunta 10": answers.p10 || "",
                "Pregunta 11": answers.p11 || "",
                "Pregunta 12": answers.p12 || ""
            };

            // Cambiar estado del botón
            const originalBtnText = btnSubmit.textContent;
            btnSubmit.textContent = "Enviando...";
            btnSubmit.disabled = true;

            // Enviar a Google Apps Script
            fetch('https://script.google.com/macros/s/AKfycbzfltI2wCdYLxGTM9M1Um_rD1ZhGVKZq6y5qhvSqVDCupAvFXs7vjeyFn3jjN6-eB5jVg/exec', {
                method: 'POST',
                // Usamos text/plain para evitar bloqueos por políticas CORS de Google
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(flatData) 
            })
            .then(response => response.json())
            .then(data => {
                console.log("Datos enviados correctamente:", data);
                
                // Mostrar pantalla final y completar barra
                screenForm.classList.remove('active');
                screenForm.classList.add('hidden');
                screenThanks.classList.remove('hidden');
                screenThanks.classList.add('active');
                progressBar.style.width = '100%';
            })
            .catch((error) => {
                console.error("Error al enviar los datos:", error);
                alert("Hubo un problema al enviar sus respuestas. Por favor, intente nuevamente.");
                btnSubmit.textContent = originalBtnText;
                btnSubmit.disabled = false;
            });
        }
    });

    // Función para actualizar UI (botones y barra de progreso)
    function updateUI() {
        // Progreso (0 = bienvenida, 1-4 = secciones form)
        const progressPercentage = ((currentSectionIndex + 1) / totalSteps) * 100;
        progressBar.style.width = `${progressPercentage}%`;

        // Botones de navegación
        if (currentSectionIndex === 0) {
            btnPrev.style.visibility = 'hidden';
        } else {
            btnPrev.style.visibility = 'visible';
        }

        if (currentSectionIndex === sections.length - 1) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Validación simplificada por sección
    function validateCurrentSection() {
        const currentSection = sections[currentSectionIndex];
        const questionGroups = currentSection.querySelectorAll('.question-group');
        let isValid = true;

        questionGroups.forEach(group => {
            // Ignorar si el grupo está oculto (por lógica condicional)
            if (group.closest('.hidden')) return;

            let groupValid = false;
            
            // Buscar inputs de radio o checkbox
            const inputs = group.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            if (inputs.length > 0) {
                groupValid = Array.from(inputs).some(input => input.checked);
            }

            // Validar textarea si es visible y requerido (para P8)
            const textarea = group.querySelector('textarea');
            if (textarea && !textarea.closest('.hidden')) {
                if (textarea.value.trim() === '') {
                    groupValid = false;
                } else {
                    groupValid = true; // Si hay texto, sobreescribe validación de radio principal
                }
            }

            if (!groupValid) {
                isValid = false;
                group.classList.add('error');
            } else {
                group.classList.remove('error');
            }
        });

        return isValid;
    }

    // Remover error visual al cambiar un input
    form.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            const group = e.target.closest('.question-group');
            if (group) group.classList.remove('error');
        }
    });

    // LÓGICA CONDICIONAL: P8 (Marcas alternativas)
    const p8Radios = document.querySelectorAll('input[name="p8"]');
    const q8Conditional = document.getElementById('q8-conditional');
    const p8Textarea = q8Conditional.querySelector('textarea');

    p8Radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value !== 'No cambiaría') {
                q8Conditional.classList.remove('hidden');
            } else {
                q8Conditional.classList.add('hidden');
                p8Textarea.value = ''; // Limpiar si oculta
                // Remover error si estaba activo por textarea vacio
                q8Conditional.closest('.question-group').classList.remove('error');
            }
        });
    });

    // LÓGICA CONDICIONAL: P9 (Límite de 3 checkboxes)
    const p9Checkboxes = document.querySelectorAll('input[name="p9"]');
    const p9CountDisplay = document.getElementById('p9-count');

    p9Checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = document.querySelectorAll('input[name="p9"]:checked');
            p9CountDisplay.textContent = checked.length;
            
            if (checked.length >= 3) {
                p9Checkboxes.forEach(unCb => {
                    if (!unCb.checked) unCb.disabled = true;
                    // Estilizar labels deshabilitados visualmente
                    if (!unCb.checked) unCb.parentElement.style.opacity = '0.5';
                });
            } else {
                p9Checkboxes.forEach(unCb => {
                    unCb.disabled = false;
                    unCb.parentElement.style.opacity = '1';
                });
            }
        });
    });

    // Fallback visual para :has() en CSS
    // Para navegadores antiguos que no soportan :has() de CSS
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        const input = card.querySelector('input');
        if(input) {
            input.addEventListener('change', () => {
                // Si es radio, limpiar todos en el mismo grupo
                if(input.type === 'radio') {
                    const name = input.name;
                    document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
                        inp.closest('.option-card').classList.remove('selected');
                    });
                }
                
                if(input.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        }
    });
});
