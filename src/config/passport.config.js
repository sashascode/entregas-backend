import passport from "passport";
import { UserManager } from "../dao/services/user.service.js";
import GitHubStrategy from "passport-github2";
import { createHash, compareHash } from "../app.js";
import local from 'passport-local';
import jwt from 'passport-jwt';
import 'dotenv/config';

const LocalStrategy = local.Strategy;
const JWTStrategy = jwt.Strategy;
const ExtractJWT = jwt.ExtractJwt;

export const initializePassport = async () => {
    const userManager = new UserManager();
    
    passport.use('github',
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.GITHUB_CALLBACK_URL,
                scope: ['user:email']
            },
            async (accessToken, refreshToken, profile, done) => {
                const email = profile._json.email || profile.emails[0].value;
                const user = await userManager.getUserByEmail(email);
        
                if (user) {
                    return done(null, user);
                }
        
                const newUser = {
                    first_name: profile._json.name,
                    last_name: '',
                    email: email,
                    password: ''
                };
        
                await userManager.registerUser(newUser);
        
                return done(null, newUser);
            }
        )
    );

    passport.use('register', new LocalStrategy({
        passReqToCallback: true, 
        usernameField: 'email'
    }, async (req, username, password, done) => {

        const { name, email } = req.body
        try {
            const user = await userManager.getUserByEmail(username);
            if (user) {
                console.log('User already exits');
                return done(null, false)
            }

            const newUser = {
                name,
                email,
                password: createHash(password)
            }

            const result = await userManager.registerUser(newUser);
            return done(null, result);
        } catch (error) {
            done('Error to register ' + error)
        }
    }))

    passport.use('login', new LocalStrategy(
        { usernameField: 'email' },
        async(username, password, done) => {
            try {
                const user = await userManager.getUserByEmail(username);

                if(!user) {
                    console.error('user doent exist');
                    return done(null, false);
                }

                if(!compareHash(password, user.password)) {
                    console.error('password not valid');
                    return done(null, false);
                }

                return done(null, user);
            } catch (error) {
                return done('error login ' + error);
            }
        }
    ))

    passport.use('jwt', new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromExtractors([cookieExtractor]),
        secretOrKey: process.env.JWT_SECRET
    }, async (jwtPayload, done) => {
        try {
            return done(null, jwtPayload);
        }
        catch (error) {
            return done(error);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.email);
    });
    
    passport.deserializeUser(async (email, done) => {
        const user = await userManager.getUserByEmail(email);
    
        done(null, user);
    });
}

const cookieExtractor = (req) => {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies['access_token'];
    }
    return token;
}