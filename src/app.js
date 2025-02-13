document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const promptInput = document.getElementById('prompt-input');
    const chatContent = document.getElementById('chat-content');
    const promptHistory = document.getElementById('prompt-history');

    // Store chat messages and API key
    let messages = [];
    let isNewChat = true;
    let apiKey = localStorage.getItem('apiKey');
    const API_BASE_URL = 'http://localhost:3001/api/v1/workspace/artes/chat';

    // Sohbet geçmişi için yerel depolama
    const STORAGE_KEY = 'chat_history';
    let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (window.lucide) {
        window.lucide.createIcons();
    }

    checkApiKey();

    function checkApiKey() {
        if (!apiKey) {
            showApiKeyPrompt();
        }
    }

    function showApiKeyPrompt() {
        const apiKeyPrompt = `
            <div class="api-key-prompt">
                <h2>API Anahtarı Gerekli</h2>
                <p>Sohbete başlamak için lütfen API anahtarınızı girin.</p>
                <div class="input-group mb-3">
                    <input type="password" id="api-key-input" class="form-control" placeholder="API Anahtarınız">
                    <button class="btn btn-primary" id="save-api-key">
                        <i data-lucide="key"></i>
                        Kaydet
                    </button>
                </div>
            </div>
        `;
        chatContent.innerHTML = apiKeyPrompt;
        
        if (window.lucide) {
            window.lucide.createIcons();
        }

        const saveButton = document.getElementById('save-api-key');
        const apiKeyInput = document.getElementById('api-key-input');
        
        if (saveButton) {
            saveButton.addEventListener('click', () => saveApiKey(apiKeyInput));
        }
        
        if (apiKeyInput) {
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveApiKey(apiKeyInput);
                }
            });
        }
    }

    function saveApiKey(input) {
        const newApiKey = input.value.trim();
        
        if (newApiKey) {
            apiKey = newApiKey;
            localStorage.setItem('apiKey', apiKey);
            chatContent.innerHTML = `
                <div class="welcome-message">
                    <h1>Artes Chat'e Hoşgeldiniz</h1>
                    <p>Aşağıdan mesajınızı yazarak sohbete başlayabilirsiniz.</p>
                </div>
            `;
            if (window.lucide) {
                window.lucide.createIcons();
            }
        } else {
            input.classList.add('is-invalid');
            setTimeout(() => input.classList.remove('is-invalid'), 2000);
        }
    }

    function detectLanguage(code) {
        // Dil algılama kuralları
        const rules = {
            python: {
                keywords: ['def ', 'class ', 'import ', 'from ', 'print(', 'if __name__'],
                extensions: ['.py']
            },
            javascript: {
                keywords: ['function ', 'const ', 'let ', 'var ', '=>', 'console.log'],
                extensions: ['.js', '.jsx']
            },
            typescript: {
                keywords: ['interface ', 'type ', 'namespace ', 'enum '],
                extensions: ['.ts', '.tsx']
            },
            sql: {
                keywords: ['SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE', 'ALTER TABLE'],
                extensions: ['.sql']
            },
            html: {
                keywords: ['<!DOCTYPE', '<html', '<div', '<p', '<script', '/*', '*/'],
                extensions: ['.html', '.htm']
            }
        };

        // Kod içeriğine göre dil tespiti
        for (const [lang, rule] of Object.entries(rules)) {
            if (rule.keywords.some(keyword => code.includes(keyword))) {
                return lang;
            }
        }

        // Varsayılan olarak html
        return 'html';
    }

    function createCopyButton() {
        const button = document.createElement('button');
        button.className = 'code-copy-button';
        button.innerHTML = `
            <i data-lucide="copy" size="14"></i>
            <span>Kopyala</span>
        `;
        return button;
    }

    function formatResponse(text) {
        // Başlık formatlaması
        text = text.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');
        text = text.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');

        
        // Kalın ve italik metin
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // HTML yorum bloklarını kod bloğuna dönüştür
        text = text.replace(/\/\*([\s\S]*?)\*\//g, (match, comment) => {
            return '```html\n' + comment.trim() + '\n```';
        });

        // HTML etiketlerini escape et (kod bloklarından önce)
        text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Kod bloğu kontrolü
        if (text.includes('```')) {
            // Çoklu satır kod bloğu
            text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                const language = lang || detectLanguage(code);
                const formattedCode = code.trim()
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');
                const highlightedCode = Prism.highlight(
                    formattedCode,
                    Prism.languages[language] || Prism.languages.html,
                    language
                );
                return `<div class="code-block-wrapper" data-language="${language}" data-raw-code="${encodeURIComponent(formattedCode)}">
                    <pre class="code-block language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>
                </div>`;
            });
        }
        
        // Tek satır kod bloğu
        text = text.replace(/`([^`]+)`/g, (match, code) => {
            const language = detectLanguage(code);
            const formattedCode = code.trim()
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            const highlightedCode = Prism.highlight(
                formattedCode,
                Prism.languages[language] || Prism.languages.html,
                language
            );
            return `<code class="inline-code language-${language}" data-raw-code="${encodeURIComponent(formattedCode)}">${highlightedCode}</code>`;
        });

        // Madde işareti kontrolü
        if (text.match(/^[•\-\*]\s/m)) {
            text = text.split('\n').map(line => {
                if (line.match(/^[•\-\*]\s/)) {
                    return `<li>${line.replace(/^[•\-\*]\s/, '')}</li>`;
                }
                return line;
            }).join('\n');
            if (text.includes('<li>')) {
                text = `<ul class="response-list">${text}</ul>`;
            }
        }

        // Numaralı liste kontrolü
        if (text.match(/^\d+\.\s/m)) {
            text = text.split('\n').map(line => {
                if (line.match(/^\d+\.\s/)) {
                    return `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
                }
                return line;
            }).join('\n');
            if (text.includes('<li>')) {
                text = `<ol class="response-list">${text}</ol>`;
            }
        }

        // Bağlantılar
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // HTML etiketlerini geri al (sadece izin verilen etiketler için)
        text = text.replace(/&lt;(\/?(h[1-6]|p|ul|ol|li|strong|em|a|code|pre|div))&gt;/g, '<$1>');

        // Paragrafları düzenle
        text = text.split('\n\n').map(paragraph => {
            if (!paragraph.includes('<pre') && !paragraph.includes('<ul') && 
                !paragraph.includes('<ol') && !paragraph.includes('<h')) {
                return `<p>${paragraph}</p>`;
            }
            return paragraph;
        }).join('\n');

        return text;
    }

    function createMessage(text, type) {
        const message = {
            id: Date.now(),
            text: text,
            type: type,
            timestamp: new Date()
        };
        messages.push(message);
        return message;
    }

    function formatTime(date) {
        return new Date(date).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async function typeText(element, text) {
        const contentDiv = element.querySelector('.message-content');
        let formattedText = formatResponse(text);
        
        // Yazma sırasında typing sınıfını ekle
        element.classList.add('typing');
        
        // Önce HTML'i parse et
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedText;
        
        // Her bir node'u sırayla ekle
        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                // Text node ise karakter karakter yaz
                const text = node.textContent;
                for (let i = 0; i < text.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 20));
                    const span = document.createElement('span');
                    span.textContent = text[i];
                    contentDiv.appendChild(span);
                }
            } else {
                // Element node ise direkt ekle
                contentDiv.appendChild(node.cloneNode(true));
            }
            
            // Kod bloklarını highlight et
            if (node.querySelector && node.querySelector('code')) {
                Prism.highlightAllUnder(contentDiv);
                
                // Kod bloklarına kopyalama butonu ekle
                contentDiv.querySelectorAll('.code-block-wrapper').forEach((wrapper) => {
                    if (!wrapper.querySelector('.code-copy-button')) {
                        const copyButton = createCopyButton();
                        wrapper.appendChild(copyButton);

                        copyButton.addEventListener('click', async () => {
                            const rawCode = decodeURIComponent(wrapper.dataset.rawCode);
                            try {
                                await navigator.clipboard.writeText(rawCode);
                                copyButton.classList.add('copied');
                                copyButton.innerHTML = `
                                    <i data-lucide="check" size="14"></i>
                                    <span>Kopyalandı</span>
                                `;
                                if (window.lucide) {
                                    window.lucide.createIcons({
                                        target: copyButton
                                    });
                                }
                                setTimeout(() => {
                                    copyButton.classList.remove('copied');
                                    copyButton.innerHTML = `
                                        <i data-lucide="copy" size="14"></i>
                                        <span>Kopyala</span>
                                    `;
                                    if (window.lucide) {
                                        window.lucide.createIcons({
                                            target: copyButton
                                        });
                                    }
                                }, 2000);
                            } catch (err) {
                                console.error('Kopyalama hatası:', err);
                            }
                        });
                    }
                });
            }
        }

        // Yazma bittiğinde typing sınıfını kaldır
        element.classList.remove('typing');

        // Inline kod bloklarına tıklama ile kopyalama özelliği
        contentDiv.querySelectorAll('.inline-code').forEach((inlineCode) => {
            inlineCode.style.cursor = 'pointer';
            inlineCode.title = 'Kopyalamak için tıklayın';
            
            inlineCode.addEventListener('click', async () => {
                const rawCode = decodeURIComponent(inlineCode.dataset.rawCode);
                try {
                    await navigator.clipboard.writeText(rawCode);
                    const originalBackground = inlineCode.style.background;
                    inlineCode.style.background = 'var(--artes-accent)';
                    setTimeout(() => {
                        inlineCode.style.background = originalBackground;
                    }, 200);
                } catch (err) {
                    console.error('Kopyalama hatası:', err);
                }
            });
        });
    }

    function addMessageToChat(message, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        messageElement.dataset.messageId = message.id;
        
        const headerHtml = `
            <div class="message-header">
                <div class="avatar">
                    ${message.type === 'user' ? 
                        '<i data-lucide="user" size="14"></i>' : 
                        '<i data-lucide="bot" size="14"></i>'}
                </div>
                <strong>${message.type === 'user' ? 'Siz' : 'Asistan'}</strong>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
        `;

        const contentHtml = isLoading ? `
            <div class="message-content">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        ` : `
            <div class="message-content">
                ${message.type === 'user' ? message.text : ''}
            </div>
        `;

        messageElement.innerHTML = headerHtml + contentHtml;
        
        if (window.lucide) {
            window.lucide.createIcons({
                target: messageElement
            });
        }

        chatContent.appendChild(messageElement);
        chatContent.scrollTop = chatContent.scrollHeight;

        if (message.type === 'user' && isNewChat) {
            addToHistory(message);
            isNewChat = false;
        }

        // Asistan mesajı ise ve yükleme değilse canlı yazma efekti uygula
        if (message.type === 'assistant' && !isLoading) {
            typeText(messageElement, message.text);
        }

        // Sohbeti yerel depolamaya kaydet
        if (!isLoading) {
            saveChatToStorage();
        }
    }

    function saveChatToStorage() {
        if (messages.length === 0) return;
        
        const existingChatIndex = chatHistory.findIndex(chat => 
            chat.messages.some(msg => msg.id === messages[0].id)
        );

        const chatData = {
            id: messages[0].id,
            messages: [...messages],
            timestamp: new Date()
        };

        if (existingChatIndex !== -1) {
            // Mevcut sohbeti güncelle
            chatHistory[existingChatIndex] = chatData;
        } else {
            // Yeni sohbet ekle
            chatHistory.unshift(chatData);
        }

        // Sadece son 50 sohbeti sakla
        chatHistory = chatHistory.slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
        updateHistoryUI();
    }

    function loadChatFromHistory(chatData) {
        // Mevcut sohbeti temizle
        chatContent.innerHTML = '';
        messages = [...chatData.messages];
        isNewChat = false;

        // Seçilen sohbetin mesajlarını yükle
        messages.forEach(message => {
            addMessageToChat(message);
        });
    }

    function addToHistory(message) {
        const historyItem = document.createElement('div');
        historyItem.className = 'prompt-history-item';
        historyItem.dataset.id = message.id;
        historyItem.innerHTML = `
            <i data-lucide="message-square" size="16"></i>
            <span class="text-truncate">${message.text}</span>
            <button class="delete-prompt" title="Sohbeti Sil">
                <i data-lucide="trash-2" size="14"></i>
            </button>
        `;
        promptHistory.insertBefore(historyItem, promptHistory.firstChild);
        
        if (window.lucide) {
            window.lucide.createIcons({
                target: historyItem
            });
        }

        // Sohbet geçmişi öğesine tıklama olayı
        historyItem.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-prompt')) {
                const chatData = chatHistory.find(chat => chat.id === parseInt(historyItem.dataset.id));
                if (chatData) {
                    loadChatFromHistory(chatData);
                }
            }
        });

        // Add delete functionality
        const deleteButton = historyItem.querySelector('.delete-prompt');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
                historyItem.remove();
                // Sohbeti yerel depolamadan da sil
                chatHistory = chatHistory.filter(chat => chat.id !== parseInt(historyItem.dataset.id));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
                
                // Eğer silinen sohbet şu an görüntüleniyorsa yeni sohbet başlat
                if (messages.length > 0 && messages[0].id === parseInt(historyItem.dataset.id)) {
                    startNewChat();
                }
            }
        });
    }

    function updateHistoryUI() {
        promptHistory.innerHTML = '';
        chatHistory.forEach(chat => {
            const firstMessage = chat.messages.find(msg => msg.type === 'user');
            if (firstMessage) {
                addToHistory(firstMessage);
            }
        });
    }

    function startNewChat() {
        chatContent.innerHTML = `
            <div class="welcome-message">
                <h1>Yeni Sohbet Başlatıldı</h1>
                <p>Mesajınızı yazarak sohbete başlayabilirsiniz.</p>
            </div>
        `;
        messages = [];
        isNewChat = true;
    }

    const newChatButton = document.createElement('button');
    newChatButton.className = 'new-chat-btn';
    newChatButton.innerHTML = `
        <i data-lucide="plus-circle" size="18"></i>
        <span>Yeni Sohbet</span>
    `;
    promptHistory.parentElement.insertBefore(newChatButton, promptHistory);
    if (window.lucide) {
        window.lucide.createIcons({
            target: newChatButton
        });
    }

    newChatButton.addEventListener('click', startNewChat);

    // Sayfa yüklendiğinde sohbet geçmişini göster
    updateHistoryUI();

    async function sendMessageToAI(message) {
        try {
            if (!apiKey) {
                throw new Error('API anahtarı bulunamadı.');
            }

            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    message: message,
                    mode: 'chat',
                    sessionId: Date.now().toString(),
                    attachments: []
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen bir hata oluştu' }));
                
                if (response.status === 403) {
                    localStorage.removeItem('apiKey');
                    apiKey = null;
                    showApiKeyPrompt();
                    throw new Error('API anahtarı geçersiz. Lütfen tekrar girin.');
                }
                
                throw new Error(errorData.error || `Sunucu hatası: ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.textResponse) {
                throw new Error('AI yanıtı alınamadı. Lütfen tekrar deneyin.');
            }

            return data.textResponse;

        } catch (error) {
            console.error('AI Hatası:', error);
            const errorMessage = error.message || 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.';
            return `Hata: ${errorMessage}`;
        }
    }

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!apiKey) {
            showApiKeyPrompt();
            return;
        }

        const text = promptInput.value.trim();
        if (!text) return;

        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const userMessage = createMessage(text, 'user');
        addMessageToChat(userMessage);

        promptInput.value = '';

        // Asistan mesajını oluştur ve yüklenme durumunu göster
        const assistantMessage = createMessage('', 'assistant');
        addMessageToChat(assistantMessage, true);

        // AI yanıtını al
        const aiResponse = await sendMessageToAI(text);

        // Yükleme mesajını kaldır
        const loadingMessage = chatContent.lastChild;
        if (loadingMessage) {
            chatContent.removeChild(loadingMessage);
        }

        // Asistan mesajını güncelle ve canlı yazma efekti ile göster
        assistantMessage.text = aiResponse;
        addMessageToChat(assistantMessage);
    });

    promptInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
});