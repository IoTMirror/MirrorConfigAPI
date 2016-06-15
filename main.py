import uuid
import random
import os

from functools import wraps

import requests
import json
from flask import Flask, request, jsonify, render_template, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import Form
from sqlalchemy.orm.exc import NoResultFound
from wtforms.validators import DataRequired
from wtforms import StringField, PasswordField
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.debug = True
app.config['SECURITY_PASSWORD_HASH'] = 'pbkdf2_sha512'
app.config['SECRET_KEY'] = os.environ['SECRET_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['SQLALCHEMY_DATABASE_URI']
db = SQLAlchemy(app)
request_headers = {"Authorization": os.environ["AUTH"]}

twitter_url = os.environ["TWITTER_URL"]
google_url = os.environ["GOOGLE_URL"]
ad_keyword_filter_url = os.environ["AD_URL"]
recognition_service_url = os.environ["RECOGNITION_SERVICE_URL"]


class User(db.Model):
    __tablename__ = 'ConfigUser'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String, unique=True)
    password_hash = db.Column(db.String(255))


class UserConfig(db.Model):
    __tablename__ = 'Config'
    id = db.Column(db.Integer, primary_key=True)
    twitter_x = db.Column(db.Integer)
    twitter_y = db.Column(db.Integer)
    twitter_w = db.Column(db.Integer)
    twitter_h = db.Column(db.Integer)

    gmail_x = db.Column(db.Integer)
    gmail_y = db.Column(db.Integer)
    gmail_w = db.Column(db.Integer)
    gmail_h = db.Column(db.Integer)

    tasks_x = db.Column(db.Integer)
    tasks_y = db.Column(db.Integer)
    tasks_w = db.Column(db.Integer)
    tasks_h = db.Column(db.Integer)


class Session(db.Model):
    __tablename__ = 'ConfigSession'
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String())


class LoginForm(Form):
    username = StringField("Login", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])


def requires_login(f):
    @wraps(f)
    def inner():
        if "token" in request.cookies:
            token = request.cookies["token"]
        elif request.json and "token" in request.json:
            token = request.json["token"]
        else:
            return redirect("/login")
        try:
            session = Session.query.filter_by(token=token).one()
            return f(session.id)
        except NoResultFound:
            return redirect("/login")

    return inner


def requires_login_get(f):
    @wraps(f)
    def inner(token):
        if not token or token == "do":
            if "token" in request.cookies:
                token = request.cookies["token"]
        try:
            session = Session.query.filter_by(token=token).one()
            return f(session.id)
        except NoResultFound:
            return redirect("/login")

    return inner


def twitter_logged_in(user_id):
    url = "{}users/{}".format(twitter_url, user_id)
    resp = requests.get(url, headers=request_headers)
    if resp.status_code is 200:
        return {
            "logged_in": True,
            "name": resp.json()["screen_name"]
        }
    else:
        return {
            "logged_in": False
        }


def google_logged_in(user_id):
    resp = requests.get("{}users/{}".format(google_url, user_id), headers=request_headers)
    if resp.status_code is 200:
        return {
            "logged_in": True,
            "name": resp.json()["name"]
        }
    else:
        return {
            "logged_in": False
        }


def config_to_dicts(config):
    widgets = []
    if config.twitter_w > 0:
        widgets.append({
            "WidgetName": "Twitter",
            "WidgetType": "Small",
            "WidgetPosition": {
                "X": config.twitter_x,
                "Y": config.twitter_y
            },
            "WidgetSize": {
                "X": config.twitter_w,
                "Y": config.twitter_h
            }
        })
    if config.gmail_w > 0:
        widgets.append({
            "WidgetName": "Gmail",
            "WidgetType": "Small",
            "WidgetPosition": {
                "X": config.gmail_x,
                "Y": config.gmail_y
            },
            "WidgetSize": {
                "X": config.gmail_w,
                "Y": config.gmail_h
            }
        })
    if config.tasks_w > 0:
        widgets.append({
            "WidgetName": "GoogleTasks",
            "WidgetType": "Small",
            "WidgetPosition": {
                "X": config.tasks_x,
                "Y": config.tasks_y
            },
            "WidgetSize": {
                "X": config.tasks_w,
                "Y": config.tasks_h
            }
        })
    return widgets


@app.route("/widgets", methods=['GET'], defaults={'token': None})
@app.route("/widgets/<token>", methods=['GET'])
@requires_login_get
def get_widget_config(user_id):
    config = UserConfig.query.get(user_id)
    return jsonify(
            {
                "Widgets": config_to_dicts(config),
                "Twitter": twitter_logged_in(user_id),
                "Google": google_logged_in(user_id)
            })


@app.route("/widgets", methods=['POST'])
@requires_login
def set_widget_config(user_id):
    json = request.json
    config = UserConfig.query.get(user_id)
    widget_type = json["widget"]
    if widget_type == "Twitter":
        if "delete" in json and json["delete"] == "True":
            config.twitter_x = 0
            config.twitter_y = 0
            config.twitter_w = 0
            config.twitter_h = 0
        else:
            if "x" not in json or \
                            "y" not in json or \
                            "width" not in json or \
                            "height" not in json:
                return jsonify({"error": "Missing field"}), 400
            config.twitter_x = json["x"]
            config.twitter_y = json["y"]
            config.twitter_w = json["width"]
            config.twitter_h = json["height"]
    elif widget_type == "Gmail":
        if "delete" in json and json["delete"] == "True":
            config.gmail_x = 0
            config.gmail_y = 0
            config.gmail_w = 0
            config.gmail_h = 0
        else:
            if "x" not in json or \
                            "y" not in json or \
                            "width" not in json or \
                            "height" not in json:
                return jsonify({"error": "Missing field"}), 400
            config.gmail_x = json["x"]
            config.gmail_y = json["y"]
            config.gmail_w = json["width"]
            config.gmail_h = json["height"]
    elif widget_type == "GoogleTasks":
        if "delete" in json and json["delete"] == "True":
            config.tasks_x = 0
            config.tasks_y = 0
            config.tasks_w = 0
            config.tasks_h = 0
        else:
            if "x" not in json or \
                            "y" not in json or \
                            "width" not in json or \
                            "height" not in json:
                return jsonify({"error": "Missing field"}), 400
            config.tasks_x = json["x"]
            config.tasks_y = json["y"]
            config.tasks_w = json["width"]
            config.tasks_h = json["height"]

    db.session.add(config)
    db.session.commit()
    return jsonify({"status": "Success"}), 200


@app.route("/", methods=['GET'])
@requires_login
def home(user_id):
    return render_template("home.html", mirror_id_list=get_mirror_ids(user_id))


@app.route("/user", methods=['POST'])
def create_user():
    json = request.json
    if "username" not in json or "password" not in json:
        return jsonify({"error": "Missing field"}), 400
    if User.query.filter_by(login=json["username"]).first() is not None:
        return jsonify({"error": "User already exists"}), 409
    user = User()
    user.login = json["username"]
    user.password_hash = generate_password_hash(json["password"])
    user.id = random.SystemRandom().randrange(-2147483647, 2147483646)
    while User.query.get(user.id):
        user.id = random.SystemRandom().randrange(-2147483647, 2147483646)
    db.session.add(user)
    db.session.commit()

    config = UserConfig.query.get(1)
    if not config:
        config = UserConfig()
    config.twitter_x = 0
    config.twitter_y = 0
    config.twitter_w = 3
    config.twitter_h = 5

    config.gmail_x = 3
    config.gmail_y = 0
    config.gmail_w = 3
    config.gmail_h = 6

    config.tasks_x = 0
    config.tasks_y = 5
    config.tasks_w = 3
    config.tasks_h = 3

    db.session.add(config)
    db.session.commit()
    return jsonify({"Result": "Success"})


@app.route("/login", methods=['GET'])
def login_get():
    form = LoginForm()
    return render_template("login.html", form=form)


@app.route("/login", methods=['POST'])
def login_post():
    json = request.json
    username = json["username"]
    password = json["password"]
    try:
        user = User.query.filter_by(login=username).one()
    except NoResultFound:
        return jsonify({"Result": "User not found"}), 400

    if not check_password_hash(user.password_hash, password):
        return jsonify({"Result": "Wrong password"}), 400

    token = uuid.uuid4().hex
    ses = Session.query.get(user.id)
    if ses:
        ses.token = token
    else:
        ses = Session(id=user.id, token=token)
    db.session.add(ses)
    db.session.commit()
    resp = jsonify({"Result": "Success", "Token": token})
    resp.set_cookie('token', token)
    resp.headers["Content-type"] = "application/json"
    return resp


@app.route("/twitter/signin/<token>", methods=["GET"])
@requires_login_get
def twitter_signin(user_id):
    return redirect("{}signin/{}".format(twitter_url, user_id))


@app.route("/twitter/users/<token>")
@requires_login_get
def twitter_user(user_id):
    return redirect("{}users/{}".format(twitter_url, user_id))


@app.route("/google/signin/<token>", methods=["GET"])
@requires_login_get
def google_signin(user_id):
    return redirect("{}signin/{}".format(google_url, user_id))


@app.route("/google/signout/<token>")
@requires_login_get
def google_signout(user_id):
    resp = requests.delete("{}signout/{}".format(google_url, user_id), headers=request_headers)
    return '', resp.status_code


@app.route("/twitter/signout/<token>")
@requires_login_get
def twitter_signout(user_id):
    resp = requests.delete("{}signout/{}".format(twitter_url, user_id), headers=request_headers)
    return '', resp.status_code


@app.route("/google/users/<token>")
@requires_login_get
def google_user(user_id):
    return redirect("{}users/{}".format(google_url, user_id))


@app.route("/ad_keywords/<token>", methods=['GET'])
@requires_login_get
def keywords(user_id):
    url="{0}keywords/{1}".format(ad_keyword_filter_url, user_id)
    resp = requests.get(url)
    return resp.content


def send_mirror_request(user_id):
  url="{}private/Users/{}/mirrors".format(recognition_service_url, user_id)
  resp = requests.get(url, headers=request_headers)
  return resp.text
    


def get_mirror_ids(user_id):
    content = send_mirror_request(user_id)
    js = json.loads(content)
    return js
    

@app.route("/mirrors/<token>", methods=['GET'])
@requires_login_get
def mirrors(user_id):
    return send_mirror_request(user_id)

@app.route("/mirrors", methods=['POST'])
@requires_login
def mirrorAdd(user_id):
  body = request.get_json()
  
  if 'DeviceId' not in body:
    return jsonify({'error': 'DeviceId missing'}), 401
  
  mirror_id = body["DeviceId"]
  url="{}private/Users/{}/mirrors/{}".format(recognition_service_url, user_id, mirror_id)
  requests.put(url, headers=request_headers)
  return jsonify({"Result": "Success"})

@app.route("/mirrors", methods=['DELETE'])
@app.route("/mirrors/delete", methods=['POST'])
@requires_login
def mirrorDelete(user_id):
  body = request.get_json()
  
  if 'DeviceId' not in body:
    return jsonify({'error': 'DeviceId missing'}), 401
  
  mirror_id = body["DeviceId"]
  url="{}private/Users/{}/mirrors/{}".format(recognition_service_url, user_id, mirror_id)
  requests.delete(url, headers=request_headers)
  return jsonify({"Result": "Success"})

@app.route("/teaching", methods=['POST'])
@requires_login
def teacher(user_id):
  body = request.get_json()
  
  if 'DeviceId' not in body:
    return jsonify({'error': 'DeviceId missing'}), 401
  
  mirror_id = body["DeviceId"]
  url="{}private/TeachingSessions/mirrors/{}/users/{}".format(recognition_service_url, mirror_id, user_id)
  requests.post(url, headers=request_headers)
  return jsonify({"Result": "Success"})

if __name__ == "__main__":
    app.run()
