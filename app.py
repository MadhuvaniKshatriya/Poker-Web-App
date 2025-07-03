from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import random
import json
from datetime import datetime
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///poker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    chips = db.Column(db.Integer, default=1000)
    games_played = db.Column(db.Integer, default=0)
    games_won = db.Column(db.Integer, default=0)
    total_winnings = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.String(36), unique=True, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='waiting')  # waiting, playing, finished
    max_players = db.Column(db.Integer, default=6)
    small_blind = db.Column(db.Integer, default=10)
    big_blind = db.Column(db.Integer, default=20)
    pot = db.Column(db.Integer, default=0)
    current_bet = db.Column(db.Integer, default=0)
    phase = db.Column(db.String(20), default='pre-flop')
    community_cards = db.Column(db.Text)  # JSON string
    deck = db.Column(db.Text)  # JSON string
    current_player_index = db.Column(db.Integer, default=0)
    dealer_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GamePlayer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.String(36), db.ForeignKey('game.game_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    chips = db.Column(db.Integer, nullable=False)
    cards = db.Column(db.Text)  # JSON string
    bet = db.Column(db.Integer, default=0)
    is_folded = db.Column(db.Boolean, default=False)
    is_all_in = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)

# Poker Logic Classes
class Card:
    def __init__(self, suit, value):
        self.suit = suit
        self.value = value
    
    def to_dict(self):
        return {'suit': self.suit, 'value': self.value}

class PokerLogic:
    SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
    
    @staticmethod
    def create_deck():
        deck = []
        for suit in PokerLogic.SUITS:
            for value in range(2, 15):  # 2-14 (11=J, 12=Q, 13=K, 14=A)
                deck.append(Card(suit, value))
        return deck
    
    @staticmethod
    def shuffle_deck(deck):
        random.shuffle(deck)
        return deck
    
    @staticmethod
    def evaluate_hand(cards):
        if len(cards) < 5:
            return {'rank': 0, 'name': 'No Hand'}
        
        # Get all possible 5-card combinations
        from itertools import combinations
        best_hand = {'rank': 0, 'name': 'High Card'}
        
        for combo in combinations(cards, 5):
            hand = PokerLogic.evaluate_five_cards(list(combo))
            if hand['rank'] > best_hand['rank']:
                best_hand = hand
        
        return best_hand
    
    @staticmethod
    def evaluate_five_cards(cards):
        sorted_cards = sorted(cards, key=lambda x: x.value, reverse=True)
        values = [card.value for card in sorted_cards]
        suits = [card.suit for card in sorted_cards]
        
        # Count occurrences of each value
        value_counts = {}
        for value in values:
            value_counts[value] = value_counts.get(value, 0) + 1
        
        counts = sorted(value_counts.values(), reverse=True)
        is_flush = len(set(suits)) == 1
        is_straight = PokerLogic.is_straight(values)
        
        # Royal Flush
        if is_flush and is_straight and values[0] == 14:
            return {'rank': 10, 'name': 'Royal Flush'}
        
        # Straight Flush
        if is_flush and is_straight:
            return {'rank': 9, 'name': 'Straight Flush'}
        
        # Four of a Kind
        if counts[0] == 4:
            return {'rank': 8, 'name': 'Four of a Kind'}
        
        # Full House
        if counts[0] == 3 and counts[1] == 2:
            return {'rank': 7, 'name': 'Full House'}
        
        # Flush
        if is_flush:
            return {'rank': 6, 'name': 'Flush'}
        
        # Straight
        if is_straight:
            return {'rank': 5, 'name': 'Straight'}
        
        # Three of a Kind
        if counts[0] == 3:
            return {'rank': 4, 'name': 'Three of a Kind'}
        
        # Two Pair
        if counts[0] == 2 and counts[1] == 2:
            return {'rank': 3, 'name': 'Two Pair'}
        
        # One Pair
        if counts[0] == 2:
            return {'rank': 2, 'name': 'One Pair'}
        
        # High Card
        return {'rank': 1, 'name': 'High Card'}
    
    @staticmethod
    def is_straight(values):
        unique_values = sorted(list(set(values)), reverse=True)
        
        if len(unique_values) != 5:
            return False
        
        # Check for regular straight
        for i in range(4):
            if unique_values[i] - unique_values[i + 1] != 1:
                # Check for A-2-3-4-5 straight (wheel)
                if i == 0 and unique_values[0] == 14 and unique_values[1] == 5:
                    continue
                return False
        
        return True

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    return jsonify({'success': True, 'user': {
        'id': user.id,
        'username': user.username,
        'chips': user.chips
    }})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        return jsonify({'success': True, 'user': {
            'id': user.id,
            'username': user.username,
            'chips': user.chips
        }})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True})

@app.route('/create_game', methods=['POST'])
def create_game():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    game_id = str(uuid.uuid4())
    
    # Create deck and shuffle
    deck = PokerLogic.create_deck()
    PokerLogic.shuffle_deck(deck)
    
    game = Game(
        game_id=game_id,
        creator_id=session['user_id'],
        max_players=data.get('max_players', 6),
        small_blind=data.get('small_blind', 10),
        big_blind=data.get('big_blind', 20),
        community_cards=json.dumps([]),
        deck=json.dumps([card.to_dict() for card in deck])
    )
    
    db.session.add(game)
    db.session.commit()
    
    return jsonify({'success': True, 'game_id': game_id})

@app.route('/join_game', methods=['POST'])
def join_game():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    game_id = data.get('game_id')
    
    game = Game.query.filter_by(game_id=game_id).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    # Check if user is already in game
    existing_player = GamePlayer.query.filter_by(
        game_id=game_id, 
        user_id=session['user_id']
    ).first()
    
    if existing_player:
        return jsonify({'error': 'Already in game'}), 400
    
    # Check if game is full
    player_count = GamePlayer.query.filter_by(game_id=game_id).count()
    if player_count >= game.max_players:
        return jsonify({'error': 'Game is full'}), 400
    
    user = User.query.get(session['user_id'])
    
    game_player = GamePlayer(
        game_id=game_id,
        user_id=session['user_id'],
        position=player_count,
        chips=1000,  # Starting chips
        cards=json.dumps([])
    )
    
    db.session.add(game_player)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/game/<game_id>')
def game_view(game_id):
    if 'user_id' not in session:
        return render_template('login.html')
    
    game = Game.query.filter_by(game_id=game_id).first()
    if not game:
        return "Game not found", 404
    
    return render_template('game.html', game_id=game_id)

@app.route('/api/game/<game_id>/state')
def get_game_state(game_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    game = Game.query.filter_by(game_id=game_id).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    players = GamePlayer.query.filter_by(game_id=game_id).order_by(GamePlayer.position).all()
    
    game_state = {
        'phase': game.phase,
        'pot': game.pot,
        'current_bet': game.current_bet,
        'community_cards': json.loads(game.community_cards),
        'current_player_index': game.current_player_index,
        'players': []
    }
    
    for player in players:
        user = User.query.get(player.user_id)
        player_data = {
            'id': player.user_id,
            'username': user.username,
            'chips': player.chips,
            'bet': player.bet,
            'is_folded': player.is_folded,
            'is_all_in': player.is_all_in,
            'is_active': player.is_active,
            'cards': json.loads(player.cards) if player.user_id == session['user_id'] else []
        }
        game_state['players'].append(player_data)
    
    return jsonify(game_state)

@app.route('/api/game/<game_id>/action', methods=['POST'])
def player_action(game_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    action = data.get('action')
    amount = data.get('amount', 0)
    
    game = Game.query.filter_by(game_id=game_id).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    player = GamePlayer.query.filter_by(
        game_id=game_id, 
        user_id=session['user_id']
    ).first()
    
    if not player:
        return jsonify({'error': 'Not in game'}), 400
    
    # Process the action
    if action == 'fold':
        player.is_folded = True
        player.is_active = False
    elif action == 'check':
        pass  # No additional bet
    elif action == 'call':
        call_amount = game.current_bet - player.bet
        player.bet += call_amount
        player.chips -= call_amount
        game.pot += call_amount
    elif action == 'raise':
        bet_amount = amount - player.bet
        player.bet = amount
        player.chips -= bet_amount
        game.pot += bet_amount
        game.current_bet = amount
    
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/stats')
def stats():
    if 'user_id' not in session:
        return render_template('login.html')
    
    user = User.query.get(session['user_id'])
    return render_template('stats.html', user=user)

@app.route('/leaderboard')
def leaderboard():
    users = User.query.order_by(User.games_won.desc()).limit(10).all()
    return render_template('leaderboard.html', users=users)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)