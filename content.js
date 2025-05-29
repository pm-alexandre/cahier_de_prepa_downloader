// content.js - Le script injecté dans la page Cahier de Prépa
// Cette version vise à filtrer les documents récents par leur nom/chemin dans l'affichage,
// en déboguant la présence de slashes.

(async () => {
  if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
    console.error("JSZip ou FileSaver.js non chargés. Assurez-vous qu'ils sont correctement injectés.");
    chrome.runtime.sendMessage({ action: "updateStatus", message: "Erreur interne: Librairies manquantes." });
    return;
  }

  const BASE_URL = window.location.origin;
  const visitedUrls = new Set();
  
  let totalDocumentsFound = 0;
  let downloadedCount = 0;
  let mainZip; 

  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "startDownload") {
      await startDownloadProcess();
    }
  });

  async function startDownloadProcess() {
    chrome.runtime.sendMessage({ action: "updateStatus", message: "Début de la récupération des documents et dossiers..." });
    mainZip = new JSZip();

    totalDocumentsFound = 0;
    downloadedCount = 0;
    visitedUrls.clear(); 

    const pageTitle = document.title.split(' - ')[0].trim();
    const sectionName = pageTitle.replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '_').toLowerCase() || 'cahier_de_prepa_telechargement';

    async function exploreAndDownload(url, currentPath) {
      if (visitedUrls.has(url)) {
        return;
      }
      visitedUrls.add(url);

      chrome.runtime.sendMessage({ action: "updateStatus", message: `Exploration: ${currentPath || 'racine'} (${downloadedCount}/${totalDocumentsFound})...` });

      let pageContent;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Impossible d'accéder à la page ${url}: ${response.statusText}`);
          chrome.runtime.sendMessage({ action: "updateStatus", message: `Avertissement: Impossible d'explorer ${currentPath}` });
          return;
        }
        pageContent = await response.text();
      } catch (error) {
          if (error.name === 'AbortError') {
            console.warn(`La requête pour ${url} a été annulée.`);
          } else {
            console.error(`Erreur réseau lors de l'exploration de ${url}:`, error);
          }
        chrome.runtime.sendMessage({ action: "updateStatus", message: `Erreur réseau lors de l'exploration de ${currentPath}` });
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(pageContent, 'text/html');

      const mainSection = doc.querySelector('section');
      let allPotentialLinks = [];

      if (mainSection) {
        allPotentialLinks = mainSection.querySelectorAll('p.rep a, a[href*="download?id="]');
      }

      for (const itemLink of allPotentialLinks) {
        const href = itemLink.getAttribute('href');
        if (!href) continue;

        const fullItemURL = new URL(href, url).href;

        const itemNameSpan = itemLink.querySelector('span.nom');
        const itemName = itemNameSpan ? itemNameSpan.textContent.trim() : 'unknown_item';
        
        // --- NOUVEAU DEBUG ET FILTRAGE ---
        console.log(`Détection pour lien: "${itemName}" (URL: ${fullItemURL})`);
        
        if (itemName.includes('/')) {
            console.log(`  >>> DÉTECTÉ SLASH dans itemName. Sera EXCLU du ZIP: "${itemName}"`);
            if (href.includes('download?id=')) { // Confirmer que c'est bien un document et non un dossier
                continue; // Passe au lien suivant, n'ajoute pas au ZIP
            }
        }
        // --- FIN NOUVEAU DEBUG ET FILTRAGE ---

        let cleanFileName = itemName.replace(/[<>:"/\\|?*]/g, '_');

        // Note: La ligne ci-dessous est moins cruciale maintenant car l'exclusion se fait sur itemName brut.
        // Mais elle reste pour le nettoyage du nom du fichier si inclus.
        // Si itemName contient des slashes, cleanFileName les aura déjà remplacés par des underscores.
        // On s'assure que cleanFileName est toujours sans slashes pour le nom du fichier dans le ZIP.
        cleanFileName = cleanFileName.replace(/\//g, '_'); // Double sécurité au cas où un slash passerait

        // Ajoute l'extension si elle manque (supposition)
        if (!cleanFileName.toLowerCase().match(/\.(pdf|zip|rar|docx|xlsx|pptx|odt|ods|odp|txt|jpg|jpeg|png|gif|svg)$/)) { 
               cleanFileName += '.pdf';
          }
          
        let pathInZip = `${currentPath ? currentPath + '/' : ''}${cleanFileName}`;

        // --- Traitement des documents ---
        if (href.includes('download?id=')) {
          totalDocumentsFound++;
          
          chrome.runtime.sendMessage({ action: "updateStatus", message: `Téléchargement: ${pathInZip} (${downloadedCount}/${totalDocumentsFound})` });

          try {
            const response = await fetch(fullItemURL);
            if (response.ok) {
              const blob = await response.blob();
              mainZip.file(pathInZip, blob); 
              downloadedCount++;
            } else {
              console.warn(`Impossible de télécharger ${fullItemURL}: ${response.statusText}`);
              chrome.runtime.sendMessage({ action: "updateStatus", message: `Échec du téléchargement de ${cleanFileName}.` });
            }
          } catch (error) {
            console.error(`Erreur réseau lors du téléchargement de ${fullItemURL}:`, error);
            chrome.runtime.sendMessage({ action: "updateStatus", message: `Erreur interne pour ${cleanFileName}.` });
          }
        } 
        // --- Traitement des dossiers ---
        else if (href.startsWith('?rep=')) {
          const cleanFolderName = itemName.replace(/[<>:"/\\|?*]/g, '_');
          const newPath = `${currentPath ? currentPath + '/' : ''}${cleanFolderName}`;
          
          if (!visitedUrls.has(fullItemURL)) {
              chrome.runtime.sendMessage({ action: "updateStatus", message: `Exploration du dossier: ${newPath}` });
              await exploreAndDownload(fullItemURL, newPath);
          } else {
              console.log(`Dossier déjà visité, ignoré: ${newPath}`);
          }
        }
      }
    }

    await exploreAndDownload(window.location.href, sectionName); 

    if (downloadedCount === 0 && totalDocumentsFound === 0) {
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Aucun document ou dossier n'a pu être trouvé/téléchargé sur cette page." });
        return;
    }

    chrome.runtime.sendMessage({ action: "updateStatus", message: `Création du fichier ZIP avec ${downloadedCount} documents téléchargés sur ${totalDocumentsFound} trouvés...` });
    mainZip.generateAsync({ type: "blob" })
      .then(function (content) {
        saveAs(content, `MesCoursCahierDePrepa.zip`);
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Téléchargement ZIP terminé !" });
      })
      .catch(error => {
        console.error("Erreur lors de la génération du ZIP:", error);
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Erreur lors de la création du fichier ZIP." });
      });
  }
})();
