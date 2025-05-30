// content.js - Le script injecté dans la page Cahier de Prépa

(async () => {
  console.log("Cahier de Prépa Downloader: content.js injecté."); // Log pour vérifier le chargement

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
      console.log("Message 'startDownload' reçu."); // Log de début
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
    let sectionName = pageTitle.replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '_').toLowerCase() || 'cahier_de_prepa_telechargement';
    // Si tu veux préserver les accents dans le nom du ZIP (au risque de problèmes sur certains OS), supprime la ligne ci-dessous:
    sectionName = sectionName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');


    async function exploreAndDownload(url, currentPath) {
      if (visitedUrls.has(url)) {
        return;
      }
      visitedUrls.add(url);
      console.log(`Exploration de: ${url} (chemin ZIP: ${currentPath})`); // Log d'exploration

      chrome.runtime.sendMessage({ action: "updateStatus", message: `Exploration: ${currentPath || 'racine'} (${downloadedCount}/${totalDocumentsFound})` });

      let pageContent;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Impossible d'accéder à la page ${url}: ${response.statusText}`);
          chrome.runtime.sendMessage({ action: "updateStatus", message: `Avertissement: Impossible d'explorer ${currentPath} (${downloadedCount}/${totalDocumentsFound})` });
          return;
        }
        pageContent = await response.text();
      } catch (error) {
          if (error.name === 'AbortError') {
            console.warn(`La requête pour ${url} a été annulée.`);
          } else {
            console.error(`Erreur réseau lors de l'exploration de ${url}:`, error);
          }
        chrome.runtime.sendMessage({ action: "updateStatus", message: `Erreur réseau lors de l'exploration de ${currentPath} (${downloadedCount}/${totalDocumentsFound})` });
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
        
        // --- FILTRAGE DES DOCS RÉCENTS PAR NOM/CHEMIN ---
        if (itemName.includes('/')) {
            console.log(`Exclusion du document récent (par nom/chemin): "${itemName}"`);
            if (href.includes('download?id=')) {
                continue; 
            }
        }
        // --- FIN FILTRAGE ---

        // Normalisation des accents et nettoyage des caractères invalides
        // Par défaut, retire les accents pour une meilleure compatibilité des noms de fichiers.
        // Si tu veux préserver les accents dans les noms de fichiers (au risque de "caractères caca" sur certains OS),
        // remplace la ligne ci-dessous par : let cleanName = itemName.replace(/[<>:"/\\|?*]/g, '_');
        let cleanName = itemName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 
        cleanName = cleanName.replace(/[<>:"/\\|?*]/g, '_'); 
        
        let pathInZip = `${currentPath ? currentPath + '/' : ''}`;

        // --- Traitement des documents ---
        if (href.includes('download?id=')) {
          totalDocumentsFound++; // Compte chaque document trouvé
          
          let cleanFileName = cleanName; 
          // Ajoute l'extension si elle manque (supposition)
          if (!cleanFileName.toLowerCase().match(/\.(pdf|zip|rar|docx|xlsx|pptx|odt|ods|odp|txt|jpg|jpeg|png|gif|svg)$/)) { 
               cleanFileName += '.pdf';
          }
          pathInZip += cleanFileName;

          console.log(`Document trouvé: ${pathInZip}. Total: ${totalDocumentsFound}`); // Log du document trouvé
          // Mettre à jour le statut avec la progression AVANT le téléchargement
          chrome.runtime.sendMessage({ action: "updateStatus", message: `Téléchargement: ${cleanFileName} (${downloadedCount}/${totalDocumentsFound})` });

          try {
            const response = await fetch(fullItemURL);
            if (response.ok) {
              const blob = await response.blob();
              mainZip.file(pathInZip, blob); 
              downloadedCount++; // Incrémente seulement après un téléchargement réussi
              console.log(`Téléchargé: ${cleanFileName}. Actuel: ${downloadedCount}/${totalDocumentsFound}`); // Log de téléchargement réussi
            } else {
              console.warn(`Impossible de télécharger ${fullItemURL}: ${response.statusText}`);
              chrome.runtime.sendMessage({ action: "updateStatus", message: `Échec du téléchargement de ${cleanFileName}. (${downloadedCount}/${totalDocumentsFound})` });
            }
          } catch (error) {
            console.error(`Erreur réseau lors du téléchargement de ${fullItemURL}:`, error);
            chrome.runtime.sendMessage({ action: "updateStatus", message: `Erreur interne pour ${cleanFileName}. (${downloadedCount}/${totalDocumentsFound})` });
          }
        } 
        // --- Traitement des dossiers ---
        else if (href.startsWith('?rep=')) {
          const cleanFolderName = cleanName; 
          const newPath = `${currentPath ? currentPath + '/' : ''}${cleanFolderName}`;
          
          if (!visitedUrls.has(fullItemURL)) {
              console.log(`Dossier détecté: ${newPath}`); // Log du dossier détecté
              chrome.runtime.sendMessage({ action: "updateStatus", message: `Exploration du dossier: ${newPath} (${downloadedCount}/${totalDocumentsFound})` });
              await exploreAndDownload(fullItemURL, newPath);
          } else {
              console.log(`Dossier déjà visité, ignoré: ${newPath}`);
          }
        }
      }
    }

    console.log("Début de l'exploration principale..."); // Log de début d'exploration
    await exploreAndDownload(window.location.href, sectionName); 

    if (downloadedCount === 0 && totalDocumentsFound === 0) {
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Aucun document ou dossier n'a pu être trouvé/téléchargé sur cette page." });
        console.log("Aucun document trouvé ou téléchargé."); // Log aucun document
        return;
    }

    chrome.runtime.sendMessage({ action: "updateStatus", message: `Création du fichier ZIP avec ${downloadedCount} documents téléchargés sur ${totalDocumentsFound} trouvés... (${downloadedCount}/${totalDocumentsFound})` });
    console.log(`Génération du ZIP avec ${downloadedCount} documents.`); // Log génération ZIP
    mainZip.generateAsync({ type: "blob" })
      .then(function (content) {
        const now = new Date();
        const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const zipFileName = `MesCoursCDP.zip`;

        saveAs(content, zipFileName);
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Téléchargement ZIP terminé !" });
        console.log(`Fichier ZIP créé et téléchargé: ${zipFileName}`); // Log ZIP terminé
      })
      .catch(error => {
        console.error("Erreur lors de la génération du ZIP:", error);
        chrome.runtime.sendMessage({ action: "updateStatus", message: "Erreur lors de la création du fichier ZIP." });
      });
  }
})();