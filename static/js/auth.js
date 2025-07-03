// Authentication functionality
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingAuth();
    }

    bindEvents() {
        // Form submissions
        const loginForm = document.getElementById('login-form-element');
        const registerForm = document.getElementById('register-form-element');
        const createGameForm = document.getElementById('create-game-form');
        const joinGameForm = document.getElementById('join-game-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        if (createGameForm) {
            createGameForm.addEventListener('submit', (e) => this.handleCreateGame(e));
        }

        if (joinGameForm) {
            joinGameForm.addEventListener('submit', (e) => this.handleJoinGame(e));
        }

        // Form switching
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
    }

    checkExistingAuth() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            const user = JSON.parse(userData);
            this.showDashboard(user);
        }
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                this.showDashboard(data.user);
                app.showNotification('Login successful!', 'success');
            } else {
                app.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            app.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        // Basic validation
        if (password.length < 6) {
            app.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                this.showDashboard(data.user);
                app.showNotification('Registration successful!', 'success');
            } else {
                app.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            app.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleCreateGame(e) {
        e.preventDefault();
        
        const maxPlayers = document.getElementById('max-players').value;
        const smallBlind = document.getElementById('small-blind').value;
        const bigBlind = smallBlind * 2;

        try {
            const response = await fetch('/create_game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    max_players: parseInt(maxPlayers),
                    small_blind: parseInt(smallBlind),
                    big_blind: parseInt(bigBlind)
                })
            });

            const data = await response.json();

            if (response.ok) {
                app.showNotification('Game created successfully!', 'success');
                // Redirect to game
                window.location.href = `/game/${data.game_id}`;
            } else {
                app.showNotification(data.error || 'Failed to create game', 'error');
            }
        } catch (error) {
            console.error('Create game error:', error);
            app.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleJoinGame(e) {
        e.preventDefault();
        
        const gameId = document.getElementById('game-id').value.trim();

        if (!gameId) {
            app.showNotification('Please enter a game ID', 'error');
            return;
        }

        try {
            const response = await fetch('/join_game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId })
            });

            const data = await response.json();

            if (response.ok) {
                app.showNotification('Joined game successfully!', 'success');
                // Redirect to game
                window.location.href = `/game/${gameId}`;
            } else {
                app.showNotification(data.error || 'Failed to join game', 'error');
            }
        } catch (error) {
            console.error('Join game error:', error);
            app.showNotification('Network error. Please try again.', 'error');
        }
    }

    showDashboard(user) {
        const authContainer = document.getElementById('auth-container');
        const dashboard = document.getElementById('dashboard');
        
        if (authContainer && dashboard) {
            authContainer.classList.add('hidden');
            dashboard.classList.remove('hidden');
            
            // Update user info
            document.getElementById('username').textContent = user.username;
            document.getElementById('user-chips').textContent = user.chips;
            
            // Update stats (you might want to fetch these from the server)
            document.getElementById('games-won').textContent = user.games_won || 0;
            document.getElementById('games-played').textContent = user.games_played || 0;
            
            const winRate = user.games_played > 0 ? 
                Math.round((user.games_won / user.games_played) * 100) : 0;
            document.getElementById('win-rate').textContent = winRate + '%';
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();