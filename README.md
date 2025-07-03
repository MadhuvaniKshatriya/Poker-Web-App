# Texas Hold'em Poker Web Application

A full-stack web application for playing Texas Hold'em Poker, built with Flask, SQLAlchemy, HTML, CSS, and JavaScript.

## Features

- **User Authentication**: Register and login system
- **Game Creation**: Create custom poker games with configurable settings
- **Real-time Gameplay**: Join games and play Texas Hold'em with other players
- **Statistics Tracking**: Track wins, losses, and performance metrics
- **Leaderboard**: Global rankings of top players
- **Responsive Design**: Works on desktop and mobile devices
- **Professional UI**: Beautiful, modern interface with smooth animations

## Technology Stack

- **Backend**: Python Flask
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with gradients and animations
- **Authentication**: Session-based with password hashing

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd poker-web-app
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Game Rules

This application implements standard Texas Hold'em Poker rules:

- Each player receives 2 private cards
- 5 community cards are dealt in stages (flop, turn, river)
- Players make the best 5-card hand using any combination of their cards and community cards
- Betting rounds occur before the flop, after the flop, after the turn, and after the river
- Standard poker hand rankings apply

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: User email address
- `password_hash`: Hashed password
- `chips`: Current chip count
- `games_played`: Total games played
- `games_won`: Total games won
- `total_winnings`: Lifetime winnings
- `created_at`: Account creation date

### Games Table
- `id`: Primary key
- `game_id`: Unique game identifier
- `creator_id`: Foreign key to users table
- `status`: Game status (waiting, playing, finished)
- `max_players`: Maximum number of players
- `small_blind`: Small blind amount
- `big_blind`: Big blind amount
- `pot`: Current pot size
- `current_bet`: Current bet amount
- `phase`: Game phase (pre-flop, flop, turn, river)
- `community_cards`: JSON string of community cards
- `deck`: JSON string of remaining deck
- `current_player_index`: Index of current player
- `dealer_index`: Index of dealer
- `created_at`: Game creation date

### GamePlayers Table
- `id`: Primary key
- `game_id`: Foreign key to games table
- `user_id`: Foreign key to users table
- `position`: Player position at table
- `chips`: Current chip count in game
- `cards`: JSON string of player's cards
- `bet`: Current bet amount
- `is_folded`: Whether player has folded
- `is_all_in`: Whether player is all-in
- `is_active`: Whether player is active in game

## API Endpoints

### Authentication
- `POST /register`: Register new user
- `POST /login`: User login
- `POST /logout`: User logout

### Game Management
- `POST /create_game`: Create new game
- `POST /join_game`: Join existing game
- `GET /api/game/<game_id>/state`: Get current game state
- `POST /api/game/<game_id>/action`: Submit player action

### Pages
- `GET /`: Home page with login/dashboard
- `GET /game/<game_id>`: Game interface
- `GET /stats`: User statistics
- `GET /leaderboard`: Global leaderboard

## File Structure

```
poker-web-app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/            # HTML templates
│   ├── base.html         # Base template
│   ├── index.html        # Home page
│   ├── game.html         # Game interface
│   ├── stats.html        # Statistics page
│   └── leaderboard.html  # Leaderboard page
└── static/               # Static assets
    ├── css/
    │   └── style.css     # Main stylesheet
    └── js/
        ├── main.js       # Core JavaScript
        ├── auth.js       # Authentication logic
        └── game.js       # Game functionality
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Future Enhancements

- AI opponents for single-player mode
- Tournament system
- Chat functionality
- Hand history tracking
- Advanced statistics and analytics
- Mobile app version
- Real money integration (with proper licensing)