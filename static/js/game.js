// Game functionality
class PokerGame {
    constructor(gameId) {
        this.gameId = gameId;
        this.gameState = null;
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.startGameUpdates();
    }

    bindEvents() {
        // Action buttons
        document.getElementById('fold-btn').addEventListener('click', () => this.playerAction('fold'));
        document.getElementById('check-call-btn').addEventListener('click', () => this.handleCheckCall());
        document.getElementById('raise-btn').addEventListener('click', () => this.showBetModal());
        document.getElementById('all-in-btn').addEventListener('click', () => this.playerAction('raise', this.getCurrentPlayerChips()));

        // Bet modal
        document.getElementById('increase-bet').addEventListener('click', () => this.adjustBet(50));
        document.getElementById('decrease-bet').addEventListener('click', () => this.adjustBet(-50));
        document.getElementById('confirm-bet').addEventListener('click', () => this.confirmBet());
        document.getElementById('cancel-bet').addEventListener('click', () => this.hideBetModal());

        // Leave game
        document.getElementById('leave-game').addEventListener('click', () => {
            if (confirm('Are you sure you want to leave the game?')) {
                window.location.href = '/';
            }
        });
    }

    startGameUpdates() {
        this.updateGameState();
        this.updateInterval = setInterval(() => {
            this.updateGameState();
        }, 2000); // Update every 2 seconds
    }

    async updateGameState() {
        try {
            const response = await fetch(`/api/game/${this.gameId}/state`);
            const data = await response.json();

            if (response.ok) {
                this.gameState = data;
                this.renderGameState();
            } else {
                console.error('Failed to fetch game state:', data.error);
            }
        } catch (error) {
            console.error('Error fetching game state:', error);
        }
    }

    renderGameState() {
        if (!this.gameState) return;

        // Update pot
        document.getElementById('pot-amount').textContent = this.gameState.pot;

        // Update phase
        document.getElementById('game-phase').textContent = this.capitalizeFirst(this.gameState.phase);

        // Update community cards
        this.renderCommunityCards();

        // Update players
        this.renderPlayers();

        // Update player actions
        this.updatePlayerActions();
    }

    renderCommunityCards() {
        const communityCardsContainer = document.getElementById('community-cards');
        const cardSlots = communityCardsContainer.querySelectorAll('.card-slot');

        cardSlots.forEach((slot, index) => {
            const card = this.gameState.community_cards[index];
            if (card) {
                slot.innerHTML = this.createCardHTML(card);
            } else {
                slot.innerHTML = '<div class="card card-back"></div>';
            }
        });
    }

    renderPlayers() {
        const playersContainer = document.getElementById('players-container');
        playersContainer.innerHTML = '';

        this.gameState.players.forEach((player, index) => {
            const playerElement = this.createPlayerElement(player, index);
            playersContainer.appendChild(playerElement);
        });
    }

    createPlayerElement(player, index) {
        const isCurrentPlayer = index === this.gameState.current_player_index;
        const isCurrentUser = player.id === this.currentUser.id;

        const playerDiv = document.createElement('div');
        playerDiv.className = `player-seat ${isCurrentPlayer ? 'current-player' : ''} ${player.is_folded ? 'folded' : ''}`;
        
        // Position player around the table
        const position = this.getPlayerPosition(index, this.gameState.players.length);
        Object.assign(playerDiv.style, position);

        playerDiv.innerHTML = `
            <div class="player-name">${player.username}</div>
            <div class="player-chips">$${player.chips}</div>
            <div class="player-cards">
                ${player.cards.map(card => this.createCardHTML(card, !isCurrentUser)).join('')}
            </div>
            ${player.bet > 0 ? `<div class="player-bet">$${player.bet}</div>` : ''}
        `;

        return playerDiv;
    }

    getPlayerPosition(index, totalPlayers) {
        const positions = {
            2: [
                { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
                { top: '20px', left: '50%', transform: 'translateX(-50%)' }
            ],
            3: [
                { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
                { top: '20px', left: '20px' },
                { top: '20px', right: '20px' }
            ],
            4: [
                { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
                { left: '20px', top: '50%', transform: 'translateY(-50%)' },
                { top: '20px', left: '50%', transform: 'translateX(-50%)' },
                { right: '20px', top: '50%', transform: 'translateY(-50%)' }
            ],
            5: [
                { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
                { bottom: '80px', left: '20px' },
                { top: '80px', left: '20px' },
                { top: '20px', left: '50%', transform: 'translateX(-50%)' },
                { top: '80px', right: '20px' }
            ],
            6: [
                { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
                { bottom: '80px', left: '20px' },
                { left: '20px', top: '50%', transform: 'translateY(-50%)' },
                { top: '20px', left: '50%', transform: 'translateX(-50%)' },
                { right: '20px', top: '50%', transform: 'translateY(-50%)' },
                { bottom: '80px', right: '20px' }
            ]
        };

        return positions[totalPlayers]?.[index] || { bottom: '20px', left: '20px' };
    }

    createCardHTML(card, isHidden = false) {
        if (isHidden || !card) {
            return '<div class="card card-back"></div>';
        }

        const suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };

        const valueNames = {
            11: 'J',
            12: 'Q',
            13: 'K',
            14: 'A'
        };

        const displayValue = valueNames[card.value] || card.value.toString();
        const suitSymbol = suitSymbols[card.suit];
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

        return `
            <div class="card ${isRed ? 'red' : 'black'}">
                <div class="card-value">${displayValue}</div>
                <div class="card-suit">${suitSymbol}</div>
            </div>
        `;
    }

    updatePlayerActions() {
        const currentPlayer = this.gameState.players[this.gameState.current_player_index];
        const isMyTurn = currentPlayer && currentPlayer.id === this.currentUser.id;
        const actionsContainer = document.getElementById('player-actions');

        if (isMyTurn && !currentPlayer.is_folded) {
            actionsContainer.classList.remove('hidden');
            
            // Update player info
            document.getElementById('current-player-chips').textContent = currentPlayer.chips;
            
            // Update call amount
            const callAmount = this.gameState.current_bet - currentPlayer.bet;
            const callInfo = document.getElementById('call-amount');
            const checkCallBtn = document.getElementById('check-call-btn');
            
            if (callAmount > 0) {
                callInfo.classList.remove('hidden');
                callInfo.querySelector('span').textContent = callAmount;
                checkCallBtn.textContent = 'Call';
                checkCallBtn.disabled = callAmount > currentPlayer.chips;
            } else {
                callInfo.classList.add('hidden');
                checkCallBtn.textContent = 'Check';
                checkCallBtn.disabled = false;
            }

            // Update raise button
            const raiseBtn = document.getElementById('raise-btn');
            raiseBtn.disabled = currentPlayer.chips <= callAmount;

            // Update all-in button
            const allInBtn = document.getElementById('all-in-btn');
            allInBtn.disabled = currentPlayer.chips === 0;
        } else {
            actionsContainer.classList.add('hidden');
        }
    }

    handleCheckCall() {
        const currentPlayer = this.gameState.players[this.gameState.current_player_index];
        const callAmount = this.gameState.current_bet - currentPlayer.bet;
        
        if (callAmount > 0) {
            this.playerAction('call');
        } else {
            this.playerAction('check');
        }
    }

    showBetModal() {
        const currentPlayer = this.gameState.players[this.gameState.current_player_index];
        const callAmount = this.gameState.current_bet - currentPlayer.bet;
        const minBet = Math.max(this.gameState.current_bet * 2, currentPlayer.bet + 50);
        const maxBet = currentPlayer.chips + currentPlayer.bet;

        document.getElementById('bet-amount').textContent = minBet;
        document.getElementById('min-bet').textContent = minBet;
        document.getElementById('max-bet').textContent = maxBet;
        
        this.currentBetAmount = minBet;
        this.minBetAmount = minBet;
        this.maxBetAmount = maxBet;

        document.getElementById('bet-modal').classList.remove('hidden');
    }

    hideBetModal() {
        document.getElementById('bet-modal').classList.add('hidden');
    }

    adjustBet(amount) {
        this.currentBetAmount = Math.max(
            this.minBetAmount,
            Math.min(this.maxBetAmount, this.currentBetAmount + amount)
        );
        document.getElementById('bet-amount').textContent = this.currentBetAmount;
    }

    confirmBet() {
        this.playerAction('raise', this.currentBetAmount);
        this.hideBetModal();
    }

    async playerAction(action, amount = 0) {
        try {
            const response = await fetch(`/api/game/${this.gameId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, amount })
            });

            const data = await response.json();

            if (!response.ok) {
                app.showNotification(data.error || 'Action failed', 'error');
            }
        } catch (error) {
            console.error('Player action error:', error);
            app.showNotification('Network error. Please try again.', 'error');
        }
    }

    getCurrentPlayerChips() {
        const currentPlayer = this.gameState.players[this.gameState.current_player_index];
        return currentPlayer ? currentPlayer.chips + currentPlayer.bet : 0;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize game if we're on a game page
if (window.location.pathname.startsWith('/game/')) {
    const gameId = window.location.pathname.split('/')[2];
    const game = new PokerGame(gameId);
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', () => {
        game.destroy();
    });
}