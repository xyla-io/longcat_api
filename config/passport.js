const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user.model');
const passportOneSessionPerUser = require('passport-one-session-per-user');

module.exports.init = (app) => {
  passport.serializeUser(function(user, done) {
    done(null, user._id.toString());
  });

  passport.deserializeUser(function(id, done) {
    User.getByID(id).then(user => done(null, user), done);
  });

  passport.use(new passportOneSessionPerUser());

  passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
  }, (req, email, password, done) => {
    // find a user whose email is the same as the forms email we are checking to see if the user trying to login already exists
    User.findOne({ 'local.email': email.toLowerCase() }, function(err, user) {
      // if there are any errors, return the error
      if (err) { return done(err); }

      // check to see if there is already a user with that email
      if (user) {
        return done(null, false, { message: 'An account already exists for this email.' });
      } else {

        // if there is no user with that email create the user
        User.generateHash(password, (err, hash) => {
          if (err) { return done(err); }

          let name = (req.body === undefined) ? null : req.body.name;
          let newUser = new User({
            local: {
              email: email,
              password: hash,
            },
            name: name,
          });

          // save the user
          User.createUser(newUser).then(
            user => done(null, user),
            err => done(err));
        });
      }
    });
  }));

  passport.use('local-signin', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
  }, (username, password, done) => {
    User.getByEmail(username)
      .then(user => {
      if (!user) { return done(null, false, { message: 'Incorrect username.' }); }

      user.validatePassword(password, (err, isValid) => {
        if (err) { return done(err); }
        if (isValid) return done(null, user);
        return done(null, false, { message: 'Incorrect password.' });
      });
    }, done);
  }));


  app.use(passport.initialize());
  app.use(passport.session());
  app.use(passport.authenticate('passport-one-session-per-user'));
};