(function () {
  'use strict';

  var CHATBOT_BASE_URL = 'https://cdn.botpress.cloud/webchat/v3.6/shareable.html?configUrl=https://files.bpcontent.cloud/2026/06/26/21/20260626210753-927VVFE2.json';

  function buildChatUrl() {
    return CHATBOT_BASE_URL + '&fresh=' + Date.now();
  }

  function getFrame() {
    return document.getElementById('aasiomChatbotFrame');
  }

  window.aasiomStartNewChat = function () {
    var frame = getFrame();
    if (frame) frame.src = buildChatUrl();
  };

  window.aasiomToggleChatbot = function () {
    var panel = document.getElementById('aasiomChatbotPanel');
    var frame = getFrame();
    if (!panel || !frame) return;

    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !frame.getAttribute('src')) {
      window.aasiomStartNewChat();
    }
  };

  window.addEventListener('DOMContentLoaded', function () {
    window.aasiomStartNewChat();
  });
}());
