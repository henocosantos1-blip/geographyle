let players = [];
        let numPlayers = 2;
        let currentRound = 1;
        let currentPlayerIndex = 0;
        
        let targetCountries = {}; // { jogadorIndex: [5 países aleatórios] }
        
        let attemptsCount = 0;
        let timerInterval = null;
        let secondsElapsed = 0;
        let currentHintLevel = 0; 
        let hasForfeited = false;
        
        const REF_LAT = 0.0;
        const REF_LON = 0.0;

        window.addEventListener('DOMContentLoaded', () => {
            setupPlayerInputs();
            initDatalist();
        });

        function initDatalist() {
            const datalist = document.getElementById('countries-list');
            datalist.innerHTML = '';
            Object.keys(COUNTRIES_DB).sort().forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                datalist.appendChild(option);
            });
        }

        function setupPlayerInputs() {
            const select = document.getElementById('player-count');
            numPlayers = parseInt(select.value);
            const container = document.getElementById('player-names-container');
            container.innerHTML = '';

            for (let i = 1; i <= numPlayers; i++) {
                const div = document.createElement('div');
                div.className = 'flex flex-col gap-1';
                div.innerHTML = `
                    <label class="text-xs text-slate-400 font-semibold uppercase text-left">Nome do Jogador ${i}</label>
                    <input type="text" id="player-name-${i}" value="Jogador ${i}" class="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
                `;
                container.appendChild(div);
            }
        }

        function startGame() {
            players = [];
            for (let i = 1; i <= numPlayers; i++) {
                const nameInput = document.getElementById(`player-name-${i}`);
                players.push({
                    name: nameInput.value.trim() || `Jogador ${i}`,
                    score: 0
                });
            }

            const countriesList = Object.keys(COUNTRIES_DB);
            targetCountries = {};

            for (let p = 0; p < numPlayers; p++) {
                targetCountries[p] = [];
                let tempPool = [...countriesList];
                for (let r = 0; r < 5; r++) {
                    const randomIndex = Math.floor(Math.random() * tempPool.length);
                    targetCountries[p].push(tempPool.splice(randomIndex, 1)[0]);
                }
            }

            currentRound = 1;
            currentPlayerIndex = 0;
            showReadyScreen();
        }

        function showReadyScreen() {
            hideAllScreens();
            document.getElementById('ready-round-num').innerText = currentRound;
            document.getElementById('ready-player-name').innerText = players[currentPlayerIndex].name;
            document.getElementById('screen-ready').classList.remove('hidden');
        }

        function startPlayerTurn() {
            hideAllScreens();
            
            attemptsCount = 0;
            secondsElapsed = 0;
            currentHintLevel = 0;
            hasForfeited = false;
            
            document.getElementById('gameplay-player-name').innerText = players[currentPlayerIndex].name;
            document.getElementById('gameplay-round-num').innerText = currentRound;
            document.getElementById('gameplay-attempts').innerText = `0`;
            document.getElementById('gameplay-timer').innerText = `0s`;
            document.getElementById('attempts-table-body').innerHTML = '';
            document.getElementById('guess-input').value = '';
            
            document.getElementById('hint-display').classList.add('hidden');
            document.getElementById('hint-display').innerHTML = '';
            
            enableHintButton('btn-hint-1', "Dica 1: Direção Ref. (Max 4 pts)");
            disableHintButton('btn-hint-2', "Dica 2: Continente (Max 3 pts)");
            disableHintButton('btn-hint-3', "Dica 3: Bandeira (Max 1 pt)");

            document.getElementById('screen-gameplay').classList.remove('hidden');

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                secondsElapsed++;
                document.getElementById('gameplay-timer').innerText = `${secondsElapsed}s`;
            }, 1000);
        }

        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
        }

        function calculateDirection(lat1, lon1, lat2, lon2) {
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const lat1Rad = lat1 * Math.PI / 180;
            const lat2Rad = lat2 * Math.PI / 180;
            
            const y = Math.sin(dLon) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            
            let bearing = Math.atan2(y, x) * 180 / Math.PI;
            bearing = (bearing + 360) % 360;
            
            const directions = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
            const idx = Math.round(bearing / 45) % 8;
            return directions[idx];
        }

        function useHint(level) {
            if (level !== currentHintLevel + 1) return;

            const targetName = targetCountries[currentPlayerIndex][currentRound - 1];
            const target = COUNTRIES_DB[targetName];
            let hintText = "";

            if (level === 1) {
                const dir = calculateDirection(REF_LAT, REF_LON, target.lat, target.lon);
                hintText = `A partir da interseção de Greenwich com o Equador (0,0), o país correto fica na direção: <strong>🧭 ${dir}</strong>`;
                disableHintButton('btn-hint-1', "Dica 1 Utilizada");
                enableHintButton('btn-hint-2', "Dica 2: Continente (Max 3 pts)");
            } else if (level === 2) {
                hintText = `O país correto fica localizado no continente: <strong>🗺️ ${target.continente}</strong>`;
                disableHintButton('btn-hint-2', "Dica 2 Utilizada");
                enableHintButton('btn-hint-3', "Dica 3: Bandeira (Max 1 pt)");
            } else if (level === 3) {
                hintText = `A bandeira oficial do país é: <span class="text-4xl inline-block align-middle ml-1">${target.bandeira}</span>`;
                disableHintButton('btn-hint-3', "Dica 3 Utilizada");
            }

            currentHintLevel = level;
            const hintBox = document.getElementById('hint-display');
            hintBox.classList.remove('hidden');
            hintBox.innerHTML += `<p class="mt-1">💡 Dica ${level}: ${hintText}</p>`;
        }

        function disableHintButton(id, text) {
            const btn = document.getElementById(id);
            btn.disabled = true;
            btn.innerText = text;
            btn.className = "bg-slate-900/60 text-slate-600 text-xs py-2 px-3 rounded border border-slate-800/60 cursor-not-allowed line-through";
        }

        function enableHintButton(id, text) {
            const btn = document.getElementById(id);
            btn.disabled = false;
            btn.innerText = text;
            btn.className = "bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs py-2 px-3 rounded border border-emerald-800 transition font-semibold";
        }

        function submitGuess() {
            const input = document.getElementById('guess-input');
            const guessName = input.value.trim();

            if (!COUNTRIES_DB[guessName]) {
                alert("Por favor, digite um país válido presente na lista.");
                return;
            }

            const targetName = targetCountries[currentPlayerIndex][currentRound - 1];
            const guess = COUNTRIES_DB[guessName];
            const target = COUNTRIES_DB[targetName];

            attemptsCount++;
            document.getElementById('gameplay-attempts').innerText = attemptsCount;
            input.value = '';

            const correct = (guessName === targetName);

            // Verifica de forma bidirecional se os países compartilham fronteira
            const sharesBorder = (typeof BORDERS_DB !== 'undefined') && (
                (BORDERS_DB[guessName] && BORDERS_DB[guessName].includes(targetName)) ||
                (BORDERS_DB[targetName] && BORDERS_DB[targetName].includes(guessName))
            );

            // 1. Calcula a distância entre os centros (centroides) geográficos
            const centroidDist = calculateDistance(guess.lat, guess.lon, target.lat, target.lon);

            // 2. Estima o "raio médio" de cada país a partir da sua área (Área = pi * r²)
            // O fator de ajuste 0.62 é usado para compensar o formato irregular e não perfeitamente circular das nações
            const radiusGuess = 0.62 * Math.sqrt(guess.area / Math.PI);
            const radiusTarget = 0.62 * Math.sqrt(target.area / Math.PI);

            // 3. Subtrai os raios da distância total para obter a distância aproximada de borda a borda
            let dist = centroidDist - radiusGuess - radiusTarget;

            // Define o texto que será exibido no campo de distância
            let distDisplay = "";
            if (correct) {
                distDisplay = "0 km";
            } else if (sharesBorder) {
                distDisplay = "< 10 km";
            } else {
                // Garante que a distância não fique negativa ou excessivamente baixa se não compartilharem fronteira direta
                dist = Math.max(15, Math.round(dist));
                distDisplay = `${dist.toLocaleString()} km`;
            }

            let popRelation = "igual";
            if (target.populacao > guess.populacao) popRelation = "maior";
            else if (target.populacao < guess.populacao) popRelation = "menor";
            
            let areaRelation = "igual";
            if (target.area > guess.area) areaRelation = "maior";
            else if (target.area < guess.area) areaRelation = "menor";

            let tempRelation = "igual";
            if (target.temp > guess.temp) tempRelation = "maior";
            else if (target.temp < guess.temp) tempRelation = "menor";

            const tbody = document.getElementById('attempts-table-body');
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/20";

            const popText = guess.populacao >= 1000000 ? `${(guess.populacao / 1000000).toFixed(1)}M` : guess.populacao.toLocaleString();
            const areaText = `${guess.area.toLocaleString()} km²`;

            const getIcon = (rel) => {
                if (rel === 'maior') return '⬆️ (Maior)';
                if (rel === 'menor') return '⬇️ (Menor)';
                return '✅';
            };

            tr.innerHTML = `
                <td class="py-3 font-semibold text-slate-100">${guessName}</td>
                <td class="py-3">${guess.continente === target.continente ? '✅' : '❌'} <span class="text-xs text-slate-400">(${guess.continente})</span></td>
                <td class="py-3">${getIcon(popRelation)} <span class="text-xs text-slate-400">(${popText})</span></td>
                <td class="py-3">${getIcon(areaRelation)} <span class="text-xs text-slate-400">(${areaText})</span></td>
                <td class="py-3">${getIcon(tempRelation)} <span class="text-xs text-slate-400">(${guess.temp}°C)</span></td>
                <td class="py-3 font-medium text-emerald-400">📍 ${distDisplay}</td>
            `;

            tbody.insertBefore(tr, tbody.firstChild);

            if (correct) {
                endTurn(true);
            } else if (attemptsCount >= 10) {
                endTurn(false);
            }
        }

        // Função para Desistir do Turno
        function forfeitRound() {
            if (confirm("Deseja realmente desistir desta rodada? Você não marcará nenhum ponto.")) {
                hasForfeited = true;
                endTurn(false);
            }
        }

        // Fim de turno
        function endTurn(isCorrect) {
            if (timerInterval) clearInterval(timerInterval);

            let guessPoints = 0;
            let timePoints = 0;

            if (isCorrect && !hasForfeited) {
                if (currentHintLevel === 0) guessPoints = 5;
                else if (currentHintLevel === 1) guessPoints = 4;
                else if (currentHintLevel === 2) guessPoints = 3;
                else if (currentHintLevel === 3) guessPoints = 1;

                if (secondsElapsed < 20) timePoints = 5;
                else if (secondsElapsed < 30) timePoints = 4;
                else if (secondsElapsed < 40) timePoints = 3;
                else if (secondsElapsed < 50) timePoints = 2;
                else timePoints = 1;
            }

            const totalEarned = guessPoints + timePoints;
            players[currentPlayerIndex].score += totalEarned;

            hideAllScreens();
            const title = document.getElementById('result-title');
            const details = document.getElementById('result-details');
            const targetName = targetCountries[currentPlayerIndex][currentRound - 1];
            const target = COUNTRIES_DB[targetName];

            if (isCorrect) {
                title.innerText = "Você Acertou! 🎉";
                title.className = "text-3xl font-extrabold text-emerald-400";
                details.innerHTML = `
                    <p class="text-lg">País Alvo: <span class="text-3xl inline-block align-middle">${target.bandeira}</span> <strong class="text-white ml-1">${targetName}</strong></p>
                    <hr class="border-slate-800 my-2">
                    <p class="text-sm">Pontos por Acerto: <span class="text-emerald-400 font-bold">${guessPoints} / 5</span> (Dicas usadas: ${currentHintLevel})</p>
                    <p class="text-sm">Pontos por Tempo (${secondsElapsed}s): <span class="text-emerald-400 font-bold">${timePoints} / 5</span></p>
                    <div class="bg-slate-900 p-2 rounded mt-3 text-sm">
                        Total Ganho nesta rodada: <strong class="text-yellow-400 text-lg">+ ${totalEarned}</strong>
                    </div>
                `;
            } else {
                title.innerText = hasForfeited ? "Você Desistiu! 🏳️" : "Tentativas Esgotadas! 😢";
                title.className = "text-3xl font-extrabold text-red-500";
                details.innerHTML = `
                    <p class="text-lg">O país correto era: <span class="text-3xl inline-block align-middle">${target.bandeira}</span> <strong class="text-white ml-1">${targetName}</strong></p>
                    <hr class="border-slate-800 my-2">
                    <p class="text-slate-400 text-sm">Você desistiu ou atingiu o limite de 10 palpites sem sucesso. Você obteve 0 pontos nesta rodada.</p>
                `;
            }

            hasForfeited = false; // reinicia estado
            document.getElementById('screen-result').classList.remove('hidden');
        }

        function nextTurn() {
            currentPlayerIndex++;

            if (currentPlayerIndex >= numPlayers) {
                currentPlayerIndex = 0;
                currentRound++;

                if (currentRound > 5) {
                    showFinalRanking();
                    return;
                }
            }

            showReadyScreen();
        }

        function showFinalRanking() {
            hideAllScreens();
            
            const ranked = [...players].sort((a, b) => b.score - a.score);
            const tbody = document.getElementById('ranking-table-body');
            tbody.innerHTML = '';

            ranked.forEach((player, idx) => {
                const tr = document.createElement('tr');
                tr.className = idx === 0 ? "bg-amber-950/20" : "";
                
                let medal = `${idx + 1}º`;
                if (idx === 0) medal = '🥇';
                else if (idx === 1) medal = '🥈';
                else if (idx === 2) medal = '🥉';

                tr.innerHTML = `
                    <td class="p-4 font-bold text-slate-300">${medal}</td>
                    <td class="p-4 font-semibold text-white">${player.name}</td>
                    <td class="p-4 text-right font-extrabold text-yellow-400 text-lg">${player.score} pts</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('screen-ranking').classList.remove('hidden');
        }

        // Função para abortar o jogo em andamento e reconfigurar tudo
        function goToMainMenu() {
            if (timerInterval) clearInterval(timerInterval);
            if (confirm("Tem certeza que deseja sair do jogo atual e voltar para a tela inicial? Seu progresso será perdido.")) {
                resetGame();
            }
        }

        function resetGame() {
            hideAllScreens();
            document.getElementById('screen-setup').classList.remove('hidden');
            setupPlayerInputs();
        }

        function hideAllScreens() {
            document.getElementById('screen-setup').classList.add('hidden');
            document.getElementById('screen-ready').classList.add('hidden');
            document.getElementById('screen-gameplay').classList.add('hidden');
            document.getElementById('screen-result').classList.add('hidden');
            document.getElementById('screen-ranking').classList.add('hidden');
        }