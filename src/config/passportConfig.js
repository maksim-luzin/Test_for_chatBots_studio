import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { secret } from './jwtConfig';
import userRepository from '../db/repositories/userRepository';
import { compare } from '../helpers/cryptoHelper';

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secret
};

passport.use(
  'login',
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      let user = await userRepository.getByEmail(email);
      user = user.toJSON();
      if (!user) {
        return done({ status: 401, message: 'Incorrect email.' }, false);
      }
      return await compare(password, user.password)
        ? done(null, user)
        : done({ status: 401, message: 'Passwords do not match.' }, null, false);
    } catch (err) {
      return done(err);
    }
  })
);

passport.use(
  'register',
  new LocalStrategy(
    { passReqToCallback: true },
    async ({ body: { email, isAdmin } }, username, password, done) => {
      try {
        const userByEmail = await userRepository.getByEmail(email);
        if (userByEmail) {
          return done({ status: 401, message: 'Email is already taken.' }, null);
        }

        if (typeof isAdmin !== 'boolean') {
          return done({ status: 401, message: 'isAdmin is not set.' }, null);
        }

        return await userRepository.getByUsername(username)
          ? done({ status: 401, message: 'Username is already taken.' }, null)
          : done(null, { email, username, password, isAdmin });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(new JwtStrategy(options, async ({ id }, done) => {
  try {
    const user = await userRepository.getById(id);
    return user ? done(null, user) : done({ status: 401, message: 'Token is invalid.' }, null);
  } catch (err) {
    return done(err);
  }
}));
