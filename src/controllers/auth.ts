import bcrypt from 'bcrypt';
import { Request, Response } from 'express-serve-static-core';
import db from '../models';

interface RequestWithSession extends Request {
    session?: any;
}

interface RequestBody {
    email: string;
    username: string;
    password: string;
}

export class AuthRoutes {
    login = async (req: RequestWithSession, res: Response): Promise<any> => {
        const { email, password } = req.body;
        console.log(req.body);
        //if (!this.validate(req.body)) return res.status(401).json({ 'message': 'invalid data provided' });

        try {
            const user: any = await db.models.User.findOne({ where: { email } });
            if (!user) return res.status(401).json({ "message": "user/password combination not found" });
            else {
                if (bcrypt.compareSync(password, user.password)) {
                    req.session.user = user.id;

                    const { email, username, id } = user;
                    const userData = { email, username, id };

                    res.status(200).json(userData);
                }
            }
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ "message": "internal server error" });
        }
    }

    signup = async (req: RequestWithSession, res: Response): Promise<any> => {
        console.log(req.body);

        //if (!this.validate(req.body)) return res.status(401).json({ 'message': 'invalid data provided' });

        try {
            const possibleDuplicate: any = await db.models.User.findOne({ where: { email: req.body.email } });
            if (possibleDuplicate) res.status(409).json({ "message": "user with same email already exist" });

            const user: any = await db.models.User.create(req.body);
            req.session.user = user.id;

            const { email, username, id } = user;
            const userData = { email, username, id };

            res.status(200).json(userData);
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ "message": "internal server error" });
        }
    }

    logout = (req: RequestWithSession, res: Response): void => {
        if (req.session) req.session.reset();

        res.status(200).json({ "message": "success" });
    }

    sessionAuth = async (req: RequestWithSession, res: Response): Promise<any> => {
        if (req.session.user) {
            const userId = req.session.user;

            const user: any = await db.models.User.find({ where: { id: userId } });
            if (!user) return res.status(401).json({ "message": "user/password combination not found" });

            const { email, username, id } = user;
            const userData = { email, username, id };

            res.status(200).json(userData);
        }
        else res.status(401).json({ "message": "user/password combination not found" });
    }

    validate = (obj: RequestBody) => {
        const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        const usernameRegExp = /^([a-zA-Z0-9_-]){2,32}$/;
        const passwordRegExp = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;

        if (obj['email'] && !new RegExp(emailRegExp).test(obj.email)) return false;
        if (obj['username'] && !new RegExp(usernameRegExp).test(obj.username)) return false;
        if (obj['password'] && !new RegExp(passwordRegExp).test(obj.password)) return false;

        return true;
    }
}
