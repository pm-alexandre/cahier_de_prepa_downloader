# Cahier de Prépa Downloader

![Extension Logo](https://img.shields.io/badge/Chrome_Extension-v1.0-blue?style=flat-square&logo=google-chrome)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Description

**Cahier de Prépa Downloader** est une extension de navigateur (initialement pour Chrome) conçue pour simplifier le téléchargement de documents et de dossiers depuis le site Cahier de Prépa. Fini les téléchargements manuel, cette extension vous permet de récupérer l'intégralité des contenus de cours, de DM, de DS, et autres ressources, tout en respectant l'arborescence des dossiers.

---

## Fonctionnalités

* **Téléchargement en masse** : Téléchargez tous les documents et dossiers d'une section de cours en un seul clic.
* **Préservation de l'arborescence** : Les documents sont organisés dans des dossiers ZIP qui reproduisent fidèlement la structure du site Cahier de Prépa.
* **Exclusion intelligente des documents récents** : Les fichiers listés dans la section "Documents récents" sont automatiquement ignorés, évitant ainsi le téléchargement de doublons ou de contenus non pertinents.
* **Gestion des noms de fichiers** : Les caractères spéciaux dans les noms de fichiers et de dossiers sont nettoyés pour assurer une compatibilité maximale avec tous les systèmes d'exploitation.
* **Support des accents** : Les noms de fichiers contenant des accents sont correctement traités et normalisés.
* **Statut de téléchargement** : Une popup informative vous tient au courant de l'avancement du processus.

---

## Installation (pour Google Chrome)

Pour utiliser cette extension, vous devez la charger en mode développeur dans votre navigateur Chrome.

1.  **Téléchargez le code** : Clonez ce dépôt GitHub ou téléchargez l'archive ZIP et décompressez-la dans un dossier local (par exemple, `cahier-de-prepa-downloader`).
2.  **Ouvrez Chrome Extensions** :
    * Ouvrez votre navigateur Google Chrome.
    * Dans la barre d'adresse, tapez `chrome://extensions` et appuyez sur Entrée.
3.  **Activez le mode développeur** :
    * Dans le coin supérieur droit de la page des extensions, activez le bouton **"Mode développeur"** (Developer mode).
4.  **Chargez l'extension** :
    * Cliquez sur le bouton **"Charger l'extension non empaquetée"** (Load unpacked).
    * Naviguez jusqu'au dossier où vous avez décompressé le code de l'extension (`cahier-de-prepa-downloader`) et sélectionnez-le.
5.  **Vérifiez l'installation** : L'extension "Cahier de Prépa Downloader" devrait maintenant apparaître dans votre liste d'extensions. Vous pouvez cliquer sur l'icône en forme de pièce de puzzle (Extensions) dans la barre d'outils de Chrome et "épingler" l'icône de l'extension pour un accès facile.

---

## Utilisation

1.  **Accédez à Cahier de Prépa** : Ouvrez une page de cours ou de documents sur le site Cahier de Prépa où les documents que vous souhaitez télécharger sont listés (par exemple, la page principale d'une matière, ou un dossier spécifique).
2.  **Lancez l'extension** : Cliquez sur l'icône de l'extension "Cahier de Prépa Downloader" dans votre barre d'outils Chrome.
3.  **Démarrez le téléchargement** : Dans la petite fenêtre qui apparaît, cliquez sur le bouton **"Lancer le Téléchargement"**.
4.  **Suivez le statut** : La popup affichera l'état du téléchargement (exploration des dossiers, téléchargement des fichiers, etc.).
5.  **Récupérez votre ZIP** : Une fois le processus terminé, un fichier `.zip` contenant tous vos documents sera automatiquement téléchargé dans votre dossier de téléchargements par défaut.

---

## Comment ça marche (pour les curieux)

L'extension fonctionne en injectant un script (`content.js`) dans la page Cahier de Prépa. Ce script analyse le contenu HTML de la page pour identifier les liens vers les documents et les dossiers. Il navigue de manière récursive dans l'arborescence des dossiers du site.

Pour gérer l'exclusion des "Documents récents", le script vérifie si le nom du fichier affiché contient des caractères de chemin (`/`). Si c'est le cas, il considère qu'il s'agit d'un document récent (qui affiche son chemin complet dans son nom) et l'exclut du ZIP final.

Les fichiers sont ensuite téléchargés et compressés à l'aide de la bibliothèque JSZip, puis enregistrés sur votre ordinateur via FileSaver.js.

---

## Contribution

Les contributions sont les bienvenues ! Si vous trouvez un bug, avez une suggestion d'amélioration, ou souhaitez ajouter de nouvelles fonctionnalités, n'hésitez pas à ouvrir une "issue" ou à soumettre une "pull request".

---

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---
