function initChat({ endpoint, agentName }) {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
html, body { height: 100%; overflow: hidden; }
body {
  background-color: #E5DDD5;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bfb0' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  display: flex; justify-content: center; min-height: 100vh; min-height: 100dvh;
}
#app { width:100%; max-width:480px; height:100vh; height:100dvh; display:flex; flex-direction:column; background:white; }
#chat-header { background:#075E54; height:56px; padding:0 12px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
#back-btn { color:white; text-decoration:none; font-size:20px; display:flex; align-items:center; }
#header-avatar { width:36px; height:36px; border-radius:50%; background:#128C7E; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; overflow:hidden; }
#header-info { flex:1; min-width:0; }
#header-name { color:white; font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#header-status { color:#a8d5b5; font-size:11px; }
#header-icons { color:white; font-size:16px; display:flex; gap:12px; cursor:pointer; flex-shrink:0; }
#chat-area { flex:1; overflow-y:auto; padding:10px 12px; display:flex; flex-direction:column; gap:4px; -webkit-overflow-scrolling:touch; }
.bubble-wrap { display:flex; margin-bottom:4px; }
.bubble-wrap.user { justify-content:flex-end; }
.bubble-wrap.agent { justify-content:flex-start; }
.bubble { max-width:80%; padding:8px 12px; font-size:14px; line-height:1.5; position:relative; word-wrap:break-word; overflow-wrap:break-word; }
.bubble.agent { background:#FFFFFF; border-radius:0px 12px 12px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.1); }
.bubble.agent::before { content:''; position:absolute; top:0; left:-8px; border-width:0 8px 8px 0; border-style:solid; border-color:transparent #FFFFFF transparent transparent; }
.bubble.user { background:#DCF8C6; border-radius:12px 0px 12px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.1); }
.bubble.user::after { content:''; position:absolute; top:0; right:-8px; border-width:0 0 8px 8px; border-style:solid; border-color:transparent transparent transparent #DCF8C6; }
.bubble-meta { font-size:10px; color:#999; text-align:right; margin-top:4px; display:flex; justify-content:flex-end; align-items:center; gap:3px; }
.receipt { color:#4FC3F7; font-size:11px; }
.typing-dots { display:flex; align-items:center; gap:4px; padding:4px 0; }
.typing-dots span { width:8px; height:8px; background:#aaa; border-radius:50%; animation:bounce 1.2s infinite ease-in-out; }
.typing-dots span:nth-child(2) { animation-delay:0.2s; }
.typing-dots span:nth-child(3) { animation-delay:0.4s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
#success-banner { background:#25D366; color:white; text-align:center; padding:10px; font-weight:600; font-size:14px; flex-shrink:0; }
#input-bar { background:#F0F2F5; padding:8px 10px; display:flex; align-items:center; gap:6px; flex-shrink:0; }
#emoji-icon { font-size:22px; cursor:pointer; color:#666; flex-shrink:0; }
#chat-input { flex:1; border:none; outline:none; border-radius:24px; padding:10px 14px; font-size:16px; background:white; font-family:inherit; min-width:0; }
#send-btn { width:42px; height:42px; border-radius:50%; border:none; background:#075E54; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s; flex-shrink:0; }
#send-btn:disabled { background:#ccc; cursor:default; }
#input-bar.locked { opacity:0.5; pointer-events:none; }
  `;
  document.head.appendChild(style);

  // Set header name
  document.getElementById('header-name').textContent = agentName;

  const chatArea = document.getElementById('chat-area');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const successBanner = document.getElementById('success-banner');
  const inputBar = document.getElementById('input-bar');

  let messages = [];

  // Handle mobile keyboard resize
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      document.getElementById('app').style.height = window.visualViewport.height + 'px';
      scrollToBottom();
    });
  }

  function getTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  function appendBubble(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap ' + role;

    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + role;
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    meta.innerHTML = getTime() + (role === 'user' ? ' <span class="receipt">\u2713\u2713</span>' : '');

    bubble.appendChild(meta);
    wrap.appendChild(bubble);
    chatArea.appendChild(wrap);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap agent';
    wrap.id = 'typing-indicator';

    const bubble = document.createElement('div');
    bubble.className = 'bubble agent';
    bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

    wrap.appendChild(bubble);
    chatArea.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (!text.trim()) return;

    appendBubble('user', text);
    messages.push({ role: 'user', content: text });
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    showTyping();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userMessage: text }),
      });

      removeTyping();

      if (!res.ok) {
        appendBubble('agent', 'Koneksi bermasalah. Coba lagi ya kak.');
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
        return;
      }

      const data = await res.json();
      appendBubble('agent', data.reply);
      messages.push({ role: 'assistant', content: data.reply });

      if (data.saved) {
        successBanner.style.display = '';
        inputBar.classList.add('locked');
      } else {
        chatInput.disabled = false;
        sendBtn.disabled = false;
      }
    } catch (err) {
      removeTyping();
      appendBubble('agent', 'Koneksi bermasalah. Coba lagi ya kak.');
      chatInput.disabled = false;
      sendBtn.disabled = false;
    }

    scrollToBottom();
    chatInput.focus();
  }

  async function triggerGreeting() {
    showTyping();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], userMessage: 'halo' }),
      });

      removeTyping();

      if (res.ok) {
        const data = await res.json();
        appendBubble('agent', data.reply);
        // Do NOT push to messages — greeting is UI-only
      }
    } catch (err) {
      removeTyping();
    }
  }

  sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage(chatInput.value);
  });

  document.addEventListener('DOMContentLoaded', triggerGreeting);
  // Also fire immediately if DOM already loaded
  if (document.readyState !== 'loading') triggerGreeting();
}

window.initChat = initChat;
