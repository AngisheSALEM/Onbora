const http = require('http');

const PORT = 3001;

// Global state holding the client HTTP connection waiting for a response
let pendingRequest = null;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Endpoint reached by Onbora client to send a chat message
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const userText = parsed.message || '';

        // If there's an existing pending connection, close it with a fallback
        if (pendingRequest) {
          try {
            pendingRequest.res.writeHead(200, { 'Content-Type': 'application/json' });
            pendingRequest.res.end(JSON.stringify({ 
              reply: "Requête annulée car une nouvelle demande a été envoyée.", 
              tool_calls: [] 
            }));
          } catch(e) {}
        }

        // Register the pending connection and prompt
        pendingRequest = {
          message: userText,
          res: res
        };

        console.log(`[Onbora Client Message Received]: "${userText}". Connection held.`);

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  } 

  // 2. Endpoint query by admin panel to check for pending messages (polling)
  else if (req.method === 'GET' && req.url === '/api/pending') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      hasPending: pendingRequest !== null,
      message: pendingRequest ? pendingRequest.message : null 
    }));
    if (pendingRequest !== null) {
      console.log(`[Polling API]: Return pending message: "${pendingRequest.message}"`);
    }
  }

  // 3. Endpoint posted by the operator to send the final JSON back to the client
  else if (req.method === 'POST' && req.url === '/api/respond') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const { reply, tool_calls, business_twin } = parsed;

        if (!pendingRequest) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Aucune requête client en attente de réponse.' }));
          return;
        }

        // Resolve the client connection waiting on /api/chat with complete JSON
        pendingRequest.res.writeHead(200, { 'Content-Type': 'application/json' });
        pendingRequest.res.end(JSON.stringify({
          reply: reply || "Votre demande a été traitée.",
          tool_calls: tool_calls || [],
          business_twin: business_twin || null
        }));

        console.log(`[Resolved Client Connection] Sent reply: "${reply}". Twin data:`, business_twin ? "Yes" : "No");

        // Reset state
        pendingRequest = null;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  }

  // 4. Web page visual console for human operator
  else if (req.method === 'GET' && req.url === '/') {
    console.log("[Operator Console]: Serving HTML console page to client.");
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Onbora - Console de pilotage IA (Human-in-the-loop)</title>
        <style>
          :root {
            --brand-orange: #FF7900;
            --zinc-950: #09090b;
            --zinc-900: #18181b;
            --zinc-800: #27272a;
            --zinc-750: #323236;
            --zinc-400: #a1a1aa;
            --zinc-100: #f4f4f5;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--zinc-950);
            color: var(--zinc-100);
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
          }
          header {
            border-bottom: 1px solid var(--zinc-900);
            background-color: var(--zinc-900);
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo-area {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-box {
            background-color: var(--brand-orange);
            color: #000;
            font-weight: 900;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 14px;
          }
          .title-area h1 {
            font-size: 15px;
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.01em;
          }
          .title-area p {
            font-size: 10px;
            color: var(--zinc-400);
            margin: 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px;
          }
          
          /* Empty State styles */
          .empty-state {
            text-align: center;
            max-width: 480px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .radar {
            position: relative;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 2px dashed rgba(255, 121, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .radar::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid var(--brand-orange);
            top: -2px;
            left: -2px;
            opacity: 0;
            animation: pulse-ring 2s infinite ease-out;
          }
          .radar-core {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: var(--brand-orange);
            box-shadow: 0 0 20px var(--brand-orange);
            animation: pulse-core 2s infinite;
          }
          
          /* Active State Panel */
          .operator-panel {
            background-color: var(--zinc-900);
            border: 1px solid var(--zinc-800);
            border-radius: 20px;
            width: 100%;
            max-width: 720px;
            overflow: hidden;
            display: none; /* Controlled dynamically */
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            animation: slide-up 0.4s ease-out;
            margin: 20px 0;
          }
          .panel-header {
            padding: 20px;
            border-bottom: 1px solid var(--zinc-800);
            background-color: rgba(255, 121, 0, 0.03);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .incoming-badge {
            background-color: rgba(255, 121, 0, 0.15);
            color: var(--brand-orange);
            border: 1px solid rgba(255, 121, 0, 0.25);
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .pulse-dot {
            width: 6px;
            height: 6px;
            background-color: var(--brand-orange);
            border-radius: 50%;
            animation: pulse-core 1s infinite;
          }
          
          .panel-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 80vh;
            overflow-y: auto;
          }
          
          .message-bubble {
            background-color: var(--zinc-800);
            border-radius: 12px 12px 12px 0;
            padding: 16px;
            font-size: 13px;
            line-height: 1.5;
            align-self: flex-start;
            border: 1px solid var(--zinc-750);
            max-width: 85%;
          }
          .message-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            color: var(--zinc-400);
            margin-bottom: 4px;
            tracking-wider: 0.05em;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          label {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: var(--zinc-400);
            letter-spacing: 0.05em;
          }
          textarea {
            width: 100%;
            background-color: var(--zinc-950);
            border: 1px solid var(--zinc-800);
            border-radius: 12px;
            padding: 12px;
            font-size: 13px;
            color: var(--zinc-100);
            outline: none;
            resize: none;
            box-sizing: border-box;
            font-family: inherit;
            transition: border-color 0.2s;
          }
          textarea:focus {
            border-color: var(--brand-orange);
          }
          select {
            width: 100%;
            background-color: var(--zinc-950);
            border: 1px solid var(--zinc-800);
            border-radius: 12px;
            padding: 14px;
            font-size: 13px;
            color: var(--zinc-100);
            outline: none;
            box-sizing: border-box;
            cursor: pointer;
            transition: border-color 0.2s;
          }
          select:focus {
            border-color: var(--brand-orange);
          }
          
          .btn-submit {
            background-color: var(--brand-orange);
            color: #000;
            font-weight: 800;
            font-size: 13px;
            padding: 14px 24px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .btn-submit:hover {
            opacity: 0.95;
          }
          .btn-submit:active {
            transform: scale(0.99);
          }
          
          .twin-editor {
            border-top: 1px solid var(--zinc-800);
            margin-top: 10px;
            padding-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: bold;
          }
          .checkbox-row input {
            cursor: pointer;
            width: 16px;
            height: 16px;
          }
          
          @keyframes pulse-ring {
            0% { transform: scale(0.85); opacity: 0.5; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          @keyframes pulse-core {
            0% { transform: scale(0.9); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.7; }
          }
          @keyframes slide-up {
            0% { transform: translateY(12px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="logo-area">
            <span class="logo-box">IA</span>
            <div class="title-area">
              <h1>Console de pilotage IA</h1>
              <p>Onbora - Human-In-The-Loop</p>
            </div>
          </div>
          <div style="font-size: 10px; font-weight: bold; color: var(--zinc-400); text-transform: uppercase;">
            Status: <span style="color: #22C55E">En ligne (Port 3001)</span>
          </div>
        </header>

        <div class="container">
          <!-- State 1: Waiting for request -->
          <div id="waiting-state" class="empty-state">
            <div class="radar">
              <div class="radar-core"></div>
            </div>
            <div>
              <h2 style="font-size: 16px; margin: 0 0 6px 0; font-weight: bold;">En attente de messages...</h2>
              <p style="margin: 0; font-size: 12px;">Tapez une demande ou parlez dans Onbora (Port 3000) pour qu'elle s'affiche ici.</p>
            </div>
          </div>

          <!-- State 2: Operator Action Panel -->
          <div id="action-panel" class="operator-panel">
            <div class="panel-header">
              <div class="incoming-badge">
                <span class="pulse-dot"></span>
                Message Reçu
              </div>
              <span style="font-size: 10px; color: var(--zinc-400); font-weight: bold;">Client Onbora (B2B)</span>
            </div>
            
            <div class="panel-body">
              <!-- User question display -->
              <div class="message-bubble">
                <div class="message-label">Client</div>
                <div id="client-msg-text" style="font-weight: 500;"></div>
              </div>

              <!-- Form to submit back to Onbora client -->
              <div class="form-group" style="margin-top: 10px;">
                <label for="reply-textarea">Votre réponse (Copilote)</label>
                <textarea 
                  id="reply-textarea" 
                  rows="3" 
                  placeholder="Écrivez le message de réponse que verra le client..."
                ></textarea>
              </div>

              <div class="form-group">
                <label for="tool-select">Action à déclencher sur l'interface (Tool Call)</label>
                <select id="tool-select">
                  <option value="none">Aucune action (Réponse textuelle simple)</option>
                  <optgroup label="Lancer un module d'adoption (launch_training)">
                    <option value="launch_training:mfa-setup">🎓 Activer Double Authentification (MFA)</option>
                    <option value="launch_training:vpn-access">🎓 Configurer VPN Cisco AnyConnect</option>
                    <option value="launch_training:sharepoint-collab">🎓 Configurer & Synchroniser SharePoint</option>
                    <option value="launch_training:teams-telephony">🎓 Paramétrer Téléphonie Teams Phone</option>
                  </optgroup>
                  <optgroup label="Business Twin PowerPoint (generate_slides)">
                    <option value="generate_slides:">📊 Afficher le diaporama Business Twin</option>
                  </optgroup>
                  <optgroup label="Automatisation direct (execute_setup)">
                    <option value="execute_setup:vpn_address">⚡ Do It For Me : Configurer IP VPN</option>
                    <option value="execute_setup:enable_call_forwarding">⚡ Do It For Me : Renvoi répondeur Teams</option>
                  </optgroup>
                </select>
              </div>

              <!-- Business Twin JSON builder fields -->
              <div class="twin-editor">
                <div class="checkbox-row">
                  <input type="checkbox" id="include-twin" checked>
                  <label for="include-twin">Inclure/Mettre à jour le Business Twin (JSON)</label>
                </div>

                <div id="twin-fields" style="display: flex; flex-direction: column; gap: 12px;">
                  <div class="form-group">
                    <label for="twin-current">Situation Actuelle (Un point par ligne)</label>
                    <textarea id="twin-current" rows="3" placeholder="ADSL lent & instable&#10;Pas de double authentification&#10;Travail collaboratif par email local"></textarea>
                  </div>
                  <div class="form-group">
                    <label for="twin-proposed">Situation Future recommandée (Un point par ligne)</label>
                    <textarea id="twin-proposed" rows="3" placeholder="Fibre Pro Orange 1Gbps symétrique&#10;MFA obligatoire sur toutes les apps&#10;SharePoint collaboratif & Teams Phone"></textarea>
                  </div>
                  <div class="form-group">
                    <label for="twin-roadmap">Roadmap de Transition (Une étape par ligne)</label>
                    <textarea id="twin-roadmap" rows="3" placeholder="Étape 1: Raccordement Fibre Pro Orange&#10;Étape 2: Migration cloud OneDrive/SharePoint&#10;Étape 3: Configuration de la double authentification"></textarea>
                  </div>
                </div>
              </div>

              <button id="send-btn" class="btn-submit" style="margin-top: 10px; shrink-0;">
                Envoyer à l'interface d'Onbora (Port 3000) &rarr;
              </button>
            </div>
          </div>
        </div>

        <script>
          const waitingState = document.getElementById('waiting-state');
          const actionPanel = document.getElementById('action-panel');
          const clientMsgText = document.getElementById('client-msg-text');
          const replyTextarea = document.getElementById('reply-textarea');
          const toolSelect = document.getElementById('tool-select');
          const sendBtn = document.getElementById('send-btn');
          
          const includeTwin = document.getElementById('include-twin');
          const twinFields = document.getElementById('twin-fields');
          const twinCurrent = document.getElementById('twin-current');
          const twinProposed = document.getElementById('twin-proposed');
          const twinRoadmap = document.getElementById('twin-roadmap');

          let activeMessageText = '';

          // Toggle twin fields visibility
          includeTwin.addEventListener('change', () => {
            twinFields.style.display = includeTwin.checked ? 'flex' : 'none';
          });

          // Poll the server every second to check for pending requests
          async function checkPending() {
            try {
              const res = await fetch('/api/pending');
              if (res.ok) {
                const data = await res.json();
                if (data.hasPending) {
                  if (activeMessageText !== data.message) {
                    activeMessageText = data.message;
                    clientMsgText.textContent = activeMessageText;
                    
                    // Pre-fill smart suggestions based on keywords
                    let replySuggestion = "D'accord, je vais vous aider.";
                    
                    let currentSuggestion = \`Réseau cuivre ADSL lent & saturé
Pas de télétravail sécurisé
Fichiers d'équipe éparpillés localement\`;
                    let proposedSuggestion = \`Fibre Pro Orange 1Gbps symétrique
Cisco Secure VPN chiffré
Espace SharePoint partagé sécurisé\`;
                    let roadmapSuggestion = \`Étape 1 : Raccordement de la Fibre Optique Pro Orange
Étape 2 : Configuration du VPN Cisco AnyConnect
Étape 3 : Synchronisation SharePoint OneDrive\`;

                    if (activeMessageText.toLowerCase().includes('vpn') || activeMessageText.toLowerCase().includes('connect')) {
                      replySuggestion = "Certainement ! Je lance le guide d'adoption interactif du VPN Cisco AnyConnect pour vous accompagner.";
                      toolSelect.value = "launch_training:vpn-access";
                      
                      currentSuggestion = \`Pas de VPN configuré
Accès réseau interne distant non chiffré
Risques de fuites de données en télétravail\`;
                      proposedSuggestion = \`VPN Cisco Secure Client installé
Liaison chiffrée SSL vers le réseau d'entreprise
Double authentification activée sur les accès\`;
                      roadmapSuggestion = \`Étape 1 : Téléchargement et installation de Cisco Secure Client
Étape 2 : Saisie de la passerelle vpn.onbora-entreprise.fr
Étape 3 : Liaison et première connexion chiffrée\`;
                    } 
                    else if (activeMessageText.toLowerCase().includes('mfa') || activeMessageText.toLowerCase().includes('auth') || activeMessageText.toLowerCase().includes('qr')) {
                      replySuggestion = "Sécurisons vos comptes. Voici le module pas-à-pas pour activer la double authentification (MFA).";
                      toolSelect.value = "launch_training:mfa-setup";
                      
                      currentSuggestion = \`Identifiants cloud protégés par mot de passe simple
Risque élevé d'usurpation d'identité
Aucun contrôle MFA actif\`;
                      proposedSuggestion = \`Double authentification obligatoire
Microsoft Authenticator lié aux comptes
Approbation instantanée sur smartphone\`;
                      roadmapSuggestion = \`Étape 1 : Installation de Microsoft Authenticator
Étape 2 : Scan du QR Code d'association
Étape 3 : Première validation par code à 2 chiffres\`;
                    } 
                    else if (activeMessageText.toLowerCase().includes('sharepoint') || activeMessageText.toLowerCase().includes('onedrive') || activeMessageText.toLowerCase().includes('synchro')) {
                      replySuggestion = "Très bien. Je vous guide pour configurer SharePoint et synchroniser vos dossiers d'équipe.";
                      toolSelect.value = "launch_training:sharepoint-collab";
                      
                      currentSuggestion = \`Serveur de fichiers physiques obsolète
Pas de partage collaboratif cloud
Documents impossibles à modifier à plusieurs\`;
                      proposedSuggestion = \`Espace documentaire SharePoint Online
Synchronisation OneDrive locale (petits nuages)
Co-édition en temps réel sur Microsoft Teams\`;
                      roadmapSuggestion = \`Étape 1 : Connexion au portail SharePoint d'équipe
Étape 2 : Synchronisation des dossiers de service
Étape 3 : Partage de liens sécurisés avec permissions\`;
                    }
                    else if (activeMessageText.toLowerCase().includes('téléphonie') || activeMessageText.toLowerCase().includes('phone') || activeMessageText.toLowerCase().includes('renvoi')) {
                      replySuggestion = "Pas de problème. Je lance la formation téléphonie IP pour configurer vos renvois d'appels Teams Phone.";
                      toolSelect.value = "launch_training:teams-telephony";
                      
                      currentSuggestion = \`Téléphonie fixe physique obsolète
Pas de messagerie vocale accessible à distance
Appels perdus en déplacement\`;
                      proposedSuggestion = \`Teams Phone System VoIP actif
Renvois d'appels automatiques vers mobile ou répondeur
Annonce d'absence personnalisée\`;
                      roadmapSuggestion = \`Étape 1 : Accès aux paramètres Appels de Teams
Étape 2 : Activation des règles de renvoi d'appels
Étape 3 : Enregistrement de l'annonce vocale d'absence\`;
                    }
                    else if (activeMessageText.toLowerCase().includes('slide') || activeMessageText.toLowerCase().includes('jumeau') || activeMessageText.toLowerCase().includes('twin')) {
                      replySuggestion = "Voici la présentation PowerPoint interactive de votre jumeau numérique (Business Twin) et la roadmap de transition.";
                      toolSelect.value = "generate_slides:";
                    }

                    replyTextarea.value = replySuggestion;
                    twinCurrent.value = currentSuggestion;
                    twinProposed.value = proposedSuggestion;
                    twinRoadmap.value = roadmapSuggestion;

                    // Switch panels
                    waitingState.style.display = 'none';
                    actionPanel.style.display = 'flex';
                  }
                } else {
                  // Reset panels if resolved
                  activeMessageText = '';
                  waitingState.style.display = 'flex';
                  actionPanel.style.display = 'none';
                }
              }
            } catch(e) {
              console.error("Polling error:", e);
            }
          }

          setInterval(checkPending, 1000);

          // Handle sending response back
          sendBtn.addEventListener('click', async () => {
            const reply = replyTextarea.value.trim();
            const toolValue = toolSelect.value;
            
            if (!reply) {
              alert("Veuillez écrire une réponse pour le client.");
              return;
            }

            let tool_calls = [];
            if (toolValue !== 'none') {
              const [toolName, toolArg] = toolValue.split(':');
              if (toolName === 'launch_training') {
                tool_calls.push({
                  name: 'launch_training',
                  arguments: { moduleId: toolArg }
                });
              } else if (toolName === 'generate_slides') {
                tool_calls.push({
                  name: 'generate_slides',
                  arguments: {}
                });
              } else if (toolName === 'execute_setup') {
                tool_calls.push({
                  name: 'execute_setup',
                  arguments: { action: toolArg }
                });
              }
            }

            let business_twin = null;
            if (includeTwin.checked) {
              const current_state = twinCurrent.value.split('\\n').map(l => l.trim()).filter(Boolean);
              const proposed_state = twinProposed.value.split('\\n').map(l => l.trim()).filter(Boolean);
              const roadmap = twinRoadmap.value.split('\\n').map(l => l.trim()).filter(Boolean);
              
              let recommended_services = [];
              // Auto-recommend services based on active tool or text keywords
              if (toolValue.includes('vpn') || reply.toLowerCase().includes('vpn')) {
                recommended_services.push({
                  service_id: 101,
                  name: "Cisco Secure Client VPN",
                  category: "vpn",
                  priority: "CRITIQUE",
                  reasoning: "Garantir un canal chiffré pour le télétravail."
                });
              }
              if (toolValue.includes('mfa') || reply.toLowerCase().includes('mfa')) {
                recommended_services.push({
                  service_id: 102,
                  name: "Microsoft Multi-Factor Authentication",
                  category: "firewall",
                  priority: "CRITIQUE",
                  reasoning: "Sécuriser les identités cloud professionnelles."
                });
              }
              if (toolValue.includes('sharepoint') || reply.toLowerCase().includes('sharepoint')) {
                recommended_services.push({
                  service_id: 103,
                  name: "Microsoft 365 SharePoint Online",
                  category: "m365",
                  priority: "HAUTE",
                  reasoning: "Centraliser les documents d'équipe et dossiers partagés."
                });
              }
              if (toolValue.includes('telephony') || reply.toLowerCase().includes('téléphonie')) {
                recommended_services.push({
                  service_id: 104,
                  name: "Teams Phone System VoIP",
                  category: "m365",
                  priority: "MOYENNE",
                  reasoning: "Migrer la téléphonie analogique obsolète."
                });
              }
              
              // Fallback default recommendation if empty
              if (recommended_services.length === 0) {
                recommended_services.push({
                  service_id: 100,
                  name: "Fibre Pro Orange 1Gbps",
                  category: "fibre",
                  priority: "CRITIQUE",
                  reasoning: "Moderniser la connectivité de l'entreprise."
                });
              }

              business_twin = {
                current_state,
                proposed_state,
                roadmap,
                recommended_services
              };
            }

            sendBtn.disabled = true;
            sendBtn.textContent = "Transmission...";

            try {
              const res = await fetch('/api/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply, tool_calls, business_twin })
              });

              if (res.ok) {
                // Success, clear panels
                activeMessageText = '';
                replyTextarea.value = '';
                toolSelect.value = 'none';
                waitingState.style.display = 'flex';
                actionPanel.style.display = 'none';
              } else {
                const err = await res.json();
                alert("Erreur de transmission: " + err.error);
              }
            } catch(e) {
              alert("Impossible de joindre le serveur.");
            } finally {
              sendBtn.disabled = false;
              sendBtn.textContent = "Envoyer à l'interface d'Onbora (Port 3000) &rarr;";
            }
          });
        </script>
      </body>
      </html>
    `);
  } 
  
  // 5. Default 404
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock AI Server and Admin Console running at http://localhost:${PORT}`);
});

