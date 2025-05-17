import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from wtforms import Form, StringField, PasswordField, EmailField
from wtforms.validators import InputRequired, Length
from sqlalchemy.ext.mutable import MutableList

load_dotenv()

bcrypt = Bcrypt()

db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'tmp', 'database.db')

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "hellothere"
# app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
# app.config["SESSION_COOKIE_SECURE"] = False # False for local development
app.config["SESSION_PERMANENT"] = False
app.config['SESSION_TYPE'] = "filesystem"

Session(app)

CORS(
    app=app,
    origins=[
        f"{os.getenv('FRONT_END_URI')}",
    ],
    supports_credentials=True # responsible for cookie
)

db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'Login'

class User(db.Model, UserMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False)
    email = db.Column(db.String(40), unique=True, nullable=False)
    password = db.Column(db.String(89), unique=False, nullable=False)
    interacted = db.Column(MutableList.as_mutable(db.JSON)) # MutableList allows SQLAlchemy to track changes

class AuthForm(Form):
    username = StringField([InputRequired(), Length(min=4, max=20)])
    email = EmailField([InputRequired()])
    password = PasswordField([InputRequired()])

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/', methods=["GET", "POST"])
def Home():
    if current_user.is_authenticated:
        if request.method == "POST":
            message_data = request.get_json()
            prev_interacted = current_user.interacted
            print(prev_interacted)
            current_user.interacted.append({
                "username": current_user.username,
                "message": message_data["message"]
            })
            db.session.commit() # if this is not written, the previous struct in json will be removed
            # db.session.refresh(current_user)
            print(message_data)
            print(current_user.interacted)
            return jsonify({

            })
        else:
            return jsonify({
                "status": "no input yet"
            })
    else:
        return jsonify({
            "action": "login"
        })

@app.route('/login', methods=["GET", "POST"])
def Login():
    form = AuthForm()
    user_response = request.get_json()
    form.username.data = user_response['username']
    form.email.data = user_response['email']
    form.password.data = user_response['password']

    if request.method == "POST" and form.validate():
        try: # use try except to avoid server crashing
            user = User.query.filter_by(username = form.username.data).first()

            check_password = bcrypt.check_password_hash(user.password, form.password.data)

            if user and check_password:
                login_user(user) # flask-login automatically sets the session key
                # session['username'] = user.username 
                return jsonify({"message": "Login Successful."})
            else: 
                raise Exception()
        except:
            return jsonify({"message": "Login Failed. Your credentials does not match any user."})
        
@app.route('/register', methods=['GET', 'POST'])
def Register():
    form = AuthForm()
    user_response = request.get_json()
    form.username.data = user_response['username']
    form.email.data = user_response['email']
    form.password.data = user_response['password']

    if request.method == "POST":
        try:
            form.validate()

            hashed_password = bcrypt.generate_password_hash(form.password.data)

            new_user = User(username=form.username.data, email=form.email.data, password=hashed_password, interacted=[])
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user) # flask-login automatically sets the session key

            # session['username'] = form.username.data

            return jsonify({"message": "Registeration Successful"})
        except:
            return jsonify({"message": "Registeration Unsuccessful. Your email or username might be duplicated."})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    port = os.environ.get("PORT", 5321)
    app.run(debug=True, host="0.0.0.0", port=port)

