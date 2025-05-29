// popup.js
document.getElementById('downloadButton').addEventListener('click', () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Préparation du téléchargement...';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab.url && activeTab.url.includes('cahier-de-prepa.fr')) {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['jszip.min.js', 'FileSaver.min.js', 'content.js']
      }, () => {
        // Envoie un message au content script pour démarrer le processus
        chrome.tabs.sendMessage(activeTab.id, { action: "startDownload" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur d'envoi de message :", chrome.runtime.lastError.message);
            statusDiv.textContent = 'Erreur: Assurez-vous que l\'extension est bien activée et sur une page Cahier de Prépa.';
          }
        });
        statusDiv.textContent = 'Analyse de la page et récupération des liens...';
      });
    } else {
      statusDiv.textContent = 'Veuillez naviguer sur une page de cahier-de-prepa.fr pour utiliser l\'extension.';
    }
  });
});

// Écoute les messages du content.js pour mettre à jour le statut
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateStatus") {
    document.getElementById('status').textContent = request.message;
  }
});