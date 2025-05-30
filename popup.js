document.addEventListener('DOMContentLoaded', function() {
    const downloadButton = document.getElementById('downloadButton');
    const buttonText = document.getElementById('buttonText');
    const progressBar = document.getElementById('progressBar');
    const statusDiv = document.getElementById('status');

    let totalDocumentsExpected = 0;

    // Fonction pour mettre à jour la barre de progression
    function updateProgressBar(downloaded, total) {
        if (total > 0) {
            const percentage = Math.round((downloaded / total) * 100);
            progressBar.style.width = `${percentage}%`;
            buttonText.textContent = `${percentage}% téléchargé`;
        } else {
            progressBar.style.width = '0%';
            buttonText.textContent = "Lancer le téléchargement";
        }
    }

    // Écoute le clic sur le bouton de téléchargement
    if (downloadButton) {
        downloadButton.addEventListener('click', function() {
            if (downloadButton.classList.contains('disabled')) {
                return;
            }
            downloadButton.classList.add('disabled');
            buttonText.textContent = "Vérification..."; // Nouveau texte pendant la vérification de l'URL
            statusDiv.textContent = "Vérification de la page...";
            progressBar.style.width = '0%';

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length === 0) {
                    statusDiv.textContent = "Erreur: Aucune page active trouvée.";
                    downloadButton.classList.remove('disabled');
                    buttonText.textContent = "Lancer le téléchargement";
                    return;
                }

                const currentTab = tabs[0];
                const cahierDePrepaRegex = /^https?:\/\/(www\.)?cahier-de-prepa\.fr/;

                // Vérifie si l'URL de la page active correspond à cahier-de-prepa.fr
                if (cahierDePrepaRegex.test(currentTab.url)) {
                    buttonText.textContent = "Préparation...";
                    statusDiv.textContent = "Début de la récupération des documents...";
                    chrome.tabs.sendMessage(currentTab.id, {action: "startDownload"});
                } else {
                    // Si ce n'est pas la bonne page, affiche le message d'erreur
                    statusDiv.textContent = "Veuillez vous rendre sur un cours de cahier-de-prepa.fr pour utiliser l'extension.";
                    downloadButton.classList.remove('disabled'); // Réactiver le bouton
                    buttonText.textContent = "Lancer le téléchargement"; // Réinitialiser le texte du bouton
                }
            });
        });
    }

    // Écoute les messages du script de contenu (content.js) pour mettre à jour le statut et la progression
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "updateStatus" && statusDiv) {
            statusDiv.textContent = request.message;

            const match = request.message.match(/\((\d+)\/(\d+)\)/);
            if (match) {
                const downloaded = parseInt(match[1]);
                const total = parseInt(match[2]);
                totalDocumentsExpected = total;
                updateProgressBar(downloaded, total);
            } else if (request.message.includes("Début de la récupération")) {
                totalDocumentsExpected = 0;
                updateProgressBar(0, 0);
            } else if (request.message.includes("Création du fichier ZIP") && totalDocumentsExpected > 0) {
                updateProgressBar(totalDocumentsExpected, totalDocumentsExpected);
            }

            if (request.message.includes("Téléchargement ZIP terminé !")) {
                downloadButton.classList.remove('disabled');
                buttonText.textContent = "Téléchargement terminé !";
                progressBar.style.width = '100%';
            } else if (request.message.includes("Erreur") || request.message.includes("Aucun document")) {
                downloadButton.classList.remove('disabled');
                buttonText.textContent = "Relancer le téléchargement";
                progressBar.style.width = '0%';
            }
        }
    });
});