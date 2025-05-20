import os
import re
import random
import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, send, join_room
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from wtforms import Form, StringField, PasswordField, EmailField
from wtforms.validators import InputRequired, Length
from sqlalchemy.ext.mutable import MutableList

random.seed(20)

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

CORS(
    app=app,
    origins=[
        f"{os.getenv('FRONT_END_URI')}"
    ],
    supports_credentials=True # responsible for cookie
)

Session(app)

socketio = SocketIO(app)

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
    current_interact = db.Column(db.JSON, unique=False, nullable=False) 
    interacted = db.Column(MutableList.as_mutable(db.JSON)) # MutableList allows SQLAlchemy to track changes
    chat_history = db.Column(MutableList.as_mutable(db.JSON))

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
        
        interacted_people = []

        for interacted_user in current_user.interacted: 
            toggle = False
            for interacted_check in interacted_people:
                if interacted_user["username"] == interacted_check:
                    toggle = True
            if interacted_user["username"] == current_user.username:
                toggle = True
            if toggle == False:
                interacted_people.append(interacted_user["username"])
        
        return jsonify({
            "interacted_people": interacted_people
        })
    
    else:

        return jsonify({
            "action": "login"
        })

@app.route('/send', methods=["GET", "POST"])
def Send():
    if request.method == "POST" and request.get_json()['message'] != '':
        message_data = request.get_json()

        other_username = current_user.current_interact[0]["username"]
        other_user = User.query.filter_by(username = other_username).first()

        other_user.chat_history.append({
            "username": current_user.username,
            "message": message_data["message"],
            "time": datetime.datetime.now().timestamp()
        })
        db.session.commit() # if this is not written, the previous struct in json will be removed

        return jsonify({
            "status": "sent"
        })
    else:
        return jsonify({
            "status": "no input yet"
        })
    
@app.route('/all_search', methods=["GET", "POST"])
def searchAll():
    if request.method == "POST":
        response = request.get_json()
        related_users = User.query.filter(User.username.like(f'{response["username"]}%')).all()
        found_users = []

        for user in related_users:
            found_users.append(user.username)

        return jsonify({
            "found_users": found_users
        })
    
@app.route('/interacted_search', methods=["GET", "POST"])
def searchInteracted():
    if request.method == "POST":
        response = request.get_json()
        found_users = []

        for data in current_user.interacted:
            if re.findall(f'^{response["username"]}', data["username"]):
                toggle = False
                for f_user in found_users:
                    if f_user == data["username"]:
                        toggle = True
                if toggle == False:
                    found_users.append(data["username"])

        return jsonify({
            "found_users": found_users
        })
    
@app.route('/start_chat', methods=["GET", "POST"])
def startChat():
    if request.method == "POST":
        response = request.get_json()

        interacting_user = User.query.filter_by(username = response['username']).first() # always use first() or equivalent

        current_user.interacted.append({"username": interacting_user.username})
        interacting_user.interacted.append({"username": current_user.username})

        db.session.commit()

        @socketio.on('start_chat') # this way of checking is preventing current_interact of any users to have content
        def roomCreate(data):
            if interacting_user.current_interact[0]["username"] == current_user.username:
                current_user.current_interact = [{
                    "username": response["username"],
                    "room": interacting_user.current_interact[0]["room"]
                }]
                join_room(interacting_user.current_interact[0]["room"])
            elif interacting_user.current_interact[0]["username"] != current_user.username:
                current_user.current_interact = [{
                    "username": response["username"],
                    "room": random.seed()
                }]
                join_room(current_user.current_interact[0]["room"])

        other_arr = []
        self_arr = []

        other_interacted = interacting_user.chat_history
        self_interacted = current_user.chat_history

        for history in other_interacted:
            if history["username"] == current_user.username:
                other_arr.append(history)

        for history in self_interacted:
            if history["username"] == interacting_user.username:
                self_arr.append(history)

        raw_main_arr = []
        main_arr = []

        # for i in range(len(other_arr)):
        #     if not len(raw_main_arr):
        #         raw_main_arr.append(other_arr[i])
        #     elif other_arr[i]["time"] > raw_main_arr[i-1]["time"]:
        #         raw_main_arr.append(other_arr[i])
        #     elif other_arr[i]["time"] < raw_main_arr[i-1]["time"]:
        #         checker_index = 2
        #         while (i-checker_index) >= 0 and other_arr[i]["time"] < raw_main_arr[i-checker_index]["time"]:
        #             checker_index += 1
        #         raw_main_arr.insert(
        #             i-checker_index,
        #             other_arr[i]
        #         )

        # for i in range(len(self_arr)):
        #     if not len(raw_main_arr):
        #         raw_main_arr.append(self_arr[i])
        #     elif self_arr[i]["time"] > raw_main_arr[i-1]["time"]:
        #         raw_main_arr.append(self_arr[i])
        #     elif self_arr[i]["time"] < raw_main_arr[i-1]["time"]:
        #         checker_index = 2
        #         while (i-checker_index) >= 0 and self_arr[i]["time"] < raw_main_arr[i-checker_index]["time"]:
        #             checker_index += 1
        #         raw_main_arr.insert(
        #             i-checker_index,
        #             self_arr[i]
        #         )

        for i in range(len(other_arr)):
            raw_main_arr.append(other_arr[i])

        for i in range(len(self_arr)):
            raw_main_arr.append(self_arr[i])

        for i in range(len(raw_main_arr)):
            current_check = raw_main_arr[i]
            current_index = None
            for o in range(len(raw_main_arr) - i):
                o += i
                if raw_main_arr[o]["time"] <= current_check["time"]:
                    current_check = raw_main_arr[o]
                    current_index = o
            raw_main_arr[current_index] = raw_main_arr[i]
            raw_main_arr[i] = current_check

        for data in raw_main_arr:
            if data["username"] == current_user.username:
                main_arr.append({
                    "unit": "self",
                    "message": data["message"]
                })
            elif data["username"] == interacting_user.username:
                main_arr.append({
                    "unit": "other",
                    "message": data["message"]
                })

        # other_counter = 0
        # self_counter = 0

        # for i in range(len(other_arr) + len(self_arr)):

        #     toggle = False

        #     print(other_arr[other_counter]["time"])

        #     if other_arr[other_counter]["time"] > self_arr[self_counter]["time"] and other_counter != "end":
        #         main_arr[i] = {
        #             "unit": "other",
        #             "message": other_arr[other_counter]["message"]
        #         }
        #     elif self_arr[self_counter]["time"] > other_arr[self_counter]["time"] and self_counter != "end":
        #         main_arr[i] = {
        #             "unit": "self",
        #             "message": self_arr[self_counter]["message"]
        #         }
        #         toggle = True

        #     if toggle:
        #         self_counter += 1
        #         if self_counter == len(self_arr):
        #             self_counter = "end"
        #     elif not toggle:
        #         other_counter += 1
        #         if other_counter == len(other_arr):
        #             other_counter = "end"

        print(main_arr)

        return jsonify({
            "chat_history": main_arr
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
                if current_user.is_authenticated:
                    logout_user()

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

    print(user_response)

    if request.method == "POST":
        try:
            form.validate()

            hashed_password = bcrypt.generate_password_hash(form.password.data)

            new_user = User(username=form.username.data, email=form.email.data, password=hashed_password, current_interact=[], interacted=[], chat_history=[])
            db.session.add(new_user)

            try:
                db.session.commit()
            except Exception as e:
                print(e)

            if current_user.is_authenticated:
                logout_user()

            login_user(new_user) # flask-login automatically sets the session key

            # session['username'] = form.username.data

            return jsonify({"message": "Registeration Successful"})
        except:
            return jsonify({"message": "Registeration Unsuccessful. Your email or username might be duplicated."})

# @socketio.on('message')
# def messaging(data):
#     send(
#         {
            
#         }
#     )

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    port = os.environ.get("PORT", 5321)
    socketio.run(app, debug=True, port=port)
